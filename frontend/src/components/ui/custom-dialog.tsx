"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface InputDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: (value: string) => void;
    title: string;
    placeholder?: string;
    description?: string;
    defaultValue?: string;
}

export function InputDialog({
    open,
    onClose,
    onConfirm,
    title,
    placeholder = "",
    description,
    defaultValue = "",
}: InputDialogProps) {
    const [value, setValue] = useState(defaultValue);
    const [mounted, setMounted] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (open) {
            setValue(defaultValue);
            // 自动聚焦
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [open, defaultValue]);

    // 按 Esc 关闭
    useEffect(() => {
        if (!open) return;
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handleEsc);
        return () => document.removeEventListener("keydown", handleEsc);
    }, [open, onClose]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (value.trim()) {
            onConfirm(value.trim());
            onClose();
        }
    };

    if (!mounted || !open) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-popover border rounded-lg shadow-xl w-[400px] max-w-[90vw] animate-in fade-in-0 zoom-in-95"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 头部 */}
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <h3 className="font-medium">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-md hover:bg-muted transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* 内容 */}
                <form onSubmit={handleSubmit} className="p-4">
                    {description && (
                        <p className="text-sm text-muted-foreground mb-3">
                            {description}
                        </p>
                    )}
                    <Input
                        ref={inputRef}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder={placeholder}
                        className="mb-4"
                    />
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={onClose}>
                            取消
                        </Button>
                        <Button type="submit" disabled={!value.trim()}>
                            确定
                        </Button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}

// Alert 对话框
interface AlertDialogProps {
    open: boolean;
    onClose: () => void;
    title: string;
    message: string;
    type?: "success" | "error" | "info";
}

export function AlertDialog({
    open,
    onClose,
    title,
    message,
    type = "info",
}: AlertDialogProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // 按 Esc 或 Enter 关闭
    useEffect(() => {
        if (!open) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" || e.key === "Enter") onClose();
        };
        document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, [open, onClose]);

    if (!mounted || !open) return null;

    const iconColors = {
        success: "text-green-500",
        error: "text-red-500",
        info: "text-blue-500",
    };

    const icons = {
        success: "✓",
        error: "✕",
        info: "ℹ",
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-popover border rounded-lg shadow-xl w-[400px] max-w-[90vw] animate-in fade-in-0 zoom-in-95"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 头部 */}
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <div className="flex items-center gap-2">
                        <span className={`text-lg ${iconColors[type]}`}>{icons[type]}</span>
                        <h3 className="font-medium">{title}</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-md hover:bg-muted transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* 内容 */}
                <div className="p-4">
                    <p className="text-sm whitespace-pre-wrap mb-4">{message}</p>
                    <div className="flex justify-end">
                        <Button onClick={onClose}>
                            确定
                        </Button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
