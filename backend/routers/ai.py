"""
AI 功能 API 路由
SSE 流式续写、摘要生成
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional

from database import get_db
from models.schemas import Project, Character, Relationship, Chapter
from services.ai_service import generate_continuation, generate_summary, list_models

router = APIRouter(prefix="/api/ai", tags=["AI"])


class ContinueRequest(BaseModel):
    """AI 续写请求"""
    project_id: int
    context: str  # 前文内容
    model: str = "gpt-4o-mini"
    temperature: float = 0.7
    max_tokens: int = 1000
    api_base: Optional[str] = None
    api_key: Optional[str] = None


class SummarizeRequest(BaseModel):
    """AI 摘要请求"""
    chapter_id: int
    model: str = "gpt-4o-mini"
    api_base: Optional[str] = None
    api_key: Optional[str] = None


@router.post("/continue")
async def ai_continue(data: ContinueRequest, db: AsyncSession = Depends(get_db)):
    """
    AI 续写 (SSE 流式返回)
    
    返回 text/event-stream 格式
    """
    # 获取项目信息
    result = await db.execute(select(Project).where(Project.id == data.project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # 获取角色关系（用于 RAG 上下文）
    result = await db.execute(
        select(Relationship, Character)
        .join(Character, Relationship.source_id == Character.id)
        .where(Relationship.project_id == data.project_id)
    )
    
    relationships = []
    for rel, source_char in result.all():
        # 获取目标角色名
        target_result = await db.execute(select(Character).where(Character.id == rel.target_id))
        target_char = target_result.scalar_one_or_none()
        if target_char:
            relationships.append({
                "source_name": source_char.name,
                "target_name": target_char.name,
                "relation_type": rel.relation_type,
                "description": rel.description,
            })
    
    async def event_stream():
        """SSE 事件流生成器"""
        async for chunk in generate_continuation(
            context=data.context,
            world_view=project.world_view or "",
            style=project.style or "",
            relationships=relationships,
            model=data.model,
            temperature=data.temperature,
            max_tokens=data.max_tokens,
            api_base=data.api_base,
            api_key=data.api_key,
        ):
            # SSE 格式: 将内容中的换行符编码为 \\n 避免破坏 SSE 协议
            encoded_chunk = chunk.replace("\n", "\\n")
            yield f"data: {encoded_chunk}\n\n"
        yield "data: [DONE]\n\n"
    
    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


@router.post("/summarize")
async def ai_summarize(data: SummarizeRequest, db: AsyncSession = Depends(get_db)):
    """AI 生成章节摘要并保存"""
    result = await db.execute(select(Chapter).where(Chapter.id == data.chapter_id))
    chapter = result.scalar_one_or_none()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    
    if not chapter.content:
        raise HTTPException(status_code=400, detail="Chapter has no content")
    
    # 生成摘要
    summary = await generate_summary(
        chapter.content, 
        model=data.model,
        api_base=data.api_base,
        api_key=data.api_key,
    )
    
    # 保存到数据库
    chapter.summary = summary
    await db.flush()
    await db.refresh(chapter)
    
    return {"summary": summary}


class ModelsRequest(BaseModel):
    """获取模型列表请求"""
    api_base: Optional[str] = None
    api_key: Optional[str] = None


@router.post("/models")
async def ai_models(data: ModelsRequest):
    """获取可用模型列表（兼作连接测试）"""
    try:
        models = await list_models(data.api_base, data.api_key)
        return {"models": models}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


class ProcessTableEditRequest(BaseModel):
    """处理表格编辑请求"""
    project_id: int
    content: str  # AI 生成的原始内容


@router.post("/process-table-edit")
async def process_table_edit(data: ProcessTableEditRequest, db: AsyncSession = Depends(get_db)):
    """
    清理 AI 输出中可能混入的代码内容
    返回: 清理后的正文内容
    """
    from services.ai_service import clean_ai_output
    
    # 使用 clean_ai_output 清理内容
    clean_content = clean_ai_output(data.content)
    
    return {"content": clean_content, "operations_applied": 0}


class ExtractDataRequest(BaseModel):
    """提取数据请求"""
    project_id: int
    content: str  # 要分析的内容
    model: str = "gpt-4o-mini"
    api_base: str = None
    api_key: str = None


@router.post("/extract-data")
async def extract_data(data: ExtractDataRequest, db: AsyncSession = Depends(get_db)):
    """
    从内容中提取结构化数据并更新数据表
    返回: 更新统计
    """
    from services.ai_service import extract_all_data
    from models.schemas import DataTable
    
    print(f"[DEBUG] extract-data called for project {data.project_id}")
    print(f"[DEBUG] Content length: {len(data.content)}")
    print(f"[DEBUG] Model: {data.model}, API Base: {data.api_base}, API Key: {'***' if data.api_key else 'None'}")
    
    # 调用 AI 提取数据
    try:
        extracted = await extract_all_data(
            content=data.content,
            model=data.model,
            api_base=data.api_base,
            api_key=data.api_key,
        )
        print(f"[DEBUG] Extracted data: {extracted}")
    except Exception as e:
        print(f"[ERROR] extract_all_data failed: {e}")
        return {"success": False, "error": str(e), "updates": {}, "total": 0}
    
    # 获取或创建项目的数据表
    result = await db.execute(
        select(DataTable).where(DataTable.project_id == data.project_id)
    )
    tables = {t.table_type: t for t in result.scalars().all()}
    
    # 确保所有表都存在
    for table_type in range(6):
        if table_type not in tables:
            new_table = DataTable(
                project_id=data.project_id,
                table_type=table_type,
                rows=[]
            )
            db.add(new_table)
            await db.flush()
            await db.refresh(new_table)
            tables[table_type] = new_table
    
    # 表格类型映射和字段映射
    table_mappings = {
        0: ("spacetime", ["date", "time", "location", "characters"]),
        1: ("characters", ["name", "traits", "personality", "role", "hobbies", "likes", "residence", "other"]),
        2: ("relationships", ["name", "relation", "attitude", "affection"]),
        3: ("tasks", ["character", "task", "location", "duration"]),
        4: ("events", ["character", "event", "date", "location", "emotion"]),
        5: ("items", ["owner", "description", "name", "importance"]),
    }
    
    updates = {}
    modified_tables = []
    for table_type, (key, fields) in table_mappings.items():
        items = extracted.get(key, [])
        if items:
            table = tables[table_type]
            # 创建新的 rows 列表（避免就地修改导致 SQLAlchemy 检测不到变化）
            new_rows = list(table.rows) if table.rows else []
            for item in items:
                # 转换为索引格式
                row = {}
                for i, field in enumerate(fields):
                    if field in item and item[field]:
                        row[i] = str(item[field])
                if row:
                    new_rows.append(row)
                    print(f"[DEBUG] Added row to table {table_type}: {row}")
            # 重新赋值而不是就地修改，确保 SQLAlchemy 检测到变化
            table.rows = new_rows
            modified_tables.append(table)
            updates[key] = len(items)
    
    # 显式标记修改过的字段
    from sqlalchemy.orm.attributes import flag_modified
    for table in modified_tables:
        flag_modified(table, "rows")
    
    await db.commit()
    print(f"[DEBUG] Commit successful, updates: {updates}")
    
    return {
        "success": True,
        "updates": updates,
        "total": sum(updates.values())
    }

