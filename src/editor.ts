import { NodeEditor, GetSchemes, ClassicPreset } from 'rete';
import { AreaPlugin, AreaExtensions } from 'rete-area-plugin';
import { ConnectionPlugin, Presets as ConnectionPresets } from 'rete-connection-plugin';
import { ReactPlugin, Presets as ReactPresets } from 'rete-react-plugin';
import { ContextMenuPlugin, Presets as ContextMenuPresets } from 'rete-context-menu-plugin';
import { ConnectionPathPlugin, Transformers } from 'rete-connection-path-plugin';
import { curveStepBefore } from 'd3-shape';
import { createRoot } from 'react-dom/client';
import { BeautifulNode } from './ui/BeautifulNode';

type Schemes = GetSchemes<
    ClassicPreset.Node,
    ClassicPreset.Connection<ClassicPreset.Node, ClassicPreset.Node>
>;

export async function createEditor(
    container: HTMLElement,
    nodeTypes: Record<string, any>,
    contextMenuNodeTypes: Record<string, any> = nodeTypes
) {

    const editor = new NodeEditor<Schemes>();
    const area = new AreaPlugin<Schemes, any>(container);
    const connection = new ConnectionPlugin<Schemes, any>();
    const render = new ReactPlugin<Schemes, any>({ createRoot });

    AreaExtensions.selectableNodes(area, AreaExtensions.selector(), {
        accumulating: AreaExtensions.accumulateOnCtrl()
    });

    const contextMenuItems = Object.keys(contextMenuNodeTypes).map(key => [
        key.replace('Node', ''),
        () => new contextMenuNodeTypes[key]()
    ]) as any;

    const contextMenu = new ContextMenuPlugin<Schemes>({
        items: ContextMenuPresets.classic.setup(contextMenuItems)
    });

    const pathPlugin = new ConnectionPathPlugin<Schemes, any>({
        curve: () => curveStepBefore,
        transformer: () => Transformers.linear(),
        arrow: () => ({ color: '#31e39b', marker: 'M-18,-14 L-18,14 L24,0 z' })
    });

    render.addPreset(
        ReactPresets.classic.setup({
            customize: {
                node() {
                    return BeautifulNode as any;
                }
            }
        })
    );
    render.addPreset(ReactPresets.contextMenu.setup());
    connection.addPreset(ConnectionPresets.classic.setup());

    editor.use(area);
    area.use(connection);
    area.use(render);
    area.use(contextMenu);
    area.use(pathPlugin);

    const input = nodeTypes.InputNode ? new nodeTypes.InputNode() : null;
    const andGate = nodeTypes.AndGateNode ? new nodeTypes.AndGateNode() : null;
    const orGate = nodeTypes.OrGateNode ? new nodeTypes.OrGateNode() : null;
    const output = nodeTypes.OutputNode ? new nodeTypes.OutputNode() : null;

    if (input && andGate && orGate && output) {
        await editor.addNode(input);
        await editor.addNode(andGate);
        await editor.addNode(orGate);
        await editor.addNode(output);

        await editor.addConnection(new ClassicPreset.Connection(input, 'out', andGate, 'a') as any);
        await editor.addConnection(new ClassicPreset.Connection(andGate, 'y', orGate, 'a') as any);
        await editor.addConnection(new ClassicPreset.Connection(orGate, 'y', output, 'in') as any);

        await area.translate(input.id, { x: 50, y: 50 });
        await area.translate(andGate.id, { x: 300, y: 50 });
        await area.translate(orGate.id, { x: 550, y: 50 });
        await area.translate(output.id, { x: 800, y: 50 });
    }

    setTimeout(() => {
        AreaExtensions.zoomAt(area, editor.getNodes());
    }, 100);

    return {
        destroy: () => area.destroy(),
        editor,
        area
    };
}
