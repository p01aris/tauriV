import type { GraphDocument, GraphNode } from '../../graph/types';
import type { NetMap } from '../types';
import { formatWidth, makePortKey, sanitizeIdentifier } from '../utils';

function getNodeOutputPorts(node: GraphNode): string[] {
  if (node.kind === 'input') {
    return [node.outputPort];
  }
  if (node.kind === 'and' || node.kind === 'or' || node.kind === 'concat') {
    return [node.outputPort];
  }
  if (node.kind === 'divide') {
    return [...node.outputPorts];
  }
  if (node.kind === 'module') {
    return node.outputs.map((port) => port.name);
  }
  return [];
}

function zeroLiteral(width: number): string {
  const normalized = Number.isFinite(width) && width > 1 ? Math.floor(width) : 1;
  return `${normalized}'b0`;
}

export function emitVerilog(graph: GraphDocument, netMap: NetMap): string {
  const inputs = graph.nodes.filter((node) => node.kind === 'input');
  const outputs = graph.nodes.filter((node) => node.kind === 'output');

  const inputDecls = inputs.map(
    (node) => `  input wire ${formatWidth(node.width)}${sanitizeIdentifier(node.name, `in_${node.id}`)}`
  );
  const outputDecls = outputs.map(
    (node) => `  output wire ${formatWidth(node.width)}${sanitizeIdentifier(node.name, `out_${node.id}`)}`
  );
  const ports = [...inputDecls, ...outputDecls].join(',\n');

  const wireDeclSet = new Set<string>();
  graph.nodes.forEach((node) => {
    getNodeOutputPorts(node).forEach((portName) => {
      if (node.kind === 'input') {
        return;
      }
      const signal = netMap[makePortKey(node.id, portName)];
      if (!signal) {
        return;
      }

      let width = 1;
      if (node.kind === 'and' || node.kind === 'or') {
        width = node.width;
      } else if (node.kind === 'concat') {
        width = node.leftWidth + node.rightWidth;
      } else if (node.kind === 'divide') {
        width = portName === node.outputPorts[0] ? node.highWidth : node.lowWidth;
      } else if (node.kind === 'module') {
        const port = node.outputs.find((item) => item.name === portName);
        width = port?.width ?? 1;
      }

      wireDeclSet.add(`wire ${formatWidth(width)}${signal};`);
    });
  });
  const wireDecls = Array.from(wireDeclSet).sort();

  const edgeByTarget = new Map<string, { sourceNodeId: string; sourcePort: string }>();
  graph.edges.forEach((edge) => {
    edgeByTarget.set(makePortKey(edge.targetNodeId, edge.targetPort), {
      sourceNodeId: edge.sourceNodeId,
      sourcePort: edge.sourcePort
    });
  });

  const getInputSignal = (nodeId: string, portName: string, expectedWidth = 1): string => {
    const source = edgeByTarget.get(makePortKey(nodeId, portName));
    if (!source) {
      return zeroLiteral(expectedWidth);
    }

    const signal = netMap[makePortKey(source.sourceNodeId, source.sourcePort)];
    return signal ?? zeroLiteral(expectedWidth);
  };

  const assignments: string[] = [];
  graph.nodes.forEach((node) => {
    if (node.kind === 'and') {
      const a = getInputSignal(node.id, node.inputPorts[0], node.width);
      const b = getInputSignal(node.id, node.inputPorts[1], node.width);
      const y = netMap[makePortKey(node.id, node.outputPort)];
      assignments.push(`assign ${y} = ${a} & ${b};`);
      return;
    }

    if (node.kind === 'or') {
      const a = getInputSignal(node.id, node.inputPorts[0], node.width);
      const b = getInputSignal(node.id, node.inputPorts[1], node.width);
      const y = netMap[makePortKey(node.id, node.outputPort)];
      assignments.push(`assign ${y} = ${a} | ${b};`);
      return;
    }

    if (node.kind === 'concat') {
      const a = getInputSignal(node.id, node.inputPorts[0], node.leftWidth);
      const b = getInputSignal(node.id, node.inputPorts[1], node.rightWidth);
      const y = netMap[makePortKey(node.id, node.outputPort)];
      assignments.push(`assign ${y} = {${a}, ${b}};`);
      return;
    }

    if (node.kind === 'divide') {
      const sourceWidth = node.highWidth + node.lowWidth;
      const input = getInputSignal(node.id, node.inputPort, sourceWidth);
      const highPort = node.outputPorts[0];
      const lowPort = node.outputPorts[1];
      const highSignal = netMap[makePortKey(node.id, highPort)];
      const lowSignal = netMap[makePortKey(node.id, lowPort)];
      const highMsb = sourceWidth - 1;
      const highLsb = node.lowWidth;
      const lowMsb = node.lowWidth - 1;
      assignments.push(`assign ${highSignal} = ${input}[${highMsb}:${highLsb}];`);
      assignments.push(`assign ${lowSignal} = ${input}[${lowMsb}:0];`);
      return;
    }

    if (node.kind === 'output') {
      const source = getInputSignal(node.id, node.inputPort, node.width);
      const outputName = sanitizeIdentifier(node.name, `out_${node.id}`);
      assignments.push(`assign ${outputName} = ${source};`);
      return;
    }

    if (node.kind === 'module') {
      const params: string[] = [];

      node.inputs.forEach((port) => {
        const source = getInputSignal(node.id, port.name, port.width);
        params.push(`.${port.name}(${source})`);
      });

      node.outputs.forEach((port) => {
        const signal = netMap[makePortKey(node.id, port.name)];
        params.push(`.${port.name}(${signal})`);
      });

      assignments.push(`${node.moduleName} ${sanitizeIdentifier(node.instanceName, `inst_${node.id}`)} (`);
      assignments.push(`  ${params.join(',\n  ')}`);
      assignments.push(`);`);
    }
  });

  return [
    `module ${sanitizeIdentifier(graph.moduleName, 'TopLevelModule')}(`,
    ports,
    `);\n`,
    wireDecls.map((line) => `  ${line}`).join('\n'),
    `\n`,
    assignments.map((line) => `  ${line}`).join('\n'),
    `\nendmodule`
  ].join('\n');
}
