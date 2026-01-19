"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/store/app-store";
import { dataTablesApi, DataTableResponse, avatarApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, Sparkles, User } from "lucide-react";
import { CharacterGraph } from "@/components/character-graph";

// 头像缓存 context（全局共享）
let avatarCache: Record<string, string> = {};
let cacheProjectId: number | null = null;

// 头像显示组件 - 从数据库读取
function CharacterAvatar({ characterName, projectId }: { characterName: string; projectId: number }) {
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!characterName.trim()) {
            setAvatarUrl(null);
            return;
        }

        // 如果缓存是当前项目的，直接使用
        if (cacheProjectId === projectId && avatarCache[characterName]) {
            setAvatarUrl(avatarCache[characterName]);
            return;
        }

        // 从数据库加载所有头像
        avatarApi.getAll(projectId).then(avatars => {
            avatarCache = avatars;
            cacheProjectId = projectId;
            setAvatarUrl(avatars[characterName] || null);
        }).catch(() => {
            setAvatarUrl(null);
        });
    }, [characterName, projectId]);

    // 定时刷新缓存
    useEffect(() => {
        const interval = setInterval(() => {
            if (!projectId) return;
            avatarApi.getAll(projectId).then(avatars => {
                avatarCache = avatars;
                cacheProjectId = projectId;
                setAvatarUrl(avatars[characterName] || null);
            }).catch(() => { });
        }, 3000);
        return () => clearInterval(interval);
    }, [characterName, projectId]);

    const handleClick = () => {
        if (avatarUrl) {
            window.open(avatarUrl, '_blank');
        }
    };

    return (
        <div
            className={`h-8 w-8 shrink-0 rounded-full overflow-hidden border-2 ${avatarUrl ? 'border-primary cursor-pointer' : 'border-muted'} bg-muted flex items-center justify-center`}
            onClick={handleClick}
            title={avatarUrl ? '点击查看头像' : '暂无头像'}
        >
            {avatarUrl ? (
                <img src={avatarUrl} alt={characterName} className="h-full w-full object-cover" />
            ) : (
                <User className="h-4 w-4 text-muted-foreground" />
            )}
        </div>
    );
}

// 头像生成按钮组件 - 直接使用角色名和数据表信息生成
function AvatarGenerateButton({
    characterName,
    bodyFeatures
}: {
    characterName: string;
    bodyFeatures?: string; // 从数据表[人物]的身体特征列获取
}) {
    const { aiConfig, currentProject } = useAppStore();
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = async () => {
        if (!characterName.trim() || !currentProject) {
            alert("请先输入角色名");
            return;
        }
        if (!aiConfig.imageApiKey) {
            alert("请先在 AI 设置中配置图像 API Key");
            return;
        }

        // 构建提示词：角色名 + 身体特征（如果有）
        let prompt = `Portrait of ${characterName}, anime style, detailed, high quality`;
        if (bodyFeatures) {
            prompt += `, ${bodyFeatures}`;
        }

        setIsGenerating(true);
        try {
            // 直接调用图像生成 API
            const response = await fetch(`${aiConfig.imageBaseUrl.replace(/\/+$/, '')}/images/generations`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${aiConfig.imageApiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: aiConfig.imageModel,
                    prompt: prompt,
                    n: 1,
                    size: '1024x1024',
                }),
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`API 错误: ${error}`);
            }

            const data = await response.json();
            const imageUrl = data.data?.[0]?.url || data.images?.[0]?.url;

            if (imageUrl) {
                // 保存到数据库
                await avatarApi.save(currentProject.id, characterName, imageUrl);

                // 更新本地缓存
                avatarCache[characterName] = imageUrl;

                // 提示用户并提供查看选项
                if (confirm('头像生成成功！已保存到数据库。点击确定查看图片')) {
                    window.open(imageUrl, '_blank');
                }
            } else {
                throw new Error('未返回图片 URL');
            }
        } catch (error) {
            console.error("生成头像失败:", error);
            alert(`生成失败: ${error instanceof Error ? error.message : "未知错误"}`);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={handleGenerate}
            disabled={isGenerating || !characterName.trim()}
            title={`生成 AI 头像${bodyFeatures ? ' (含身体特征)' : ''}`}
        >
            {isGenerating ? (
                <div className="h-3 w-3 animate-spin border-2 border-primary border-t-transparent rounded-full" />
            ) : (
                <Sparkles className="h-3 w-3" />
            )}
        </Button>
    );
}

