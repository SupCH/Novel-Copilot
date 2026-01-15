"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAppStore } from "@/store/app-store";
import { dataTablesApi, aiApi, DataTableResponse } from "@/lib/api";
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
import { ChevronDown, ChevronRight, Plus, Trash2, RefreshCw, Check, X, Network, Sparkles, ExternalLink } from "lucide-react";
import { CharacterGraph } from "@/components/character-graph";

export function DataTablesPanel() {
    const { currentProject, currentChapter, aiConfig, dataTablesRefreshKey, refreshDataTables } = useAppStore();
    const [tables, setTables] = useState<DataTableResponse[]>([]);
    const [expandedTables, setExpandedTables] = useState<Set<number>>(new Set([1, 2]));
    const [loading, setLoading] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);
    const [extractResult, setExtractResult] = useState<{ success: boolean; message: string } | null>(null);

    // 确认对话框状态
    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean;
        tableId: number;
        tableName: string;
    }>({ open: false, tableId: 0, tableName: "" });

    // 清空所有对话框
    const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);

    // 关系图弹窗
    const [graphOpen, setGraphOpen] = useState(false);

    // 一键整理状态
    const [isOrganizing, setIsOrganizing] = useState(false);
    const [organizeResult, setOrganizeResult] = useState<{ success: boolean; message: string } | null>(null);

    // 列宽状态 (按表格类型存储)
    const [columnWidths, setColumnWidths] = useState<Record<number, Record<number, number>>>({});
    const resizingRef = useRef<{ tableType: number; colIndex: number; startX: number; startWidth: number } | null>(null);

    // 加载数据表
    useEffect(() => {
        if (!currentProject) return;

        setLoading(true);
        dataTablesApi.list(currentProject.id)
            .then(setTables)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [currentProject, dataTablesRefreshKey]);

    const toggleTable = (tableType: number) => {
        setExpandedTables(prev => {
            const next = new Set(prev);
            if (next.has(tableType)) {
                next.delete(tableType);
            } else {
                next.add(tableType);
            }
            return next;
        });
    };

    // 列宽调整处理
    const handleResizeStart = (e: React.MouseEvent, tableType: number, colIndex: number, currentWidth: number) => {
        e.preventDefault();
        resizingRef.current = {
            tableType,
            colIndex,
            startX: e.clientX,
            startWidth: currentWidth || 120,
        };
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!resizingRef.current) return;

            const { tableType, colIndex, startX, startWidth } = resizingRef.current;
            const diff = e.clientX - startX;
            const newWidth = Math.max(50, startWidth + diff);

            setColumnWidths(prev => ({
                ...prev,
                [tableType]: {
                    ...(prev[tableType] || {}),
                    [colIndex]: newWidth,
                },
            }));
        };

        const handleMouseUp = () => {
            resizingRef.current = null;
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);

        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, []);

    // 更新单元格
    const updateCell = useCallback(async (
        tableId: number,
        tableType: number,
        rowIndex: number,
        colIndex: number,
        value: string
    ) => {
        const table = tables.find(t => t.id === tableId);
        if (!table) return;

        const newRows = [...table.rows];
        if (!newRows[rowIndex]) {
            newRows[rowIndex] = {};
        }
        newRows[rowIndex] = { ...newRows[rowIndex], [colIndex]: value };

        setTables(prev => prev.map(t =>
            t.id === tableId ? { ...t, rows: newRows } : t
        ));

        try {
            await dataTablesApi.update(tableId, newRows);
        } catch (error) {
            console.error("Failed to save table:", error);
        }
    }, [tables]);

    // 添加新行
    const addRow = useCallback(async (tableId: number, columns: string[]) => {
        const table = tables.find(t => t.id === tableId);
        if (!table) return;

        const newRow: Record<number, string> = {};
        columns.forEach((_, i) => { newRow[i] = ""; });

        const newRows = [...table.rows, newRow];
        setTables(prev => prev.map(t =>
            t.id === tableId ? { ...t, rows: newRows } : t
        ));

        try {
            await dataTablesApi.update(tableId, newRows);
        } catch (error) {
            console.error("Failed to add row:", error);
        }
    }, [tables]);

    // 删除行
    const deleteRow = useCallback(async (tableId: number, rowIndex: number) => {
        const table = tables.find(t => t.id === tableId);
        if (!table) return;

        const newRows = table.rows.filter((_, i) => i !== rowIndex);
        setTables(prev => prev.map(t =>
            t.id === tableId ? { ...t, rows: newRows } : t
        ));

        try {
            await dataTablesApi.update(tableId, newRows);
        } catch (error) {
            console.error("Failed to delete row:", error);
        }
    }, [tables]);

    // 清空整个表格
    const clearTable = useCallback(async () => {
        const { tableId } = confirmDialog;
        setConfirmDialog({ open: false, tableId: 0, tableName: "" });

        try {
            await dataTablesApi.clear(tableId);
            setTables(prev => prev.map(t =>
                t.id === tableId ? { ...t, rows: [] } : t
            ));
        } catch (error) {
            console.error("Failed to clear table:", error);
        }
    }, [confirmDialog]);

    // 清空所有数据表
    const clearAllTables = useCallback(async () => {
        if (!currentProject) return;
        setClearAllDialogOpen(false);

        try {
            await dataTablesApi.clearAll(currentProject.id);
            setTables(prev => prev.map(t => ({ ...t, rows: [] })));
        } catch (error) {
            console.error("Failed to clear all tables:", error);
        }
    }, [currentProject]);

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

    return (
        <div className="h-full flex flex-col">
            {/* 固定头部 */}
            {/* 单个表格确认对话框 */}
            <Dialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, tableId: 0, tableName: "" })}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>确认清空</DialogTitle>
                        <DialogDescription>
                            确定要清空 &quot;{confirmDialog.tableName}&quot; 的所有数据吗？此操作不可恢复。
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmDialog({ open: false, tableId: 0, tableName: "" })}>
                            取消
                        </Button>
                        <Button variant="destructive" onClick={clearTable}>
                            确认清空
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 清空所有对话框 */}
            <Dialog open={clearAllDialogOpen} onOpenChange={setClearAllDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>确认清空所有数据</DialogTitle>
                        <DialogDescription>
                            确定要清空所有数据表吗？此操作将删除所有表格中的数据，不可恢复。
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setClearAllDialogOpen(false)}>
                            取消
                        </Button>
                        <Button variant="destructive" onClick={clearAllTables}>
                            清空所有
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 页面头部 */}
            <div className="p-3 pb-0 flex items-center justify-between">
                <span className="text-sm font-medium">数据表</span>
                <div className="flex gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => {
                            if (currentProject) {
                                window.open(
                                    `/project/${currentProject.id}/data`,
                                    'data-panel',
                                    'width=1200,height=800,menubar=no,toolbar=no,location=no,status=no'
                                );
                            }
                        }}
                        title="在新窗口打开数据面板 (Ctrl+D)"
                    >
                        <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => setGraphOpen(true)}
                        title="查看人物关系图"
                    >
                        <Network className="h-3 w-3" />
                        关系图
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        disabled={isOrganizing}
                        onClick={async () => {
                            if (!currentProject) return;
                            setIsOrganizing(true);
                            setOrganizeResult(null);
                            try {
                                const result = await aiApi.organizeCharacters({
                                    projectId: currentProject.id,
                                    config: aiConfig,
                                });
                                refreshDataTables();
                                setOrganizeResult({ success: result.success, message: result.message });
                            } catch (error) {
                                console.error('Organize error:', error);
                                setOrganizeResult({ success: false, message: '整理失败' });
                            } finally {
                                setIsOrganizing(false);
                                setTimeout(() => setOrganizeResult(null), 3000);
                            }
                        }}
                        title="AI 一键整理人物关系"
                    >
                        {isOrganizing ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                        {isOrganizing ? "整理中..." : "一键整理"}
                    </Button>
                </div>
            </div>
            <div className="p-3 pt-2 flex gap-2">
                {currentChapter && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        disabled={isExtracting}
                        onClick={async () => {
                            if (!currentProject || !currentChapter) return;
                            setIsExtracting(true);
                            setExtractResult(null);
                            try {
                                const content = currentChapter.content?.replace(/<[^>]*>/g, '') || '';
                                if (!content.trim()) {
                                    setExtractResult({ success: false, message: '当前章节没有内容' });
                                    return;
                                }
                                const result = await aiApi.extractData({
                                    projectId: currentProject.id,
                                    content,
                                    config: aiConfig,
                                });
                                refreshDataTables();
                                if (result.total > 0) {
                                    setExtractResult({ success: true, message: `提取成功，更新了 ${result.total} 条数据` });
                                } else {
                                    setExtractResult({ success: true, message: '提取完成，未发现新数据' });
                                }
                            } catch (err: unknown) {
                                console.error('重新提取失败:', err);
                                const message = err instanceof Error ? err.message : '未知错误';
                                setExtractResult({ success: false, message: `提取失败: ${message}` });
                            } finally {
                                setIsExtracting(false);
                                setTimeout(() => setExtractResult(null), 3000);
                            }
                        }}
                    >
                        <RefreshCw className={`h-3 w-3 mr-1 ${isExtracting ? 'animate-spin' : ''}`} />
                        {isExtracting ? '提取中...' : '重新提取'}
                    </Button>
                )}
                {tables.some(t => t.rows.length > 0) && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs text-destructive hover:text-destructive"
                        onClick={() => setClearAllDialogOpen(true)}
                    >
                        <Trash2 className="h-3 w-3 mr-1" />
                        清空所有
                    </Button>
                )}
            </div>

            {/* 内容区域 - 嵌套容器实现底部固定横向滚动条 */}
            <div className="flex-1 flex flex-col min-h-0">
                {/* 横向滚动容器 - 固定在底部 */}
                <div className="flex-1 overflow-x-auto overflow-y-hidden">
                    {/* 纵向滚动容器 */}
                    <div className="h-full overflow-y-auto p-3 space-y-2" style={{ minWidth: 'max-content' }}>
                        {/* 过滤掉 #2 社交关系表 */}
                        {tables.filter(t => t.table_type !== 2).map(table => (
                            <div key={table.id} className="border rounded-lg overflow-hidden" style={{ minWidth: '600px' }}>
                                {/* 表格头部 */}
                                <div className="flex items-center bg-muted/50 hover:bg-muted">
                                    <button
                                        className="flex-1 px-3 py-2 flex items-center gap-2 text-left text-sm font-medium"
                                        onClick={() => toggleTable(table.table_type)}
                                    >
                                        {expandedTables.has(table.table_type) ? (
                                            <ChevronDown className="h-4 w-4" />
                                        ) : (
                                            <ChevronRight className="h-4 w-4" />
                                        )}
                                        <span>#{table.table_type} {table.table_name}</span>
                                        <span className="text-xs text-muted-foreground ml-auto">
                                            {table.rows.length} 条记录
                                        </span>
                                    </button>
                                    {table.rows.length > 0 && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 mr-1 text-destructive hover:text-destructive"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setConfirmDialog({ open: true, tableId: table.id, tableName: table.table_name });
                                            }}
                                            title={`清空${table.table_name}`}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>

                                {/* 表格内容 */}
                                {expandedTables.has(table.table_type) && (
                                    <div className="p-2">
                                        {table.rows.length === 0 ? (
                                            <div className="text-sm text-muted-foreground text-center py-2">
                                                暂无数据
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="text-xs border-collapse border" style={{ tableLayout: 'fixed' }}>
                                                    <thead>
                                                        <tr className="border-b">
                                                            {table.columns.map((col, i) => {
                                                                const width = columnWidths[table.table_type]?.[i] || 120;
                                                                return (
                                                                    <th
                                                                        key={i}
                                                                        className="px-2 py-1 text-left font-medium text-muted-foreground border relative"
                                                                        style={{ width: `${width}px`, minWidth: '50px' }}
                                                                    >
                                                                        <span className="truncate block">{col}</span>
                                                                        {/* 调整手柄 - 加宽区域便于点击 */}
                                                                        <div
                                                                            className="absolute right-0 top-0 h-full w-2 cursor-col-resize bg-transparent hover:bg-primary/30 active:bg-primary/50"
                                                                            onMouseDown={(e) => handleResizeStart(e, table.table_type, i, width)}
                                                                            title="拖动调整列宽"
                                                                        />
                                                                    </th>
                                                                );
                                                            })}
                                                            <th className="w-8 border"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {table.rows.map((row, rowIndex) => (
                                                            <tr key={rowIndex} className="border-b last:border-b-0 group">
                                                                {table.columns.map((_, colIndex) => {
                                                                    const width = columnWidths[table.table_type]?.[colIndex] || 120;
                                                                    return (
                                                                        <td
                                                                            key={colIndex}
                                                                            className="px-1 py-1 align-top border"
                                                                            style={{ width: `${width}px` }}
                                                                        >
                                                                            <textarea
                                                                                value={row[colIndex] || ""}
                                                                                onChange={(e) => updateCell(table.id, table.table_type, rowIndex, colIndex, e.target.value)}
                                                                                className="w-full text-xs bg-transparent resize-none border-0 focus:ring-1 focus:ring-primary rounded p-1"
                                                                                rows={2}
                                                                                title={row[colIndex] || ""}
                                                                            />
                                                                        </td>
                                                                    );
                                                                })}
                                                                <td className="px-1 border">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                                                        onClick={() => deleteRow(table.id, rowIndex)}
                                                                    >
                                                                        <Trash2 className="h-3 w-3 text-destructive" />
                                                                    </Button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="w-full mt-1 text-xs h-7"
                                            onClick={() => addRow(table.id, table.columns)}
                                        >
                                            <Plus className="h-3 w-3 mr-1" />
                                            添加行
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 提取中提示 */}
            {isExtracting && (
                <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 z-50">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span className="text-sm">正在总结数据...</span>
                </div>
            )}

            {/* 提取结果提示 */}
            {extractResult && !isExtracting && (
                <div className={`fixed bottom-4 right-4 ${extractResult.success ? 'bg-green-500' : 'bg-red-500'} text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 z-50 max-w-md`}>
                    {extractResult.success ? <Check className="h-4 w-4 flex-shrink-0" /> : <X className="h-4 w-4 flex-shrink-0" />}
                    <span className="text-sm">{extractResult.message}</span>
                </div>
            )}

            {/* 整理结果提示 */}
            {organizeResult && !isOrganizing && (
                <div className={`fixed bottom-4 right-4 ${organizeResult.success ? 'bg-green-500' : 'bg-red-500'} text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 z-50 max-w-md`}>
                    {organizeResult.success ? <Check className="h-4 w-4 flex-shrink-0" /> : <X className="h-4 w-4 flex-shrink-0" />}
                    <span className="text-sm">{organizeResult.message}</span>
                </div>
            )}

            {/* 关系图弹窗 */}
            <CharacterGraph isOpen={graphOpen} onClose={() => setGraphOpen(false)} />
        </div>
    );
}
