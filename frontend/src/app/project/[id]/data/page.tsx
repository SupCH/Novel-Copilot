"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { projectsApi, Project } from "@/lib/api";
import { DataTablesPanel } from "@/components/data-tables-panel";

// Cloudflare Pages Edge Runtime
export const runtime = 'edge';

export default function DataPage() {
    const params = useParams();
    const projectId = params.id as string;
    const { currentProject, setCurrentProject } = useAppStore();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 加载项目
    useEffect(() => {
        async function loadProject() {
            if (!projectId) return;

            try {
                setLoading(true);
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

        // 如果当前项目 ID 不匹配，重新加载
        if (!currentProject || currentProject.id !== parseInt(projectId)) {
            loadProject();
        } else {
            setLoading(false);
        }
    }, [projectId, currentProject, setCurrentProject]);

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">加载数据面板...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <div className="text-center text-destructive">
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    if (!currentProject) {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <p className="text-muted-foreground">请选择一个项目</p>
            </div>
        );
    }

    return (
        <div className="h-screen overflow-hidden bg-background">
            <div className="h-full p-4">
                <h1 className="text-xl font-bold mb-4 flex items-center gap-2">
                    📊 {currentProject.title} - 数据面板
                    <span className="text-sm font-normal text-muted-foreground">
                        （独立窗口模式）
                    </span>
                </h1>
                <div className="h-[calc(100vh-100px)] border rounded-lg overflow-hidden">
                    <DataTablesPanel />
                </div>
            </div>
        </div>
    );
}
