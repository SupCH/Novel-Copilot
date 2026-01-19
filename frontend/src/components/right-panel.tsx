"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { CharacterGraph } from "@/components/character-graph";
import { DataTablesPanel } from "@/components/data-tables-panel";
import { RelationshipsTable } from "@/components/relationships-table";
import { OutlinePanel } from "@/components/outline-panel";
import { useAppStore } from "@/store/app-store";
import { charactersApi, relationshipsApi, projectsApi } from "@/lib/api";
import { Settings, Network, Plus, User, Pencil, Table2, BookOpen, History, BarChart3, GitBranch } from "lucide-react";
import type { Character } from "@/lib/api";
import { SnapshotPanel } from "@/components/snapshot-panel";
import { CharacterStats } from "@/components/character-stats";
import { RelationshipTimeline } from "@/components/relationship-timeline";

export function RightPanel() {
    const {
        currentProject,
        setCurrentProject,
        characters,
        setCharacters,
        relationships,
        setRelationships,
        rightPanelTab,
        setRightPanelTab,
    } = useAppStore();

    const [newCharName, setNewCharName] = useState("");
    const [newCharBio, setNewCharBio] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);

    // 项目设置编辑
    const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
    const [editStyle, setEditStyle] = useState("");
    const [editWorldView, setEditWorldView] = useState("");
    const [editPerspective, setEditPerspective] = useState("third");

    // 加载角色和关系
    useEffect(() => {
        if (currentProject) {
            charactersApi.list(currentProject.id).then(setCharacters);
            relationshipsApi.list(currentProject.id).then(setRelationships);
        }
    }, [currentProject, setCharacters, setRelationships]);

    const handleCreateCharacter = async () => {
        if (!currentProject || !newCharName.trim()) return;

        const character = await charactersApi.create(currentProject.id, {
            name: newCharName.trim(),
            bio: newCharBio.trim() || null,
            position_x: Math.random() * 300,
            position_y: Math.random() * 300,
        });
        setCharacters([...characters, character]);
        setNewCharName("");
        setNewCharBio("");
        setDialogOpen(false);
    };

    const handleDeleteCharacter = async (id: number) => {
        if (!confirm("删除角色将同时删除相关关系，确定？")) return;
        await charactersApi.delete(id);
        setCharacters(characters.filter((c) => c.id !== id));
        setRelationships(
            relationships.filter((r) => r.source_id !== id && r.target_id !== id)
        );
    };

    const openSettingsEditor = () => {
        if (currentProject) {
            setEditStyle(currentProject.style || "");
            setEditWorldView(currentProject.world_view || "");
            setEditPerspective(currentProject.perspective || "third");
            setSettingsDialogOpen(true);
        }
    };

    // 自动保存项目设置 (debounced)
    useEffect(() => {
        if (!settingsDialogOpen || !currentProject) return;

        // 检查是否有变化
        const hasChanges =
            editStyle !== (currentProject.style || "") ||
            editWorldView !== (currentProject.world_view || "") ||
            editPerspective !== (currentProject.perspective || "third");

        if (!hasChanges) return;

        const timer = setTimeout(async () => {
            try {
                const updated = await projectsApi.update(currentProject.id, {
                    style: editStyle || null,
                    world_view: editWorldView || null,
                    perspective: editPerspective,
                });
                setCurrentProject(updated);
            } catch (error) {
                console.error("Auto-save failed:", error);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [editStyle, editWorldView, editPerspective, settingsDialogOpen, currentProject, setCurrentProject]);

    return (
        <div className="h-full flex flex-col border-l">
            {/* Tab 切换 */}
            <div className="border-b p-2 flex gap-1">
                <Button
                    variant={rightPanelTab === "settings" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setRightPanelTab("settings")}
                    className="flex-1 gap-1"
                >
                    <Settings className="h-4 w-4" />
                    设置
                </Button>
                <Button
                    variant={rightPanelTab === "graph" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setRightPanelTab("graph")}
                    className="flex-1 gap-1"
                >
                    <Network className="h-4 w-4" />
                    关系
                </Button>
                <Button
                    variant={rightPanelTab === "tables" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setRightPanelTab("tables")}
                    className="flex-1 gap-1"
                >
                    <Table2 className="h-4 w-4" />
                    数据
                </Button>
                <Button
                    variant={rightPanelTab === "outline" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setRightPanelTab("outline")}
                    className="flex-1 gap-1"
                >
                    <BookOpen className="h-4 w-4" />
                    大纲
                </Button>
                <Button
                    variant={rightPanelTab === "history" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setRightPanelTab("history")}
                    className="flex-1 gap-1"
                >
                    <History className="h-4 w-4" />
                    历史
                </Button>
            </div>

            {/* 内容区 */}
            <div className="flex-1 overflow-hidden">
                {rightPanelTab === "settings" ? (
                    <ScrollArea className="h-full">
                        <div className="p-4 space-y-6">
                            {/* 项目设置 */}
                            {currentProject && (
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-semibold text-sm">项目设置</h3>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={openSettingsEditor}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="space-y-3 text-sm">
                                        <div>
                                            <label className="text-muted-foreground">人称视角</label>
                                            <p>{
                                                currentProject.perspective === "first" ? "第一人称" :
                                                    currentProject.perspective === "omniscient" ? "上帝视角" :
                                                        "第三人称"
                                            }</p>
                                        </div>
                                        <div>
                                            <label className="text-muted-foreground">写作风格</label>
                                            <p>{currentProject.style || "未设置"}</p>
                                        </div>
                                        <div>
                                            <label className="text-muted-foreground">世界观</label>
                                            <p className="line-clamp-3">
                                                {currentProject.world_view || "未设置"}
                                            </p>
                                        </div>
                                    </div>

                                    {/* 项目设置编辑弹窗 */}
                                    <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>编辑项目设置</DialogTitle>
                                            </DialogHeader>
                                            <div className="space-y-4 pt-4">
                                                <div>
                                                    <label className="text-sm font-medium mb-2 block">人称视角</label>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant={editPerspective === "first" ? "default" : "outline"}
                                                            onClick={() => setEditPerspective("first")}
                                                        >
                                                            第一人称
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant={editPerspective === "third" ? "default" : "outline"}
                                                            onClick={() => setEditPerspective("third")}
                                                        >
                                                            第三人称
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant={editPerspective === "omniscient" ? "default" : "outline"}
                                                            onClick={() => setEditPerspective("omniscient")}
                                                        >
                                                            上帝视角
                                                        </Button>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-sm font-medium mb-2 block">写作风格</label>
                                                    <Input
                                                        value={editStyle}
                                                        onChange={(e) => setEditStyle(e.target.value)}
                                                        placeholder="例如：轻松幽默、严肃深沉、悬疑紧张..."
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-sm font-medium mb-2 block">世界观设定</label>
                                                    <Textarea
                                                        value={editWorldView}
                                                        onChange={(e) => setEditWorldView(e.target.value)}
                                                        placeholder="描述故事发生的世界背景、规则、历史等..."
                                                        rows={5}
                                                    />
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <span className="text-sm text-muted-foreground">
                                                    ✓ 修改自动保存
                                                </span>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                ) : rightPanelTab === "graph" ? (
                    <ScrollArea className="h-full">
                        <RelationshipsTable />
                        <div className="border-t">
                            <CharacterStats />
                        </div>
                        <div className="border-t">
                            <RelationshipTimeline />
                        </div>
                    </ScrollArea>
                ) : rightPanelTab === "outline" ? (
                    <OutlinePanel />
                ) : rightPanelTab === "history" ? (
                    <SnapshotPanel />
                ) : (
                    <DataTablesPanel />
                )}
            </div>
        </div>
    );
}

function CharacterCard({
    character,
    onDelete,
}: {
    character: Character;
    onDelete: () => void;
}) {
    return (
        <div className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group">
            <div className="flex items-start gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{character.name}</p>
                    {character.bio && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {character.bio}
                        </p>
                    )}
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={onDelete}
                >
                    ×
                </Button>
            </div>
        </div>
    );
}
