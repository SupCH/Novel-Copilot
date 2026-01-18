"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Chapter } from "@/lib/api";

interface ChapterSelectDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    chapters: Chapter[];
    title: string;
    onConfirm: (selectedChapterIds: number[]) => void;
}

export function ChapterSelectDialog({
    open,
    onOpenChange,
    chapters,
    title,
    onConfirm,
}: ChapterSelectDialogProps) {
    const [selected, setSelected] = useState<Set<number>>(new Set());

    // 打开时默认全选
    useEffect(() => {
        if (open) {
            setSelected(new Set(chapters.map((ch) => ch.id)));
        }
    }, [open, chapters]);

    const handleToggle = (id: number) => {
        const newSet = new Set(selected);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelected(newSet);
    };

    const handleSelectAll = () => {
        setSelected(new Set(chapters.map((ch) => ch.id)));
    };

    const handleSelectNone = () => {
        setSelected(new Set());
    };

    const handleInvert = () => {
        const newSet = new Set<number>();
        chapters.forEach((ch) => {
            if (!selected.has(ch.id)) {
                newSet.add(ch.id);
            }
        });
        setSelected(newSet);
    };

    const handleConfirm = () => {
        onConfirm(Array.from(selected));
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>

                <div className="flex gap-2 py-2">
                    <Button size="sm" variant="outline" onClick={handleSelectAll}>
                        全选
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleSelectNone}>
                        取消全选
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleInvert}>
                        反选
                    </Button>
                </div>

                <ScrollArea className="h-[300px] border rounded-md p-2">
                    <div className="space-y-2">
                        {chapters.map((chapter) => (
                            <div
                                key={chapter.id}
                                className="flex items-center gap-2 p-2 hover:bg-accent rounded cursor-pointer"
                                onClick={() => handleToggle(chapter.id)}
                            >
                                <Checkbox
                                    checked={selected.has(chapter.id)}
                                    onCheckedChange={() => handleToggle(chapter.id)}
                                />
                                <span className="text-sm flex-1 truncate">
                                    {chapter.title}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {chapter.word_count}字
                                </span>
                            </div>
                        ))}
                    </div>
                </ScrollArea>

                <DialogFooter>
                    <span className="text-sm text-muted-foreground mr-auto">
                        已选 {selected.size} / {chapters.length} 章
                    </span>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        取消
                    </Button>
                    <Button onClick={handleConfirm} disabled={selected.size === 0}>
                        确认
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
