import type React from "react";
import type { Diagnostic } from "../../core/diagnostics/types";

interface RightSidebarProps {
  diagnostics: Diagnostic[];
  hasErrors: boolean;
  generatedCode: string;
  testbenchCode: string;
  simulationOutput: string;
  simulationError: string;
  simulationWorkDir: string;
  onTestbenchCodeChange: (value: string) => void;
}

export function RightSidebar(props: RightSidebarProps): React.JSX.Element {
  const {
    diagnostics,
    hasErrors,
    generatedCode,
    testbenchCode,
    simulationOutput,
    simulationError,
    simulationWorkDir,
    onTestbenchCodeChange
  } = props;

  return (
    <aside className="panel panel-right">
      <div className="panel-group">
        <h2 className="panel-title">Diagnostics ({diagnostics.length})</h2>
        <div className="diagnostic-list">
          {diagnostics.length === 0 && <p className="panel-meta">No diagnostics.</p>}
          {diagnostics.map((diagnostic, index) => (
            <div
              key={`${diagnostic.code}-${index}`}
              className={`diagnostic-item ${
                diagnostic.severity === "error"
                  ? "diagnostic-error"
                  : "diagnostic-warning"
              }`}
            >
              <div className="diagnostic-code">{diagnostic.code}</div>
              <div>{diagnostic.message}</div>
            </div>
          ))}
          {hasErrors && (
            <div className="diagnostic-hint">
              Compile output is hidden while errors exist.
            </div>
          )}
        </div>
      </div>

      <div className="panel-group">
        <h2 className="panel-title">Generated Verilog</h2>
        <pre className="code-box generated-verilog-box">
          <code>{generatedCode || "// Compile graph to see generated Verilog"}</code>
        </pre>
      </div>

      <div className="panel-group">
        <h2 className="panel-title">Testbench</h2>
        <textarea
          className="code-input"
          value={testbenchCode}
          onChange={(event) => onTestbenchCodeChange(event.target.value)}
          spellCheck={false}
        />
      </div>

      <div className="panel-group">
        <h2 className="panel-title">Simulation Output</h2>
        <pre className="code-box">
          <code>{simulationOutput || "// Run simulation to see output"}</code>
        </pre>
        {simulationError && (
          <pre className="code-box code-error">
            <code>{simulationError}</code>
          </pre>
        )}
        {simulationWorkDir && (
          <p className="panel-meta">
            Workdir: <code>{simulationWorkDir}</code>
          </p>
        )}
      </div>
    </aside>
  );
}
