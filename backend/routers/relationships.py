"""
角色关系管理 API 路由
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.schemas import Relationship, Project, Character
from models.dto import RelationshipCreate, RelationshipUpdate, RelationshipResponse

router = APIRouter(prefix="/api", tags=["Relationships"])


@router.get("/projects/{project_id}/relationships", response_model=list[RelationshipResponse])
async def list_relationships(project_id: int, db: AsyncSession = Depends(get_db)):
    """获取项目所有角色关系"""
    # 检查项目是否存在
    project = await db.execute(select(Project).where(Project.id == project_id))
    if not project.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")
    
    result = await db.execute(
        select(Relationship).where(Relationship.project_id == project_id)
    )
    return result.scalars().all()


@router.post("/relationships", response_model=RelationshipResponse, status_code=status.HTTP_201_CREATED)
async def create_relationship(data: RelationshipCreate, db: AsyncSession = Depends(get_db)):
    """创建新关系"""
    # 检查项目是否存在
    project = await db.execute(select(Project).where(Project.id == data.project_id))
    if not project.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")
    
    # 检查源角色是否存在
    source = await db.execute(select(Character).where(Character.id == data.source_id))
    if not source.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Source character not found")
    
    # 检查目标角色是否存在
    target = await db.execute(select(Character).where(Character.id == data.target_id))
    if not target.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Target character not found")
    
    relationship = Relationship(**data.model_dump())
    db.add(relationship)
    await db.flush()
    await db.refresh(relationship)
    return relationship


@router.put("/relationships/{relationship_id}", response_model=RelationshipResponse)
async def update_relationship(relationship_id: int, data: RelationshipUpdate, db: AsyncSession = Depends(get_db)):
    """更新关系"""
    result = await db.execute(select(Relationship).where(Relationship.id == relationship_id))
    relationship = result.scalar_one_or_none()
    if not relationship:
        raise HTTPException(status_code=404, detail="Relationship not found")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(relationship, key, value)
    
    await db.flush()
    await db.refresh(relationship)
    return relationship


@router.delete("/relationships/{relationship_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_relationship(relationship_id: int, db: AsyncSession = Depends(get_db)):
    """删除关系"""
    result = await db.execute(select(Relationship).where(Relationship.id == relationship_id))
    relationship = result.scalar_one_or_none()
    if not relationship:
        raise HTTPException(status_code=404, detail="Relationship not found")
    
    await db.delete(relationship)
