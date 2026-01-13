"use client";

import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useAppStore } from "@/store/app-store";
import { chaptersApi } from "@/lib/api";
import { Plus, FileText, Trash2 } from "lucide-react";

export function ChapterSidebar() {
    const {
        currentProject,
        chapters,
        setChapters,
        currentChapter,
        setCurrentChapter,
        removeChapter,
        addChapter,
    } = useAppStore();

    const [newChapterTitle, setNewChapterTitle] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);

    // 加载章节列表
    useEffect(() => {
        if (currentProject) {
            chaptersApi.list(currentProject.id).then(setChapters);
        }
    }, [currentProject, setChapters]);

    const handleCreateChapter = async () => {
        if (!currentProject || !newChapterTitle.trim()) return;

        const chapter = await chaptersApi.create(currentProject.id, {
            title: newChapterTitle.trim(),
        });
        addChapter(chapter);
        setNewChapterTitle("");
        setDialogOpen(false);
        setCurrentChapter(chapter);
    };

    const handleDeleteChapter = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("确定删除此章节？")) return;
        await chaptersApi.delete(id);
        removeChapter(id);
        if (currentChapter?.id === id) {
            setCurrentChapter(null);
        }
    };

    if (!currentProject) {
        return (
            <div className="h-full flex items-center justify-center text-muted-foreground p-4 text-center">
                请先选择或创建一个项目
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            <div className="p-3 border-b flex items-center justify-between">
                <h2 className="font-semibold text-sm truncate">{currentProject.title}</h2>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="新建章节">
                            <Plus className="h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>新建章节</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                            <Input
                                placeholder="章节标题"
                                value={newChapterTitle}
                                onChange={(e) => setNewChapterTitle(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleCreateChapter()}
                            />
                            <Button onClick={handleCreateChapter} className="w-full">
                                创建
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                    {chapters.length === 0 ? (
                        <div className="text-sm text-muted-foreground text-center py-8">
                            暂无章节
                        </div>
                    ) : (
                        chapters.map((chapter) => (
                            <div
                                key={chapter.id}
                                onClick={() => setCurrentChapter(chapter)}
                                className={`
                  group flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer
                  hover:bg-accent transition-colors
                  ${currentChapter?.id === chapter.id ? "bg-accent" : ""}
                `}
                            >
                                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="flex-1 truncate text-sm">{chapter.title}</span>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    {chapter.word_count} 字
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                    onClick={(e) => handleDeleteChapter(chapter.id, e)}
                                    title="删除章节"
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
