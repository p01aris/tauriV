import { invoke } from '@tauri-apps/api/core';
import { parseVerilogSourceMap } from '../core/registry/parseVerilogSignature';
import type { ModuleSignature } from '../core/registry/types';

export interface RunSimulationRequest {
  verilogCode: string;
  testbenchCode?: string;
  topModule?: string;
}

export interface SimulationResult {
  success: boolean;
  stdout: string;
  stderr: string;
  workDir?: string;
}

const bundledVerilogSources = import.meta.glob('../verilog_module/*.v', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>;

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export async function scanVerilogModules(
  directory = 'src/verilog_module'
): Promise<ModuleSignature[]> {
  if (isTauriRuntime()) {
    try {
      const signatures = await invoke<ModuleSignature[]>('scan_verilog_modules', {
        directory
      });
      return signatures.sort((a, b) => a.moduleName.localeCompare(b.moduleName));
    } catch (error) {
      console.warn('Failed to scan Verilog modules via Tauri command, fallback to bundled modules.', error);
    }
  }

  return parseVerilogSourceMap(bundledVerilogSources);
}

export async function runVerilogSimulation(
  request: RunSimulationRequest
): Promise<SimulationResult> {
  if (!isTauriRuntime()) {
    return {
      success: false,
      stdout: '',
      stderr: 'Simulation is only available in the Tauri desktop runtime.'
    };
  }

  return invoke<SimulationResult>('run_verilog_simulation', { request });
}
