"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/store/app-store";
import { dataTablesApi, DataTableResponse, aiApi, charactersApi } from "@/lib/api";
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
import { Plus, Trash2, Sparkles } from "lucide-react";
import { CharacterGraph } from "@/components/character-graph";

// 头像生成按钮组件
function AvatarGenerateButton({ characterName }: { characterName: string }) {
    const { aiConfig, currentProject, characters, refreshCharacters } = useAppStore();
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

        // 查找对应的角色
        const character = characters.find(c => c.name === characterName);
        if (!character) {
            alert(`未找到角色 "${characterName}"，请先在设置页添加角色或使用一键整理`);
            return;
        }

        setIsGenerating(true);
        try {
            const result = await aiApi.generateAvatar({
                characterId: character.id,
                imageConfig: {
                    imageBaseUrl: aiConfig.imageBaseUrl,
                    imageApiKey: aiConfig.imageApiKey,
                    imageModel: aiConfig.imageModel,
                },
            });
            if (result.success) {
                refreshCharacters(); // 刷新以显示新头像
                alert(`头像生成成功！`);
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
            title="生成 AI 头像"
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
                        <div key={rowIndex} className="p-3 rounded-lg border bg-card space-y-2 group relative">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 absolute top-2 right-2 opacity-0 group-hover:opacity-100"
                                onClick={() => deleteRow(rowIndex)}
                            >
                                <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                            <div className="font-medium text-sm flex gap-2">
                                <Input
                                    value={row[0] || ""}
                                    onChange={(e) => updateCell(rowIndex, 0, e.target.value)}
                                    placeholder="角色名"
                                    className="h-7 text-sm font-medium flex-1"
                                />
                                <AvatarGenerateButton characterName={row[0] || ""} />
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
            )}

            {/* 关系图 */}
            <div className="mt-4 border rounded-lg overflow-hidden">
                <div className="p-2 bg-muted/50 text-sm font-medium">
                    关系图
                </div>
                <div className="h-[300px]">
                    <CharacterGraph embedded />
                </div>
            </div>
        </div>
    );
}

