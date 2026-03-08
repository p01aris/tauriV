import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AreaExtensions } from "rete-area-plugin";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { openPath } from "@tauri-apps/plugin-opener";
import { createEditor } from "./editor";
import {
  isSavedGraphDocument,
  restoreEditorGraph,
  serializeEditorGraph
} from "./core/adapters/graphStorage";
import { reteToGraph } from "./core/adapters/reteToGraph";
import { compileGraph } from "./core/compiler/compileGraph";
import type { Diagnostic } from "./core/diagnostics/types";
import {
  NodeTypes,
  getNodeTypeByName,
  getRegisteredModuleSignatures,
  listNodeTypeNames,
  replaceModuleNodeTypes
} from "./node";
import {
  runVerilogSimulation,
  scanVerilogModules
} from "./tauri-adapter/verilogService";
import { AppView } from "./ui/AppView";
import "./App.css";

const BUILTIN_NODE_TYPE_NAMES = [
  "InputNode",
  "OutputNode",
  "AndGateNode",
  "OrGateNode",
  "ConcatNode",
  "DivideNode"
] as const;

const DEFAULT_PROJECT_PATH = "/Volumes/External/src/tauriV";
const DEFAULT_SCAN_PATH = "src/verilog_module";
const DEFAULT_TOP_MODULE = "TopLevelModule";

function isAbsolutePath(path: string): boolean {
  return path.startsWith("/") || /^[a-zA-Z]:[\\/]/.test(path);
}

function joinPath(basePath: string, relativePath: string): string {
  const normalizedBase = basePath.replace(/[\\/]+$/, "");
  const normalizedRelative = relativePath.replace(/^[\\/]+/, "");
  return `${normalizedBase}/${normalizedRelative}`;
}

function resolveScanDirectory(projectPath: string, scanPath: string): string {
  const trimmedScanPath = scanPath.trim();
  if (!trimmedScanPath) {
    return projectPath.trim() || DEFAULT_SCAN_PATH;
  }

  if (isAbsolutePath(trimmedScanPath)) {
    return trimmedScanPath;
  }

  const trimmedProjectPath = projectPath.trim();
  if (!trimmedProjectPath) {
    return trimmedScanPath;
  }

  return joinPath(trimmedProjectPath, trimmedScanPath);
}

function normalizePathForCompare(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+$/, "");
}

