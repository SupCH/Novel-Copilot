# Novel-Copilot 需求规格说明书

## 1. 项目愿景 (Vision)
构建一个**隐私优先、本地化、可视化**的 AI 小说创作辅助平台。
核心理念是将"人物关系"从抽象的脑海设定转化为可视化的图谱，并以此作为 RAG (检索增强生成) 的上下文，辅助 AI 进行逻辑严密的小说续写。

---

## 2. 技术栈 (Tech Stack)

### 前端 (Frontend)
- **Framework**: `Next.js 14+` (App Router)
- **UI Library**: `Tailwind CSS` + `Shadcn/UI` (侧边栏、对话框、表单)
- **Graph Visualization**: `React Flow` (核心组件：用于拖拽式人物关系管理)
- **Rich Text Editor**: `Tiptap` (Headless 编辑器，支持 AI 指令高亮与流式插入)
- **State Management**: `Zustand` (管理全局 UI 状态与编辑器内容)

### 后端 (Backend)
- **Framework**: `FastAPI` (Python, 异步架构)
- **Database**: `SQLite` + `SQLAlchemy (Async)` (单文件数据库，零配置，易迁移)
- **AI Engine**: `OpenAI SDK` (设计为兼容 OpenAI 官方 API 及 Ollama 本地 URL)

---

## 3. 环境配置 (Configuration)

### 环境变量
```env
# AI 配置 (二选一)
OPENAI_API_KEY=sk-xxx                    # OpenAI 官方 API
OLLAMA_BASE_URL=http://localhost:11434   # Ollama 本地地址

# 服务端口
BACKEND_PORT=8000
FRONTEND_PORT=3000

# 数据库路径 (相对于 backend 目录)
DATABASE_URL=sqlite+aiosqlite:///./data/novel.db
```

### 快速启动
```bash
# 后端
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# 前端
cd frontend
npm install
npm run dev
```

---

## 4. 数据架构 (Data Schema)
*基于 Phase 1 修正后的最终模型设计*

### A. Project (项目表)
| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | Integer | 主键 |
| `title` | String | 小说标题 |
| `description` | Text | 简介 |
| **`world_view`** | Text | 世界观设定，用于 AI System Prompt |
| **`style`** | String | 写作风格 (如：赛博朋克、古风)，用于 AI 指导 |
| `created_at` | DateTime | 创建时间 |
| `updated_at` | DateTime | 更新时间 |

### B. Character (角色表)
| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | Integer | 主键 |
| **`project_id`** | Integer | **(FK)** 外键，实现多书数据隔离 |
| `name` | String | 角色名 |
| `bio` | Text | 角色传记/基本设定 |
| `attributes` | JSON | 灵活属性 (年龄、等级、武器等) |
| **`position_x`** | Float | React Flow 节点 X 坐标 (持久化布局) |
| **`position_y`** | Float | React Flow 节点 Y 坐标 (持久化布局) |
| `created_at` | DateTime | 创建时间 |
| `updated_at` | DateTime | 更新时间 |

### C. Relationship (关系表)
| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | Integer | 主键 |
| `project_id` | Integer | **(FK)** 冗余外键，方便查询 |
| `source_id` | Integer | **(FK)** 源角色 ID |
| `target_id` | Integer | **(FK)** 目标角色 ID |
| `relation_type` | String | 关系类型 (如：父子、敌对) |
| `description` | String | 关系详情 (如：杀父之仇) |
| `created_at` | DateTime | 创建时间 |
| `updated_at` | DateTime | 更新时间 |

### D. Chapter (章节表)
| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | Integer | 主键 |
| `project_id` | Integer | **(FK)** 外键 |
| `title` | String | 章节标题 |
| `content` | Text | 章节正文 (HTML/JSON) |
| **`rank`** | Integer | 用于目录树的手动拖拽排序 |
| `word_count` | Integer | 章节字数统计 |
| `summary` | Text | 章节摘要 (用于 AI 上下文) |
| `characters_mentioned` | JSON | 本章涉及的角色 ID 列表 |
| `created_at` | DateTime | 创建时间 |
| `updated_at` | DateTime | 更新时间 |

---

## 5. API 端点 (API Endpoints)

### 项目管理
| 方法 | 端点 | 说明 |
| :--- | :--- | :--- |
| GET | `/api/projects` | 获取所有项目列表 |
| POST | `/api/projects` | 创建新项目 |
| GET | `/api/projects/{id}` | 获取项目详情 |
| PUT | `/api/projects/{id}` | 更新项目信息 |
| DELETE | `/api/projects/{id}` | 删除项目 |

### 角色管理
| 方法 | 端点 | 说明 |
| :--- | :--- | :--- |
| GET | `/api/projects/{id}/characters` | 获取项目所有角色 |
| POST | `/api/projects/{id}/characters` | 创建新角色 |
| PUT | `/api/characters/{id}` | 更新角色信息 |
| DELETE | `/api/characters/{id}` | 删除角色 |

