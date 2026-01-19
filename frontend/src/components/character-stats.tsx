"use client";

import { useEffect, useState, useMemo } from "react";
import { useAppStore } from "@/store/app-store";
import { dataTablesApi, DataTableResponse } from "@/lib/api";
import { BarChart3, User } from "lucide-react";

interface CharacterAppearance {
    name: string;
    total: number;
    chapters: { title: string; count: number }[];
}

export function CharacterStats() {
    const { currentProject, chapters, dataTablesRefreshKey } = useAppStore();
    const [table, setTable] = useState<DataTableResponse | null>(null);

    // 从数据表加载角色（table_type = 2 是社交关系表）
    useEffect(() => {
        if (!currentProject) return;

        dataTablesApi.list(currentProject.id)
            .then(tables => {
                const relationshipTable = tables.find(t => t.table_type === 2);
                setTable(relationshipTable || null);
            })
            .catch(console.error);
    }, [currentProject, dataTablesRefreshKey]);

    // 从数据表的第一列提取角色名列表
    const characterNames = useMemo(() => {
        if (!table || !table.rows.length) return [];
        return [...new Set(table.rows.map(row => row[0]).filter(Boolean))] as string[];
    }, [table]);

    // 计算每个角色在各章节的出场次数
    const stats = useMemo<CharacterAppearance[]>(() => {
        if (!characterNames.length || !chapters.length) return [];

        return characterNames.map(name => {
            const chaptersData = chapters.map(ch => {
                // 从章节内容中统计角色名出现次数
                const contentCount = ch.content
                    ? (ch.content.match(new RegExp(name, 'gi')) || []).length
                    : 0;

                return {
                    title: ch.title,
                    count: contentCount
                };
            });

            return {
                name,
                total: chaptersData.reduce((sum, c) => sum + c.count, 0),
                chapters: chaptersData.filter(c => c.count > 0)
            };
        }).sort((a, b) => b.total - a.total);
    }, [characterNames, chapters]);

    if (!characterNames.length) {
        return (
            <div className="p-4 text-center text-muted-foreground text-sm">
                <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>暂无角色数据</p>
                <p className="text-xs mt-1">使用"一键整理"或在"关系"页添加角色</p>
            </div>
        );
    }

    return (
        <div className="p-3 space-y-3">
            <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="text-sm font-medium">角色出场统计 ({characterNames.length}人)</span>
            </div>

            <div className="space-y-2">
                {stats.map(stat => (
                    <div
                        key={stat.name}
                        className="p-3 rounded-lg border bg-card"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                                    <User className="h-3 w-3 text-primary" />
                                </div>
                                <span className="font-medium text-sm">{stat.name}</span>
                            </div>
                            <span className="text-sm font-bold text-primary">
                                {stat.total} 次
                            </span>
                        </div>

                        {/* 进度条 */}
                        {stats.length > 0 && stats[0].total > 0 && (
                            <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
                                <div
                                    className="h-full bg-primary/60 rounded-full transition-all"
                                    style={{
                                        width: `${Math.min(100, (stat.total / stats[0].total) * 100)}%`
                                    }}
                                />
                            </div>
                        )}

                        {/* 章节分布 */}
                        {stat.chapters.length > 0 && (
                            <div className="text-xs text-muted-foreground">
                                出现在：{stat.chapters.slice(0, 3).map(c => c.title).join('、')}
                                {stat.chapters.length > 3 && ` 等 ${stat.chapters.length} 章`}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {stats.length === 0 && (
                <div className="text-center py-4 text-muted-foreground text-sm">
                    暂无出场记录
                </div>
            )}
        </div>
    );
}
