import { ClassicPreset } from 'rete';
import { socket } from './socket';

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
