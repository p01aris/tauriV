import { ClassicPreset } from 'rete';
import type { DivideGraphNode } from '../core/graph/types';
import { socket } from './socket';
import { getNodeBaseInfo, type ReteNodeGraphConverter } from './reteGraphConverter';

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

export const divideNodeGraphConverter: ReteNodeGraphConverter = {
  toGraphNode(node, helpers) {
    if (node.nodeKind !== 'divide') {
      return null;
    }

    const { id, label, instanceName } = getNodeBaseInfo(node);
    return {
      id,
      kind: 'divide',
      label,
      instanceName,
      highWidth: helpers.readNumberControl(node, 'highWidth', 1),
      lowWidth: helpers.readNumberControl(node, 'lowWidth', 1),
      inputPort: 'in',
      outputPorts: ['hi', 'lo']
    } satisfies DivideGraphNode;
  }
};
