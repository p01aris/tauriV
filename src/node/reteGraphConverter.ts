import type { GraphNode } from '../core/graph/types';

export interface ReteNodeReadHelpers {
  readNumberControl(node: any, controlName: string, fallback: number): number;
  readTextControl(node: any, controlName: string, fallback: string): string;
}

export interface ReteNodeGraphConverter {
  toGraphNode(node: any, helpers: ReteNodeReadHelpers): GraphNode | null;
}

export interface NodeBaseInfo {
  id: string;
  label: string;
  instanceName: string;
}

export function getNodeBaseInfo(node: any): NodeBaseInfo {
  const id = String(node.id);
  return {
    id,
    label: String(node.label ?? node.id),
    instanceName: String(node.varName ?? node.label ?? node.id)
  };
}
