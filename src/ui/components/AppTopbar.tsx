import type React from "react";

interface AppTopbarProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  isBootstrapping: boolean;
  isCompiling: boolean;
  isSimulating: boolean;
  onSaveGraph: () => void;
  onRequestLoadGraph: () => void;
  onCompile: () => void;
  onRunSimulation: () => void;
  onLoadGraphFile: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function AppTopbar(props: AppTopbarProps): React.JSX.Element {
  const {
    fileInputRef,
    isBootstrapping,
    isCompiling,
    isSimulating,
    onSaveGraph,
    onRequestLoadGraph,
    onCompile,
    onRunSimulation,
    onLoadGraphFile
  } = props;

  return (
    <header className="topbar">
      <div className="topbar-title-wrap">
        <h1 className="topbar-title">Flow Verilog Studio</h1>
        <p className="topbar-subtitle">
          Design Logic Visually, Compile Hardware Reliably.
        </p>
      </div>
      <div className="topbar-actions">
        <button
          className="btn btn-ghost"
          onClick={onSaveGraph}
          disabled={isBootstrapping}
        >
          Save Graph
        </button>
        <button
          className="btn btn-ghost"
          onClick={onRequestLoadGraph}
          disabled={isBootstrapping}
        >
          Load Graph
        </button>
        <button
          className="btn btn-accent"
          onClick={onCompile}
          disabled={isBootstrapping || isCompiling}
        >
          {isCompiling ? "Compiling..." : "Compile Graph"}
        </button>
        <button
          className="btn btn-ghost"
          onClick={onRunSimulation}
          disabled={isBootstrapping || isSimulating}
        >
          {isSimulating ? "Simulating..." : "Run Simulation"}
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.flowgraph.json"
        style={{ display: "none" }}
        onChange={onLoadGraphFile}
      />
    </header>
  );
}
