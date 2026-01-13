"""
角色管理 API 路由
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.schemas import Character, Project
from models.dto import CharacterCreate, CharacterUpdate, CharacterResponse

router = APIRouter(prefix="/api", tags=["Characters"])


@router.get("/projects/{project_id}/characters", response_model=list[CharacterResponse])
async def list_characters(project_id: int, db: AsyncSession = Depends(get_db)):
    """获取项目所有角色"""
    # 检查项目是否存在
    project = await db.execute(select(Project).where(Project.id == project_id))
    if not project.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")
    
    result = await db.execute(
        select(Character).where(Character.project_id == project_id).order_by(Character.id)
    )
    return result.scalars().all()


@router.post("/projects/{project_id}/characters", response_model=CharacterResponse, status_code=status.HTTP_201_CREATED)
async def create_character(project_id: int, data: CharacterCreate, db: AsyncSession = Depends(get_db)):
    """创建新角色"""
    # 检查项目是否存在
    project = await db.execute(select(Project).where(Project.id == project_id))
    if not project.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")
    
    character = Character(project_id=project_id, **data.model_dump())
    db.add(character)
    await db.flush()
    await db.refresh(character)
    return character


@router.get("/characters/{character_id}", response_model=CharacterResponse)
async def get_character(character_id: int, db: AsyncSession = Depends(get_db)):
    """获取角色详情"""
    result = await db.execute(select(Character).where(Character.id == character_id))
    character = result.scalar_one_or_none()
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")
    return character


@router.put("/characters/{character_id}", response_model=CharacterResponse)
async def update_character(character_id: int, data: CharacterUpdate, db: AsyncSession = Depends(get_db)):
    """更新角色信息"""
    result = await db.execute(select(Character).where(Character.id == character_id))
    character = result.scalar_one_or_none()
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(character, key, value)
    
    await db.flush()
    await db.refresh(character)
    return character


@router.delete("/characters/{character_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_character(character_id: int, db: AsyncSession = Depends(get_db)):
    """删除角色（级联删除相关关系）"""
    result = await db.execute(select(Character).where(Character.id == character_id))
    character = result.scalar_one_or_none()
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")
    
    await db.delete(character)
