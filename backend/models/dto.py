"""
Novel-Copilot Pydantic 数据传输对象 (DTO)
用于 API 请求/响应的数据验证
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


# ============ Project DTOs ============

class ProjectCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    world_view: Optional[str] = None
    style: Optional[str] = None


class ProjectUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    world_view: Optional[str] = None
    style: Optional[str] = None


class ProjectResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    world_view: Optional[str]
    style: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============ Character DTOs ============

class CharacterCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    bio: Optional[str] = None
    attributes: Optional[dict] = Field(default_factory=dict)
    position_x: float = 0.0
    position_y: float = 0.0


class CharacterUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    bio: Optional[str] = None
    attributes: Optional[dict] = None
    position_x: Optional[float] = None
    position_y: Optional[float] = None


class CharacterResponse(BaseModel):
    id: int
    project_id: int
    name: str
    bio: Optional[str]
    attributes: Optional[dict]
    position_x: float
    position_y: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============ Relationship DTOs ============

class RelationshipCreate(BaseModel):
    project_id: int
    source_id: int
    target_id: int
    relation_type: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = None


class RelationshipUpdate(BaseModel):
    relation_type: Optional[str] = Field(None, min_length=1, max_length=50)
    description: Optional[str] = None


class RelationshipResponse(BaseModel):
    id: int
    project_id: int
    source_id: int
    target_id: int
    relation_type: str
    description: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============ Chapter DTOs ============

class ChapterCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    content: Optional[str] = ""
    rank: int = 0


class ChapterUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    content: Optional[str] = None
    rank: Optional[int] = None
    summary: Optional[str] = None
    characters_mentioned: Optional[list] = None


class ChapterResponse(BaseModel):
    id: int
    project_id: int
    title: str
    content: Optional[str]
    rank: int
    word_count: int
    summary: Optional[str]
    characters_mentioned: Optional[list]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ChapterReorder(BaseModel):
    """批量更新章节排序"""
    chapter_ids: list[int]  # 按新顺序排列的章节 ID 列表
