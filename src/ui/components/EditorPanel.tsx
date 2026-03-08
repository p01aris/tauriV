import type React from "react";

interface EditorPanelProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  isBootstrapping: boolean;
}

export function EditorPanel(props: EditorPanelProps): React.JSX.Element {
  const { containerRef, isBootstrapping } = props;

  return (
    <section className="panel panel-center">
      <div className="panel-title-row">
        <h2 className="panel-title">Graph Editor</h2>
        <span className="panel-meta">
          Right panel shows compiled Verilog and simulation logs.
        </span>
      </div>
      <div
        className={`editor-surface ${isBootstrapping ? "editor-loading" : ""}`}
        ref={containerRef}
      />
    </section>
  );
}
