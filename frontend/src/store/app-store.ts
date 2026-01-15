/**
 * Novel-Copilot 全局状态管理
 * 使用 Zustand
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Project, Chapter, Character, Relationship } from "@/lib/api";

interface AppState {
    // 当前项目
    currentProject: Project | null;
    setCurrentProject: (project: Project | null) => void;

    // 章节列表
    chapters: Chapter[];
    setChapters: (chapters: Chapter[]) => void;
    addChapter: (chapter: Chapter) => void;
    updateChapter: (id: number, data: Partial<Chapter>) => void;
    removeChapter: (id: number) => void;

    // 当前编辑章节
    currentChapter: Chapter | null;
    setCurrentChapter: (chapter: Chapter | null) => void;

    // 角色列表
    characters: Character[];
    setCharacters: (characters: Character[]) => void;

    // 关系列表
    relationships: Relationship[];
    setRelationships: (relationships: Relationship[]) => void;

    // UI 状态
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    rightPanelOpen: boolean;
    setRightPanelOpen: (open: boolean) => void;
    rightPanelTab: "settings" | "graph" | "tables";
    setRightPanelTab: (tab: "settings" | "graph" | "tables") => void;

    // AI 状态
    isGenerating: boolean;
    setIsGenerating: (generating: boolean) => void;

    // 数据表刷新触发器
    dataTablesRefreshKey: number;
    refreshDataTables: () => void;

    // AI 配置
    aiConfig: {
        baseUrl: string;
        apiKey: string;
        model: string;
        extractModel: string;
        maxTokens: number;
    };
    setAiConfig: (config: { baseUrl: string; apiKey: string; model: string; extractModel: string; maxTokens: number }) => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            // 项目
            currentProject: null,
            setCurrentProject: (project) => set({
                currentProject: project,
                // 切换项目时清除章节状态
                chapters: [],
                currentChapter: null,
            }),

            // 章节
            chapters: [],
            setChapters: (chapters) => set({ chapters }),
            addChapter: (chapter) =>
                set((state) => ({ chapters: [...state.chapters, chapter] })),
            updateChapter: (id, data) =>
                set((state) => ({
                    chapters: state.chapters.map((ch) =>
                        ch.id === id ? { ...ch, ...data } : ch
                    ),
                })),
            removeChapter: (id) =>
                set((state) => ({
                    chapters: state.chapters.filter((ch) => ch.id !== id),
                })),

            // 当前章节
            currentChapter: null,
            setCurrentChapter: (chapter) => set({ currentChapter: chapter }),

            // 角色
            characters: [],
            setCharacters: (characters) => set({ characters }),

            // 关系
            relationships: [],
            setRelationships: (relationships) => set({ relationships }),

            // UI
            sidebarOpen: true,
            setSidebarOpen: (open) => set({ sidebarOpen: open }),
            rightPanelOpen: true,
            setRightPanelOpen: (open) => set({ rightPanelOpen: open }),
            rightPanelTab: "settings",
            setRightPanelTab: (tab) => set({ rightPanelTab: tab }),

            // AI
            isGenerating: false,
            setIsGenerating: (generating) => set({ isGenerating: generating }),

            // 数据表刷新触发器
            dataTablesRefreshKey: 0,
            refreshDataTables: () => set((state) => ({ dataTablesRefreshKey: state.dataTablesRefreshKey + 1 })),

            // 默认连接本地 Ollama
            aiConfig: {
                baseUrl: "http://localhost:11434/v1",
                apiKey: "",
                model: "gpt-4o-mini",
                extractModel: "",
                maxTokens: 500,
            },
            setAiConfig: (config) => set({ aiConfig: config }),
        }),
        {
            name: "novel-copilot-storage",
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                // 只持久化部分可配置项
                aiConfig: state.aiConfig,
                sidebarOpen: state.sidebarOpen,
                rightPanelOpen: state.rightPanelOpen,
            }),
        }
    )
);
