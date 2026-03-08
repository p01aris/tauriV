import type React from "react";

interface StatusStripProps {
  statusMessage: string;
  scanDirectory: string;
  graphStats: { nodes: number; edges: number } | null;
}

export function StatusStrip(props: StatusStripProps): React.JSX.Element {
  const { statusMessage, scanDirectory, graphStats } = props;

  return (
    <section className="status-strip">
      <span className="status-item status-primary">{statusMessage}</span>
      <span className="status-item">
        Scan Dir: <code>{scanDirectory}</code>
      </span>
      {graphStats && (
        <span className="status-item">
          Graph: {graphStats.nodes} nodes / {graphStats.edges} edges
        </span>
      )}
    </section>
  );
}
