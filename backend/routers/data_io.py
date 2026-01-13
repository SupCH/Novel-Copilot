"""
数据导入导出 API 路由
"""

import json
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.schemas import Project, Character, Relationship, Chapter

router = APIRouter(prefix="/api", tags=["Import/Export"])


@router.get("/export/{project_id}")
async def export_project(project_id: int, db: AsyncSession = Depends(get_db)):
    """导出项目为 JSON"""
    # 获取项目
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # 获取角色
    result = await db.execute(select(Character).where(Character.project_id == project_id))
    characters = result.scalars().all()
    
    # 获取关系
    result = await db.execute(select(Relationship).where(Relationship.project_id == project_id))
    relationships = result.scalars().all()
    
    # 获取章节
    result = await db.execute(select(Chapter).where(Chapter.project_id == project_id).order_by(Chapter.rank))
    chapters = result.scalars().all()
    
    # 组装导出数据
    export_data = {
        "version": "1.0",
        "project": {
            "title": project.title,
            "description": project.description,
            "world_view": project.world_view,
            "style": project.style,
        },
        "characters": [
            {
                "id": c.id,
                "name": c.name,
                "bio": c.bio,
                "attributes": c.attributes,
                "position_x": c.position_x,
                "position_y": c.position_y,
            }
            for c in characters
        ],
        "relationships": [
            {
                "source_id": r.source_id,
                "target_id": r.target_id,
                "relation_type": r.relation_type,
                "description": r.description,
            }
            for r in relationships
        ],
        "chapters": [
            {
                "title": ch.title,
                "content": ch.content,
                "rank": ch.rank,
                "summary": ch.summary,
                "characters_mentioned": ch.characters_mentioned,
            }
            for ch in chapters
        ],
    }
    
    return JSONResponse(
        content=export_data,
        headers={
            "Content-Disposition": f"attachment; filename={project.title}.json"
        }
    )


@router.post("/import")
async def import_project(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    """从 JSON 导入项目"""
    try:
        content = await file.read()
        data = json.loads(content.decode("utf-8"))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON file: {str(e)}")
    
    # 验证数据格式
    if "project" not in data:
        raise HTTPException(status_code=400, detail="Missing 'project' field")
    
    # 创建项目
    project_data = data["project"]
    project = Project(
        title=project_data.get("title", "Imported Project"),
        description=project_data.get("description"),
        world_view=project_data.get("world_view"),
        style=project_data.get("style"),
    )
    db.add(project)
    await db.flush()
    
    # ID 映射表（用于关系导入）
    char_id_map = {}
    
    # 创建角色
    for char_data in data.get("characters", []):
        old_id = char_data.get("id")
        character = Character(
            project_id=project.id,
            name=char_data.get("name", "Unknown"),
            bio=char_data.get("bio"),
            attributes=char_data.get("attributes", {}),
            position_x=char_data.get("position_x", 0),
            position_y=char_data.get("position_y", 0),
        )
        db.add(character)
        await db.flush()
        if old_id:
            char_id_map[old_id] = character.id
    
    # 创建关系（使用新 ID）
    for rel_data in data.get("relationships", []):
        old_source = rel_data.get("source_id")
        old_target = rel_data.get("target_id")
        if old_source in char_id_map and old_target in char_id_map:
            relationship = Relationship(
                project_id=project.id,
                source_id=char_id_map[old_source],
                target_id=char_id_map[old_target],
                relation_type=rel_data.get("relation_type", "unknown"),
                description=rel_data.get("description"),
            )
            db.add(relationship)
    
    # 创建章节
    for chapter_data in data.get("chapters", []):
        chapter = Chapter(
            project_id=project.id,
            title=chapter_data.get("title", "Untitled"),
            content=chapter_data.get("content", ""),
            rank=chapter_data.get("rank", 0),
            summary=chapter_data.get("summary"),
            characters_mentioned=chapter_data.get("characters_mentioned", []),
        )
        db.add(chapter)
    
    await db.flush()
    await db.refresh(project)
    
    return {"message": "Import successful", "project_id": project.id}
