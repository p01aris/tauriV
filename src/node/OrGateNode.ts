import { ClassicPreset } from 'rete';
import { socket } from './socket';

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
