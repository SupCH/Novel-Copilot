"""
Novel-Copilot 后端入口
FastAPI 应用主文件
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from routers import (
    projects_router,
    characters_router,
    relationships_router,
    chapters_router,
    ai_router,
    data_io_router,
    data_tables_router,
    snapshots_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时初始化数据库
    await init_db()
    print("[INFO] Database initialized")
    yield
    # 关闭时清理资源
    print("[INFO] Shutting down...")


app = FastAPI(
    title="Novel-Copilot API",
    description="AI 小说创作辅助平台后端",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS 配置（开发环境）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,  # 通配符 * 与 credentials=True 不兼容
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(projects_router)
app.include_router(characters_router)
app.include_router(relationships_router)
app.include_router(chapters_router)
app.include_router(ai_router)
app.include_router(data_io_router)
app.include_router(data_tables_router)
app.include_router(snapshots_router)


@app.get("/")
async def root():
    """健康检查"""
    return {"status": "ok", "message": "Novel-Copilot API is running"}


@app.get("/api/health")
async def health():
    """健康检查端点"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
