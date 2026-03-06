import type { Diagnostic } from '../diagnostics/types';
import type { GraphDocument } from '../graph/types';
import type { CompileResult } from './types';
import { allocateNets } from './passes/allocateNets';
import { emitVerilog } from './passes/emitVerilog';
import { normalizeGraph } from './passes/normalizeGraph';
import { resolveModules } from './passes/resolveModules';
import { validateConnections } from './passes/validateConnections';

export function compileGraph(inputGraph: GraphDocument): CompileResult {
  const diagnostics: Diagnostic[] = [];
  const graph = normalizeGraph(inputGraph);

  resolveModules(graph, diagnostics);
  validateConnections(graph, diagnostics);

  const hasErrors = diagnostics.some((diagnostic) => diagnostic.severity === 'error');
  if (hasErrors) {
    return {
      success: false,
      verilog: '',
      diagnostics,
      graph
    };
  }

  const netMap = allocateNets(graph);
  const verilog = emitVerilog(graph, netMap);

  return {
    success: true,
    verilog,
    diagnostics,
    graph
  };
}
