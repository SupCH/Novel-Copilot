"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAppStore } from "@/store/app-store";
import { snapshotsApi, Snapshot } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { History, Plus, RotateCcw, Trash2, Clock, RefreshCw, Settings2, Play, Pause } from "lucide-react";

// 自动快照配置 key
const AUTO_SNAPSHOT_KEY = "novel-copilot-auto-snapshot";

export function SnapshotPanel() {
    const { currentProject, refreshDataTables } = useAppStore();
    const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
    const [loading, setLoading] = useState(false);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [newSnapshotName, setNewSnapshotName] = useState("");
    const [newSnapshotDesc, setNewSnapshotDesc] = useState("");
    const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
    const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);
    const [isRestoring, setIsRestoring] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    // 自动快照状态
    const [autoEnabled, setAutoEnabled] = useState(false);
    const [autoInterval, setAutoInterval] = useState(10); // 分钟
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // 加载自动快照配置
    useEffect(() => {
        const saved = localStorage.getItem(AUTO_SNAPSHOT_KEY);
        if (saved) {
            try {
                const config = JSON.parse(saved);
                setAutoEnabled(config.enabled ?? false);
                setAutoInterval(config.interval ?? 10);
            } catch {
                // ignore
            }
        }
    }, []);

    // 保存自动快照配置
    const saveAutoConfig = (enabled: boolean, interval: number) => {
        localStorage.setItem(AUTO_SNAPSHOT_KEY, JSON.stringify({ enabled, interval }));
    };

    // 创建自动快照
    const createAutoSnapshot = useCallback(async () => {
        if (!currentProject) return;
        try {
            await snapshotsApi.create({
                project_id: currentProject.id,
                name: `自动快照 ${new Date().toLocaleString("zh-CN")}`,
                snapshot_type: "auto",
            });
            setLastAutoSave(new Date());
            loadSnapshots();
            console.log("[AutoSnapshot] Created at", new Date().toLocaleString());
        } catch (error) {
            console.error("[AutoSnapshot] Failed:", error);
        }
    }, [currentProject]);

    // 加载快照列表
    const loadSnapshots = useCallback(async () => {
        if (!currentProject) return;
        setLoading(true);
        try {
            const data = await snapshotsApi.list(currentProject.id);
            setSnapshots(data);
        } catch (error) {
            console.error("Load snapshots error:", error);
        } finally {
            setLoading(false);
        }
    }, [currentProject]);

    useEffect(() => {
        loadSnapshots();
    }, [loadSnapshots]);

    // 自动快照定时器
    useEffect(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        if (autoEnabled && currentProject) {
            const intervalMs = autoInterval * 60 * 1000;
            timerRef.current = setInterval(() => {
                createAutoSnapshot();
            }, intervalMs);
            console.log(`[AutoSnapshot] Timer started: every ${autoInterval} min`);
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [autoEnabled, autoInterval, currentProject, createAutoSnapshot]);

    // 切换自动快照
    const toggleAutoSnapshot = () => {
        const newEnabled = !autoEnabled;
        setAutoEnabled(newEnabled);
        saveAutoConfig(newEnabled, autoInterval);
    };

    // 更新间隔
    const updateInterval = (value: number) => {
        const interval = Math.max(1, Math.min(60, value));
        setAutoInterval(interval);
        saveAutoConfig(autoEnabled, interval);
    };

    // 创建快照
    const handleCreate = async () => {
        if (!currentProject) return;
        setIsCreating(true);
        try {
            await snapshotsApi.create({
                project_id: currentProject.id,
                name: newSnapshotName || undefined,
                description: newSnapshotDesc || undefined,
                snapshot_type: "manual",
            });
            setCreateDialogOpen(false);
            setNewSnapshotName("");
            setNewSnapshotDesc("");
            loadSnapshots();
        } catch (error) {
            console.error("Create snapshot error:", error);
            alert("创建快照失败");
        } finally {
            setIsCreating(false);
        }
    };

    // ... 其余代码保持不变

    // 恢复快照
    const handleRestore = async () => {
        if (!selectedSnapshot) return;
        setIsRestoring(true);
        try {
            await snapshotsApi.restore(selectedSnapshot.id);
            setRestoreDialogOpen(false);
            setSelectedSnapshot(null);
            refreshDataTables();
            window.location.reload();
        } catch (error) {
            console.error("Restore snapshot error:", error);
            alert("恢复快照失败");
        } finally {
            setIsRestoring(false);
        }
    };

    // 删除快照
    const handleDelete = async (snapshot: Snapshot) => {
        if (!confirm(`确定要删除快照 "${snapshot.name}" 吗？`)) return;
        try {
            await snapshotsApi.delete(snapshot.id);
            loadSnapshots();
        } catch (error) {
            console.error("Delete snapshot error:", error);
            alert("删除快照失败");
        }
    };

    // 格式化时间
    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString("zh-CN", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    if (!currentProject) {
        return (
            <div className="p-4 text-center text-muted-foreground">
                请先选择一个项目
            </div>
        );
    }

    return (
        <div className="p-3 space-y-3">
            {/* 头部 */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <History className="h-4 w-4" />
                    <span className="text-sm font-medium">版本历史</span>
                </div>
                <div className="flex gap-1">
                    <Button
                        size="sm"
                        variant={autoEnabled ? "default" : "ghost"}
                        className="h-7 w-7 p-0"
                        onClick={toggleAutoSnapshot}
                        title={autoEnabled ? `自动快照已开启 (每${autoInterval}分钟)` : "开启自动快照"}
                    >
                        {autoEnabled ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => setSettingsOpen(true)}
                        title="快照设置"
                    >
                        <Settings2 className="h-3 w-3" />
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={() => setCreateDialogOpen(true)}
                    >
                        <Plus className="h-3 w-3" />
                        创建
                    </Button>
                </div>
            </div>

            {/* 自动快照状态 */}
            {autoEnabled && (
                <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/30 p-2 rounded flex items-center gap-2">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    <span>自动快照已开启，每 {autoInterval} 分钟保存一次</span>
                </div>
            )}

            {/* 快照列表 */}
            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                </div>
            ) : snapshots.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                    <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>暂无快照</p>
                    <p className="text-xs mt-1">点击"创建快照"保存当前状态</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {snapshots.map((snapshot) => (
                        <div
                            key={snapshot.id}
                            className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate">
                                        {snapshot.name}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                        <Clock className="h-3 w-3" />
                                        {formatTime(snapshot.created_at)}
                                        {snapshot.snapshot_type === "auto" && (
                                            <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                                自动
                                            </span>
                                        )}
                                    </div>
                                    {snapshot.description && (
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                            {snapshot.description}
                                        </p>
                                    )}
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0"
                                        title="恢复到此版本"
                                        onClick={() => {
                                            setSelectedSnapshot(snapshot);
                                            setRestoreDialogOpen(true);
                                        }}
                                    >
                                        <RotateCcw className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                                        title="删除快照"
                                        onClick={() => handleDelete(snapshot)}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* 创建快照对话框 */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>创建快照</DialogTitle>
                        <DialogDescription>
                            保存当前项目的完整状态，包括章节内容、角色、关系和数据表。
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div>
                            <label className="text-sm font-medium">快照名称（可选）</label>
                            <Input
                                value={newSnapshotName}
                                onChange={(e) => setNewSnapshotName(e.target.value)}
                                placeholder="留空将自动生成"
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">描述（可选）</label>
                            <Input
                                value={newSnapshotDesc}
                                onChange={(e) => setNewSnapshotDesc(e.target.value)}
                                placeholder="记录此次快照的目的"
                                className="mt-1"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                            取消
                        </Button>
                        <Button onClick={handleCreate} disabled={isCreating}>
                            {isCreating ? "创建中..." : "创建快照"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 恢复确认对话框 */}
            <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>恢复快照</DialogTitle>
                        <DialogDescription>
                            确定要恢复到快照 "{selectedSnapshot?.name}" 吗？
                            <br />
                            <span className="text-orange-500 font-medium">
                                ⚠️ 当前所有未保存的更改将被覆盖！
                            </span>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRestoreDialogOpen(false)}>
                            取消
                        </Button>
                        <Button variant="destructive" onClick={handleRestore} disabled={isRestoring}>
                            {isRestoring ? "恢复中..." : "确认恢复"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 设置对话框 */}
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>快照设置</DialogTitle>
                        <DialogDescription>
                            配置自动快照的保存间隔。
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div>
                            <label className="text-sm font-medium">自动快照间隔（分钟）</label>
                            <Input
                                type="number"
                                min={1}
                                max={60}
                                value={autoInterval}
                                onChange={(e) => updateInterval(parseInt(e.target.value) || 10)}
                                className="mt-1 w-32"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                建议 5-30 分钟，范围 1-60 分钟
                            </p>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                            <div>
                                <p className="text-sm font-medium">自动快照</p>
                                <p className="text-xs text-muted-foreground">
                                    {autoEnabled ? "已开启" : "已关闭"}
                                </p>
                            </div>
                            <Button
                                size="sm"
                                variant={autoEnabled ? "destructive" : "default"}
                                onClick={toggleAutoSnapshot}
                            >
                                {autoEnabled ? "关闭" : "开启"}
                            </Button>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setSettingsOpen(false)}>
                            完成
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
