/**
 * Novel-Copilot API 客户端
 */

// 支持环境变量配置 API 地址（生产环境通过 CF Pages 环境变量设置）
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3506";

// ============ 通用请求函数 ============

async function request<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        credentials: "omit", // 不发送 cookies，配合后端 allow_origins=["*"]
        headers: {
            "Content-Type": "application/json",
            ...options.headers,
        },
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(error.detail || "Request failed");
    }

    // 204 No Content
    if (res.status === 204) {
        return {} as T;
    }

    return res.json();
}

// ============ 类型定义 ============

export interface Project {
    id: number;
    title: string;
    description: string | null;
    world_view: string | null;
    style: string | null;
    outline: string | null;
    perspective: string | null;
    created_at: string;
    updated_at: string;
}

export interface Character {
    id: number;
    project_id: number;
    name: string;
    bio: string | null;
    attributes: Record<string, unknown> | null;
    position_x: number;
    position_y: number;
    created_at: string;
    updated_at: string;
}

export interface Relationship {
    id: number;
    project_id: number;
    source_id: number;
    target_id: number;
    relation_type: string;
    description: string | null;
    created_at: string;
    updated_at: string;
}

export interface Chapter {
    id: number;
    project_id: number;
    title: string;
    content: string | null;
    rank: number;
    word_count: number;
    summary: string | null;
    chapter_outline: string | null;
    characters_mentioned: number[] | null;
    created_at: string;
    updated_at: string;
}

// ============ API 函数 ============

// 项目
export const projectsApi = {
    list: () => request<Project[]>("/api/projects"),
    get: (id: number) => request<Project>(`/api/projects/${id}`),
    create: (data: Partial<Project>) =>
        request<Project>("/api/projects", {
            method: "POST",
            body: JSON.stringify(data),
        }),
    update: (id: number, data: Partial<Project>) =>
        request<Project>(`/api/projects/${id}`, {
            method: "PUT",
            body: JSON.stringify(data),
        }),
    delete: (id: number) =>
        request<void>(`/api/projects/${id}`, { method: "DELETE" }),
};

// 角色
export const charactersApi = {
    list: (projectId: number) =>
        request<Character[]>(`/api/projects/${projectId}/characters`),
    create: (projectId: number, data: Partial<Character>) =>
        request<Character>(`/api/projects/${projectId}/characters`, {
            method: "POST",
            body: JSON.stringify(data),
        }),
    update: (id: number, data: Partial<Character>) =>
        request<Character>(`/api/characters/${id}`, {
            method: "PUT",
            body: JSON.stringify(data),
        }),
    delete: (id: number) =>
        request<void>(`/api/characters/${id}`, { method: "DELETE" }),
};

// 关系
export const relationshipsApi = {
    list: (projectId: number) =>
        request<Relationship[]>(`/api/projects/${projectId}/relationships`),
    create: (data: Partial<Relationship>) =>
        request<Relationship>("/api/relationships", {
            method: "POST",
            body: JSON.stringify(data),
        }),
    update: (id: number, data: Partial<Relationship>) =>
        request<Relationship>(`/api/relationships/${id}`, {
            method: "PUT",
            body: JSON.stringify(data),
        }),
    delete: (id: number) =>
        request<void>(`/api/relationships/${id}`, { method: "DELETE" }),
};

// 章节
export const chaptersApi = {
    list: (projectId: number) =>
        request<Chapter[]>(`/api/projects/${projectId}/chapters`),
    get: (id: number) => request<Chapter>(`/api/chapters/${id}`),
    create: (projectId: number, data: Partial<Chapter>) =>
        request<Chapter>(`/api/projects/${projectId}/chapters`, {
            method: "POST",
            body: JSON.stringify(data),
        }),
    update: (id: number, data: Partial<Chapter>) =>
        request<Chapter>(`/api/chapters/${id}`, {
            method: "PUT",
            body: JSON.stringify(data),
        }),
    delete: (id: number) =>
        request<void>(`/api/chapters/${id}`, { method: "DELETE" }),
    reorder: (chapterIds: number[]) =>
        request<Chapter[]>("/api/chapters/reorder", {
            method: "PUT",
            body: JSON.stringify({ chapter_ids: chapterIds }),
        }),
};

