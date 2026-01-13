"use client";

import { useCallback, useMemo } from "react";
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Node,
    Edge,
    ControlButton,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useAppStore } from "@/store/app-store";
import { Maximize, ZoomIn, ZoomOut, Lock, Unlock } from "lucide-react";

export function CharacterGraph() {
    const { characters, relationships } = useAppStore();

    // 将角色转换为节点
    const initialNodes: Node[] = useMemo(
        () =>
            characters.map((char) => ({
                id: String(char.id),
                position: { x: char.position_x || 0, y: char.position_y || 0 },
                data: { label: char.name },
                type: "default",
                style: {
                    background: "hsl(var(--primary))",
                    color: "hsl(var(--primary-foreground))",
                    border: "none",
                    borderRadius: "8px",
                    padding: "8px 16px",
                    fontSize: "14px",
                    fontWeight: 500,
                },
            })),
        [characters]
    );

    // 将关系转换为边
    const initialEdges: Edge[] = useMemo(
        () =>
            relationships.map((rel) => ({
                id: String(rel.id),
                source: String(rel.source_id),
                target: String(rel.target_id),
                label: rel.relation_type,
                animated: rel.relation_type === "敌对",
                style: {
                    stroke: rel.relation_type === "敌对" ? "#ef4444" : "#22c55e",
                },
                labelStyle: {
                    fontSize: "12px",
                    fill: "hsl(var(--foreground))",
                },
                labelBgStyle: {
                    fill: "hsl(var(--background))",
                    fillOpacity: 0.8,
                },
            })),
        [relationships]
    );

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
    );

    if (characters.length === 0) {
        return (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                暂无角色，请先添加角色
            </div>
        );
    }

    return (
        <div className="h-full w-full">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                fitView
                className="bg-background"
            >
                <Background />
                {/* 自定义本地化控制条 */}
                <Controls showInteractive={false}>
                    {/* 我们可以在这里添加自定义按钮，或者通过 CSS 隐藏默认按钮并重新实现 */}
                    {/* 但更简单的方法是直接禁用默认按钮并手动添加 */}
                </Controls>
                {/* 覆盖默认按钮的 aria-label 和 title */}
                <style jsx global>{`
          .react-flow__controls-zoomin { title: "放大"; aria-label: "放大"; }
          .react-flow__controls-zoomout { title: "缩小"; aria-label: "缩小"; }
          .react-flow__controls-fitview { title: "适应视图"; aria-label: "适应视图"; }
          .react-flow__controls-interactive { title: "锁定"; aria-label: "锁定"; }
        `}</style>
                <MiniMap
                    style={{
                        background: "hsl(var(--muted))",
                    }}
                    maskColor="hsl(var(--background) / 0.8)"
                />
            </ReactFlow>
        </div>
    );
}
