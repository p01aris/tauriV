import { ClassicPreset } from 'rete';
import { socket } from './socket';

export class ConcatNode extends ClassicPreset.Node {
  nodeKind = 'concat' as const;
  height = undefined as any;
  width = 200;
  static counter = 0;
  public varName: string;

  constructor() {
    super('');
    const id = ConcatNode.counter++;
    this.label = `concat_${id}`;
    this.varName = this.label;
    this.addControl('leftWidth', new ClassicPreset.InputControl('number', { initial: 1 }));
    this.addControl('rightWidth', new ClassicPreset.InputControl('number', { initial: 1 }));
    this.addInput('a', new ClassicPreset.Input(socket, 'A'));
    this.addInput('b', new ClassicPreset.Input(socket, 'B'));
    this.addOutput('y', new ClassicPreset.Output(socket, 'Y'));
  }
}
