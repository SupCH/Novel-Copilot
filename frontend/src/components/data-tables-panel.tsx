"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/store/app-store";
import { dataTablesApi, DataTableResponse } from "@/lib/api";
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
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";

export function DataTablesPanel() {
    const { currentProject, dataTablesRefreshKey } = useAppStore();
    const [tables, setTables] = useState<DataTableResponse[]>([]);
    const [expandedTables, setExpandedTables] = useState<Set<number>>(new Set([1, 2]));
    const [loading, setLoading] = useState(false);

    // 确认对话框状态
    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean;
        tableId: number;
        tableName: string;
    }>({ open: false, tableId: 0, tableName: "" });

    // 清空所有对话框
    const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);

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
        <div className="h-full overflow-auto">
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

            <div className="p-3 space-y-2">
                {/* 过滤掉 #2 社交关系表 */}
                {tables.filter(t => t.table_type !== 2).map(table => (
                    <div key={table.id} className="border rounded-lg overflow-hidden">
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
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="border-b">
                                                    {table.columns.map((col, i) => (
                                                        <th key={i} className="px-2 py-1 text-left font-medium text-muted-foreground whitespace-nowrap">
                                                            {col}
                                                        </th>
                                                    ))}
                                                    <th className="w-8"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {table.rows.map((row, rowIndex) => (
                                                    <tr key={rowIndex} className="border-b last:border-b-0 group">
                                                        {table.columns.map((_, colIndex) => (
                                                            <td key={colIndex} className="px-1 py-1 min-w-[100px] align-top">
                                                                <textarea
                                                                    value={row[colIndex] || ""}
                                                                    onChange={(e) => updateCell(table.id, table.table_type, rowIndex, colIndex, e.target.value)}
                                                                    className="w-full text-xs bg-transparent resize-none border-0 focus:ring-1 focus:ring-primary rounded p-1"
                                                                    rows={2}
                                                                    title={row[colIndex] || ""}
                                                                />
                                                            </td>
                                                        ))}
                                                        <td className="px-1">
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
    );
}
