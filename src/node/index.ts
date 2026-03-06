import { ClassicPreset } from 'rete';
import { socket } from './socket';
import { moduleRegistry } from '../core/registry/moduleRegistry';
import type { ModuleSignature, PortSignature } from '../core/registry/types';
export * from './socket';

const modules = import.meta.glob('./*Node.ts', { eager: true });

export const NodeTypes: Record<string, any> = {};

for (const path in modules) {
    const mod = modules[path] as any;
    for (const key in mod) {
        if (key.endsWith('Node')) {
            NodeTypes[key] = mod[key];
        }
    }
}

function createVerilogNodeClass(
    moduleName: string,
    inputs: PortSignature[],
    outputs: PortSignature[]
) {
    class DynamicVerilogNode extends ClassicPreset.Node {
        nodeKind = 'module' as const;
        isVerilogModule = true;
        verilogModuleName = moduleName;
        verilogInputs = inputs;
        verilogOutputs = outputs;
        public varName: string;
        static counter = 0;
        height = undefined as any;
        width = 200;

        constructor() {
            super('');
            const id = DynamicVerilogNode.counter++;
            this.label = `${moduleName}_${id}`;
            this.varName = this.label;

            inputs.forEach(inPort => {
                const signed = inPort.signed ? ' signed' : '';
                this.addInput(
                    inPort.name,
                    new ClassicPreset.Input(
                        socket,
                        `${inPort.name}${signed}${inPort.width > 1 ? ` [${inPort.width - 1}:0]` : ''}`
                    )
                );
            });
            outputs.forEach(outPort => {
                const signed = outPort.signed ? ' signed' : '';
                this.addOutput(
                    outPort.name,
                    new ClassicPreset.Output(
                        socket,
                        `${outPort.name}${signed}${outPort.width > 1 ? ` [${outPort.width - 1}:0]` : ''}`
                    )
                );
            });
        }
    }
    Object.defineProperty(DynamicVerilogNode, 'name', { value: moduleName + 'Node' });
    return DynamicVerilogNode;
}

const dynamicNodeNameSet = new Set<string>();

export function registerModuleNodeType(signature: ModuleSignature): void {
    moduleRegistry.upsert(signature);

    const inputPorts = signature.ports.filter((port) => port.direction === 'input');
    const outputPorts = signature.ports.filter((port) => port.direction === 'output');
    const nodeTypeName = `${signature.moduleName}Node`;

    NodeTypes[nodeTypeName] = createVerilogNodeClass(signature.moduleName, inputPorts, outputPorts);
    dynamicNodeNameSet.add(nodeTypeName);
}

export function replaceModuleNodeTypes(signatures: ModuleSignature[]): void {
    dynamicNodeNameSet.forEach((nodeTypeName) => {
        delete NodeTypes[nodeTypeName];
    });
    dynamicNodeNameSet.clear();

    moduleRegistry.replaceAll(signatures);
    signatures.forEach((signature) => {
        registerModuleNodeType(signature);
    });
}

export function listNodeTypeNames(): string[] {
    return Object.keys(NodeTypes).sort((a, b) => a.localeCompare(b));
}

export function getNodeTypeByName(nodeTypeName: string): any {
    return NodeTypes[nodeTypeName];
}

export function getRegisteredModuleSignatures(): ModuleSignature[] {
    return moduleRegistry.getAll();
}

export function resetDynamicNodeTypes(): void {
    dynamicNodeNameSet.forEach((nodeTypeName) => {
        delete NodeTypes[nodeTypeName];
    });
    dynamicNodeNameSet.clear();
    moduleRegistry.replaceAll([]);
}
