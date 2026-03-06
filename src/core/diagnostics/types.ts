export type DiagnosticSeverity = 'error' | 'warning';

export interface Diagnostic {
  severity: DiagnosticSeverity;
  code: string;
  message: string;
  nodeId?: string;
  portName?: string;
  edgeId?: string;
}
