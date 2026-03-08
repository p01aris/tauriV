import type { ModuleSignature } from '../registry/types';

export type GraphNodeKind =
  | 'input'
  | 'output'
  | 'and'
  | 'or'
  | 'concat'
  | 'divide'
  | 'module';

export interface GraphPort {
  name: string;
  width: number;
  signed: boolean;
}

interface BaseGraphNode {
  id: string;
  kind: GraphNodeKind;
  label: string;
  instanceName: string;
}

export interface InputGraphNode extends BaseGraphNode {
  kind: 'input';
  name: string;
  width: number;
  outputPort: string;
}

export interface OutputGraphNode extends BaseGraphNode {
  kind: 'output';
  name: string;
  width: number;
  inputPort: string;
}

export interface GateGraphNode extends BaseGraphNode {
  kind: 'and' | 'or';
  width: number;
  inputPorts: [string, string];
  outputPort: string;
}

export interface ConcatGraphNode extends BaseGraphNode {
  kind: 'concat';
  leftWidth: number;
  rightWidth: number;
  inputPorts: ['a', 'b'];
  outputPort: 'y';
}

export interface DivideGraphNode extends BaseGraphNode {
  kind: 'divide';
  highWidth: number;
  lowWidth: number;
  inputPort: 'in';
  outputPorts: ['hi', 'lo'];
}

export interface ModuleGraphNode extends BaseGraphNode {
  kind: 'module';
  moduleName: string;
  inputs: GraphPort[];
  outputs: GraphPort[];
}

export type GraphNode =
  | InputGraphNode
  | OutputGraphNode
  | GateGraphNode
  | ConcatGraphNode
  | DivideGraphNode
  | ModuleGraphNode;

export interface GraphEdge {
  id: string;
  sourceNodeId: string;
  sourcePort: string;
  targetNodeId: string;
  targetPort: string;
}

export interface GraphDocument {
  moduleName: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  moduleSignatures: ModuleSignature[];
}