### 关系管理
| 方法 | 端点 | 说明 |
| :--- | :--- | :--- |
| GET | `/api/projects/{id}/relationships` | 获取项目所有关系 |
| POST | `/api/relationships` | 创建新关系 |
| PUT | `/api/relationships/{id}` | 更新关系 |
| DELETE | `/api/relationships/{id}` | 删除关系 |

### 章节管理
| 方法 | 端点 | 说明 |
| :--- | :--- | :--- |
| GET | `/api/projects/{id}/chapters` | 获取项目所有章节 |
| POST | `/api/projects/{id}/chapters` | 创建新章节 |
| PUT | `/api/chapters/{id}` | 更新章节内容 |
| DELETE | `/api/chapters/{id}` | 删除章节 |
| PUT | `/api/chapters/reorder` | 批量更新章节排序 |

### AI 功能
| 方法 | 端点 | 说明 |
| :--- | :--- | :--- |
| POST | `/api/ai/continue` | AI 续写 (SSE 流式返回) |
| POST | `/api/ai/summarize` | AI 生成章节摘要 |
| POST | `/api/ai/extract-characters` | 从文本中提取角色实体 |

### 数据导入导出
| 方法 | 端点 | 说明 |
| :--- | :--- | :--- |
| GET | `/api/export/{project_id}` | 导出项目为 JSON |
| POST | `/api/import` | 导入 JSON 恢复项目 |

---

## 6. 界面布局 (UI Layout)

应用采用 **三栏式 (Three-Column)** 布局：

1.  **左侧栏 (Sidebar)**
    * **功能**: 章节管理。
    * **交互**: 目录树结构，支持右键新建、重命名、拖拽排序 (更新 `rank`)。
2.  **中间区 (Main Editor)**
    * **功能**: 沉浸式写作。
    * **交互**: Tiptap 编辑器。输入 `/` 可呼出 AI 指令菜单。
3.  **右侧栏 (Inspector - Collapsible)**
    * **Tab A: 属性/设置**: 调整 AI 温度、模型参数；查看当前光标所在人物的详细属性。
    * **Tab B: 关系网 (Graph)**: 嵌入 React Flow 画布。
        * 实时显示当前章节涉及的人物。
        * 支持拖拽连线建立新关系。
        * 双击连线编辑关系描述。

---

## 7. 核心业务逻辑 (Core Logic)

### AI RAG 续写流程
1.  **Context Awareness**: 用户在编辑器中触发续写。
2.  **Extraction**: 后端提取当前光标前文中的**角色实体**。
3.  **Retrieval**: 在 SQLite 中查询这些角色之间的 `Relationship` 以及 `Project.world_view`。
4.  **Prompt Engineering**: 组装 Prompt (世界观 + 角色关系 + 前文)。
5.  **Streaming**: 调用 LLM (或 Ollama)，通过 SSE (Server-Sent Events) 流式返回文本到前端。

### 数据主权 (Data Sovereignty)
* **Export**: 提供 `/api/export/{project_id}`，导出该书所有数据为 JSON。
* **Import**: 提供 `/api/import`，解析 JSON 并恢复到 SQLite。

---

## 8. 安全性考虑 (Security)

### 当前 (本地单用户模式)
- 数据存储在本地 SQLite，无需认证
- API 仅监听 localhost

### 未来扩展 (多用户/云部署)
- [ ] JWT / Session 认证
- [ ] 用户表 (User) + 项目权限隔离
- [ ] API 限流 (Rate Limiting)
- [ ] HTTPS 支持

---

## 9. 开发路线图 (Roadmap)

- [x] **Phase 1 (Backend Foundation)**: ✅ 完成
  - FastAPI 项目结构
  - SQLite 异步驱动
  - 最终版 Schema 定义 (含坐标系与排序)

- [ ] **Phase 2 (Frontend & Editor)**: 🚧 待启动
  - Next.js 项目初始化
  - Tiptap 编辑器集成
  - 三栏式布局实现

- [ ] **Phase 3 (Character Graph)**
  - React Flow 集成
  - 角色节点拖拽与连线
  - 布局位置持久化

- [ ] **Phase 4 (AI Integration)**
  - OpenAI/Ollama 接入
  - RAG 上下文组装
  - SSE 流式续写

- [ ] **Phase 5 (Advanced Features)**
  - 多轮对话记忆
  - 角色对话模拟
  - 多语言/多模型支持

---

## 10. 目录结构 (Project Structure)

```
Novel-Copilot/
├── backend/
│   ├── main.py              # FastAPI 入口
│   ├── models/              # SQLAlchemy 模型
│   ├── routers/             # API 路由
│   ├── services/            # 业务逻辑
│   ├── data/                # SQLite 数据库
│   └── requirements.txt
├── frontend/
│   ├── app/                 # Next.js App Router
│   ├── components/          # React 组件
│   ├── lib/                 # 工具函数
│   ├── store/               # Zustand 状态
│   └── package.json
└── readme.txt
```