"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useAppStore } from "@/store/app-store";
import { projectsApi } from "@/lib/api";
import type { Project } from "@/lib/api";
import { BookOpen, Plus, Trash2, Loader2 } from "lucide-react";

export function ProjectSelector() {
    const { currentProject, setCurrentProject } = useAppStore();
    const [projects, setProjects] = useState<Project[]>([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newDesc, setNewDesc] = useState("");
    const [newWorldView, setNewWorldView] = useState("");
    const [newStyle, setNewStyle] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        projectsApi.list().then(setProjects).catch(console.error);
    }, []);

    const handleCreate = async () => {
        if (!newTitle.trim()) return;

        setIsCreating(true);
        setError(null);

        try {
            const project = await projectsApi.create({
                title: newTitle.trim(),
                description: newDesc.trim() || null,
                world_view: newWorldView.trim() || null,
                style: newStyle.trim() || null,
            });
            setProjects([project, ...projects]);
            setCurrentProject(project);
            setDialogOpen(false);
            resetForm();
        } catch (err) {
            console.error("创建作品失败:", err);
            setError(err instanceof Error ? err.message : "创建失败，请重试");
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("删除项目将删除所有相关数据，确定？")) return;
        await projectsApi.delete(id);
        setProjects(projects.filter((p) => p.id !== id));
        if (currentProject?.id === id) {
            setCurrentProject(null);
        }
    };

    const resetForm = () => {
        setNewTitle("");
        setNewDesc("");
        setNewWorldView("");
        setNewStyle("");
    };

    return (
        <div className="p-4">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-bold">我的作品</h1>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="gap-1">
                            <Plus className="h-4 w-4" />
                            新建
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>创建新作品</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                            <div>
                                <label className="text-sm font-medium">作品标题 *</label>
                                <Input
                                    placeholder="例：星际迷航"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">简介</label>
                                <Textarea
                                    placeholder="简单描述你的故事..."
                                    value={newDesc}
                                    onChange={(e) => setNewDesc(e.target.value)}
                                    rows={2}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">世界观设定</label>
                                <Textarea
                                    placeholder="例：公元3000年，人类已殖民银河系..."
                                    value={newWorldView}
                                    onChange={(e) => setNewWorldView(e.target.value)}
                                    rows={3}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">写作风格</label>
                                <Input
                                    placeholder="例：科幻、悬疑、轻松幽默"
                                    value={newStyle}
                                    onChange={(e) => setNewStyle(e.target.value)}
                                />
                            </div>
                            {error && (
                                <p className="text-sm text-destructive">{error}</p>
                            )}
                            <Button
                                type="button"
                                onClick={handleCreate}
                                className="w-full"
                                disabled={isCreating || !newTitle.trim()}
                            >
                                {isCreating ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        创建中...
                                    </>
                                ) : (
                                    "创建作品"
                                )}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {projects.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>还没有作品，点击"新建"开始创作</p>
                </div>
            ) : (
                <div className="grid gap-3">
                    {projects.map((project) => (
                        <div
                            key={project.id}
                            onClick={() => setCurrentProject(project)}
                            className={`
                p-4 rounded-lg border cursor-pointer transition-all group
                hover:border-primary hover:shadow-md
                ${currentProject?.id === project.id ? "border-primary bg-primary/5" : ""}
              `}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold truncate">{project.title}</h3>
                                    {project.description && (
                                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                            {project.description}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                        {project.style && (
                                            <span className="px-2 py-0.5 bg-secondary rounded">
                                                {project.style}
                                            </span>
                                        )}
                                        <span>
                                            更新于 {new Date(project.updated_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 opacity-0 group-hover:opacity-100"
                                    onClick={(e) => handleDelete(project.id, e)}
                                    title="删除项目"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
