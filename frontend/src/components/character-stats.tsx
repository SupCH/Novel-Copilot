"use client";

import { useMemo } from "react";
import { useAppStore } from "@/store/app-store";
import { BarChart3, User } from "lucide-react";

interface CharacterAppearance {
    name: string;
    total: number;
    chapters: { title: string; count: number }[];
}

export function CharacterStats() {
    const { chapters, characters } = useAppStore();

    // 计算每个角色在各章节的出场次数
    const stats = useMemo<CharacterAppearance[]>(() => {
        if (!characters.length || !chapters.length) return [];

        return characters.map(char => {
            const chaptersData = chapters.map(ch => {
                // 从 characters_mentioned 字段统计（存储的是角色 ID）
                const mentioned = ch.characters_mentioned || [];
                const count = mentioned.filter((id: number) => id === char.id).length;

                // 如果没有 characters_mentioned，从内容中简单统计
                const contentCount = ch.content
                    ? (ch.content.match(new RegExp(char.name, 'gi')) || []).length
                    : 0;

                return {
                    title: ch.title,
                    count: count || contentCount
                };
            });

            return {
                name: char.name,
                total: chaptersData.reduce((sum, c) => sum + c.count, 0),
                chapters: chaptersData.filter(c => c.count > 0)
            };
        }).sort((a, b) => b.total - a.total);
    }, [characters, chapters]);

    if (!characters.length) {
        return (
            <div className="p-4 text-center text-muted-foreground text-sm">
                <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>暂无角色数据</p>
            </div>
        );
    }

    return (
        <div className="p-3 space-y-3">
            <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="text-sm font-medium">角色出场统计</span>
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
                        <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
                            <div
                                className="h-full bg-primary/60 rounded-full transition-all"
                                style={{
                                    width: `${Math.min(100, (stat.total / Math.max(...stats.map(s => s.total))) * 100)}%`
                                }}
                            />
                        </div>

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
