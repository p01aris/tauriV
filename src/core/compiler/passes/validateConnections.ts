import type { Diagnostic } from '../../diagnostics/types';
import type { GraphDocument, GraphNode } from '../../graph/types';

interface PortInfo {
  direction: 'input' | 'output';
  width: number;
}

function getPortInfo(node: GraphNode, portName: string): PortInfo | null {
  if (node.kind === 'input') {
    if (portName !== node.outputPort) {
      return null;
    }
    return { direction: 'output', width: node.width };
  }

  if (node.kind === 'output') {
    if (portName !== node.inputPort) {
      return null;
    }
    return { direction: 'input', width: node.width };
  }

  if (node.kind === 'and' || node.kind === 'or') {
    if (node.inputPorts.includes(portName as 'a' | 'b')) {
      return { direction: 'input', width: node.width };
    }
    if (portName === node.outputPort) {
      return { direction: 'output', width: node.width };
    }
    return null;
  }

  if (node.kind === 'concat') {
    if (portName === node.inputPorts[0]) {
      return { direction: 'input', width: node.leftWidth };
    }
    if (portName === node.inputPorts[1]) {
      return { direction: 'input', width: node.rightWidth };
    }
    if (portName === node.outputPort) {
      return { direction: 'output', width: node.leftWidth + node.rightWidth };
    }
    return null;
  }

  if (node.kind === 'divide') {
    if (portName === node.inputPort) {
      return { direction: 'input', width: node.highWidth + node.lowWidth };
    }
    if (portName === node.outputPorts[0]) {
      return { direction: 'output', width: node.highWidth };
    }
    if (portName === node.outputPorts[1]) {
      return { direction: 'output', width: node.lowWidth };
    }
    return null;
  }

  if (node.kind !== 'module') {
    return null;
  }

  const inputPort = node.inputs.find((port) => port.name === portName);
  if (inputPort) {
    return { direction: 'input', width: inputPort.width };
  }

  const outputPort = node.outputs.find((port) => port.name === portName);
  if (outputPort) {
    return { direction: 'output', width: outputPort.width };
  }

  return null;
}

export function validateConnections(
  graph: GraphDocument,
  diagnostics: Diagnostic[]
): void {
  const nodeMap = new Map(graph.nodes.map((node) => [node.id, node]));
  const targetInputCount = new Map<string, number>();

  graph.edges.forEach((edge) => {
    const sourceNode = nodeMap.get(edge.sourceNodeId);
    const targetNode = nodeMap.get(edge.targetNodeId);

    if (!sourceNode) {
      diagnostics.push({
        severity: 'error',
        code: 'SOURCE_NODE_NOT_FOUND',
        message: `Source node "${edge.sourceNodeId}" was not found.`,
        edgeId: edge.id
      });
      return;
    }

    if (!targetNode) {
      diagnostics.push({
        severity: 'error',
        code: 'TARGET_NODE_NOT_FOUND',
        message: `Target node "${edge.targetNodeId}" was not found.`,
        edgeId: edge.id
      });
      return;
    }

    const sourcePort = getPortInfo(sourceNode, edge.sourcePort);
    const targetPort = getPortInfo(targetNode, edge.targetPort);

    if (!sourcePort) {
      diagnostics.push({
        severity: 'error',
        code: 'SOURCE_PORT_NOT_FOUND',
        message: `Source port "${edge.sourcePort}" does not exist on node "${edge.sourceNodeId}".`,
        edgeId: edge.id,
        nodeId: edge.sourceNodeId,
        portName: edge.sourcePort
      });
      return;
    }

    if (!targetPort) {
      diagnostics.push({
        severity: 'error',
        code: 'TARGET_PORT_NOT_FOUND',
        message: `Target port "${edge.targetPort}" does not exist on node "${edge.targetNodeId}".`,
        edgeId: edge.id,
        nodeId: edge.targetNodeId,
        portName: edge.targetPort
      });
      return;
    }

    if (sourcePort.direction !== 'output') {
      diagnostics.push({
        severity: 'error',
        code: 'SOURCE_PORT_DIRECTION_INVALID',
        message: `Port "${edge.sourcePort}" on node "${edge.sourceNodeId}" is not an output.`,
        edgeId: edge.id,
        nodeId: edge.sourceNodeId,
        portName: edge.sourcePort
      });
    }

    if (targetPort.direction !== 'input') {
      diagnostics.push({
        severity: 'error',
        code: 'TARGET_PORT_DIRECTION_INVALID',
        message: `Port "${edge.targetPort}" on node "${edge.targetNodeId}" is not an input.`,
        edgeId: edge.id,
        nodeId: edge.targetNodeId,
        portName: edge.targetPort
      });
    }

    if (sourcePort.width !== targetPort.width) {
      diagnostics.push({
        severity: 'error',
        code: 'WIDTH_MISMATCH',
        message: `Width mismatch: ${edge.sourceNodeId}.${edge.sourcePort} (${sourcePort.width}) -> ${edge.targetNodeId}.${edge.targetPort} (${targetPort.width}).`,
        edgeId: edge.id
      });
    }

    const targetKey = `${edge.targetNodeId}:${edge.targetPort}`;
    targetInputCount.set(targetKey, (targetInputCount.get(targetKey) ?? 0) + 1);
  });

  targetInputCount.forEach((count, targetKey) => {
    if (count <= 1) {
      return;
    }

    const [nodeId, portName] = targetKey.split(':');
    diagnostics.push({
      severity: 'error',
      code: 'MULTIPLE_DRIVERS',
      message: `Input "${targetKey}" has multiple drivers.`,
      nodeId,
      portName
    });
  });
}
