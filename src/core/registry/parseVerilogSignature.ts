import type { ModuleSignature, PortSignature } from './types';

const MODULE_PATTERN = /\bmodule\s+([a-zA-Z_][a-zA-Z0-9_]*)/;
const PORT_PATTERN =
  /^\s*(input|output)\s+(?:wire\s+|reg\s+|logic\s+)?(signed\s+)?(?:\[(\d+)\s*:\s*(\d+)\]\s+)?([a-zA-Z_][a-zA-Z0-9_]*)/;

function normalizeWidth(width: number): number {
  if (!Number.isFinite(width) || width < 1) {
    return 1;
  }
  return Math.floor(width);
}

function parsePortLine(line: string): PortSignature | null {
  const withoutComment = line.split('//')[0];
  if (!withoutComment.trim()) {
    return null;
  }

  const match = withoutComment.match(PORT_PATTERN);
  if (!match) {
    return null;
  }

  const direction = match[1] as PortSignature['direction'];
  const signed = Boolean(match[2]);
  const msb = match[3] ? Number.parseInt(match[3], 10) : 0;
  const lsb = match[4] ? Number.parseInt(match[4], 10) : 0;
  const width = normalizeWidth(Math.abs(msb - lsb) + 1);
  const name = match[5];

  return {
    name,
    direction,
    width,
    signed
  };
}

export function parseVerilogSignature(
  rawContent: string,
  sourcePath?: string
): ModuleSignature | null {
  const moduleMatch = rawContent.match(MODULE_PATTERN);
  if (!moduleMatch) {
    return null;
  }

  const moduleName = moduleMatch[1];
  const ports: PortSignature[] = [];

  rawContent.split('\n').forEach((line) => {
    const port = parsePortLine(line);
    if (port) {
      ports.push(port);
    }
  });

  return {
    moduleName,
    sourcePath,
    ports
  };
}

export function parseVerilogSourceMap(
  sourceMap: Record<string, string>
): ModuleSignature[] {
  return Object.entries(sourceMap)
    .map(([sourcePath, rawContent]) => parseVerilogSignature(rawContent, sourcePath))
    .filter((signature): signature is ModuleSignature => signature !== null)
    .sort((a, b) => a.moduleName.localeCompare(b.moduleName));
}
