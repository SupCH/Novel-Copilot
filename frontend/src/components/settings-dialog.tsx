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

    // 图像模型状态
    const [imageModels, setImageModels] = useState<string[]>([]);
    const [isCheckingImage, setIsCheckingImage] = useState(false);
    const [imageCheckStatus, setImageCheckStatus] = useState<"idle" | "success" | "error">("idle");
    const [imageErrorMessage, setImageErrorMessage] = useState("");

    // 当 store 更新或对话框打开时，同步状态（处理旧配置缺少新字段的情况）
    useEffect(() => {
        if (open) {
            setConfig({
                ...aiConfig,
                // 确保图像配置有默认值（兼容旧版本配置）
                imageProvider: aiConfig.imageProvider || 'siliconflow',
                imageBaseUrl: aiConfig.imageBaseUrl || 'https://api.siliconflow.cn/v1',
                imageApiKey: aiConfig.imageApiKey || '',
                imageModel: aiConfig.imageModel || 'black-forest-labs/FLUX.1-schnell',
            });
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
            <DialogContent className="sm:max-w-[480px] max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>AI 设置</DialogTitle>
                    <DialogDescription>
                        配置 AI 服务连接信息
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 py-3 overflow-y-auto flex-1 pr-2">
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

                    {/* 图像生成设置分隔线 */}
                    <div className="border-t my-4" />
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                        🎨 图像生成设置（角色头像）
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="image-provider" className="text-right">
                            图像服务
                        </Label>
                        <div className="col-span-3">
                            <select
                                id="image-provider"
                                value={config.imageProvider}
                                onChange={(e) => {
                                    const provider = e.target.value as 'openai' | 'siliconflow' | 'custom';
                                    // 根据服务商自动填充预设值
                                    const presets = {
                                        siliconflow: {
                                            imageBaseUrl: 'https://api.siliconflow.cn/v1',
                                            imageModel: 'black-forest-labs/FLUX.1-schnell',
                                        },
                                        openai: {
                                            imageBaseUrl: 'https://api.openai.com/v1',
                                            imageModel: 'dall-e-3',
                                        },
                                        custom: {
                                            imageBaseUrl: config.imageBaseUrl,
                                            imageModel: config.imageModel,
                                        },
                                    };
                                    setConfig({
                                        ...config,
                                        imageProvider: provider,
                                        imageBaseUrl: presets[provider].imageBaseUrl,
                                        imageModel: presets[provider].imageModel,
                                    });
                                    setImageModels([]); // 清空已获取的模型列表
                                    setImageCheckStatus("idle");
                                }}
                                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                            >
                                <option value="siliconflow">硅基流动 SiliconFlow（推荐，免费）</option>
                                <option value="openai">OpenAI DALL-E</option>
                                <option value="custom">自定义 API</option>
                            </select>
                            <p className="text-xs text-muted-foreground mt-1">
                                {config.imageProvider === 'siliconflow' && '免费额度充足，支持 FLUX、Kolors 等模型'}
                                {config.imageProvider === 'openai' && '需要 OpenAI API Key，支持 DALL-E 2/3'}
                                {config.imageProvider === 'custom' && '自定义 OpenAI 兼容的图像生成 API'}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="image-base-url" className="text-right">
                            图像API地址
                        </Label>
                        <Input
                            id="image-base-url"
                            value={config.imageBaseUrl}
                            onChange={(e) => setConfig({ ...config, imageBaseUrl: e.target.value })}
                            className="col-span-3"
                            placeholder="https://api.siliconflow.cn/v1"
                        />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="image-api-key" className="text-right">
                            图像API Key
                        </Label>
                        <Input
                            id="image-api-key"
                            type="password"
                            value={config.imageApiKey}
                            onChange={(e) => setConfig({ ...config, imageApiKey: e.target.value })}
                            className="col-span-3"
                            placeholder="sk-..."
                        />
                    </div>

                    {/* 图像连接测试区域 */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <div className="col-start-2 col-span-3 flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                    setIsCheckingImage(true);
                                    setImageCheckStatus("idle");
                                    setImageErrorMessage("");
                                    setImageModels([]);
                                    try {
                                        const { models } = await aiApi.getModels({
                                            baseUrl: config.imageBaseUrl,
                                            apiKey: config.imageApiKey,
                                        });
                                        // 过滤出图像模型（通常包含 flux, dall, stable, kolors 等关键词）
                                        const imgModels = models.filter(m =>
                                            /flux|dall|stable|kolors|midjourney|image|diffusion|sdxl|gemini.*image/i.test(m)
                                        );
                                        setImageModels(imgModels.length > 0 ? imgModels : models);
                                        setImageCheckStatus("success");
                                        if (imgModels.length > 0 && (!config.imageModel || !imgModels.includes(config.imageModel))) {
                                            setConfig(prev => ({ ...prev, imageModel: imgModels[0] }));
                                        }
                                    } catch (error) {
                                        const errMsg = error instanceof Error ? error.message : "连接失败";
                                        // 404 或 Connection error 都表示 API 可能不支持模型列表
                                        if (errMsg.includes("404") || errMsg.includes("Not Found")) {
                                            setImageCheckStatus("success");
                                            setImageErrorMessage("此 API 不支持模型列表，请手动输入");
                                        } else if (errMsg.toLowerCase().includes("connection") || errMsg.toLowerCase().includes("network") || errMsg.toLowerCase().includes("fetch")) {
                                            setImageCheckStatus("success");
                                            setImageErrorMessage("无法获取模型列表，请手动输入模型名");
                                        } else {
                                            setImageCheckStatus("error");
                                            setImageErrorMessage(errMsg);
                                        }
                                    } finally {
                                        setIsCheckingImage(false);
                                    }
                                }}
                                disabled={isCheckingImage}
                            >
                                {isCheckingImage && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                测试连接 & 获取模型
                            </Button>

                            {imageCheckStatus === "success" && (
                                <span className="flex items-center text-sm text-green-600">
                                    <CheckCircle2 className="mr-1 h-4 w-4" />
                                    找到 {imageModels.length} 个模型
                                </span>
                            )}

                            {imageCheckStatus === "error" && (
                                <span className="flex items-center text-sm text-red-600" title={imageErrorMessage}>
                                    <XCircle className="mr-1 h-4 w-4" />
                                    {imageErrorMessage || "连接失败"}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="image-model" className="text-right">
                            图像模型
                        </Label>
                        <div className="col-span-3">
                            {imageModels.length > 0 ? (
                                <select
                                    id="image-model"
                                    value={config.imageModel}
                                    onChange={(e) => setConfig({ ...config, imageModel: e.target.value })}
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                                >
                                    {imageModels.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            ) : (
                                <Input
                                    id="image-model"
                                    value={config.imageModel}
                                    onChange={(e) => setConfig({ ...config, imageModel: e.target.value })}
                                    placeholder="black-forest-labs/FLUX.1-schnell"
                                />
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                                {config.imageProvider === 'siliconflow' ? '推荐: FLUX.1-schnell (快速) 或 Kolors' :
                                    config.imageProvider === 'openai' ? '推荐: dall-e-3' : '输入模型名称'}
                            </p>
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
