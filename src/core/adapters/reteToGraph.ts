import type { GraphDocument, GraphNode } from '../graph/types';
import type { ModuleSignature } from '../registry/types';
import { andGateNodeGraphConverter } from '../../node/AndGateNode';
import { concatNodeGraphConverter } from '../../node/ConcatNode';
import { divideNodeGraphConverter } from '../../node/DivideNode';
import { inputNodeGraphConverter } from '../../node/InputNode';
import { moduleNodeGraphConverter } from '../../node/ModuleNode';
import { orGateNodeGraphConverter } from '../../node/OrGateNode';
import { outputNodeGraphConverter } from '../../node/OutputNode';
import type {
  ReteNodeGraphConverter,
  ReteNodeReadHelpers
} from '../../node/reteGraphConverter';

interface ReteToGraphOptions {
  moduleName?: string;
  moduleSignatures?: ModuleSignature[];
}

const nodeConverters: ReteNodeGraphConverter[] = [
  inputNodeGraphConverter,
  outputNodeGraphConverter,
  andGateNodeGraphConverter,
  orGateNodeGraphConverter,
  concatNodeGraphConverter,
  divideNodeGraphConverter,
  moduleNodeGraphConverter
];

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

const readHelpers: ReteNodeReadHelpers = {
  readNumberControl,
  readTextControl
};

function nodeToGraphNode(node: any): GraphNode {
  for (const converter of nodeConverters) {
    const converted = converter.toGraphNode(node, readHelpers);
    if (converted) {
      return converted;
    }
  }

  const nodeKind = node.nodeKind as string | undefined;
  const id = String(node.id);
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
