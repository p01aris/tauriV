import { ClassicPreset } from 'rete';
import { socket } from './socket';

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
