import { useState, useEffect } from "react";
import { useAppStore } from "@/store/app-store";
import { aiApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

interface SettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
    const { aiConfig, setAiConfig } = useAppStore();
    const [config, setConfig] = useState(aiConfig);
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [isChecking, setIsChecking] = useState(false);
    const [checkStatus, setCheckStatus] = useState<"idle" | "success" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState("");

    // 模型测试状态
    const [isTestingModel, setIsTestingModel] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    // 当 store 更新或对话框打开时，同步状态
    useEffect(() => {
        if (open) {
            setConfig(aiConfig);
            setCheckStatus("idle");
            setErrorMessage("");
            setTestResult(null);
        }
    }, [open, aiConfig]);

    const handleSave = () => {
        setAiConfig(config);
        onOpenChange(false);
    };

    const handleApply = () => {
        setAiConfig(config);
        // 显示应用成功反馈
        setTestResult({ success: true, message: "设置已应用" });
    };

    const handleCheckConnection = async () => {
        setIsChecking(true);
        setCheckStatus("idle");
        setErrorMessage("");
        setAvailableModels([]);

        try {
            const { models } = await aiApi.getModels({
                baseUrl: config.baseUrl,
                apiKey: config.apiKey,
            });
            setAvailableModels(models);
            setCheckStatus("success");

            // 如果当前模型不在新列表中，或者没有设置模型，则自动选中第一个
            if (models.length > 0) {
                if (!config.model || !models.includes(config.model)) {
                    setConfig(prev => ({ ...prev, model: models[0] }));
                }
                // 同样处理提取模型
                if (config.extractModel && !models.includes(config.extractModel)) {
                    setConfig(prev => ({ ...prev, extractModel: models[0] }));
                }
            }
        } catch (error) {
            console.error("Connection check failed:", error);
            setCheckStatus("error");
            setErrorMessage(error instanceof Error ? error.message : "连接失败");
        } finally {
            setIsChecking(false);
        }
    };

    const handleTestModel = async () => {
        // 确定要测试的模型：优先使用提取模型，否则使用续写模型
        const modelToTest = config.extractModel || config.model;
        if (!modelToTest) {
            setTestResult({ success: false, message: "请先选择或输入模型名称" });
            return;
        }

        setIsTestingModel(true);
        setTestResult(null);

        try {
            const result = await aiApi.testExtractModel({
                model: modelToTest,
                config: {
                    baseUrl: config.baseUrl,
                    apiKey: config.apiKey,
                }
            });

            setTestResult({
                success: result.success,
                message: result.success ? "模型兼容数据提取" : (result.message || "测试失败"),
            });
        } catch (error) {
            setTestResult({
                success: false,
                message: error instanceof Error ? error.message : "测试请求失败",
            });
        } finally {
            setIsTestingModel(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>AI 设置</DialogTitle>
                    <DialogDescription>
                        配置 AI 服务的连接信息。默认支持本地 Ollama。
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="base-url" className="text-right">
                            API 地址
                        </Label>
                        <Input
                            id="base-url"
                            value={config.baseUrl}
                            onChange={(e) =>
                                setConfig({ ...config, baseUrl: e.target.value })
                            }
                            className="col-span-3"
                            placeholder="http://localhost:11434/v1"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="api-key" className="text-right">
                            API Key
                        </Label>
                        <Input
                            id="api-key"
                            type="password"
                            value={config.apiKey}
                            onChange={(e) =>
                                setConfig({ ...config, apiKey: e.target.value })
                            }
                            className="col-span-3"
                            placeholder="ollama (如果使用默认配置)"
                        />
                    </div>

                    {/* 连接测试区域 */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <div className="col-start-2 col-span-3 flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleCheckConnection}
                                disabled={isChecking}
                            >
                                {isChecking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                测试连接 & 获取模型
                            </Button>

                            {checkStatus === "success" && (
                                <span className="flex items-center text-sm text-green-600">
                                    <CheckCircle2 className="mr-1 h-4 w-4" />
                                    连接成功
                                </span>
                            )}

                            {checkStatus === "error" && (
                                <span className="flex items-center text-sm text-red-600" title={errorMessage}>
                                    <XCircle className="mr-1 h-4 w-4" />
                                    {errorMessage || "连接失败"}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="model" className="text-right">
                            模型名称
                        </Label>
                        <div className="col-span-3">
                            {availableModels.length > 0 ? (
                                <select
                                    id="model"
                                    value={config.model}
                                    onChange={(e) =>
                                        setConfig({ ...config, model: e.target.value })
                                    }
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                >
                                    {availableModels.map((model) => (
                                        <option key={model} value={model}>
                                            {model}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <Input
                                    id="model"
                                    value={config.model}
                                    onChange={(e) =>
                                        setConfig({ ...config, model: e.target.value })
                                    }
                                    placeholder="点击上方按钮获取模型列表，或手动输入"
                                />
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="extract-model" className="text-right">
                            提取模型
                        </Label>
                        <div className="col-span-3">
                            {availableModels.length > 0 ? (
                                <select
                                    id="extract-model"
                                    value={config.extractModel}
                                    onChange={(e) =>
                                        setConfig({ ...config, extractModel: e.target.value })
                                    }
                                    className="w-full h-10 px-3 py-2 text-sm rounded-md border border-input bg-background"
                                >
                                    <option value="">（使用续写模型）</option>
                                    {availableModels.map((m) => (
                                        <option key={m} value={m}>
                                            {m}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <Input
                                    id="extract-model"
                                    value={config.extractModel}
                                    onChange={(e) =>
                                        setConfig({ ...config, extractModel: e.target.value })
                                    }
                                    placeholder="留空则使用续写模型（可选）"
                                />
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                                用于分析内容并自动填充数据表，建议使用非流式模型
                            </p>
                        </div>
                        <div className="flex justify-end col-start-2 col-span-3 mt-1 gap-2 items-center">
                            {testResult && (
                                <span className={`text-xs flex items-center ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                                    {testResult.success ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                                    {testResult.message}
                                </span>
                            )}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={handleTestModel}
                                disabled={isTestingModel}
                            >
                                {isTestingModel && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                                测试提取能力
                            </Button>
                        </div>
                    </div>


                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="max-tokens" className="text-right">
                            生成字数
                        </Label>
                        <div className="col-span-3 flex items-center gap-2">
                            <Input
                                id="max-tokens"
                                type="number"
                                min={100}
                                max={4000}
                                step={100}
                                value={config.maxTokens}
                                onChange={(e) =>
                                    setConfig({ ...config, maxTokens: parseInt(e.target.value) || 500 })
                                }
                                className="w-24"
                            />
                            <span className="text-sm text-muted-foreground">
                                字（约 {config.maxTokens} tokens）
                            </span>
                        </div>
                    </div>
                </div>
                <DialogFooter className="gap-2">
                    <Button type="button" variant="outline" onClick={handleApply}>
                        应用设置
                    </Button>
                    <Button type="submit" onClick={handleSave}>
                        保存并关闭
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog >
    );
}
