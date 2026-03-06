import { reteToGraph } from './core/adapters/reteToGraph';
import { compileGraph } from './core/compiler/compileGraph';
import { moduleRegistry } from './core/registry/moduleRegistry';

export function generateVerilog(editor: any): string {
    const graph = reteToGraph(editor, {
        moduleName: 'TopLevelModule',
        moduleSignatures: moduleRegistry.getAll()
    });
    const result = compileGraph(graph);
    return result.verilog;
}
