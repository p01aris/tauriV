import { ClassicPreset } from 'rete';
import { socket } from './socket';

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
