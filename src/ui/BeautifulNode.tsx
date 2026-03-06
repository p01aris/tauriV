import type React from "react";
import { Presets as ReactPresets } from "rete-react-plugin";

const RefControl = ReactPresets.classic.RefControl;
const RefSocket = ReactPresets.classic.RefSocket;

function sortByIndex(entries: [string, any][]): [string, any][] {
  return [...entries].sort(([, a], [, b]) => {
    const left = Number(a?.index ?? 0);
    const right = Number(b?.index ?? 0);
    return left - right;
  });
}

function getNumberControlValue(data: any, key: string, fallback: number): number {
  const raw = Number(data?.controls?.[key]?.value);
  if (!Number.isFinite(raw) || raw < 1) {
    return fallback;
  }
  return Math.floor(raw);
}

function getPortWidth(data: any, side: "input" | "output", portKey: string): number {
  if (data?.nodeKind === "module") {
    const ports = side === "input" ? data?.verilogInputs : data?.verilogOutputs;
    const match = Array.isArray(ports)
      ? ports.find((port: any) => String(port?.name) === portKey)
      : null;
    const width = Number(match?.width);
    if (Number.isFinite(width) && width > 0) {
      return Math.floor(width);
    }
  }

  if (
    data?.nodeKind === "input" ||
    data?.nodeKind === "output" ||
    data?.nodeKind === "and" ||
    data?.nodeKind === "or"
  ) {
    return getNumberControlValue(data, "width", 1);
  }

  return 1;
}

function formatBitWidth(width: number): string {
  return `${width}b`;
}

export function BeautifulNode(props: {
  data: any;
  emit: (payload: any) => void;
}): React.JSX.Element {
  const { data, emit } = props;
  const inputs = sortByIndex(Object.entries(data.inputs ?? {}));
  const outputs = sortByIndex(Object.entries(data.outputs ?? {}));
  const controls = sortByIndex(Object.entries(data.controls ?? {}));

  return (
    <div
      className={`beautiful-node ${data.selected ? "is-selected" : ""}`}
      style={{
        width: Number.isFinite(data.width) ? `${data.width}px` : undefined,
        height: Number.isFinite(data.height) ? `${data.height}px` : undefined
      }}
      data-testid="node"
    >
      <div className="beautiful-node-title" data-testid="title">
        {data.label}
      </div>

      {outputs.length > 0 && (
        <div className="beautiful-node-section">
          {outputs.map(([key, output]) => {
            if (!output) return null;
            const width = getPortWidth(data, "output", key);
            return (
              <div className="beautiful-port-row output" key={key}>
                <span className="beautiful-port-label">{output.label}</span>
                <div className="beautiful-port-end output">
                  <span className="beautiful-width-badge">
                    {formatBitWidth(width)}
                  </span>
                  <RefSocket
                    name="beautiful-socket output-socket"
                    side="output"
                    socketKey={key}
                    nodeId={data.id}
                    emit={emit}
                    payload={output.socket}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {controls.length > 0 && (
        <div className="beautiful-node-section beautiful-controls">
          {controls.map(([key, control]) =>
            control ? (
              <RefControl
                key={key}
                name="beautiful-control"
                emit={emit}
                payload={control}
              />
            ) : null
          )}
        </div>
      )}

      {inputs.length > 0 && (
        <div className="beautiful-node-section">
          {inputs.map(([key, input]) => {
            if (!input) return null;
            const width = getPortWidth(data, "input", key);
            return (
              <div className="beautiful-port-row input" key={key}>
                <div className="beautiful-port-end input">
                  <RefSocket
                    name="beautiful-socket input-socket"
                    side="input"
                    socketKey={key}
                    nodeId={data.id}
                    emit={emit}
                    payload={input.socket}
                  />
                  <span className="beautiful-width-badge">
                    {formatBitWidth(width)}
                  </span>
                </div>
                {input.control && input.showControl ? (
                  <RefControl
                    name="beautiful-inline-control"
                    emit={emit}
                    payload={input.control}
                  />
                ) : (
                  <span className="beautiful-port-label">{input.label}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
