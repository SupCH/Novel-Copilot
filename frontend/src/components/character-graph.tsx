"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
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
    Panel,
    Handle,
    Position,
    NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { X, ZoomIn, Maximize2, User } from "lucide-react";
import { createPortal } from "react-dom";
import { dataTablesApi, avatarApi } from "@/lib/api";

// 头像缓存（与 relationships-table 共享逻辑）
let graphAvatarCache: Record<string, string> = {};
let graphCacheProjectId: number | null = null;

// 自定义节点组件 - 显示角色名和头像
function CharacterNode({ data, selected }: NodeProps) {
    const { currentProject } = useAppStore();
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const label = data.label as string || "未知";

    useEffect(() => {
        if (!label || !currentProject) return;

        // 如果缓存是当前项目的，直接使用
        if (graphCacheProjectId === currentProject.id && graphAvatarCache[label]) {
            setAvatarUrl(graphAvatarCache[label]);
            return;
        }

        // 从数据库加载所有头像
        avatarApi.getAll(currentProject.id).then(avatars => {
            graphAvatarCache = avatars;
            graphCacheProjectId = currentProject.id;
            setAvatarUrl(avatars[label] || null);
        }).catch(() => {
            setAvatarUrl(null);
        });
    }, [label, currentProject]);

    // 定时刷新
    useEffect(() => {
        if (!currentProject) return;
        const interval = setInterval(() => {
            avatarApi.getAll(currentProject.id).then(avatars => {
                graphAvatarCache = avatars;
                graphCacheProjectId = currentProject.id;
                setAvatarUrl(avatars[label] || null);
            }).catch(() => { });
        }, 3000);
        return () => clearInterval(interval);
    }, [label, currentProject]);

    return (
        <div
            style={{
                background: selected ? "#3b82f6" : "#ffffff",
                color: selected ? "#ffffff" : "#1f2937",
                border: "2px solid #1f2937",
                borderRadius: "12px",
                padding: "8px 12px",
                fontSize: "14px",
                fontWeight: 500,
                boxShadow: selected ? "0 4px 12px rgba(0,0,0,0.2)" : "0 2px 6px rgba(0,0,0,0.1)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                minWidth: "80px",
            }}
        >
            <Handle type="target" position={Position.Left} style={{ background: '#555' }} />
            <span style={{ flex: 1 }}>{label}</span>
            <div
                style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    overflow: "hidden",
                    border: avatarUrl ? "2px solid #3b82f6" : "2px solid #d1d5db",
                    background: "#f3f4f6",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                }}
            >
                {avatarUrl ? (
                    <img src={avatarUrl} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                    <User style={{ width: "14px", height: "14px", color: "#9ca3af" }} />
                )}
            </div>
            <Handle type="source" position={Position.Right} style={{ background: '#555' }} />
        </div>
    );
}

// 自定义节点类型映射
const nodeTypes = {
    character: CharacterNode,
};

interface CharacterGraphProps {
    isOpen?: boolean;
    onClose?: () => void;
    embedded?: boolean;
}

// 自动布局算法 - 圆形布局
function calculateCircularLayout(nodeCount: number, centerX: number, centerY: number, radius: number) {
    const positions: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < nodeCount; i++) {
        const angle = (2 * Math.PI * i) / nodeCount - Math.PI / 2;
        positions.push({
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle),
        });
    }
    return positions;
}

// 边的颜色配置
const relationColors: Record<string, string> = {
    "敌对": "#ef4444",
    "仇人": "#ef4444",
    "敌人": "#ef4444",
    "朋友": "#22c55e",
    "好友": "#22c55e",
    "师徒": "#3b82f6",
    "师父": "#3b82f6",
    "徒弟": "#3b82f6",
    "恋人": "#ec4899",
    "爱人": "#ec4899",
    "情侣": "#ec4899",
    "家人": "#f59e0b",
    "亲人": "#f59e0b",
    "兄弟": "#f59e0b",
    "姐妹": "#f59e0b",
    "同门": "#8b5cf6",
    "同事": "#6b7280",
    "主仆": "#0ea5e9",
};

function getEdgeColor(relation: string): string {
    for (const [key, color] of Object.entries(relationColors)) {
        if (relation.includes(key)) return color;
    }
    return "#6b7280"; // 默认灰色
}

