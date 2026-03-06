# Sprint 1 Plan: Compiler Core Decoupling

## Sprint window
- Duration: 7 days
- Objective: decouple Verilog generation from Rete UI runtime and establish a typed compiler pipeline with feature parity.

## Sprint goal
- Introduce a stable intermediate model (`GraphDocument`) between editor and codegen.
- Replace direct UI-side string assembly with `compileGraph()` entry.
- Keep current supported nodes and generated Verilog behavior unchanged.

## Out of scope
- Clock-domain analysis.
- Parameter inference and advanced type inference.
- Simulation runner integration (`iverilog`/`verilator`).
- Hierarchical subgraph/module packaging.

## Baseline compatibility
- Supported nodes remain:
- `InputNode`
- `OutputNode`
- `AndGateNode`
- `OrGateNode`
- Dynamically loaded Verilog module nodes from `src/verilog_module/*.v`
- Output remains one top module in Verilog text.

## Work breakdown

### 1) Core contracts and types (Day 1)
- Create:
- `src/core/graph/types.ts`
- `src/core/diagnostics/types.ts`
- `src/core/compiler/types.ts`
- Define:
- `GraphDocument`, `GraphNode`, `GraphEdge`
- `PortRef`, `PortType`, `ModuleSignature`
- `Diagnostic` and `CompileResult`
- Acceptance:
- Types compile cleanly with strict TypeScript checks.
- No compiler code depends on Rete runtime classes.

### 2) Rete adapter (Day 2)
- Create:
- `src/core/adapters/reteToGraph.ts`
- Convert editor state (`nodes`, `connections`) into `GraphDocument`.
- Keep deterministic ordering for stable snapshots (sort by id before emit).
- Acceptance:
- Same editor graph always yields identical `GraphDocument` JSON.

### 3) Compiler pipeline skeleton (Day 3-4)
- Create:
- `src/core/compiler/compileGraph.ts`
- `src/core/compiler/passes/normalizeGraph.ts`
- `src/core/compiler/passes/resolveModules.ts`
- `src/core/compiler/passes/allocateNets.ts`
- `src/core/compiler/passes/emitVerilog.ts`
- Migrate logic from `src/genVerilog.ts` into pass-based implementation.
- Keep `src/genVerilog.ts` as temporary compatibility wrapper (calling `compileGraph`) for one sprint only.
- Acceptance:
- Generated output is functionally equivalent to current behavior for existing demo graphs.

### 4) Module registry split (Day 5)
- Create:
- `src/core/registry/parseVerilogSignature.ts`
- `src/core/registry/moduleRegistry.ts`
- Move Verilog signature parsing out of `src/node/index.ts`.
- Keep node factory logic in UI layer, consume `ModuleSignature` from registry.
- Acceptance:
- Dynamic module nodes still render with same ports as before for current sample files.

### 5) UI integration (Day 6)
- Update:
- `src/App.tsx`
- Replace direct call chain to old generator with:
- `reteToGraph(editor) -> compileGraph(graph) -> render code + diagnostics`
- Add simple diagnostics panel area (text list is enough for Sprint 1).
- Acceptance:
- Clicking `Generate Verilog` shows generated code on success.
- On validation failure, diagnostics are visible and code panel is not silently wrong.

### 6) Test baseline and golden outputs (Day 7)
- Add test toolchain (recommended: `vitest`) and scripts in `package.json`.
- Create tests:
- `src/core/adapters/reteToGraph.spec.ts`
- `src/core/compiler/compileGraph.golden.spec.ts`
- `src/core/compiler/diagnostics.spec.ts`
- Add fixtures:
- `src/core/__fixtures__/simple-logic.graph.json`
- `src/core/__fixtures__/simple-logic.expected.v`
- Acceptance:
- `npm run test` passes locally.
- Golden test catches accidental output regressions.

## File-level change list (expected)
- New:
- `src/core/graph/types.ts`
- `src/core/diagnostics/types.ts`
- `src/core/adapters/reteToGraph.ts`
- `src/core/compiler/types.ts`
- `src/core/compiler/compileGraph.ts`
- `src/core/compiler/passes/*`
- `src/core/registry/*`
- `src/core/__fixtures__/*`
- Modified:
- `src/App.tsx`
- `src/genVerilog.ts` (temporary wrapper)
- `src/node/index.ts`
- `package.json`

## Definition of done
- Code generation no longer depends on `constructor.name` checks in UI component flow.
- Main compile path is `compileGraph()` in core layer.
- Existing demo graph behavior preserved.
- Minimum 3 automated tests in place including 1 golden output test.
- Basic diagnostics surfaced in UI.

## Risks and mitigation
- Risk: signature parser based on regex may fail for complex Verilog declarations.
- Mitigation: keep parser module isolated and design for future replacement by proper parser.
- Risk: output diff noise from unstable node ordering.
- Mitigation: deterministic sort in adapter and net allocation pass.
- Risk: large refactor breaks UI interaction flow.
- Mitigation: keep `src/genVerilog.ts` wrapper during Sprint 1 and remove in Sprint 2.

## Sprint demo checklist
- Open app, build graph with mixed built-in and dynamic module nodes.
- Click generate, verify deterministic Verilog output.
- Break a connection intentionally, verify diagnostics visible.
- Run tests and show green result.
