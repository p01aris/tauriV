import { ClassicPreset } from 'rete';
import type { GateGraphNode } from '../core/graph/types';
import { socket } from './socket';
import { getNodeBaseInfo, type ReteNodeGraphConverter } from './reteGraphConverter';

export class OrGateNode extends ClassicPreset.Node {
    nodeKind = 'or' as const;
    height = undefined as any;
    width = 180;
    static counter = 0;
    public varName: string;

    constructor() {
        super('');
        const id = OrGateNode.counter++;
        this.label = `or_${id}`;
        this.varName = this.label;
        this.addControl('width', new ClassicPreset.InputControl('number', { initial: 1 }));
        this.addInput('a', new ClassicPreset.Input(socket, 'A'));
        this.addInput('b', new ClassicPreset.Input(socket, 'B'));
        this.addOutput('y', new ClassicPreset.Output(socket, 'Y'));
    }

    getVerilog(inputs: Record<string, string>) {
        return `${inputs.a} | ${inputs.b}`;
    }
}

export const orGateNodeGraphConverter: ReteNodeGraphConverter = {
    toGraphNode(node, helpers) {
        if (node.nodeKind !== 'or') {
            return null;
        }

        const { id, label, instanceName } = getNodeBaseInfo(node);
        return {
            id,
            kind: 'or',
            label,
            instanceName,
            width: helpers.readNumberControl(node, 'width', 1),
            inputPorts: ['a', 'b'],
            outputPort: 'y'
        } satisfies GateGraphNode;
    }
};
