"use client";

import { useEffect, useCallback, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useAppStore } from "@/store/app-store";
import { chaptersApi, aiApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Sparkles, Save, Check, RefreshCw, X } from "lucide-react";

export function NovelEditor() {
    const {
        currentProject,
        currentChapter,
        setCurrentChapter,
        updateChapter,
        isGenerating,
        setIsGenerating,
        aiConfig,
        refreshDataTables,
    } = useAppStore();

    // AI 生成的待确认内容
    const [pendingContent, setPendingContent] = useState<string | null>(null);

    // 保存提示
    const [showSaveToast, setShowSaveToast] = useState(false);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: "开始写作...\n\n输入内容后，点击 AI 续写按钮生成后续内容",
            }),
        ],
        content: currentChapter?.content || "",
        immediatelyRender: false, // 避免 SSR hydration 不匹配
        editorProps: {
            attributes: {
                class:
                    "prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none focus:outline-none min-h-[calc(100vh-200px)] p-4",
            },
        },
    });

    // 章节切换时更新编辑器内容
    useEffect(() => {
        if (editor && currentChapter) {
            editor.commands.setContent(currentChapter.content || "");
            setPendingContent(null); // 清空待确认内容
        }
    }, [editor, currentChapter?.id]);

    // 保存章节
    const handleSave = useCallback(async () => {
        if (!currentChapter || !editor) return;

        const content = editor.getHTML();
        const updated = await chaptersApi.update(currentChapter.id, { content });
        updateChapter(currentChapter.id, updated);
        setCurrentChapter(updated);

        // 显示保存提示
        setShowSaveToast(true);
        setTimeout(() => setShowSaveToast(false), 2000);
    }, [currentChapter, editor, updateChapter, setCurrentChapter]);

    // 自动保存 (debounced)
    useEffect(() => {
        if (!editor || !currentChapter) return;

        const handleUpdate = () => {
            // 保存定时器 ID
            const timerId = setTimeout(() => {
                handleSave();
            }, 2000);

            return () => clearTimeout(timerId);
        };

        editor.on("update", handleUpdate);
        return () => {
            editor.off("update", handleUpdate);
        };
    }, [editor, currentChapter, handleSave]);

    // AI 续写 - 生成到 pending 状态
    const handleAIContinue = useCallback(async () => {
        if (!currentProject || !editor || isGenerating) return;

        const context = editor.getText();
        if (!context.trim()) {
            alert("请先输入一些内容");
            return;
        }

        setIsGenerating(true);
        setPendingContent(""); // 开始生成

        try {
            let generated = "";
            for await (const chunk of aiApi.continueStream({
                project_id: currentProject.id,
                context,
                config: aiConfig,
            })) {
                generated += chunk;
                setPendingContent(generated); // 实时更新预览
            }
        } catch (error) {
            console.error("AI continue error:", error);
            alert("AI 续写失败，请检查后端服务");
            setPendingContent(null);
        } finally {
            setIsGenerating(false);
        }
    }, [currentProject, editor, isGenerating, setIsGenerating, aiConfig]);

    // 接受 AI 生成的内容
    const handleAccept = useCallback(async () => {
        if (!editor || !pendingContent || !currentProject) return;

        try {
            // 1. 清理内容（移除可能混入的代码）
            const { content: cleanContent } = await aiApi.processTableEdit(
                currentProject.id,
                pendingContent
            );

            // 2. 插入清理后的内容到编辑器
            editor.commands.focus("end");
            editor.commands.insertContent(cleanContent);

            // 3. 异步提取数据并更新表格（不阻塞用户操作）
            aiApi.extractData({
                projectId: currentProject.id,
                content: cleanContent,
                config: aiConfig,
            }).then(result => {
                if (result.total > 0) {
                    console.log(`自动提取数据: ${JSON.stringify(result.updates)}`);
                    // 刷新数据表面板
                    refreshDataTables();
                }
            }).catch(err => {
                console.error("数据提取失败:", err);
            });

        } catch (error) {
            console.error("Failed to process content:", error);
            // 如果处理失败，直接插入原始内容
            editor.commands.focus("end");
            editor.commands.insertContent(pendingContent);
        }

        setPendingContent(null);
    }, [editor, pendingContent, currentProject, aiConfig]);

    // 拒绝 AI 生成的内容
    const handleReject = useCallback(() => {
        setPendingContent(null);
    }, []);

    // 重新生成
    const handleRegenerate = useCallback(() => {
        setPendingContent(null);
        handleAIContinue();
    }, [handleAIContinue]);

    // 快捷键
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                e.preventDefault();
                handleSave();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [handleSave]);

    if (!currentChapter) {
        return (
            <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                    <p className="text-lg mb-2">选择一个章节开始写作</p>
                    <p className="text-sm">或在左侧创建新章节</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* 工具栏 */}
            <div className="border-b p-2 flex items-center justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex items-center gap-2">
                    <h3 className="font-medium">{currentChapter.title}</h3>
                    <span className="text-xs text-muted-foreground">
                        {currentChapter.word_count} 字
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSave}
                        className="gap-1"
                    >
                        <Save className="h-4 w-4" />
                        保存
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleAIContinue}
                        disabled={isGenerating || pendingContent !== null}
                        className="gap-1"
                    >
                        <Sparkles className="h-4 w-4" />
                        {isGenerating ? "生成中..." : "AI 续写"}
                    </Button>
                </div>
            </div>

            {/* 编辑器 */}
            <div className="flex-1 overflow-auto">
                <EditorContent editor={editor} className="h-full" />
            </div>

            {/* AI 生成内容预览 */}
            {pendingContent !== null && (
                <div className="border-t bg-muted/30">
                    <div className="p-3 border-b bg-amber-50 dark:bg-amber-950/30">
                        <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                            <Sparkles className="h-4 w-4" />
                            <span>AI 生成内容预览</span>
                            {isGenerating && <span className="animate-pulse">生成中...</span>}
                        </div>
                    </div>
                    <div className="p-4 max-h-[200px] overflow-auto">
                        <div className="prose prose-sm max-w-none whitespace-pre-wrap text-foreground/80">
                            {pendingContent || <span className="text-muted-foreground italic">等待生成...</span>}
                        </div>
                    </div>
                    {!isGenerating && pendingContent && (
                        <div className="p-2 border-t flex items-center gap-2 bg-background">
                            <Button
                                size="sm"
                                variant="default"
                                onClick={handleAccept}
                                className="gap-1"
                            >
                                <Check className="h-4 w-4" />
                                接受
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleRegenerate}
                                className="gap-1"
                            >
                                <RefreshCw className="h-4 w-4" />
                                重新生成
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleReject}
                                className="gap-1 text-destructive hover:text-destructive"
                            >
                                <X className="h-4 w-4" />
                                拒绝
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* 保存成功提示 */}
            {showSaveToast && (
                <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 z-50">
                    <Check className="h-4 w-4" />
                    <span>已保存</span>
                </div>
            )}
        </div>
    );
}
