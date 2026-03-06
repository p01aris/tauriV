export function formatWidth(width: number): string {
  const normalized = Number.isFinite(width) && width > 1 ? Math.floor(width) : 1;
  return normalized > 1 ? `[${normalized - 1}:0] ` : '';
}

export function makePortKey(nodeId: string, portName: string): string {
  return `${nodeId}:${portName}`;
}

export function sanitizeIdentifier(value: string, fallback: string): string {
  const cleaned = value.replace(/[^a-zA-Z0-9_]/g, '_');
  const normalized = cleaned.match(/^[a-zA-Z_]/) ? cleaned : `_${cleaned}`;
  return normalized || fallback;
}
