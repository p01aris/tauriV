import { ClassicPreset } from 'rete';
import type { InputGraphNode } from '../core/graph/types';
import { socket } from './socket';
import { getNodeBaseInfo, type ReteNodeGraphConverter } from './reteGraphConverter';

export class InputNode extends ClassicPreset.Node {
    nodeKind = 'input' as const;
    isInputPort = true;
    height = undefined as any;
    width = 180;
    static counter = 0;

    constructor(public initialName?: string) {
        super('');
        const id = InputNode.counter++;
        this.label = `input_${id}`;
        const resolvedName = initialName || `in_${id}`;
        this.addControl('name', new ClassicPreset.InputControl('text', { initial: resolvedName }));
        this.addControl('width', new ClassicPreset.InputControl('number', { initial: 1 }));
        this.addOutput('out', new ClassicPreset.Output(socket, 'Out'));
    }
}

export const inputNodeGraphConverter: ReteNodeGraphConverter = {
    toGraphNode(node, helpers) {
        if (node.nodeKind !== 'input') {
            return null;
        }

        const { id, label, instanceName } = getNodeBaseInfo(node);
        const defaultName = node.initialName ?? `in_${id}`;
        return {
            id,
            kind: 'input',
            label,
            instanceName,
            name: helpers.readTextControl(node, 'name', defaultName),
            width: helpers.readNumberControl(node, 'width', 1),
            outputPort: 'out'
        } satisfies InputGraphNode;
    }
};
