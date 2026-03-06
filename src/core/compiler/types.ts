import type { Diagnostic } from '../diagnostics/types';
import type { GraphDocument } from '../graph/types';

export interface CompileResult {
  success: boolean;
  verilog: string;
  diagnostics: Diagnostic[];
  graph: GraphDocument;
}

export type NetMap = Record<string, string>;
