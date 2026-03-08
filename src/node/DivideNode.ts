import { ClassicPreset } from 'rete';
import { socket } from './socket';

export class DivideNode extends ClassicPreset.Node {
  nodeKind = 'divide' as const;
  height = undefined as any;
  width = 200;
  static counter = 0;
  public varName: string;

  constructor() {
    super('');
    const id = DivideNode.counter++;
    this.label = `divide_${id}`;
    this.varName = this.label;
    this.addControl('highWidth', new ClassicPreset.InputControl('number', { initial: 1 }));
    this.addControl('lowWidth', new ClassicPreset.InputControl('number', { initial: 1 }));
    this.addInput('in', new ClassicPreset.Input(socket, 'In'));
    this.addOutput('hi', new ClassicPreset.Output(socket, 'Hi'));
    this.addOutput('lo', new ClassicPreset.Output(socket, 'Lo'));
  }
}
