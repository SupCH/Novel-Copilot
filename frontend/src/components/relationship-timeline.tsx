"use client";

import { useEffect, useState, useMemo } from "react";
import { useAppStore } from "@/store/app-store";
import { dataTablesApi, DataTableResponse } from "@/lib/api";
import { GitBranch, ArrowRight, User } from "lucide-react";

interface RelationshipRecord {
    name: string;
    relation: string;
    attitude: string;
    affection: string;
}

export function RelationshipTimeline() {
    const { currentProject, dataTablesRefreshKey } = useAppStore();
    const [table, setTable] = useState<DataTableResponse | null>(null);

    // 从数据表加载关系（table_type = 2 是社交关系表）
    useEffect(() => {
        if (!currentProject) return;

        dataTablesApi.list(currentProject.id)
            .then(tables => {
                const relationshipTable = tables.find(t => t.table_type === 2);
                setTable(relationshipTable || null);
            })
            .catch(console.error);
    }, [currentProject, dataTablesRefreshKey]);

    // 从数据表转换为关系记录列表
    const relationships = useMemo<RelationshipRecord[]>(() => {
        if (!table || !table.rows.length) return [];

        return table.rows
            .filter(row => row[0]) // 只保留有角色名的行
            .map(row => ({
                name: row[0] || "",
                relation: row[1] || "",
                attitude: row[2] || "",
                affection: row[3] || "",
            }));
    }, [table]);

    if (!relationships.length) {
        return (
            <div className="p-4 text-center text-muted-foreground text-sm">
                <GitBranch className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>暂无关系记录</p>
                <p className="text-xs mt-1">使用"一键整理"或在"关系"页添加关系</p>
            </div>
        );
    }

    return (
        <div className="p-3 space-y-3">
            <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                <span className="text-sm font-medium">角色关系 ({relationships.length}条)</span>
            </div>

            {/* 关系列表 */}
            <div className="relative">
                {/* 时间线轴 */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

                <div className="space-y-3">
                    {relationships.map((rel, index) => (
                        <div key={index} className="relative pl-10">
                            {/* 时间线点 */}
                            <div className="absolute left-2.5 top-3 w-3 h-3 rounded-full bg-primary border-2 border-background" />

                            <div className="p-3 rounded-lg border bg-card">
                                {/* 角色名 */}
                                <div className="flex items-center gap-2 flex-wrap mb-2">
                                    <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                        <User className="h-3 w-3" />
                                        <span className="text-sm font-medium">
                                            {rel.name}
                                        </span>
                                    </div>

                                    {rel.relation && (
                                        <>
                                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                            <div className="px-2 py-1 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                                                <span className="text-sm">{rel.relation}</span>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* 态度和好感 */}
                                <div className="flex flex-wrap gap-2 text-xs">
                                    {rel.attitude && (
                                        <span className="px-2 py-0.5 rounded bg-muted">{rel.attitude}</span>
                                    )}
                                    {rel.affection && (
                                        <span className="px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                                            {rel.affection}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