// AI
export const aiApi = {
    // SSE 续写
    continueStream: async function* (data: {
        project_id: number;
        chapter_id?: number;
        context: string;
        config?: { baseUrl?: string; apiKey?: string; model?: string; maxTokens?: number };
    }) {
        const response = await fetch(`${API_BASE}/api/ai/continue`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "omit",
            body: JSON.stringify({
                project_id: data.project_id,
                chapter_id: data.chapter_id,
                context: data.context,
                model: data.config?.model || "gpt-4o-mini",
                max_tokens: data.config?.maxTokens || 500,
                api_base: data.config?.baseUrl || undefined,
                api_key: data.config?.apiKey || undefined,
            }),
        });

        if (!response.ok || !response.body) {
            throw new Error(response.statusText);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = ""; // 缓冲区：处理跨 read 的不完整行

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    // 处理剩余缓冲区
                    if (buffer.trim()) {
                        const lines = buffer.split("\n");
                        for (const line of lines) {
                            if (line.startsWith("data: ")) {
                                const content = line.slice(6);
                                if (content !== "[DONE]") {
                                    // 解码转义的换行符
                                    const decoded = content.replace(/\\n/g, "\n");
                                    yield decoded;
                                }
                            }
                        }
                    }
                    break;
                }

                buffer += decoder.decode(value, { stream: true });

                // 只处理完整的行（以 \n 结尾）
                const lines = buffer.split("\n");
                // 最后一个元素可能是不完整的行，保留在 buffer 中
                buffer = lines.pop() || "";

                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        const content = line.slice(6);
                        if (content === "[DONE]") return;
                        // 解码转义的换行符
                        const decoded = content.replace(/\\n/g, "\n");
                        yield decoded;
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    },

    summarize: (data: {
        chapter_id: number;
        config?: { baseUrl?: string; apiKey?: string; model?: string }
    }) => {
        return request<{ summary: string }>("/api/ai/summarize", {
            method: "POST",
            body: JSON.stringify({
                chapter_id: data.chapter_id,
                model: data.config?.model || "gpt-4o-mini",
                api_base: data.config?.baseUrl || undefined,
                api_key: data.config?.apiKey || undefined,
            }),
        });
    },

    modifyText: (data: {
        text: string;
        action: string;
        config?: { baseUrl?: string; apiKey?: string; model?: string }
    }) => {
        return request<{ success: boolean; result?: string; error?: string }>("/api/ai/modify", {
            method: "POST",
            body: JSON.stringify({
                text: data.text,
                action: data.action,
                model: data.config?.model || "gpt-4o-mini",
                api_base: data.config?.baseUrl || undefined,
                api_key: data.config?.apiKey || undefined,
            }),
        });
    },
    getModels: (config: { baseUrl: string; apiKey: string }) => {
        return request<{ models: string[] }>("/api/ai/models", {
            method: "POST",
            body: JSON.stringify({
                api_base: config.baseUrl || undefined,
                api_key: config.apiKey || undefined,
            }),
        });
    },
    processTableEdit: (projectId: number, content: string) => {
        return request<{ content: string; operations_applied: number }>("/api/ai/process-table-edit", {
            method: "POST",
            body: JSON.stringify({
                project_id: projectId,
                content,
            }),
        });
    },
    extractData: (data: {
        projectId: number;
        content: string;
        config?: { baseUrl?: string; apiKey?: string; model?: string; extractModel?: string };
    }) => {
        // 优先使用 extractModel，如果没有设置则使用 model
        const modelToUse = data.config?.extractModel || data.config?.model || "gpt-4o-mini";
        return request<{ success: boolean; updates: Record<string, number>; total: number }>("/api/ai/extract-data", {
            method: "POST",
            body: JSON.stringify({
                project_id: data.projectId,
                content: data.content,
                model: modelToUse,
                api_base: data.config?.baseUrl || undefined,
                api_key: data.config?.apiKey || undefined,
            }),
        });
    },
    testExtractModel: (data: {
        model: string;
        config?: { baseUrl?: string; apiKey?: string };
    }) => {
        return request<{ success: boolean; message: string; response: string | null }>(
            "/api/ai/test-extract", {
            method: "POST",
            body: JSON.stringify({
                model: data.model,
                api_base: data.config?.baseUrl || undefined,
                api_key: data.config?.apiKey || undefined,
            }),
        }
        );
    },
    organizeCharacters: (data: {
        projectId: number;
        chapterIds?: number[];
        config?: { baseUrl?: string; apiKey?: string; model?: string };
    }) => {
        return request<{
            success: boolean;
            message: string;
            characters_count?: number;
            relationships_count?: number;
        }>("/api/ai/organize-characters", {
            method: "POST",
            body: JSON.stringify({
                project_id: data.projectId,
                chapter_ids: data.chapterIds,
                model: data.config?.model || "gpt-4o-mini",
                api_base: data.config?.baseUrl || undefined,
                api_key: data.config?.apiKey || undefined,
            }),
        });
    },
};

// 数据导入导出
export interface ImportResult {
    message: string;
    project_id: number;
    warnings: string[];
}

export const dataApi = {
    exportProject: async (projectId: number) => {
        const res = await fetch(`${API_BASE}/api/export/${projectId}`, {
            credentials: "omit",
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({ detail: res.statusText }));
            throw new Error(error.detail || "Export failed");
        }
        return res.json();
    },
    importProject: async (file: File): Promise<ImportResult> => {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch(`${API_BASE}/api/import`, {
            method: "POST",
            credentials: "omit",
            body: formData,
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({ detail: res.statusText }));
            throw new Error(error.detail || "Import failed");
        }
        return res.json();
    },
};

// 数据表 API
export interface DataTableResponse {
    id: number;
    project_id: number;
    table_type: number;
    table_name: string;
    columns: string[];
    rows: Record<number, string>[];
}

export const dataTablesApi = {
    list: (projectId: number) =>
        request<DataTableResponse[]>(`/api/data-tables/project/${projectId}`),
    update: (tableId: number, rows: Record<number, string>[]) =>
        request<DataTableResponse>(`/api/data-tables/${tableId}`, {
            method: "PUT",
            body: JSON.stringify({ rows }),
        }),
    clear: (tableId: number) =>
        request<{ message: string; table_id: number }>(`/api/data-tables/${tableId}/clear`, {
            method: "DELETE",
        }),
    clearAll: (projectId: number) =>
        request<{ message: string; project_id: number }>(`/api/data-tables/project/${projectId}/clear-all`, {
            method: "DELETE",
        }),
};
