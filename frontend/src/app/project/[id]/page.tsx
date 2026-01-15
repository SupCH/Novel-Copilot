"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAppStore } from "@/store/app-store";
import { projectsApi, Project } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ArrowLeft, PanelLeftClose, PanelRightClose, Settings } from "lucide-react";
import {
    ResizablePanelGroup,
    ResizablePanel,
    ResizableHandle,
} from "@/components/ui/resizable";

// 动态导入避免 SSR hydration 问题
const ChapterSidebar = dynamic(
    () => import("@/components/chapter-sidebar").then((mod) => mod.ChapterSidebar),
    { ssr: false }
);

const NovelEditor = dynamic(
    () => import("@/components/novel-editor").then((mod) => mod.NovelEditor),
    { ssr: false }
);

const RightPanel = dynamic(
    () => import("@/components/right-panel").then((mod) => mod.RightPanel),
    { ssr: false }
);

const SettingsDialog = dynamic(
    () => import("@/components/settings-dialog").then((mod) => mod.SettingsDialog),
    { ssr: false }
);

export default function ProjectPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;

    const {
        currentProject,
        setCurrentProject,
        sidebarOpen,
        setSidebarOpen,
        rightPanelOpen,
        setRightPanelOpen,
    } = useAppStore();

    const [settingsOpen, setSettingsOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 加载项目
    useEffect(() => {
        async function loadProject() {
            if (!projectId) return;

            // 立即清除旧项目，防止显示旧内容
            setCurrentProject(null);

            try {
                setLoading(true);
                setError(null);
                const projects = await projectsApi.list();
                const project = projects.find((p: Project) => p.id === parseInt(projectId));

                if (project) {
                    setCurrentProject(project);
                } else {
                    setError("项目不存在");
                }
            } catch (err) {
                console.error("Failed to load project:", err);
                setError("加载项目失败");
            } finally {
                setLoading(false);
            }
        }

        loadProject();
    }, [projectId, setCurrentProject]);

    // 返回首页
    const handleBack = () => {
        setCurrentProject(null);
        router.push("/");
    };

    if (loading) {
        return (
            <main className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-muted-foreground">加载中...</div>
            </main>
        );
    }

    if (error || !currentProject) {
        return (
            <main className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
                <div className="text-destructive">{error || "项目不存在"}</div>
                <Button onClick={handleBack}>返回首页</Button>
            </main>
        );
    }

    return (
        <main className="h-screen bg-background flex flex-col">
            <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

            {/* 顶部导航 */}
            <header className="h-12 border-b flex items-center px-4 gap-2 shrink-0">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBack}
                    className="gap-1"
                    title="退出项目"
                    aria-label="退出项目"
                >
                    <ArrowLeft className="h-4 w-4" />
                    返回
                </Button>

                <span className="text-sm font-medium text-muted-foreground">
                    {currentProject.title}
                </span>

                <div className="flex-1" />

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSettingsOpen(true)}
                    className="h-8 w-8"
                    title="AI 设置"
                >
                    <Settings className="h-4 w-4" />
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="h-8 w-8"
                    title={sidebarOpen ? "隐藏左侧栏" : "显示左侧栏"}
                    aria-label={sidebarOpen ? "隐藏左侧栏" : "显示左侧栏"}
                >
                    <PanelLeftClose className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setRightPanelOpen(!rightPanelOpen)}
                    className="h-8 w-8"
                    title={rightPanelOpen ? "隐藏右侧栏" : "显示右侧栏"}
                    aria-label={rightPanelOpen ? "隐藏右侧栏" : "显示右侧栏"}
                >
                    <PanelRightClose className="h-4 w-4" />
                </Button>
            </header>

            {/* 三栏布局 */}
            <div className="flex-1 overflow-hidden">
                {/* @ts-ignore - direction prop exists but types are incorrect in react-resizable-panels */}
                <ResizablePanelGroup direction="horizontal">
                    {/* 左侧栏 - 章节目录 */}
                    {sidebarOpen && (
                        <>
                            <ResizablePanel defaultSize={20} minSize={10}>
                                <ChapterSidebar />
                            </ResizablePanel>
                            <ResizableHandle />
                        </>
                    )}

                    {/* 中间 - 编辑器 */}
                    <ResizablePanel defaultSize={rightPanelOpen ? 55 : 80} minSize={20}>
                        <NovelEditor />
                    </ResizablePanel>

                    {/* 右侧栏 - 设置/关系图 */}
                    {rightPanelOpen && (
                        <>
                            <ResizableHandle withHandle />
                            <ResizablePanel defaultSize={25} minSize={10}>
                                <RightPanel />
                            </ResizablePanel>
                        </>
                    )}
                </ResizablePanelGroup>
            </div>
        </main>
    );
}
