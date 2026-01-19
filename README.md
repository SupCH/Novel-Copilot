# Novel-Copilot

[![GitHub release](https://img.shields.io/github/v/release/SupCH/Novel-Copilot?include_prereleases&style=flat-square)](https://github.com/SupCH/Novel-Copilot/releases)
[![GitHub license](https://img.shields.io/github/license/SupCH/Novel-Copilot?style=flat-square)](https://github.com/SupCH/Novel-Copilot/blob/main/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/SupCH/Novel-Copilot?style=flat-square)](https://github.com/SupCH/Novel-Copilot/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/SupCH/Novel-Copilot?style=flat-square)](https://github.com/SupCH/Novel-Copilot/issues)

> 🚀 **隐私优先、本地化、可视化** 的 AI 小说创作辅助平台

## ✨ 功能特性

### 核心功能
- **🤖 AI 智能续写** - 支持 OpenAI API / Ollama 本地模型，流式输出，**自动获取前章摘要保持剧情连贯**
- **📊 自动数据提取** - AI 自动识别角色、事件、关系并填充数据表
- **📝 富文本编辑器** - 基于 Tiptap 的沉浸式写作体验
- **🖼️ 智能头像生成** - 一键生成 AI 角色头像，**自动下载并本地压缩为 540p 缩略图**，提升展示性能
- **📁 多项目管理** - 每个项目独立 URL（`/project/[id]`），章节目录树，支持拖拽排序
- **💾 本地存储** - SQLite 数据库，数据完全本地化

### 人物关系系统
- **👥 人物关系图** - 可视化角色关系网络（基于 React Flow）
- **🔍 角色名高亮** - 编辑器中自动标记人物名，单击查看详情
- **⚡ 一键整理** - AI 扫描全文自动合并人物、补充信息、生成关系

### 数据管理
- **📤 导入/导出** - 完整项目数据 JSON 导入导出，便于备份迁移
- **🗑️ 数据清理** - 一键清空单个或全部数据表
- **📝 右键菜单** - 选中文字后右键可进行 AI 重写、精简、扩写等操作

## 🛠️ 技术栈

| 前端 | 后端 |
|------|------|
| Next.js 16+ | FastAPI |
| Tailwind CSS + Shadcn/UI | SQLAlchemy (Async) |
| Tiptap Editor | SQLite |
| Zustand | OpenAI SDK |
| React Flow | Pydantic |

## 📦 快速开始

### 环境要求
- Python 3.10+
- Node.js 18+
- npm 或 pnpm

### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/SupCH/Novel-Copilot.git
cd Novel-Copilot

# 后端安装
cd backend
pip install -r requirements.txt

# 前端安装
cd ../frontend
npm install
```

### 启动服务

**方式一：使用启动脚本 (推荐)**
```bash
# Windows
.\start.ps1
# 或
start.bat
```

**方式二：手动启动**
```bash
# 终端 1 - 后端
cd backend
uvicorn main:app --reload --port 3506

# 终端 2 - 前端
cd frontend
npm run dev -- -p 3505
```

访问 http://localhost:3505 开始使用！

## ⚙️ 配置

在前端界面点击右上角 **AI 设置** 按钮配置：

| 配置项 | 说明 | 示例 |
|--------|------|------|
| API Base | API 地址 | `https://api.openai.com/v1` 或 Ollama 地址 |
| API Key | API 密钥 | `sk-xxx` |
| 续写模型 | 用于内容生成 | `gpt-4o-mini` |
| 提取模型 | 用于数据提取 | `gpt-3.5-turbo` (可选) |
| 生成字数 | 每次生成的 token 数 | `500` |

## 📁 项目结构

```
Novel-Copilot/
├── backend/
│   ├── main.py              # FastAPI 入口
│   ├── models/              # 数据模型 (schemas, dto)
│   ├── routers/             # API 路由 (projects, chapters, ai, data-tables)
│   ├── services/            # 业务逻辑 (AI 服务)
│   └── data/                # SQLite 数据库
├── frontend/
│   ├── app/                 # Next.js 页面
│   │   ├── page.tsx         # 首页（项目列表）
│   │   └── project/[id]/    # 项目编辑页（动态路由）
│   ├── components/          # React 组件
│   │   ├── novel-editor.tsx # 主编辑器
│   │   ├── character-graph.tsx # 人物关系图
│   │   └── ...
│   ├── lib/                 # API 客户端、工具函数
│   └── store/               # Zustand 状态管理
├── start.ps1                # Windows 启动脚本
└── README.md
```

## 🔗 API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/projects` | GET/POST | 项目列表/创建 |
| `/api/chapters` | GET/POST | 章节管理 |
| `/api/data-tables` | GET/POST | 数据表管理 |
| `/api/ai/continue` | POST | AI 续写（SSE） |
| `/api/ai/extract` | POST | AI 数据提取 |
| `/api/ai/generate-avatar` | POST | 生成 AI 头像（支持缩略图压缩） |
| `/api/ai/organize-characters` | POST | AI 一键整理人物关系 |
| `/thumbnails/{path}` | GET | 访问本地压缩后的缩略图 |
| `/api/data/export/{id}` | GET | 导出项目 |
| `/api/data/import` | POST | 导入项目 |

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

[MIT License](LICENSE)

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/SupCH">SupCH</a>
</p>
