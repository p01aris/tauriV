import { ClassicPreset } from 'rete';
import type { OutputGraphNode } from '../core/graph/types';
import { socket } from './socket';
import { getNodeBaseInfo, type ReteNodeGraphConverter } from './reteGraphConverter';

export class OutputNode extends ClassicPreset.Node {
    nodeKind = 'output' as const;
    isOutputPort = true;
    height = undefined as any;
    width = 180;
    static counter = 0;

    constructor(public initialName?: string) {
        super('');
        const id = OutputNode.counter++;
        this.label = `output_${id}`;
        const resolvedName = initialName || `out_${id}`;
        this.addControl('name', new ClassicPreset.InputControl('text', { initial: resolvedName }));
        this.addControl('width', new ClassicPreset.InputControl('number', { initial: 1 }));
        this.addInput('in', new ClassicPreset.Input(socket, 'In'));
    }
}

export const outputNodeGraphConverter: ReteNodeGraphConverter = {
    toGraphNode(node, helpers) {
        if (node.nodeKind !== 'output') {
            return null;
        }

        const { id, label, instanceName } = getNodeBaseInfo(node);
        const defaultName = node.initialName ?? `out_${id}`;
        return {
            id,
            kind: 'output',
            label,
            instanceName,
            name: helpers.readTextControl(node, 'name', defaultName),
            width: helpers.readNumberControl(node, 'width', 1),
            inputPort: 'in'
        } satisfies OutputGraphNode;
    }
};
