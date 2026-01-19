"use client";

import { useMemo } from "react";
import { useAppStore } from "@/store/app-store";
import { GitBranch, ArrowRight, User } from "lucide-react";

export function RelationshipTimeline() {
    const { relationships, characters, chapters } = useAppStore();

    // 按创建时间排序的关系列表
    const sortedRelationships = useMemo(() => {
        return [...relationships].sort((a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
    }, [relationships]);

    // 获取角色名称
    const getCharacterName = (id: number) => {
        return characters.find(c => c.id === id)?.name || `角色#${id}`;
    };

    // 格式化时间
    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString("zh-CN", {
            month: "short",
            day: "numeric",
        });
    };

    if (!relationships.length) {
        return (
            <div className="p-4 text-center text-muted-foreground text-sm">
                <GitBranch className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>暂无关系记录</p>
                <p className="text-xs mt-1">添加角色关系后将显示时间线</p>
            </div>
        );
    }

    return (
        <div className="p-3 space-y-3">
            <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                <span className="text-sm font-medium">关系时间线</span>
            </div>

            {/* 时间线 */}
            <div className="relative">
                {/* 时间线轴 */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

                <div className="space-y-3">
                    {sortedRelationships.map((rel, index) => (
                        <div key={rel.id} className="relative pl-10">
                            {/* 时间线点 */}
                            <div className="absolute left-2.5 top-3 w-3 h-3 rounded-full bg-primary border-2 border-background" />

                            <div className="p-3 rounded-lg border bg-card">
                                {/* 时间 */}
                                <div className="text-xs text-muted-foreground mb-2">
                                    {formatTime(rel.created_at)}
                                </div>

                                {/* 关系内容 */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                        <User className="h-3 w-3" />
                                        <span className="text-sm font-medium">
                                            {getCharacterName(rel.source_id)}
                                        </span>
                                    </div>

                                    <ArrowRight className="h-4 w-4 text-muted-foreground" />

                                    <div className="px-2 py-1 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                                        <span className="text-sm">{rel.relation_type}</span>
                                    </div>

                                    <ArrowRight className="h-4 w-4 text-muted-foreground" />

                                    <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                                        <User className="h-3 w-3" />
                                        <span className="text-sm font-medium">
                                            {getCharacterName(rel.target_id)}
                                        </span>
                                    </div>
                                </div>

                                {/* 描述 */}
                                {rel.description && (
                                    <p className="text-xs text-muted-foreground mt-2">
                                        {rel.description}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
