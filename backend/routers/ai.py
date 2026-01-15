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


class ModifyRequest(BaseModel):
    """AI 修改文字请求"""
    text: str
    action: str  # rewrite, shorten, expand, formal, casual, serious
    model: str = "gpt-4o-mini"
    api_base: Optional[str] = None
    api_key: Optional[str] = None


@router.post("/modify")
async def ai_modify(data: ModifyRequest):
    """AI 修改文字"""
    from services.ai_service import modify_text
    
    try:
        result = await modify_text(
            text=data.text,
            action=data.action,
            model=data.model,
            api_base=data.api_base,
            api_key=data.api_key,
        )
        return {"success": True, "result": result}
    except Exception as e:
        return {"success": False, "error": str(e)}


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


class TestExtractRequest(BaseModel):
    """测试提取模型请求"""
    model: str
    api_base: Optional[str] = None
    api_key: Optional[str] = None


@router.post("/test-extract")
async def test_extract_model(data: TestExtractRequest):
    """
    测试模型是否支持数据提取功能
    使用简短的测试内容验证模型兼容性
    """
    from services.ai_service import get_client
    
    try:
        client = get_client(data.api_base, data.api_key)
        
        # 简单测试请求
        response = await client.chat.completions.create(
            model=data.model,
            messages=[
                {"role": "system", "content": "返回JSON格式: {\"test\": true}"},
                {"role": "user", "content": "测试"},
            ],
            temperature=0.1,
            max_tokens=50,
        )
        
        content = response.choices[0].message.content or ""
        return {
            "success": True,
            "message": "模型测试通过",
            "response": content[:100],
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"模型测试失败: {str(e)}",
            "response": None,
        }


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
                
                if not row:
                    continue
                    
                # 获取第一列的值（通常是名字/角色名）作为唯一标识
                first_col_value = row.get(0, "")
                
                # 查找是否有相同名字的现有行
                existing_row_idx = None
                if first_col_value:
                    for idx, existing_row in enumerate(new_rows):
                        if existing_row.get(0, "") == first_col_value:
                            existing_row_idx = idx
                            break
                
                if existing_row_idx is not None:
                    # 更新现有行：合并新数据（只更新非空字段）
                    for col_idx, col_value in row.items():
                        if col_value:  # 只更新非空值
                            new_rows[existing_row_idx][col_idx] = col_value
                    print(f"[DEBUG] Updated existing row in table {table_type}: {first_col_value}")
                else:
                    # 添加新行
                    new_rows.append(row)
                    print(f"[DEBUG] Added new row to table {table_type}: {row}")
                    
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


class OrganizeCharactersRequest(BaseModel):
    """整理人物请求"""
    project_id: int
    model: str = "gpt-4o-mini"
    api_base: Optional[str] = None
    api_key: Optional[str] = None


@router.post("/organize-characters")
async def organize_characters(data: OrganizeCharactersRequest, db: AsyncSession = Depends(get_db)):
    """
    一键整理人物关系
    扫描所有章节，使用 AI 合并重复人物、补充信息
    """
    from services.ai_service import get_client
    
    # 获取项目
    result = await db.execute(select(Project).where(Project.id == data.project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # 获取所有章节内容
    chapters_result = await db.execute(
        select(Chapter).where(Chapter.project_id == data.project_id).order_by(Chapter.rank)
    )
    chapters = chapters_result.scalars().all()
    
    if not chapters:
        return {"success": False, "message": "没有章节内容"}
    
    # 合并所有章节内容
    all_content = "\n\n".join([
        f"【{ch.title}】\n{ch.content or ''}" 
        for ch in chapters if ch.content
    ])
    
    if not all_content.strip():
        return {"success": False, "message": "章节内容为空"}
    
    # 获取现有人物数据
    from models.schemas import DataTable
    tables_result = await db.execute(
        select(DataTable).where(DataTable.project_id == data.project_id)
    )
    tables = {t.table_type: t for t in tables_result.scalars().all()}
    
    existing_characters = []
    if 1 in tables and tables[1].rows:
        for row in tables[1].rows:
            if row.get(0):
                existing_characters.append(row.get(0))
    
    # 构建 AI 提示
    prompt = f"""请分析以下小说内容，整理人物信息。

现有人物列表: {', '.join(existing_characters) if existing_characters else '无'}

小说内容:
{all_content[:30000]}

请输出 JSON 格式的整理结果，包含所有人物的完整信息:
{{
    "characters": [
        {{
            "name": "人物名",
            "traits": "身体特征外貌描写",
            "personality": "性格特点",
            "role": "身份/职业",
            "hobbies": "爱好特长",
            "likes": "喜欢的事物/人",
            "residence": "住所/势力",
            "other": "其他重要信息"
        }}
    ],
    "relationships": [
        {{
            "source": "人物A",
            "target": "人物B", 
            "relation": "关系类型",
            "attitude": "态度",
            "affection": "好感度描述"
        }}
    ]
}}

注意:
1. 合并同一人物的不同称呼（如"阮酥"和"阮姑娘"）
2. 整合散落在各章节的信息
3. 只返回 JSON，不要其他内容"""

    try:
        # 使用项目配置或请求参数
        api_base = data.api_base or project.api_base
        api_key = data.api_key or project.api_key
        
        client = get_client(api_base, api_key)
        
        response = await client.chat.completions.create(
            model=data.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=4000,
            response_format={"type": "json_object"}
        )
        
        result_text = response.choices[0].message.content
        import json
        result_data = json.loads(result_text)
        
        # 更新人物表
        characters = result_data.get("characters", [])
        relationships_data = result_data.get("relationships", [])
        
        # 更新人物表
        if 1 not in tables:
            char_table = DataTable(
                project_id=data.project_id,
                table_type=1,
                rows=[]
            )
            db.add(char_table)
            tables[1] = char_table
        
        new_rows = []
        for char in characters:
            new_rows.append({
                0: char.get("name", ""),
                1: char.get("traits", ""),
                2: char.get("personality", ""),
                3: char.get("role", ""),
                4: char.get("hobbies", ""),
                5: char.get("likes", ""),
                6: char.get("residence", ""),
                7: char.get("other", ""),
            })
        tables[1].rows = new_rows
        
        # 更新关系表
        if 2 not in tables:
            rel_table = DataTable(
                project_id=data.project_id,
                table_type=2,
                rows=[]
            )
            db.add(rel_table)
            tables[2] = rel_table
        
        rel_rows = []
        for rel in relationships_data:
            rel_rows.append({
                0: rel.get("source", ""),
                1: rel.get("target", ""),
                2: rel.get("relation", ""),
                3: rel.get("attitude", ""),
                4: rel.get("affection", ""),
            })
        tables[2].rows = rel_rows
        
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(tables[1], "rows")
        flag_modified(tables[2], "rows")
        
        await db.commit()
        
        return {
            "success": True,
            "characters_count": len(characters),
            "relationships_count": len(relationships_data),
            "message": f"整理完成：{len(characters)} 个人物，{len(relationships_data)} 条关系"
        }
        
    except Exception as e:
        print(f"[ERROR] organize_characters: {e}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "message": f"整理失败: {str(e)}"
        }
