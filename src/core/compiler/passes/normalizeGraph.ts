import type { GraphDocument } from '../../graph/types';

export function normalizeGraph(graph: GraphDocument): GraphDocument {
  const normalizedNodes = [...graph.nodes]
    .map((node) => ({ ...node }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const normalizedEdges = [...graph.edges]
    .map((edge, index) => ({
      ...edge,
      id: edge.id || `edge_${index}`
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const normalizedModuleSignatures = [...graph.moduleSignatures].sort((a, b) =>
    a.moduleName.localeCompare(b.moduleName)
  );

  return {
    moduleName: graph.moduleName || 'TopLevelModule',
    nodes: normalizedNodes,
    edges: normalizedEdges,
    moduleSignatures: normalizedModuleSignatures
  };
}