export function CharacterGraph({ isOpen = true, onClose, embedded = false }: CharacterGraphProps) {
    const { currentProject } = useAppStore();
    const [characters, setCharacters] = useState<Array<Record<number, string>>>([]);
    const [relationships, setRelationships] = useState<Array<Record<number, string>>>([]);
    const [selectedNode, setSelectedNode] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // 加载数据
    useEffect(() => {
        if (!isOpen || !currentProject) return;

        async function loadData() {
            try {
                const tables = await dataTablesApi.list(currentProject!.id);
                const charTable = tables.find((t: { table_type: number }) => t.table_type === 1);
                const relTable = tables.find((t: { table_type: number }) => t.table_type === 2);

                if (charTable?.rows) setCharacters(charTable.rows);
                if (relTable?.rows) setRelationships(relTable.rows);
            } catch (error) {
                console.error("Failed to load graph data:", error);
            }
        }
        loadData();
    }, [isOpen, currentProject]);

    // 计算节点布局
    const positions = useMemo(() => {
        return calculateCircularLayout(
            characters.length,
            400, // centerX
            300, // centerY
            Math.min(250, 50 + characters.length * 15) // radius
        );
    }, [characters.length]);

    // 节点样式函数
    const getNodeStyle = useCallback((isSelected: boolean) => ({
        background: isSelected ? "#3b82f6" : "#ffffff",
        color: isSelected ? "#ffffff" : "#1f2937",
        border: "2px solid #1f2937",
        borderRadius: "12px",
        padding: "10px 16px",
        fontSize: "14px",
        fontWeight: 500,
        cursor: "pointer",
        boxShadow: isSelected ? "0 4px 12px rgba(0,0,0,0.2)" : "0 2px 6px rgba(0,0,0,0.1)",
    }), []);

    // 将角色转换为节点 - 只在 characters 变化时重新创建
    const initialNodes: Node[] = useMemo(
        () =>
            characters.map((char, index) => ({
                id: char[0] || `char-${index}`,
                position: positions[index] || { x: 100, y: 100 },
                data: {
                    label: char[0] || "未知",
                    role: char[3] || "",
                    personality: char[2] || "",
                },
                type: "character",  // 使用自定义节点类型
            })),
        [characters, positions]
    );

    // 将关系转换为边 - 同时去重双向关系
    const initialEdges: Edge[] = useMemo(
        () => {
            const edgeMap = new Map<string, Edge>();

            relationships.forEach((rel, index) => {
                const source = rel[0] || "";
                const target = rel[1] || "";
                const relation = rel[2] || "";
                const color = getEdgeColor(relation);

                // 生成规范化的 key（较小的在前）
                const sortedKey = [source, target].sort().join("<->");

                // 检查是否已存在双向边
                if (edgeMap.has(sortedKey)) {
                    // 如果已存在，合并标签
                    const existing = edgeMap.get(sortedKey)!;
                    const existingLabel = existing.label as string;
                    if (!existingLabel.includes(relation)) {
                        existing.label = `${existingLabel} / ${relation}`;
                    }
                } else {
                    // 创建新边
                    edgeMap.set(sortedKey, {
                        id: `edge-${index}`,
                        source,
                        target,
                        label: relation,
                        animated: relation.includes("敌") || relation.includes("仇"),
                        style: {
                            stroke: color,
                            strokeWidth: 2,
                        },
                        labelStyle: {
                            fontSize: 11,
                            fill: "#374151",
                            fontWeight: 500,
                        },
                        labelBgStyle: {
                            fill: "#ffffff",
                            fillOpacity: 0.95,
                            rx: 4,
                            ry: 4,
                        },
                        labelBgPadding: [6, 4] as [number, number],
                    });
                }
            });

            return Array.from(edgeMap.values());
        },
        [relationships]
    );

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    // 只在数据变化时更新节点和边
    useEffect(() => {
        setNodes(initialNodes);
        setEdges(initialEdges);
    }, [characters, relationships, initialNodes, initialEdges, setNodes, setEdges]);

    // 选中节点时只更新样式，不重置位置
    useEffect(() => {
        setNodes((nds) =>
            nds.map((node) => ({
                ...node,
                style: getNodeStyle(node.id === selectedNode),
            }))
        );
    }, [selectedNode, setNodes, getNodeStyle]);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
    );

    const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
        setSelectedNode(node.id);
    }, []);

    // 获取选中节点的详细信息
    const selectedCharacter = useMemo(() => {
        if (!selectedNode) return null;
        return characters.find(char => char[0] === selectedNode);
    }, [selectedNode, characters]);

    const selectedRelationships = useMemo(() => {
        if (!selectedNode) return [];
        return relationships.filter(rel => rel[0] === selectedNode || rel[1] === selectedNode);
    }, [selectedNode, relationships]);

    if (!isOpen || !mounted) return null;

    // 嵌入式模式 - 简化的 ReactFlow
    if (embedded) {
        if (characters.length === 0) {
            return (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                    暂无数据
                </div>
            );
        }
        return (
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                fitView
                className="bg-background"
            >
                <Background />
                <Controls />
            </ReactFlow>
        );
    }

    const content = (
        <div className="fixed inset-0 z-[99999] bg-background/95 backdrop-blur-sm">
            {/* 头部 */}
            <div className="absolute top-0 left-0 right-0 h-14 border-b bg-background/80 backdrop-blur flex items-center justify-between px-4 z-10">
                <h2 className="font-semibold text-lg">人物关系图</h2>
                <Button variant="ghost" size="icon" onClick={onClose}>
                    <X className="h-5 w-5" />
                </Button>
            </div>

            {/* 主内容区 */}
            <div className="pt-14 h-full flex">
                {/* 关系图 */}
                <div className="flex-1 h-full">
                    {characters.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                            暂无角色数据，请先添加角色或使用"一键整理"功能
                        </div>
                    ) : (
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onConnect={onConnect}
                            nodeTypes={nodeTypes}
                            onNodeClick={onNodeClick}
                            fitView
                            className="bg-background"
                        >
                            <Background />
                            <Controls />
                            <MiniMap
                                style={{
                                    background: "#f3f4f6",
                                    width: 200,
                                    height: 150,
                                }}
                                nodeColor="#1f2937"
                                nodeStrokeWidth={3}
                                zoomable
                                pannable
                            />
                            <Panel position="top-left" className="text-xs text-muted-foreground">
                                点击节点查看详情
                            </Panel>
                        </ReactFlow>
                    )}
                </div>

                {/* 详情侧边栏 */}
                {selectedCharacter && (
                    <div className="w-80 border-l bg-background p-4 overflow-y-auto">
                        <h3 className="font-semibold text-lg mb-4">{selectedCharacter[0]}</h3>

                        {selectedCharacter[3] && (
                            <div className="mb-3">
                                <span className="text-xs text-muted-foreground">身份/职业</span>
                                <p className="text-sm">{selectedCharacter[3]}</p>
                            </div>
                        )}

                        {selectedCharacter[1] && (
                            <div className="mb-3">
                                <span className="text-xs text-muted-foreground">外貌特征</span>
                                <p className="text-sm">{selectedCharacter[1]}</p>
                            </div>
                        )}

                        {selectedCharacter[2] && (
                            <div className="mb-3">
                                <span className="text-xs text-muted-foreground">性格</span>
                                <p className="text-sm">{selectedCharacter[2]}</p>
                            </div>
                        )}

                        {selectedCharacter[7] && (
                            <div className="mb-3">
                                <span className="text-xs text-muted-foreground">其他信息</span>
                                <p className="text-sm">{selectedCharacter[7]}</p>
                            </div>
                        )}

                        {selectedRelationships.length > 0 && (
                            <div className="mt-4 pt-4 border-t">
                                <span className="text-xs text-muted-foreground">人物关系</span>
                                <div className="mt-2 space-y-2">
                                    {selectedRelationships.map((rel, i) => {
                                        const isSource = rel[0] === selectedNode;
                                        const otherPerson = isSource ? rel[1] : rel[0];
                                        return (
                                            <div
                                                key={i}
                                                className="text-sm p-2 rounded bg-muted/50 cursor-pointer hover:bg-muted"
                                                onClick={() => setSelectedNode(otherPerson)}
                                            >
                                                <span className="font-medium">{otherPerson}</span>
                                                <span className="text-muted-foreground"> - {rel[2]}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <Button
                            variant="outline"
                            size="sm"
                            className="mt-4 w-full"
                            onClick={() => setSelectedNode(null)}
                        >
                            关闭详情
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );

    return createPortal(content, document.body);
}
