import { ClassicPreset } from "rete";
import type { ModuleSignature } from "../registry/types";

export interface SavedGraphNode {
  id: string;
  nodeTypeName: string;
  label: string;
  varName?: string;
  position: {
    x: number;
    y: number;
  };
  controls: Record<string, string | number | boolean | null>;
}

export interface SavedGraphConnection {
  sourceNodeId: string;
  sourceOutput: string;
  targetNodeId: string;
  targetInput: string;
}

export interface SavedProjectSetup {
  projectPath: string;
  scanFolderPath: string;
  topModuleName: string;
}

export interface SavedGraphDocument {
  version: 1 | 2;
  moduleName: string;
  moduleSignatures: ModuleSignature[];
  nodes: SavedGraphNode[];
  connections: SavedGraphConnection[];
  createdAt: string;
  projectSetup?: SavedProjectSetup;
}

export interface RestoreGraphResult {
  restoredNodes: number;
  restoredConnections: number;
  warnings: string[];
}

function normalizeNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return parsed;
}

function nodeTypeFromNode(node: any): string {
  if (node.nodeKind === "input") return "InputNode";
  if (node.nodeKind === "output") return "OutputNode";
  if (node.nodeKind === "and") return "AndGateNode";
  if (node.nodeKind === "or") return "OrGateNode";
  if (node.nodeKind === "concat") return "ConcatNode";
  if (node.nodeKind === "divide") return "DivideNode";
  if (node.nodeKind === "module" && node.verilogModuleName) {
    return `${String(node.verilogModuleName)}Node`;
  }
  return String(node.constructor?.name || "UnknownNode");
}

function normalizeControlValue(
  value: unknown
): string | number | boolean | null {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  return null;
}

export function serializeEditorGraph(
  editor: any,
  area: any,
  options: {
    moduleName: string;
    moduleSignatures: ModuleSignature[];
    projectSetup?: SavedProjectSetup;
  }
): SavedGraphDocument {
  const nodes = editor
    .getNodes()
    .map((node: any) => {
      const nodeView = area?.nodeViews?.get(String(node.id));
      const controls = Object.fromEntries(
        Object.entries(node.controls ?? {}).map(([controlName, control]) => {
          const rawValue = (control as any)?.value;
          return [controlName, normalizeControlValue(rawValue)];
        })
      );

      return {
        id: String(node.id),
        nodeTypeName: nodeTypeFromNode(node),
        label: String(node.label ?? ""),
        varName:
          typeof node.varName === "string" ? (node.varName as string) : undefined,
        position: {
          x: normalizeNumber(nodeView?.position?.x, 0),
          y: normalizeNumber(nodeView?.position?.y, 0)
        },
        controls
      } satisfies SavedGraphNode;
    })
    .sort((a: SavedGraphNode, b: SavedGraphNode) =>
      a.id.localeCompare(b.id)
    );

  const connections = editor
    .getConnections()
    .map((connection: any) => ({
      sourceNodeId: String(connection.source),
      sourceOutput: String(connection.sourceOutput),
      targetNodeId: String(connection.target),
      targetInput: String(connection.targetInput)
    }))
    .sort((a: SavedGraphConnection, b: SavedGraphConnection) => {
      const source = `${a.sourceNodeId}:${a.sourceOutput}`;
      const target = `${a.targetNodeId}:${a.targetInput}`;
      const sourceB = `${b.sourceNodeId}:${b.sourceOutput}`;
      const targetB = `${b.targetNodeId}:${b.targetInput}`;
      return `${source}->${target}`.localeCompare(`${sourceB}->${targetB}`);
    });

  return {
    version: 2,
    moduleName: options.moduleName,
    moduleSignatures: options.moduleSignatures,
    nodes,
    connections,
    createdAt: new Date().toISOString(),
    projectSetup: options.projectSetup
  };
}

export async function restoreEditorGraph(
  editor: any,
  area: any,
  nodeTypes: Record<string, any>,
  saved: SavedGraphDocument
): Promise<RestoreGraphResult> {
  const warnings: string[] = [];
  const nodeMap = new Map<string, any>();
  let restoredNodes = 0;
  let restoredConnections = 0;

  await editor.clear();

  for (const nodeData of saved.nodes) {
    const NodeClass = nodeTypes[nodeData.nodeTypeName];
    if (!NodeClass) {
      warnings.push(`Node type "${nodeData.nodeTypeName}" is not available.`);
      continue;
    }

    const node = new NodeClass();
    if (typeof nodeData.label === "string" && nodeData.label) {
      node.label = nodeData.label;
    }
    if (typeof nodeData.varName === "string" && "varName" in node) {
      node.varName = nodeData.varName;
    }

    Object.entries(nodeData.controls ?? {}).forEach(([key, value]) => {
      const control = (node.controls ?? {})[key] as any;
      if (!control || typeof control.setValue !== "function") {
        return;
      }
      control.setValue(value as any);
    });

    await editor.addNode(node);
    await area.translate(node.id, {
      x: normalizeNumber(nodeData.position?.x, 0),
      y: normalizeNumber(nodeData.position?.y, 0)
    });
    nodeMap.set(nodeData.id, node);
    restoredNodes += 1;
  }

  for (const connectionData of saved.connections) {
    const sourceNode = nodeMap.get(connectionData.sourceNodeId);
    const targetNode = nodeMap.get(connectionData.targetNodeId);
    if (!sourceNode || !targetNode) {
      warnings.push(
        `Skipped connection ${connectionData.sourceNodeId}.${connectionData.sourceOutput} -> ${connectionData.targetNodeId}.${connectionData.targetInput}.`
      );
      continue;
    }

    try {
      const connection = new ClassicPreset.Connection(
        sourceNode,
        connectionData.sourceOutput,
        targetNode,
        connectionData.targetInput
      ) as any;
      await editor.addConnection(connection);
      restoredConnections += 1;
    } catch {
      warnings.push(
        `Failed to restore connection ${connectionData.sourceNodeId}.${connectionData.sourceOutput} -> ${connectionData.targetNodeId}.${connectionData.targetInput}.`
      );
    }
  }

  return {
    restoredNodes,
    restoredConnections,
    warnings
  };
}

export function isSavedGraphDocument(
  value: unknown
): value is SavedGraphDocument {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<SavedGraphDocument>;
  return (
    (candidate.version === 1 || candidate.version === 2) &&
    typeof candidate.moduleName === "string" &&
    Array.isArray(candidate.nodes) &&
    Array.isArray(candidate.connections) &&
    Array.isArray(candidate.moduleSignatures)
  );
}
