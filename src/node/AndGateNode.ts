import { ClassicPreset } from 'rete';
import type { GateGraphNode } from '../core/graph/types';
import { socket } from './socket';
import { getNodeBaseInfo, type ReteNodeGraphConverter } from './reteGraphConverter';

export class AndGateNode extends ClassicPreset.Node {
    nodeKind = 'and' as const;
    height = undefined as any;
    width = 180;
    static counter = 0;
    public varName: string;

    constructor() {
        super('');
        const id = AndGateNode.counter++;
        this.label = `and_${id}`;
        this.varName = this.label;
        this.addControl('width', new ClassicPreset.InputControl('number', { initial: 1 }));
        this.addInput('a', new ClassicPreset.Input(socket, 'A'));
        this.addInput('b', new ClassicPreset.Input(socket, 'B'));
        this.addOutput('y', new ClassicPreset.Output(socket, 'Y'));
    }

    getVerilog(inputs: Record<string, string>) {
        return `${inputs.a} & ${inputs.b}`;
    }
}

export const andGateNodeGraphConverter: ReteNodeGraphConverter = {
    toGraphNode(node, helpers) {
        if (node.nodeKind !== 'and') {
            return null;
        }

        const { id, label, instanceName } = getNodeBaseInfo(node);
        return {
            id,
            kind: 'and',
            label,
            instanceName,
            width: helpers.readNumberControl(node, 'width', 1),
            inputPorts: ['a', 'b'],
            outputPort: 'y'
        } satisfies GateGraphNode;
    }
};