export function RelationshipsTable() {
    const { currentProject, dataTablesRefreshKey } = useAppStore();
    const [table, setTable] = useState<DataTableResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

    // 加载社交关系表 (table_type = 2)
    useEffect(() => {
        if (!currentProject) return;

        setLoading(true);
        dataTablesApi.list(currentProject.id)
            .then(tables => {
                const relationshipTable = tables.find(t => t.table_type === 2);
                setTable(relationshipTable || null);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [currentProject, dataTablesRefreshKey]);

    // 更新单元格
    const updateCell = useCallback(async (
        rowIndex: number,
        colIndex: number,
        value: string
    ) => {
        if (!table) return;

        const newRows = [...table.rows];
        if (!newRows[rowIndex]) {
            newRows[rowIndex] = {};
        }
        newRows[rowIndex] = { ...newRows[rowIndex], [colIndex]: value };

        setTable({ ...table, rows: newRows });

        try {
            await dataTablesApi.update(table.id, newRows);
        } catch (error) {
            console.error("Failed to save:", error);
        }
    }, [table]);

    // 添加新行
    const addRow = useCallback(async () => {
        if (!table) return;

        const newRow: Record<number, string> = {};
        table.columns.forEach((_, i) => { newRow[i] = ""; });

        const newRows = [...table.rows, newRow];
        setTable({ ...table, rows: newRows });

        try {
            await dataTablesApi.update(table.id, newRows);
        } catch (error) {
            console.error("Failed to add row:", error);
        }
    }, [table]);

    // 删除行
    const deleteRow = useCallback(async (rowIndex: number) => {
        if (!table) return;

        const newRows = table.rows.filter((_, i) => i !== rowIndex);
        setTable({ ...table, rows: newRows });

        try {
            await dataTablesApi.update(table.id, newRows);
        } catch (error) {
            console.error("Failed to delete row:", error);
        }
    }, [table]);

    // 清空所有数据
    const clearTable = useCallback(async () => {
        if (!table) return;
        setConfirmDialogOpen(false);

        try {
            await dataTablesApi.clear(table.id);
            setTable({ ...table, rows: [] });
        } catch (error) {
            console.error("Failed to clear table:", error);
        }
    }, [table]);

    if (!currentProject) {
        return (
            <div className="p-4 text-center text-muted-foreground">
                请先选择项目
            </div>
        );
    }

    if (loading) {
        return (
            <div className="p-4 text-center text-muted-foreground">
                加载中...
            </div>
        );
    }

    if (!table) {
        return (
            <div className="p-4 text-center text-muted-foreground">
                暂无数据
            </div>
        );
    }

    return (
        <div className="h-full overflow-auto p-3">
            {/* 确认对话框 */}
            <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>确认清空</DialogTitle>
                        <DialogDescription>
                            确定要清空 "社交关系表" 的所有数据吗？此操作不可恢复。
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
                            取消
                        </Button>
                        <Button variant="destructive" onClick={clearTable}>
                            确认清空
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">社交关系</h3>
                <div className="flex gap-1">
                    {table.rows.length > 0 && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setConfirmDialogOpen(true)}
                            title="清空所有"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={addRow}>
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {table.rows.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                    暂无角色，请先添加角色
                </p>
            ) : (
                <div className="space-y-2">
                    {table.rows.map((row, rowIndex) => (
                        <div key={rowIndex} className="p-3 rounded-lg border bg-card space-y-2 group">
                            <div className="font-medium text-sm flex gap-2 items-center">
                                {currentProject && (
                                    <CharacterAvatar
                                        characterName={row[0] || ""}
                                        projectId={currentProject.id}
                                    />
                                )}
                                <Input
                                    value={row[0] || ""}
                                    onChange={(e) => updateCell(rowIndex, 0, e.target.value)}
                                    placeholder="角色名"
                                    className="h-7 text-sm font-medium flex-1"
                                />
                                <AvatarGenerateButton characterName={row[0] || ""} />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 opacity-0 group-hover:opacity-100"
                                    onClick={() => deleteRow(rowIndex)}
                                    title="删除"
                                >
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <label className="text-muted-foreground">关系</label>
                                    <Input
                                        value={row[1] || ""}
                                        onChange={(e) => updateCell(rowIndex, 1, e.target.value)}
                                        placeholder="与主角的关系"
                                        className="h-6 text-xs mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="text-muted-foreground">态度</label>
                                    <Input
                                        value={row[2] || ""}
                                        onChange={(e) => updateCell(rowIndex, 2, e.target.value)}
                                        placeholder="对主角态度"
                                        className="h-6 text-xs mt-1"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-muted-foreground">好感度</label>
                                    <Input
                                        value={row[3] || ""}
                                        onChange={(e) => updateCell(rowIndex, 3, e.target.value)}
                                        placeholder="好感程度"
                                        className="h-6 text-xs mt-1"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )
            }

            {/* 关系图 */}
            <div className="mt-4 border rounded-lg overflow-hidden">
                <div className="p-2 bg-muted/50 text-sm font-medium">
                    关系图
                </div>
                <div className="h-[300px]">
                    <CharacterGraph embedded />
                </div>
            </div>
        </div >
    );
}

