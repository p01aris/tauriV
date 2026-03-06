import type { Diagnostic } from '../../diagnostics/types';
import type { GraphDocument } from '../../graph/types';
import type { ModuleSignature } from '../../registry/types';

export function resolveModules(
  graph: GraphDocument,
  diagnostics: Diagnostic[]
): Map<string, ModuleSignature> {
  const moduleMap = new Map<string, ModuleSignature>();

  graph.moduleSignatures.forEach((signature) => {
    const existing = moduleMap.get(signature.moduleName);
    if (existing) {
      diagnostics.push({
        severity: 'warning',
        code: 'DUPLICATE_MODULE_SIGNATURE',
        message: `Duplicate module signature "${signature.moduleName}" detected. Using the latest entry.`
      });
    }
    moduleMap.set(signature.moduleName, signature);
  });

  graph.nodes.forEach((node) => {
    if (node.kind !== 'module') {
      return;
    }

    const signature = moduleMap.get(node.moduleName);
    if (!signature) {
      diagnostics.push({
        severity: 'error',
        code: 'MODULE_SIGNATURE_NOT_FOUND',
        message: `Module signature "${node.moduleName}" was not found.`,
        nodeId: node.id
      });
      return;
    }

    const signatureInputs = signature.ports
      .filter((port) => port.direction === 'input')
      .map((port) => port.name);
    const signatureOutputs = signature.ports
      .filter((port) => port.direction === 'output')
      .map((port) => port.name);

    node.inputs.forEach((port) => {
      if (!signatureInputs.includes(port.name)) {
        diagnostics.push({
          severity: 'error',
          code: 'UNKNOWN_MODULE_INPUT_PORT',
          message: `Input port "${port.name}" is not defined on module "${node.moduleName}".`,
          nodeId: node.id,
          portName: port.name
        });
      }
    });

    node.outputs.forEach((port) => {
      if (!signatureOutputs.includes(port.name)) {
        diagnostics.push({
          severity: 'error',
          code: 'UNKNOWN_MODULE_OUTPUT_PORT',
          message: `Output port "${port.name}" is not defined on module "${node.moduleName}".`,
          nodeId: node.id,
          portName: port.name
        });
      }
    });
  });

  return moduleMap;
}
