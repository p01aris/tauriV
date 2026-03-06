import type { GraphDocument } from '../../graph/types';
import type { NetMap } from '../types';
import { makePortKey, sanitizeIdentifier } from '../utils';

export function allocateNets(graph: GraphDocument): NetMap {
  const netMap: NetMap = {};

  graph.nodes.forEach((node) => {
    if (node.kind === 'input') {
      const signalName = sanitizeIdentifier(node.name, `in_${node.id}`);
      netMap[makePortKey(node.id, node.outputPort)] = signalName;
      return;
    }

    if (node.kind === 'and' || node.kind === 'or') {
      const instance = sanitizeIdentifier(node.instanceName, `inst_${node.id}`);
      netMap[makePortKey(node.id, node.outputPort)] = `w_${instance}_${node.outputPort}`;
      return;
    }

    if (node.kind === 'module') {
      const instance = sanitizeIdentifier(node.instanceName, `inst_${node.id}`);
      node.outputs.forEach((port) => {
        netMap[makePortKey(node.id, port.name)] = `w_${instance}_${port.name}`;
      });
    }
  });

  return netMap;
}
