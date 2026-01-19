"use client";

import { useAppStore } from "@/store/app-store";
import { FileText, Hash, BookOpen, Layers } from "lucide-react";

export function StatusBar() {
    const { currentChapter, chapters } = useAppStore();

    // 计算总字数
    const totalWordCount = chapters.reduce((sum, ch) => sum + (ch.word_count || 0), 0);

    // 当前章节索引
    const currentIndex = currentChapter
        ? chapters.findIndex(ch => ch.id === currentChapter.id) + 1
        : 0;

    return (
        <div className="h-7 border-t bg-muted/50 px-4 flex items-center justify-between text-xs select-none shrink-0">
            {/* 左侧：章节信息 */}
            <div className="flex items-center gap-4 text-foreground/70">
                {currentChapter ? (
                    <>
                        <div className="flex items-center gap-1.5">
                            <BookOpen className="h-3.5 w-3.5" />
                            <span>第 {currentIndex}/{chapters.length} 章</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5" />
                            <span>{(currentChapter.word_count || 0).toLocaleString()} 字</span>
                        </div>
                    </>
                ) : (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>未选择章节</span>
                    </div>
                )}
            </div>

            {/* 右侧：总字数 */}
            <div className="flex items-center gap-4 text-foreground/70">
                <div className="flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5" />
                    <span>总计 {totalWordCount.toLocaleString()} 字</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5" />
                    <span>{chapters.length} 章</span>
                </div>
            </div>
        </div>
    );
}
