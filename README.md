# Novel-Copilot

[![GitHub release](https://img.shields.io/github/v/release/SupCH/Novel-Copilot?include_prereleases&style=flat-square)](https://github.com/SupCH/Novel-Copilot/releases)
[![GitHub license](https://img.shields.io/github/license/SupCH/Novel-Copilot?style=flat-square)](https://github.com/SupCH/Novel-Copilot/blob/main/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/SupCH/Novel-Copilot?style=flat-square)](https://github.com/SupCH/Novel-Copilot/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/SupCH/Novel-Copilot?style=flat-square)](https://github.com/SupCH/Novel-Copilot/issues)

> 🚀 **隐私优先、本地化、可视化** 的 AI 小说创作辅助平台

![Novel-Copilot Demo](https://via.placeholder.com/800x400?text=Novel-Copilot+Demo)

## ✨ 功能特性

- **🤖 AI 智能续写** - 支持 OpenAI API / Ollama 本地模型，流式输出
- **📊 自动数据提取** - AI 自动识别角色、事件、关系并填充数据表
- **👥 社交关系管理** - 可视化管理角色间的关系网络
- **📝 富文本编辑器** - 基于 Tiptap 的沉浸式写作体验
- **📁 多项目管理** - 章节目录树，支持拖拽排序
- **💾 本地存储** - SQLite 数据库，数据完全本地化
- **🌙 深色模式** - 护眼的写作界面

## 🛠️ 技术栈

| 前端 | 后端 |
|------|------|
| Next.js 14+ | FastAPI |
| Tailwind CSS + Shadcn/UI | SQLAlchemy (Async) |
| Tiptap Editor | SQLite |
| Zustand | OpenAI SDK |

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
│   ├── models/              # 数据模型
│   ├── routers/             # API 路由
│   ├── services/            # 业务逻辑 (AI 服务等)
│   └── data/                # SQLite 数据库
├── frontend/
│   ├── app/                 # Next.js 页面
│   ├── components/          # React 组件
│   ├── lib/                 # API 客户端
│   └── store/               # Zustand 状态
├── start.ps1                # Windows 启动脚本
└── README.md
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

[MIT License](LICENSE)

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/SupCH">SupCH</a>
</p>
