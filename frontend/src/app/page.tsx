"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { ArrowLeft, PanelLeftClose, PanelRightClose, Settings } from "lucide-react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

// 动态导入避免 SSR hydration 问题
const ProjectSelector = dynamic(
  () => import("@/components/project-selector").then((mod) => mod.ProjectSelector),
  { ssr: false }
);

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

export default function Home() {
  const {
    currentProject,
    setCurrentProject,
    sidebarOpen,
    setSidebarOpen,
    rightPanelOpen,
    setRightPanelOpen,
  } = useAppStore();

  const [settingsOpen, setSettingsOpen] = useState(false);

  // 未选择项目时显示项目选择器
  if (!currentProject) {
    return (
      <main className="min-h-screen bg-background">
        <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
        <div className="max-w-4xl mx-auto py-8">
          <div className="flex justify-end mb-4 px-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSettingsOpen(true)}
              title="AI 设置"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
          <ProjectSelector />
        </div>
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
          onClick={() => setCurrentProject(null)}
          className="gap-1"
          title="退出项目"
          aria-label="退出项目"
        >
          <ArrowLeft className="h-4 w-4" />
          返回
        </Button>
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
