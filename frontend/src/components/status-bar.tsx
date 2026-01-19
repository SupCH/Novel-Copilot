"use client";

import { useAppStore } from "@/store/app-store";
import { FileText, Hash, BookOpen } from "lucide-react";

export function StatusBar() {
    const { currentChapter, chapters } = useAppStore();

    // 计算总字数
    const totalWordCount = chapters.reduce((sum, ch) => sum + (ch.word_count || 0), 0);

    // 当前章节索引
    const currentIndex = currentChapter
        ? chapters.findIndex(ch => ch.id === currentChapter.id) + 1
        : 0;

    return (
        <div className="h-6 border-t bg-muted/30 px-3 flex items-center justify-between text-xs text-muted-foreground select-none">
            {/* 左侧：章节信息 */}
            <div className="flex items-center gap-4">
                {currentChapter && (
                    <>
                        <div className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            <span>第 {currentIndex}/{chapters.length} 章</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            <span>{currentChapter.word_count || 0} 字</span>
                        </div>
                    </>
                )}
            </div>

            {/* 右侧：总字数 */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                    <Hash className="h-3 w-3" />
                    <span>总计 {totalWordCount.toLocaleString()} 字</span>
                </div>
                {chapters.length > 0 && (
                    <div className="text-muted-foreground/60">
                        共 {chapters.length} 章
                    </div>
                )}
            </div>
        </div>
    );
}
