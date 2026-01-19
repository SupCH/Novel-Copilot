"use client";

import { useEffect, useState, useMemo } from "react";
import { useAppStore } from "@/store/app-store";
import { dataTablesApi, DataTableResponse } from "@/lib/api";
import { GitBranch, ChevronDown, ChevronRight, User } from "lucide-react";

interface RelationshipRecord {
    relation: string;
    attitude: string;
    affection: string;
}

interface GroupedCharacter {
    name: string;
    relationships: RelationshipRecord[];
}

export function RelationshipTimeline() {
    const { currentProject, dataTablesRefreshKey } = useAppStore();
    const [table, setTable] = useState<DataTableResponse | null>(null);
    const [expandedNames, setExpandedNames] = useState<Set<string>>(new Set());

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

    // 按角色名分组
    const groupedCharacters = useMemo<GroupedCharacter[]>(() => {
        if (!table || !table.rows.length) return [];

        const groups: Record<string, RelationshipRecord[]> = {};

        table.rows
            .filter(row => row[0]) // 只保留有角色名的行
            .forEach(row => {
                const name = row[0] || "";
                if (!groups[name]) {
                    groups[name] = [];
                }
                groups[name].push({
                    relation: row[1] || "",
                    attitude: row[2] || "",
                    affection: row[3] || "",
                });
            });

        return Object.entries(groups).map(([name, relationships]) => ({
            name,
            relationships,
        }));
    }, [table]);

    const toggleExpand = (name: string) => {
        setExpandedNames(prev => {
            const next = new Set(prev);
            if (next.has(name)) {
                next.delete(name);
            } else {
                next.add(name);
            }
            return next;
        });
    };

    if (!groupedCharacters.length) {
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
                <span className="text-sm font-medium">角色关系 ({groupedCharacters.length}人)</span>
            </div>

            {/* 按角色分组的关系列表 */}
            <div className="space-y-2">
                {groupedCharacters.map((group) => {
                    const isExpanded = expandedNames.has(group.name);
                    const hasMultiple = group.relationships.length > 1;

                    return (
                        <div key={group.name} className="rounded-lg border bg-card overflow-hidden">
                            {/* 角色名标题 */}
                            <div
                                className={`p-3 flex items-center gap-2 ${hasMultiple ? 'cursor-pointer hover:bg-accent/50' : ''}`}
                                onClick={() => hasMultiple && toggleExpand(group.name)}
                            >
                                {hasMultiple && (
                                    isExpanded
                                        ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                        : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                )}
                                <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                    <User className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                </div>
                                <span className="font-medium text-sm">{group.name}</span>
                                <span className="text-xs text-muted-foreground ml-auto">
                                    {group.relationships.length} 条关系
                                </span>
                            </div>

                            {/* 关系详情 */}
                            <div className={`border-t ${!hasMultiple || isExpanded ? 'block' : 'hidden'}`}>
                                {group.relationships.map((rel, idx) => (
                                    <div
                                        key={idx}
                                        className={`px-3 py-2 flex flex-wrap gap-2 text-xs ${idx > 0 ? 'border-t' : ''}`}
                                    >
                                        {rel.relation && (
                                            <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                                                {rel.relation}
                                            </span>
                                        )}
                                        {rel.attitude && (
                                            <span className="px-2 py-0.5 rounded bg-muted">
                                                {rel.attitude}
                                            </span>
                                        )}
                                        {rel.affection && (
                                            <span className="px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                                                {rel.affection}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
