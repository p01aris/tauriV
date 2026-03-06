use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PortSignature {
    pub name: String,
    pub direction: String,
    pub width: u32,
    pub signed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModuleSignature {
    pub module_name: String,
    pub source_path: String,
    pub ports: Vec<PortSignature>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunSimulationRequest {
    pub verilog_code: String,
    pub testbench_code: Option<String>,
    pub top_module: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SimulationResult {
    pub success: bool,
    pub stdout: String,
    pub stderr: String,
    pub work_dir: Option<String>,
}

fn resolve_scan_directory(input: Option<String>) -> PathBuf {
    let requested = input.unwrap_or_else(|| "src/verilog_module".to_string());
    let direct_path = PathBuf::from(&requested);
    if direct_path.is_absolute() {
        return direct_path;
    }

    let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    let from_cwd = cwd.join(&direct_path);
    if from_cwd.exists() {
        return from_cwd;
    }

    if let Some(parent) = cwd.parent() {
        let from_parent = parent.join(&direct_path);
        if from_parent.exists() {
            return from_parent;
        }
    }

    from_cwd
}

fn collect_verilog_files(directory: &Path, files: &mut Vec<PathBuf>) -> Result<(), String> {
    let entries = fs::read_dir(directory)
        .map_err(|error| format!("Failed to read directory {}: {}", directory.display(), error))?;

    for entry in entries {
        let entry =
            entry.map_err(|error| format!("Failed to read directory entry: {}", error))?;
        let path = entry.path();
        if path.is_dir() {
            collect_verilog_files(&path, files)?;
            continue;
        }

        if path
            .extension()
            .and_then(|ext| ext.to_str())
            .is_some_and(|ext| ext.eq_ignore_ascii_case("v"))
        {
            files.push(path);
        }
    }

    Ok(())
}

fn parse_verilog_signature(path: &Path, source: &str) -> Option<ModuleSignature> {
    let module_re = Regex::new(r"(?m)^\s*module\s+([A-Za-z_][A-Za-z0-9_]*)").ok()?;
    let port_re = Regex::new(
        r"(?m)^\s*(input|output)\s+(?:wire|reg|logic)?\s*(signed\s+)?(?:\[(\d+)\s*:\s*(\d+)\]\s*)?([A-Za-z_][A-Za-z0-9_]*)",
    )
    .ok()?;

    let module_name = module_re
        .captures(source)
        .and_then(|captures| captures.get(1))
        .map(|capture| capture.as_str().to_string())?;

    let mut ports = Vec::new();
    for captures in port_re.captures_iter(source) {
        let direction = captures
            .get(1)
            .map(|capture| capture.as_str().to_string())
            .unwrap_or_else(|| "input".to_string());
        let signed = captures.get(2).is_some();
        let msb = captures
            .get(3)
            .and_then(|capture| capture.as_str().parse::<i32>().ok())
            .unwrap_or(0);
        let lsb = captures
            .get(4)
            .and_then(|capture| capture.as_str().parse::<i32>().ok())
            .unwrap_or(0);
        let width = (msb - lsb).abs() as u32 + 1;
        let name = captures.get(5).map(|capture| capture.as_str().to_string())?;

        ports.push(PortSignature {
            name,
            direction,
            width,
            signed,
        });
    }

    Some(ModuleSignature {
        module_name,
        source_path: path.display().to_string(),
        ports,
    })
}

#[tauri::command]
pub fn scan_verilog_modules(directory: Option<String>) -> Result<Vec<ModuleSignature>, String> {
    let scan_directory = resolve_scan_directory(directory);
    if !scan_directory.exists() {
        return Err(format!(
            "Verilog directory does not exist: {}",
            scan_directory.display()
        ));
    }

    let mut files = Vec::new();
    collect_verilog_files(&scan_directory, &mut files)?;
    files.sort();

    let mut modules = Vec::new();
    for file in files {
        let source = fs::read_to_string(&file)
            .map_err(|error| format!("Failed to read {}: {}", file.display(), error))?;

        if let Some(signature) = parse_verilog_signature(&file, &source) {
            modules.push(signature);
        }
    }

    let mut unique_modules: HashMap<String, ModuleSignature> = HashMap::new();
    for signature in modules {
        unique_modules.insert(signature.module_name.clone(), signature);
    }

    let mut deduped: Vec<ModuleSignature> = unique_modules.into_values().collect();
    deduped.sort_by(|a, b| a.module_name.cmp(&b.module_name));

    Ok(deduped)
}

#[tauri::command]
pub fn run_verilog_simulation(
    request: RunSimulationRequest,
) -> Result<SimulationResult, String> {
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| format!("Failed to create timestamp: {}", error))?
        .as_millis();
    let work_dir = std::env::temp_dir().join(format!("tauriv-sim-{}", stamp));
    fs::create_dir_all(&work_dir)
        .map_err(|error| format!("Failed to create work directory: {}", error))?;

    let design_path = work_dir.join("design.v");
    fs::write(&design_path, request.verilog_code.as_bytes())
        .map_err(|error| format!("Failed to write design file: {}", error))?;

    let mut input_files = vec![design_path.to_string_lossy().to_string()];
    let testbench_present = request
        .testbench_code
        .as_ref()
        .is_some_and(|code| !code.trim().is_empty());

    if let Some(testbench_code) = request.testbench_code {
        if !testbench_code.trim().is_empty() {
            let testbench_path = work_dir.join("tb.v");
            fs::write(&testbench_path, testbench_code.as_bytes())
                .map_err(|error| format!("Failed to write testbench file: {}", error))?;
            input_files.push(testbench_path.to_string_lossy().to_string());
        }
    }

    let output_binary = work_dir.join("simv");
    let mut compile_args = vec![
        "-g2012".to_string(),
        "-o".to_string(),
        output_binary.to_string_lossy().to_string(),
    ];
    compile_args.extend(input_files.clone());
    if !testbench_present {
        if let Some(top_module) = request.top_module {
            if !top_module.trim().is_empty() {
                compile_args.push("-s".to_string());
                compile_args.push(top_module);
            }
        }
    }

    let compile_output = Command::new("iverilog")
        .current_dir(&work_dir)
        .args(&compile_args)
        .output()
        .map_err(|error| {
            format!(
                "Failed to execute iverilog: {}. Ensure iverilog is installed and available on PATH.",
                error
            )
        })?;

    let compile_stdout = String::from_utf8_lossy(&compile_output.stdout).to_string();
    let compile_stderr = String::from_utf8_lossy(&compile_output.stderr).to_string();
    if !compile_output.status.success() {
        return Ok(SimulationResult {
            success: false,
            stdout: compile_stdout,
            stderr: compile_stderr,
            work_dir: Some(work_dir.display().to_string()),
        });
    }

    if !testbench_present {
        return Ok(SimulationResult {
            success: true,
            stdout: format!(
                "{}\nCompilation succeeded. No testbench provided; simulation run skipped.",
                compile_stdout
            )
            .trim()
            .to_string(),
            stderr: compile_stderr,
            work_dir: Some(work_dir.display().to_string()),
        });
    }

    let run_output = Command::new("vvp")
        .current_dir(&work_dir)
        .arg(output_binary.to_string_lossy().to_string())
        .output()
        .map_err(|error| {
            format!(
                "Failed to execute vvp: {}. Ensure vvp is installed and available on PATH.",
                error
            )
        })?;

    let run_stdout = String::from_utf8_lossy(&run_output.stdout).to_string();
    let run_stderr = String::from_utf8_lossy(&run_output.stderr).to_string();

    Ok(SimulationResult {
        success: run_output.status.success(),
        stdout: format!("{}\n{}", compile_stdout, run_stdout)
            .trim()
            .to_string(),
        stderr: format!("{}\n{}", compile_stderr, run_stderr)
            .trim()
            .to_string(),
        work_dir: Some(work_dir.display().to_string()),
    })
}
