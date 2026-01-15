"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { useAppStore } from "@/store/app-store";
import { projectsApi, dataApi } from "@/lib/api";
import type { Project } from "@/lib/api";
import { BookOpen, Plus, Trash2, Loader2, FileUp, FileDown, AlertTriangle } from "lucide-react";

export function ProjectSelector() {
    const router = useRouter();
    const { currentProject, setCurrentProject } = useAppStore();
    const [projects, setProjects] = useState<Project[]>([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newDesc, setNewDesc] = useState("");
    const [newWorldView, setNewWorldView] = useState("");
    const [newStyle, setNewStyle] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Import related state
    const [isImporting, setIsImporting] = useState(false);
    const [warningDialogOpen, setWarningDialogOpen] = useState(false);
    const [importWarnings, setImportWarnings] = useState<string[]>([]);
    const [importedProjectId, setImportedProjectId] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
            router.push(`/project/${project.id}`);
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

    // Import functionality
    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        setError(null);

        try {
            const result = await dataApi.importProject(file);

            if (result.warnings && result.warnings.length > 0) {
                setImportWarnings(result.warnings);
                setImportedProjectId(result.project_id);
                setWarningDialogOpen(true);
            }

            // Refresh project list
            const updatedProjects = await projectsApi.list();
            setProjects(updatedProjects);

            // Select the imported project
            const importedProject = updatedProjects.find(p => p.id === result.project_id);
            if (importedProject) {
                setCurrentProject(importedProject);
            }
        } catch (err) {
            console.error("导入失败:", err);
            setError(err instanceof Error ? err.message : "导入失败，请检查文件格式");
        } finally {
            setIsImporting(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    // Export functionality
    const handleExport = async (projectId: number, projectTitle: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const data = await dataApi.exportProject(projectId);
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${projectTitle}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("导出失败:", err);
            setError(err instanceof Error ? err.message : "导出失败");
        }
    };

    return (
        <div className="p-4">
            {/* Hidden file input */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".json"
                className="hidden"
            />

            {/* Warning Dialog */}
            <Dialog open={warningDialogOpen} onOpenChange={setWarningDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-amber-600">
                            <AlertTriangle className="h-5 w-5" />
                            导入警告
                        </DialogTitle>
                        <DialogDescription>
                            项目已成功导入，但发现以下信息缺失：
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                            {importWarnings.map((warning, index) => (
                                <li key={index}>{warning}</li>
                            ))}
                        </ul>
                        <p className="mt-4 text-sm">
                            建议：在项目设置中补充这些信息，以便 AI 更好地理解您的创作背景。
                        </p>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setWarningDialogOpen(false)}>
                            我知道了
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-bold">我的作品</h1>
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={handleImportClick}
                        disabled={isImporting}
                    >
                        {isImporting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <FileUp className="h-4 w-4" />
                        )}
                        导入
                    </Button>
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
            </div>

            {error && (
                <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                    {error}
                </div>
            )}

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
                            onClick={() => router.push(`/project/${project.id}`)}
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
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={(e) => handleExport(project.id, project.title, e)}
                                        title="导出项目"
                                    >
                                        <FileDown className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={(e) => handleDelete(project.id, e)}
                                        title="删除项目"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