function toRelativePathIfInside(basePath: string, targetPath: string): string | null {
  const normalizedBase = normalizePathForCompare(basePath);
  const normalizedTarget = normalizePathForCompare(targetPath);
  if (!normalizedBase || !normalizedTarget) {
    return null;
  }

  const baseComparable = /^[a-zA-Z]:/.test(normalizedBase)
    ? normalizedBase.toLowerCase()
    : normalizedBase;
  const targetComparable = /^[a-zA-Z]:/.test(normalizedTarget)
    ? normalizedTarget.toLowerCase()
    : normalizedTarget;

  if (targetComparable === baseComparable) {
    return ".";
  }

  if (!targetComparable.startsWith(`${baseComparable}/`)) {
    return null;
  }

  return normalizedTarget.slice(normalizedBase.length + 1);
}

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<any>(null);

  const [generatedCode, setGeneratedCode] = useState<string>("");
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [nodeTypeNames, setNodeTypeNames] = useState<string[]>(() =>
    listNodeTypeNames()
  );

  const [projectPath, setProjectPath] = useState(DEFAULT_PROJECT_PATH);
  const [scanFolderPath, setScanFolderPath] = useState(DEFAULT_SCAN_PATH);
  const [topModuleName, setTopModuleName] = useState(DEFAULT_TOP_MODULE);
  const [testbenchCode, setTestbenchCode] = useState<string>(
    `\`timescale 1ns/1ps
module tb;
  reg in_0 = 0;
  wire out_0;

  TopLevelModule dut(
    .in_0(in_0),
    .out_0(out_0)
  );

  initial begin
    #10 in_0 = 1;
    #10 in_0 = 0;
    #10 $finish;
  end
endmodule`
  );

  const [statusMessage, setStatusMessage] = useState("Bootstrapping editor...");
  const [loadingError, setLoadingError] = useState<string>("");
  const [simulationOutput, setSimulationOutput] = useState<string>("");
  const [simulationError, setSimulationError] = useState<string>("");
  const [simulationWorkDir, setSimulationWorkDir] = useState<string>("");
  const [graphStats, setGraphStats] = useState<{ nodes: number; edges: number } | null>(null);

  const [isBootstrapping, setIsBootstrapping] = useState<boolean>(true);
  const [isScanningModules, setIsScanningModules] = useState<boolean>(false);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [libraryExpanded, setLibraryExpanded] = useState<{
    builtIn: boolean;
    modules: boolean;
  }>({
    builtIn: true,
    modules: true
  });

  const scanDirectory = useMemo(
    () => resolveScanDirectory(projectPath, scanFolderPath),
    [projectPath, scanFolderPath]
  );

  const loadModules = useCallback(
    async (directory: string) => {
      setIsScanningModules(true);
      setLoadingError("");
      setStatusMessage(`Scanning modules in ${directory} ...`);

      try {
        const signatures = await scanVerilogModules(directory);
        replaceModuleNodeTypes(signatures);
        setNodeTypeNames(listNodeTypeNames());
        setStatusMessage(`Loaded ${signatures.length} module signatures.`);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to scan module folder.";
        setLoadingError(message);
        setStatusMessage("Module scan failed.");
      } finally {
        setIsScanningModules(false);
      }
    },
    []
  );

  useEffect(() => {
    let destroyed = false;
    let contextToDestroy: any = null;

    const bootstrap = async () => {
      await loadModules(resolveScanDirectory(DEFAULT_PROJECT_PATH, DEFAULT_SCAN_PATH));
      if (destroyed || !containerRef.current) {
        return;
      }

      try {
        const builtInContextMenuNodeTypes = Object.fromEntries(
          BUILTIN_NODE_TYPE_NAMES.map((name) => [name, NodeTypes[name]]).filter(
            ([, NodeClass]) => Boolean(NodeClass)
          )
        ) as Record<string, any>;

        const context = await createEditor(
          containerRef.current,
          NodeTypes,
          builtInContextMenuNodeTypes
        );
        if (destroyed) {
          context.destroy();
          return;
        }

        contextToDestroy = context;
        editorRef.current = context;
        setStatusMessage("Editor ready.");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to initialize editor.";
        setLoadingError(message);
      } finally {
        if (!destroyed) {
          setIsBootstrapping(false);
        }
      }
    };

    bootstrap();

    return () => {
      destroyed = true;
      editorRef.current = null;
      if (contextToDestroy) {
        contextToDestroy.destroy();
      }
    };
  }, [loadModules]);

  const compileCurrentGraph = useCallback(() => {
    if (!editorRef.current) {
      return null;
    }

    setIsCompiling(true);
    try {
      const { editor } = editorRef.current;
      const graph = reteToGraph(editor, {
        moduleName: topModuleName.trim() || DEFAULT_TOP_MODULE,
        moduleSignatures: getRegisteredModuleSignatures()
      });

      const result = compileGraph(graph);
      setDiagnostics(result.diagnostics);
      setGeneratedCode(result.success ? result.verilog : "");
      setGraphStats({
        nodes: result.graph.nodes.length,
        edges: result.graph.edges.length
      });
      setStatusMessage(
        result.success
          ? `Compile succeeded (${result.graph.nodes.length} nodes, ${result.graph.edges.length} edges).`
          : "Compile failed. Check diagnostics."
      );
      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to compile graph.";
      setGeneratedCode("");
      setDiagnostics([
        {
          severity: "error",
          code: "GRAPH_ADAPTER_FAILURE",
          message
        }
      ]);
      setStatusMessage("Compile failed due to adapter error.");
      return null;
    } finally {
      setIsCompiling(false);
    }
  }, [topModuleName]);

  const handleGenerate = () => {
    compileCurrentGraph();
  };

  const handleScanModules = async () => {
    await loadModules(scanDirectory);
  };

  const pickFolder = useCallback(
    async (initialPath: string): Promise<string | null> => {
      try {
        const selected = await openDialog({
          directory: true,
          multiple: false,
          defaultPath: initialPath.trim() || undefined
        });
        return typeof selected === "string" && selected.trim()
          ? selected.trim()
          : null;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to open folder picker.";
        setLoadingError(message);
        setStatusMessage("Folder picker failed.");
        return null;
      }
    },
    []
  );

  const handlePickProjectFolder = useCallback(async () => {
    const selectedPath = await pickFolder(projectPath);
    if (!selectedPath) {
      return;
    }
    setProjectPath(selectedPath);
    setLoadingError("");
    setStatusMessage(`Project folder selected: ${selectedPath}`);
    try {
      await openPath(selectedPath);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to open project folder.";
      setLoadingError(message);
      setStatusMessage("Open folder failed.");
    }
  }, [pickFolder, projectPath]);

  const handlePickScanFolder = useCallback(async () => {
    const selectedPath = await pickFolder(scanDirectory);
    if (!selectedPath) {
      return;
    }

    const relativePath = toRelativePathIfInside(projectPath, selectedPath);
    setScanFolderPath(relativePath ?? selectedPath);
    setLoadingError("");
    setStatusMessage(
      `Scan folder selected: ${relativePath ?? selectedPath}`
    );
    try {
      await openPath(selectedPath);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to open scan folder.";
      setLoadingError(message);
      setStatusMessage("Open folder failed.");
    }
  }, [pickFolder, projectPath, scanDirectory]);

  const handleAddNode = useCallback(async (nodeTypeName: string) => {
    if (!editorRef.current) {
      return;
    }

    const NodeClass = getNodeTypeByName(nodeTypeName);
    if (!NodeClass) {
      return;
    }

    const { editor, area } = editorRef.current;
    const node = new NodeClass();
    await editor.addNode(node);
    await area.translate(node.id, {
      x: 80 + Math.random() * 120,
      y: 80 + Math.random() * 120
    });
  }, []);

  const toggleLibraryBranch = useCallback((branch: "builtIn" | "modules") => {
    setLibraryExpanded((prev) => ({
      ...prev,
      [branch]: !prev[branch]
    }));
  }, []);

  const handleRunSimulation = async () => {
    const compileResult = compileCurrentGraph();
    if (!compileResult || !compileResult.success || !compileResult.verilog) {
      setSimulationError("Simulation blocked because compile did not succeed.");
      setSimulationOutput("");
      return;
    }

    setIsSimulating(true);
    setSimulationError("");
    setStatusMessage("Running simulation...");
    try {
      const result = await runVerilogSimulation({
        verilogCode: compileResult.verilog,
        testbenchCode: testbenchCode.trim() ? testbenchCode : undefined,
        topModule: topModuleName.trim() || DEFAULT_TOP_MODULE
      });

      setSimulationOutput(result.stdout);
      setSimulationWorkDir(result.workDir || "");
      if (!result.success) {
        setSimulationError(result.stderr || "Simulation failed.");
        setStatusMessage("Simulation failed.");
      } else {
        setSimulationError(result.stderr);
        setStatusMessage("Simulation finished.");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to run simulation.";
      setSimulationError(message);
      setSimulationOutput("");
      setSimulationWorkDir("");
      setStatusMessage("Simulation failed to start.");
    } finally {
      setIsSimulating(false);
    }
  };

  const handleSaveGraph = useCallback(() => {
    if (!editorRef.current) {
      return;
    }

    const { editor, area } = editorRef.current;
    const saved = serializeEditorGraph(editor, area, {
      moduleName: topModuleName.trim() || DEFAULT_TOP_MODULE,
      moduleSignatures: getRegisteredModuleSignatures(),
      projectSetup: {
        projectPath: projectPath.trim(),
        scanFolderPath: scanFolderPath.trim(),
        topModuleName: topModuleName.trim() || DEFAULT_TOP_MODULE
      }
    });

    const blob = new Blob([JSON.stringify(saved, null, 2)], {
      type: "application/json"
    });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeModuleName = (saved.moduleName || "graph")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .replace(/^_+/, "") || "graph";
    link.href = objectUrl;
    link.download = `${safeModuleName}.flowgraph.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);

    setStatusMessage(
      `Graph saved (${saved.nodes.length} nodes, ${saved.connections.length} connections).`
    );
  }, [projectPath, scanFolderPath, topModuleName]);

  const handleRequestLoadGraph = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleLoadGraphFile = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !editorRef.current) {
        return;
      }

      setLoadingError("");
      try {
        const rawText = await file.text();
        const parsed = JSON.parse(rawText) as unknown;
        if (!isSavedGraphDocument(parsed)) {
          throw new Error("Invalid graph file format.");
        }

        if (parsed.projectSetup?.projectPath) {
          setProjectPath(parsed.projectSetup.projectPath);
        }
        if (parsed.projectSetup?.scanFolderPath) {
          setScanFolderPath(parsed.projectSetup.scanFolderPath);
        }

        replaceModuleNodeTypes(parsed.moduleSignatures ?? []);
        setNodeTypeNames(listNodeTypeNames());
        setTopModuleName(
          parsed.projectSetup?.topModuleName ||
            parsed.moduleName ||
            DEFAULT_TOP_MODULE
        );

        const { editor, area } = editorRef.current;
        const restoreResult = await restoreEditorGraph(
          editor,
          area,
          NodeTypes,
          parsed
        );

        AreaExtensions.zoomAt(area, editor.getNodes());
        setGeneratedCode("");
        setDiagnostics([]);
        setSimulationOutput("");
        setSimulationError("");
        setSimulationWorkDir("");
        setGraphStats({
          nodes: restoreResult.restoredNodes,
          edges: restoreResult.restoredConnections
        });

        if (restoreResult.warnings.length > 0) {
          setLoadingError(restoreResult.warnings.join(" "));
          setStatusMessage(
            `Graph loaded with ${restoreResult.warnings.length} warnings.`
          );
        } else {
          setStatusMessage(
            `Graph loaded (${restoreResult.restoredNodes} nodes, ${restoreResult.restoredConnections} connections).`
          );
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load graph file.";
        setLoadingError(message);
        setStatusMessage("Load graph failed.");
      } finally {
        event.target.value = "";
      }
    },
    []
  );

  const hasErrors = diagnostics.some(
    (diagnostic) => diagnostic.severity === "error"
  );
  const builtinNodeTypes = nodeTypeNames.filter((name) =>
    BUILTIN_NODE_TYPE_NAMES.includes(name as (typeof BUILTIN_NODE_TYPE_NAMES)[number])
  );
  const moduleNodeTypes = nodeTypeNames.filter(
    (name) => !builtinNodeTypes.includes(name)
  );

  return (
    <AppView
      containerRef={containerRef}
      fileInputRef={fileInputRef}
      statusMessage={statusMessage}
      scanDirectory={scanDirectory}
      graphStats={graphStats}
      isBootstrapping={isBootstrapping}
      isCompiling={isCompiling}
      isSimulating={isSimulating}
      isScanningModules={isScanningModules}
      projectPath={projectPath}
      scanFolderPath={scanFolderPath}
      topModuleName={topModuleName}
      loadingError={loadingError}
      libraryExpanded={libraryExpanded}
      builtinNodeTypes={builtinNodeTypes}
      moduleNodeTypes={moduleNodeTypes}
      diagnostics={diagnostics}
      hasErrors={hasErrors}
      generatedCode={generatedCode}
      testbenchCode={testbenchCode}
      simulationOutput={simulationOutput}
      simulationError={simulationError}
      simulationWorkDir={simulationWorkDir}
      onSaveGraph={handleSaveGraph}
      onRequestLoadGraph={handleRequestLoadGraph}
      onCompile={handleGenerate}
      onRunSimulation={() => {
        void handleRunSimulation();
      }}
      onLoadGraphFile={(event) => {
        void handleLoadGraphFile(event);
      }}
      onProjectPathChange={setProjectPath}
      onScanFolderPathChange={setScanFolderPath}
      onTopModuleNameChange={setTopModuleName}
      onPickProjectFolder={() => {
        void handlePickProjectFolder();
      }}
      onPickScanFolder={() => {
        void handlePickScanFolder();
      }}
      onScanModules={() => {
        void handleScanModules();
      }}
      onToggleLibraryBranch={toggleLibraryBranch}
      onAddNode={(nodeTypeName) => {
        void handleAddNode(nodeTypeName);
      }}
      onTestbenchCodeChange={setTestbenchCode}
    />
  );
}

export default App;
