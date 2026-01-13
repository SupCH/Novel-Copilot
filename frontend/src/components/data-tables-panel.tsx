"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/store/app-store";
import { dataTablesApi, DataTableResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";

export function DataTablesPanel() {
    const { currentProject, dataTablesRefreshKey } = useAppStore();
    const [tables, setTables] = useState<DataTableResponse[]>([]);
    const [expandedTables, setExpandedTables] = useState<Set<number>>(new Set([1, 2])); // 默认展开角色和社交表
    const [loading, setLoading] = useState(false);

    // 加载数据表 - 当 refreshKey 变化时也重新加载
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

        // 乐观更新
        setTables(prev => prev.map(t =>
            t.id === tableId ? { ...t, rows: newRows } : t
        ));

        // 保存到后端 (debounced)
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
            <div className="p-3 space-y-2">
                {/* 过滤掉 #2 社交关系表（它在"关系"标签页显示） */}
                {tables.filter(t => t.table_type !== 2).map(table => (
                    <div key={table.id} className="border rounded-lg overflow-hidden">
                        {/* 表格头部 */}
                        <button
                            className="w-full px-3 py-2 flex items-center gap-2 bg-muted/50 hover:bg-muted text-left text-sm font-medium"
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
