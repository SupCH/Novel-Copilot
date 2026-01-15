"use client";

import { useEffect, useCallback, useState, useMemo } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useAppStore } from "@/store/app-store";
import { chaptersApi, aiApi, dataTablesApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Sparkles, Save, Check, RefreshCw, X } from "lucide-react";
import { ContextMenu, getEditorContextMenuItems } from "@/components/context-menu";
import { CharacterHoverCard, CharacterData } from "@/components/character-hover-card";
import { CharacterHighlight, updateCharacterNames } from "@/lib/character-highlight";

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
        dataTablesRefreshKey,
    } = useAppStore();

    // AI 生成的待确认内容
    const [pendingContent, setPendingContent] = useState<string | null>(null);
    // 保存提示
    const [showSaveToast, setShowSaveToast] = useState(false);
    // 数据提取状态
    const [isExtracting, setIsExtracting] = useState(false);
    const [extractResult, setExtractResult] = useState<{ success: boolean; message: string } | null>(null);
    // 右键菜单状态
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; selectedText: string } | null>(null);
    // 人物悬停卡片状态
    const [hoverCard, setHoverCard] = useState<{ name: string; x: number; y: number } | null>(null);
    const [characterData, setCharacterData] = useState<CharacterData | null>(null);
    const [characterNames, setCharacterNames] = useState<string[]>([]);

    // 编辑器扩展配置
    const editorExtensions = useMemo(() => [
        StarterKit,
        Placeholder.configure({
            placeholder: "开始写作...\n\n输入内容后，点击 AI 续写按钮生成后续内容",
        }),
        CharacterHighlight,
    ], []);

    const editor = useEditor({
        extensions: editorExtensions,
        content: currentChapter?.content || "",
        immediatelyRender: false,
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
            setPendingContent(null);
        }
    }, [editor, currentChapter?.id]);

    // 角色名列表更新时，更新全局变量并刷新视图
    useEffect(() => {
        if (characterNames.length > 0) {
            console.log("[Editor] Updating character names:", characterNames.length);
            updateCharacterNames(characterNames);
            if (editor) {
                editor.view.dispatch(editor.state.tr);
            }
        }
    }, [editor, characterNames]);

    // 获取角色名列表
    useEffect(() => {
        async function fetchCharacterNames() {
            if (!currentProject) return;
            try {
                const tables = await dataTablesApi.list(currentProject.id);
                const charactersTable = tables.find((t: { table_type: number }) => t.table_type === 1);
                if (charactersTable && charactersTable.rows) {
                    const names = charactersTable.rows
                        .map((row: Record<number, string>) => row[0])
                        .filter((name: string | undefined): name is string => !!name && name.length >= 2);
                    setCharacterNames(names);
                }
            } catch (error) {
                console.error("Failed to fetch character names:", error);
            }
        }
        fetchCharacterNames();
    }, [currentProject, dataTablesRefreshKey]);

    // 加载角色数据的辅助函数
    const loadCharacterData = useCallback(async (name: string, x: number, y: number) => {
        if (!currentProject) return;
        try {
            const tables = await dataTablesApi.list(currentProject.id);
            const charactersTable = tables.find((t: { table_type: number }) => t.table_type === 1);
            const relationshipsTable = tables.find((t: { table_type: number }) => t.table_type === 2);

            if (charactersTable) {
                const row = charactersTable.rows.find((r: Record<number, string>) => r[0] === name);
                if (row) {
                    const charData: CharacterData = {
                        name: row[0] || name,
                        traits: row[1] || "",
                        personality: row[2] || "",
                        role: row[3] || "",
                        hobbies: row[4] || "",
                        likes: row[5] || "",
                        residence: row[6] || "",
                        other: row[7] || "",
                        relationships: [],
                    };

                    if (relationshipsTable) {
                        charData.relationships = relationshipsTable.rows
                            .filter((r: Record<number, string>) => r[0] === name)
                            .map((r: Record<number, string>) => ({
                                name: r[1] || "",
                                relation: r[2] || "",
                                attitude: r[3] || "",
                                affection: r[4] || "",
                            }));
                    }

                    setCharacterData(charData);
                    setHoverCard({ name, x, y });
                }
            }
        } catch (error) {
            console.error("Failed to load character data:", error);
        }
    }, [currentProject]);

    // 保存章节
    const handleSave = useCallback(async () => {
        if (!currentChapter || !editor) return;

        const content = editor.getHTML();
        const updated = await chaptersApi.update(currentChapter.id, { content });
        updateChapter(currentChapter.id, updated);
        setCurrentChapter(updated);

        setShowSaveToast(true);
        setTimeout(() => setShowSaveToast(false), 2000);
    }, [currentChapter, editor, updateChapter, setCurrentChapter]);

    // 自动保存 (debounced)
    useEffect(() => {
        if (!editor || !currentChapter) return;

        const handleUpdate = () => {
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

    // AI 续写
    const handleAIContinue = useCallback(async () => {
        if (!currentProject || !editor || isGenerating) return;

        const context = editor.getText();
        if (!context.trim()) {
            alert("请先输入一些内容");
            return;
        }

        setIsGenerating(true);
        setPendingContent("");

        try {
            let generated = "";
            for await (const chunk of aiApi.continueStream({
                project_id: currentProject.id,
                chapter_id: currentChapter?.id,
                context,
                config: aiConfig,
            })) {
                generated += chunk;
                setPendingContent(generated);
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
            const { content: cleanContent } = await aiApi.processTableEdit(
                currentProject.id,
                pendingContent
            );

            const htmlContent = cleanContent
                .split('\n\n')
                .filter(p => p.trim())
                .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
                .join('');

            editor.commands.focus("end");
            editor.commands.insertContent(htmlContent);

            setIsExtracting(true);
            setExtractResult(null);
            aiApi.extractData({
                projectId: currentProject.id,
                content: cleanContent,
                config: aiConfig,
            }).then(result => {
                if (result.total > 0) {
                    refreshDataTables();
                    setExtractResult({ success: true, message: `提取成功，更新了 ${result.total} 条数据` });
                } else {
                    setExtractResult({ success: true, message: "提取完成，未发现新数据" });
                }
            }).catch(err => {
                console.error("数据提取失败:", err);
                setExtractResult({ success: false, message: `提取失败: ${err.message || '未知错误'}` });
            }).finally(() => {
                setIsExtracting(false);
                setTimeout(() => setExtractResult(null), 3000);
            });

        } catch (error) {
            console.error("Failed to process content:", error);
            editor.commands.focus("end");
            editor.commands.insertContent(pendingContent);
        }

        setPendingContent(null);
    }, [editor, pendingContent, currentProject, aiConfig, refreshDataTables]);

    const handleReject = useCallback(() => {
        setPendingContent(null);
    }, []);

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
            <div
                className="flex-1 overflow-auto"
                onContextMenu={(e) => {
                    e.preventDefault();
                    const selectedText = editor?.state.selection.empty
                        ? ""
                        : editor?.state.doc.textBetween(
                            editor.state.selection.from,
                            editor.state.selection.to,
                            " "
                        ) || "";
                    setContextMenu({ x: e.clientX, y: e.clientY, selectedText });
                }}
                onClick={async (e) => {
                    // 检测是否单击在角色名 span 上
                    const target = e.target as HTMLElement;
                    const characterSpan = target.closest('.character-name') as HTMLElement;

                    if (characterSpan) {
                        const characterName = characterSpan.getAttribute('data-character-name') || characterSpan.textContent?.trim() || "";
                        console.log("[Click] Clicked on character:", characterName);

                        if (characterName && characterNames.includes(characterName)) {
                            e.preventDefault();
                            e.stopPropagation();
                            await loadCharacterData(characterName, e.clientX, e.clientY);
                        }
                    }
                }}
            >
                <EditorContent editor={editor} className="h-full" />
            </div>

            {/* 自定义右键菜单 */}
            {contextMenu && (
                <ContextMenu
                    position={{ x: contextMenu.x, y: contextMenu.y }}
                    items={getEditorContextMenuItems(
                        contextMenu.selectedText,
                        () => document.execCommand("copy"),
                        () => document.execCommand("cut"),
                        () => editor?.commands.focus() && document.execCommand("paste"),
                        async (action, text) => {
                            if (!editor) return;
                            try {
                                const response = await aiApi.modifyText({
                                    text,
                                    action,
                                    config: aiConfig,
                                });
                                if (response.success && response.result) {
                                    editor.commands.insertContent(response.result);
                                } else {
                                    alert(`修改失败: ${response.error || '未知错误'}`);
                                }
                            } catch (error) {
                                console.error("AI modify error:", error);
                                alert("AI 修改失败，请检查网络连接");
                            }
                        },
                        characterNames,
                        async (name) => {
                            await loadCharacterData(name, contextMenu.x, contextMenu.y);
                        }
                    )}
                    onClose={() => setContextMenu(null)}
                />
            )}

            {/* 角色信息卡片 */}
            {hoverCard && characterData && (
                <CharacterHoverCard
                    character={characterData}
                    position={{ x: hoverCard.x, y: hoverCard.y }}
                    onClose={() => { setHoverCard(null); setCharacterData(null); }}
                    onSave={async (data) => {
                        console.log("Save character data:", data);
                        setHoverCard(null);
                        setCharacterData(null);
                    }}
                />
            )}

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
                            <Button size="sm" variant="default" onClick={handleAccept} className="gap-1">
                                <Check className="h-4 w-4" />
                                接受
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleRegenerate} className="gap-1">
                                <RefreshCw className="h-4 w-4" />
                                重新生成
                            </Button>
                            <Button size="sm" variant="ghost" onClick={handleReject} className="gap-1 text-destructive hover:text-destructive">
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

            {/* 数据提取中提示 */}
            {isExtracting && (
                <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 z-50">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>正在总结数据...</span>
                </div>
            )}

            {/* 数据提取结果提示 */}
            {extractResult && (
                <div className={`fixed bottom-4 right-4 ${extractResult.success ? 'bg-green-500' : 'bg-red-500'} text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 z-50`}>
                    {extractResult.success ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    <span>{extractResult.message}</span>
                </div>
            )}
        </div>
    );
}
