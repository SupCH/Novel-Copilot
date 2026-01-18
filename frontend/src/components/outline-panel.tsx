"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/store/app-store";
import { projectsApi, chaptersApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Save, BookOpen, FileText } from "lucide-react";

export function OutlinePanel() {
    const { currentProject, setCurrentProject, currentChapter, updateChapter } = useAppStore();

    // 项目大纲
    const [projectOutline, setProjectOutline] = useState("");
    // 章节大纲
    const [chapterOutline, setChapterOutline] = useState("");
    // 保存状态
    const [isSavingProject, setIsSavingProject] = useState(false);
    const [isSavingChapter, setIsSavingChapter] = useState(false);
    const [savedProject, setSavedProject] = useState(false);
    const [savedChapter, setSavedChapter] = useState(false);

    // 初始化项目大纲
    useEffect(() => {
        if (currentProject) {
            setProjectOutline(currentProject.outline || "");
        }
    }, [currentProject]);

    // 初始化章节大纲
    useEffect(() => {
        if (currentChapter) {
            setChapterOutline(currentChapter.chapter_outline || "");
        } else {
            setChapterOutline("");
        }
    }, [currentChapter]);

    // 保存项目大纲
    const handleSaveProjectOutline = useCallback(async () => {
        if (!currentProject) return;

        setIsSavingProject(true);
        try {
            const updated = await projectsApi.update(currentProject.id, {
                outline: projectOutline,
            });
            setCurrentProject(updated);
            setSavedProject(true);
            setTimeout(() => setSavedProject(false), 2000);
        } catch (error) {
            console.error("Failed to save project outline:", error);
        } finally {
            setIsSavingProject(false);
        }
    }, [currentProject, projectOutline, setCurrentProject]);

    // 保存章节大纲
    const handleSaveChapterOutline = useCallback(async () => {
        if (!currentChapter) return;

        setIsSavingChapter(true);
        try {
            const updated = await chaptersApi.update(currentChapter.id, {
                chapter_outline: chapterOutline,
            });
            updateChapter(currentChapter.id, updated);
            setSavedChapter(true);
            setTimeout(() => setSavedChapter(false), 2000);
        } catch (error) {
            console.error("Failed to save chapter outline:", error);
        } finally {
            setIsSavingChapter(false);
        }
    }, [currentChapter, chapterOutline, updateChapter]);

    if (!currentProject) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground">
                请选择一个项目
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full p-4 gap-4 overflow-auto">
            {/* 项目总大纲 */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-medium">
                        <BookOpen className="h-4 w-4" />
                        <span>剧情大纲</span>
                    </div>
                    <Button
                        size="sm"
                        variant={savedProject ? "default" : "outline"}
                        onClick={handleSaveProjectOutline}
                        disabled={isSavingProject}
                        className="h-7 text-xs gap-1"
                    >
                        <Save className="h-3 w-3" />
                        {savedProject ? "已保存" : "保存"}
                    </Button>
                </div>
                <Textarea
                    value={projectOutline}
                    onChange={(e) => setProjectOutline(e.target.value)}
                    placeholder="在此编写小说的总体剧情大纲...&#10;&#10;例如：&#10;主角苏二狸是太一剑宗的弟子，偶然发现了一个上古秘密...&#10;第一卷：入门修炼&#10;第二卷：江湖历练&#10;..."
                    className="min-h-[150px] text-sm resize-y"
                />
                <p className="text-xs text-muted-foreground">
                    AI 续写时会参考此大纲，保持故事走向一致
                </p>
            </div>

            {/* 分隔线 */}
            <div className="border-t my-2" />

            {/* 章节大纲 */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-medium">
                        <FileText className="h-4 w-4" />
                        <span>章节大纲</span>
                        {currentChapter && (
                            <span className="text-xs text-muted-foreground">
                                ({currentChapter.title})
                            </span>
                        )}
                    </div>
                    <Button
                        size="sm"
                        variant={savedChapter ? "default" : "outline"}
                        onClick={handleSaveChapterOutline}
                        disabled={isSavingChapter || !currentChapter}
                        className="h-7 text-xs gap-1"
                    >
                        <Save className="h-3 w-3" />
                        {savedChapter ? "已保存" : "保存"}
                    </Button>
                </div>
                {currentChapter ? (
                    <>
                        <Textarea
                            value={chapterOutline}
                            onChange={(e) => setChapterOutline(e.target.value)}
                            placeholder="在此编写本章的详细大纲...&#10;&#10;例如：&#10;本章主角在剑阁遇到神秘老者&#10;老者传授剑法口诀&#10;主角初步领悟剑意"
                            className="min-h-[120px] text-sm resize-y"
                        />
                        <p className="text-xs text-muted-foreground">
                            AI 会根据本章大纲生成更贴合的内容
                        </p>
                    </>
                ) : (
                    <div className="text-sm text-muted-foreground py-4 text-center border rounded-md">
                        请先选择一个章节
                    </div>
                )}
            </div>

            {/* 章节摘要（只读显示） */}
            {currentChapter && (
                <>
                    <div className="border-t my-2" />
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 font-medium text-muted-foreground">
                            <span>📝 章节摘要</span>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-md text-sm">
                            {currentChapter.summary || (
                                <span className="text-muted-foreground italic">
                                    暂无摘要，点击编辑器上方的"生成摘要"按钮生成
                                </span>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
