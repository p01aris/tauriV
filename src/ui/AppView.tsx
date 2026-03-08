import type React from "react";
import type { Diagnostic } from "../core/diagnostics/types";
import { AppTopbar } from "./components/AppTopbar";
import { EditorPanel } from "./components/EditorPanel";
import { LeftSidebar } from "./components/LeftSidebar";
import { RightSidebar } from "./components/RightSidebar";
import { StatusStrip } from "./components/StatusStrip";

interface AppViewProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  statusMessage: string;
  scanDirectory: string;
  graphStats: { nodes: number; edges: number } | null;
  isBootstrapping: boolean;
  isCompiling: boolean;
  isSimulating: boolean;
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
  diagnostics: Diagnostic[];
  hasErrors: boolean;
  generatedCode: string;
  testbenchCode: string;
  simulationOutput: string;
  simulationError: string;
  simulationWorkDir: string;
  onSaveGraph: () => void;
  onRequestLoadGraph: () => void;
  onCompile: () => void;
  onRunSimulation: () => void;
  onLoadGraphFile: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onProjectPathChange: (value: string) => void;
  onScanFolderPathChange: (value: string) => void;
  onTopModuleNameChange: (value: string) => void;
  onPickProjectFolder: () => void;
  onPickScanFolder: () => void;
  onScanModules: () => void;
  onToggleLibraryBranch: (branch: "builtIn" | "modules") => void;
  onAddNode: (nodeTypeName: string) => void;
  onTestbenchCodeChange: (value: string) => void;
}

export function AppView(props: AppViewProps): React.JSX.Element {
  const {
    containerRef,
    fileInputRef,
    statusMessage,
    scanDirectory,
    graphStats,
    isBootstrapping,
    isCompiling,
    isSimulating,
    isScanningModules,
    projectPath,
    scanFolderPath,
    topModuleName,
    loadingError,
    libraryExpanded,
    builtinNodeTypes,
    moduleNodeTypes,
    diagnostics,
    hasErrors,
    generatedCode,
    testbenchCode,
    simulationOutput,
    simulationError,
    simulationWorkDir,
    onSaveGraph,
    onRequestLoadGraph,
    onCompile,
    onRunSimulation,
    onLoadGraphFile,
    onProjectPathChange,
    onScanFolderPathChange,
    onTopModuleNameChange,
    onPickProjectFolder,
    onPickScanFolder,
    onScanModules,
    onToggleLibraryBranch,
    onAddNode,
    onTestbenchCodeChange
  } = props;

  return (
    <div className="app-shell">
      <AppTopbar
        fileInputRef={fileInputRef}
        isBootstrapping={isBootstrapping}
        isCompiling={isCompiling}
        isSimulating={isSimulating}
        onSaveGraph={onSaveGraph}
        onRequestLoadGraph={onRequestLoadGraph}
        onCompile={onCompile}
        onRunSimulation={onRunSimulation}
        onLoadGraphFile={onLoadGraphFile}
      />

      <StatusStrip
        statusMessage={statusMessage}
        scanDirectory={scanDirectory}
        graphStats={graphStats}
      />

      <main className="workspace-grid">
        <LeftSidebar
          isScanningModules={isScanningModules}
          projectPath={projectPath}
          scanFolderPath={scanFolderPath}
          topModuleName={topModuleName}
          loadingError={loadingError}
          libraryExpanded={libraryExpanded}
          builtinNodeTypes={builtinNodeTypes}
          moduleNodeTypes={moduleNodeTypes}
          onProjectPathChange={onProjectPathChange}
          onScanFolderPathChange={onScanFolderPathChange}
          onTopModuleNameChange={onTopModuleNameChange}
          onPickProjectFolder={onPickProjectFolder}
          onPickScanFolder={onPickScanFolder}
          onScanModules={onScanModules}
          onToggleLibraryBranch={onToggleLibraryBranch}
          onAddNode={onAddNode}
        />

        <EditorPanel
          containerRef={containerRef}
          isBootstrapping={isBootstrapping}
        />

        <RightSidebar
          diagnostics={diagnostics}
          hasErrors={hasErrors}
          generatedCode={generatedCode}
          testbenchCode={testbenchCode}
          simulationOutput={simulationOutput}
          simulationError={simulationError}
          simulationWorkDir={simulationWorkDir}
          onTestbenchCodeChange={onTestbenchCodeChange}
        />
      </main>
    </div>
  );
}
