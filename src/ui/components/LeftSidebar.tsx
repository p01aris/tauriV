import type React from "react";

interface LeftSidebarProps {
  isScanningModules: boolean;
  projectPath: string;
  scanFolderPath: string;
  topModuleName: string;
  loadingError: string;
  libraryExpanded: {
    builtIn: boolean;
    modules: boolean;
  };
  builtinNodeTypes: string[];
  moduleNodeTypes: string[];
  onProjectPathChange: (value: string) => void;
  onScanFolderPathChange: (value: string) => void;
  onTopModuleNameChange: (value: string) => void;
  onPickProjectFolder: () => void;
  onPickScanFolder: () => void;
  onScanModules: () => void;
  onToggleLibraryBranch: (branch: "builtIn" | "modules") => void;
  onAddNode: (nodeTypeName: string) => void;
}

export function LeftSidebar(props: LeftSidebarProps): React.JSX.Element {
  const {
    isScanningModules,
    projectPath,
    scanFolderPath,
    topModuleName,
    loadingError,
    libraryExpanded,
    builtinNodeTypes,
    moduleNodeTypes,
    onProjectPathChange,
    onScanFolderPathChange,
    onTopModuleNameChange,
    onPickProjectFolder,
    onPickScanFolder,
    onScanModules,
    onToggleLibraryBranch,
    onAddNode
  } = props;

  return (
    <aside className="panel panel-left">
      <div className="panel-group">
        <h2 className="panel-title">Project Setup</h2>
        <label className="field">
          <span className="field-label">Project Path</span>
          <div className="field-input-row">
            <input
              className="field-input"
              value={projectPath}
              onChange={(event) => onProjectPathChange(event.target.value)}
              placeholder="/absolute/project/path"
            />
            <button
              className="btn btn-ghost field-inline-btn"
              type="button"
              onClick={onPickProjectFolder}
              title="Pick project folder"
            >
              Browse
            </button>
          </div>
        </label>
        <label className="field">
          <span className="field-label">Verilog Scan Folder</span>
          <div className="field-input-row">
            <input
              className="field-input"
              value={scanFolderPath}
              onChange={(event) => onScanFolderPathChange(event.target.value)}
              placeholder="src/verilog_module"
            />
            <button
              className="btn btn-ghost field-inline-btn"
              type="button"
              onClick={onPickScanFolder}
              title="Pick scan folder"
            >
              Browse
            </button>
          </div>
        </label>
        <label className="field">
          <span className="field-label">Top Module Name</span>
          <input
            className="field-input"
            value={topModuleName}
            onChange={(event) => onTopModuleNameChange(event.target.value)}
            placeholder="TopLevelModule"
          />
        </label>
        <button
          className="btn btn-accent"
          onClick={onScanModules}
          disabled={isScanningModules}
        >
          {isScanningModules ? "Scanning..." : "Scan Modules"}
        </button>
        {loadingError && <p className="text-error">{loadingError}</p>}
      </div>

      <div className="panel-group node-library-group">
        <h2 className="panel-title">Node Library</h2>
        <p className="panel-meta">
          Right-click menu in editor now shows only built-in nodes.
        </p>
        <div className="tree-view">
          <div className="tree-scroll">
            <ul className="tree-root">
              <li className="tree-branch">
                <button
                  className="tree-branch-toggle"
                  onClick={() => onToggleLibraryBranch("builtIn")}
                >
                  <span className="tree-arrow">
                    {libraryExpanded.builtIn ? "▾" : "▸"}
                  </span>
                  <span className="tree-branch-label">
                    Built-in Library ({builtinNodeTypes.length})
                  </span>
                </button>
                {libraryExpanded.builtIn && (
                  <ul className="tree-children">
                    {builtinNodeTypes.map((name) => {
                      const label = name.replace("Node", "");
                      return (
                        <li key={name} className="tree-leaf-wrap">
                          <button
                            className="tree-leaf-btn"
                            onClick={() => onAddNode(name)}
                          >
                            + {label}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>

              <li className="tree-branch">
                <button
                  className="tree-branch-toggle"
                  onClick={() => onToggleLibraryBranch("modules")}
                >
                  <span className="tree-arrow">
                    {libraryExpanded.modules ? "▾" : "▸"}
                  </span>
                  <span className="tree-branch-label">
                    Loaded Modules ({moduleNodeTypes.length})
                  </span>
                </button>
                {libraryExpanded.modules && (
                  <ul className="tree-children">
                    {moduleNodeTypes.length === 0 ? (
                      <li className="tree-empty">No module nodes loaded.</li>
                    ) : (
                      moduleNodeTypes.map((name) => {
                        const label = name.replace("Node", "");
                        return (
                          <li key={name} className="tree-leaf-wrap">
                            <button
                              className="tree-leaf-btn"
                              onClick={() => onAddNode(name)}
                            >
                              + {label}
                            </button>
                          </li>
                        );
                      })
                    )}
                  </ul>
                )}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </aside>
  );
}
