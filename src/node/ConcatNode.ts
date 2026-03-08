import { ClassicPreset } from 'rete';
import type { ConcatGraphNode } from '../core/graph/types';
import { socket } from './socket';
import { getNodeBaseInfo, type ReteNodeGraphConverter } from './reteGraphConverter';

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

export const concatNodeGraphConverter: ReteNodeGraphConverter = {
  toGraphNode(node, helpers) {
    if (node.nodeKind !== 'concat') {
      return null;
    }

    const { id, label, instanceName } = getNodeBaseInfo(node);
    return {
      id,
      kind: 'concat',
      label,
      instanceName,
      leftWidth: helpers.readNumberControl(node, 'leftWidth', 1),
      rightWidth: helpers.readNumberControl(node, 'rightWidth', 1),
      inputPorts: ['a', 'b'],
      outputPort: 'y'
    } satisfies ConcatGraphNode;
  }
};
