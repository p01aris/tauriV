import type { GraphDocument, GraphNode } from '../graph/types';
import type { ModuleSignature } from '../registry/types';

interface ReteToGraphOptions {
  moduleName?: string;
  moduleSignatures?: ModuleSignature[];
}

function readNumberControl(node: any, controlName: string, fallback: number): number {
  const raw = Number((node.controls?.[controlName] as any)?.value);
  if (!Number.isFinite(raw) || raw < 1) {
    return fallback;
  }
  return Math.floor(raw);
}

function readTextControl(node: any, controlName: string, fallback: string): string {
  const raw = (node.controls?.[controlName] as any)?.value;
  if (typeof raw !== 'string' || !raw.trim()) {
    return fallback;
  }
  return raw.trim();
}

function nodeToGraphNode(node: any): GraphNode {
  const nodeKind = node.nodeKind as string | undefined;
  const id = String(node.id);
  const label = String(node.label ?? node.id);
  const instanceName = String(node.varName ?? node.label ?? node.id);

  if (nodeKind === 'input') {
    const defaultName = node.initialName ?? `in_${id}`;
    return {
      id,
      kind: 'input',
      label,
      instanceName,
      name: readTextControl(node, 'name', defaultName),
      width: readNumberControl(node, 'width', 1),
      outputPort: 'out'
    };
  }

  if (nodeKind === 'output') {
    const defaultName = node.initialName ?? `out_${id}`;
    return {
      id,
      kind: 'output',
      label,
      instanceName,
      name: readTextControl(node, 'name', defaultName),
      width: readNumberControl(node, 'width', 1),
      inputPort: 'in'
    };
  }

  if (nodeKind === 'and' || nodeKind === 'or') {
    return {
      id,
      kind: nodeKind,
      label,
      instanceName,
      width: readNumberControl(node, 'width', 1),
      inputPorts: ['a', 'b'],
      outputPort: 'y'
    };
  }

  if (nodeKind === 'module') {
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
    };
  }

  throw new Error(`Unsupported node kind "${nodeKind ?? 'unknown'}" on node "${id}"`);
}

export function reteToGraph(
  editor: any,
  options: ReteToGraphOptions = {}
): GraphDocument {
  const nodes = editor.getNodes().map((node: any) => nodeToGraphNode(node));
  const edges = editor.getConnections().map((connection: any, index: number) => ({
    id: String(connection.id ?? `edge_${index}`),
    sourceNodeId: String(connection.source),
    sourcePort: String(connection.sourceOutput),
    targetNodeId: String(connection.target),
    targetPort: String(connection.targetInput)
  }));

  return {
    moduleName: options.moduleName ?? 'TopLevelModule',
    nodes,
    edges,
    moduleSignatures: options.moduleSignatures ?? []
  };
}
