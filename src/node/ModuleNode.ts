import type { ModuleGraphNode } from '../core/graph/types';
import { getNodeBaseInfo, type ReteNodeGraphConverter } from './reteGraphConverter';

export const moduleNodeGraphConverter: ReteNodeGraphConverter = {
  toGraphNode(node) {
    if (node.nodeKind !== 'module') {
      return null;
    }

    const { id, label, instanceName } = getNodeBaseInfo(node);
    const inputs =
      node.verilogInputs?.map((port: any) => ({
        name: String(port.name),
        width: Number(port.width) || 1,
        signed: Boolean(port.signed)
      })) ?? [];

    const outputs =
      node.verilogOutputs?.map((port: any) => ({
        name: String(port.name),
        width: Number(port.width) || 1,
        signed: Boolean(port.signed)
      })) ?? [];

    return {
      id,
      kind: 'module',
      label,
      instanceName,
      moduleName: String(node.verilogModuleName),
      inputs,
      outputs
    } satisfies ModuleGraphNode;
  }
};
