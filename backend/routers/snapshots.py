"""
快照路由 - 版本历史功能
"""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel

from database import get_db
from models.schemas import Snapshot, Project, Chapter, Character, Relationship, DataTable

router = APIRouter(prefix="/api/snapshots", tags=["snapshots"])


class CreateSnapshotRequest(BaseModel):
    """创建快照请求"""
    project_id: int
    name: Optional[str] = None
    description: Optional[str] = None
    snapshot_type: str = "manual"


class SnapshotResponse(BaseModel):
    """快照响应"""
    id: int
    project_id: int
    name: str
    description: Optional[str]
    snapshot_type: str
    created_at: datetime

    class Config:
        from_attributes = True


class SnapshotDetailResponse(SnapshotResponse):
    """快照详情响应（包含数据）"""
    data: dict


async def capture_project_snapshot(db: AsyncSession, project_id: int) -> dict:
    """
    捕获项目的完整快照数据
    """
    # 获取项目
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # 获取章节
    chapters_result = await db.execute(
        select(Chapter).where(Chapter.project_id == project_id).order_by(Chapter.rank)
    )
    chapters = chapters_result.scalars().all()
    
    # 获取角色
    characters_result = await db.execute(
        select(Character).where(Character.project_id == project_id)
    )
    characters = characters_result.scalars().all()
    
    # 获取关系
    relationships_result = await db.execute(
        select(Relationship).where(Relationship.project_id == project_id)
    )
    relationships = relationships_result.scalars().all()
    
    # 获取数据表
    data_tables_result = await db.execute(
        select(DataTable).where(DataTable.project_id == project_id)
    )
    data_tables = data_tables_result.scalars().all()
    
    return {
        "project": {
            "title": project.title,
            "description": project.description,
            "world_view": project.world_view,
            "style": project.style,
            "outline": project.outline,
            "perspective": project.perspective,
        },
        "chapters": [
            {
                "id": ch.id,
                "title": ch.title,
                "content": ch.content,
                "rank": ch.rank,
                "word_count": ch.word_count,
                "summary": ch.summary,
                "chapter_outline": ch.chapter_outline,
                "characters_mentioned": ch.characters_mentioned,
            }
            for ch in chapters
        ],
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
                "id": r.id,
                "source_id": r.source_id,
                "target_id": r.target_id,
                "relation_type": r.relation_type,
                "description": r.description,
            }
            for r in relationships
        ],
        "data_tables": [
            {
                "id": dt.id,
                "table_type": dt.table_type,
                "rows": dt.rows,
            }
            for dt in data_tables
        ],
    }


@router.post("/", response_model=SnapshotResponse)
async def create_snapshot(data: CreateSnapshotRequest, db: AsyncSession = Depends(get_db)):
    """创建项目快照"""
    # 捕获快照数据
    snapshot_data = await capture_project_snapshot(db, data.project_id)
    
    # 生成快照名称
    name = data.name or f"快照 {datetime.now().strftime('%Y-%m-%d %H:%M')}"
    
    # 创建快照
    snapshot = Snapshot(
        project_id=data.project_id,
        name=name,
        description=data.description,
        snapshot_type=data.snapshot_type,
        data=snapshot_data,
    )
    db.add(snapshot)
    await db.commit()
    await db.refresh(snapshot)
    
    return snapshot


@router.get("/{project_id}", response_model=list[SnapshotResponse])
async def list_snapshots(project_id: int, db: AsyncSession = Depends(get_db)):
    """获取项目的快照列表"""
    result = await db.execute(
        select(Snapshot)
        .where(Snapshot.project_id == project_id)
        .order_by(Snapshot.created_at.desc())
    )
    snapshots = result.scalars().all()
    return snapshots


@router.get("/{snapshot_id}/detail", response_model=SnapshotDetailResponse)
async def get_snapshot_detail(snapshot_id: int, db: AsyncSession = Depends(get_db)):
    """获取快照详情（包含完整数据）"""
    result = await db.execute(select(Snapshot).where(Snapshot.id == snapshot_id))
    snapshot = result.scalar_one_or_none()
    if not snapshot:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    return snapshot


@router.post("/{snapshot_id}/restore")
async def restore_snapshot(snapshot_id: int, db: AsyncSession = Depends(get_db)):
    """恢复到指定快照"""
    # 获取快照
    result = await db.execute(select(Snapshot).where(Snapshot.id == snapshot_id))
    snapshot = result.scalar_one_or_none()
    if not snapshot:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    
    project_id = snapshot.project_id
    data = snapshot.data
    
    # 获取项目
    project_result = await db.execute(select(Project).where(Project.id == project_id))
    project = project_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # 恢复项目基本信息
    project_data = data.get("project", {})
    project.title = project_data.get("title", project.title)
    project.description = project_data.get("description")
    project.world_view = project_data.get("world_view")
    project.style = project_data.get("style")
    project.outline = project_data.get("outline")
    project.perspective = project_data.get("perspective")
    
    # 删除现有章节并恢复
    await db.execute(delete(Chapter).where(Chapter.project_id == project_id))
    for ch_data in data.get("chapters", []):
        chapter = Chapter(
            project_id=project_id,
            title=ch_data.get("title", ""),
            content=ch_data.get("content", ""),
            rank=ch_data.get("rank", 0),
            word_count=ch_data.get("word_count", 0),
            summary=ch_data.get("summary"),
            chapter_outline=ch_data.get("chapter_outline"),
            characters_mentioned=ch_data.get("characters_mentioned", []),
        )
        db.add(chapter)
    
    # 删除现有角色并恢复
    await db.execute(delete(Character).where(Character.project_id == project_id))
    character_id_map = {}  # 旧ID -> 新对象，用于关系恢复
    for c_data in data.get("characters", []):
        character = Character(
            project_id=project_id,
            name=c_data.get("name", ""),
            bio=c_data.get("bio"),
            attributes=c_data.get("attributes", {}),
            position_x=c_data.get("position_x", 0),
            position_y=c_data.get("position_y", 0),
        )
        db.add(character)
        await db.flush()  # 获取新ID
        character_id_map[c_data.get("id")] = character.id
    
    # 删除现有关系并恢复
    await db.execute(delete(Relationship).where(Relationship.project_id == project_id))
    for r_data in data.get("relationships", []):
        old_source_id = r_data.get("source_id")
        old_target_id = r_data.get("target_id")
        new_source_id = character_id_map.get(old_source_id)
        new_target_id = character_id_map.get(old_target_id)
        
        if new_source_id and new_target_id:
            relationship = Relationship(
                project_id=project_id,
                source_id=new_source_id,
                target_id=new_target_id,
                relation_type=r_data.get("relation_type", ""),
                description=r_data.get("description"),
            )
            db.add(relationship)
    
    # 删除现有数据表并恢复
    await db.execute(delete(DataTable).where(DataTable.project_id == project_id))
    for dt_data in data.get("data_tables", []):
        data_table = DataTable(
            project_id=project_id,
            table_type=dt_data.get("table_type", 0),
            rows=dt_data.get("rows", []),
        )
        db.add(data_table)
    
    await db.commit()
    
    return {"success": True, "message": f"已恢复到快照: {snapshot.name}"}


@router.delete("/{snapshot_id}")
async def delete_snapshot(snapshot_id: int, db: AsyncSession = Depends(get_db)):
    """删除快照"""
    result = await db.execute(select(Snapshot).where(Snapshot.id == snapshot_id))
    snapshot = result.scalar_one_or_none()
    if not snapshot:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    
    await db.delete(snapshot)
    await db.commit()
    
    return {"success": True, "message": "快照已删除"}
