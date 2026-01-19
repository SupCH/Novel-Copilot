"""
Novel-Copilot SQLAlchemy 数据模型
包含 Project, Character, Relationship, Chapter 四个核心表
"""

from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, Integer, Float, ForeignKey, JSON, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class Project(Base):
    """项目/小说表"""
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    world_view: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    style: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    # 剧情大纲
    outline: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # 人称视角: first(第一人称), third(第三人称), omniscient(上帝视角)
    perspective: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, default="third")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # 关系
    characters: Mapped[list["Character"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    relationships: Mapped[list["Relationship"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    chapters: Mapped[list["Chapter"]] = relationship(back_populates="project", cascade="all, delete-orphan")


class Character(Base):
    """角色表"""
    __tablename__ = "characters"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    attributes: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True, default=dict)
    position_x: Mapped[float] = mapped_column(Float, default=0.0)
    position_y: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # 关系
    project: Mapped["Project"] = relationship(back_populates="characters")


class Relationship(Base):
    """角色关系表"""
    __tablename__ = "relationships"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    source_id: Mapped[int] = mapped_column(ForeignKey("characters.id", ondelete="CASCADE"), nullable=False)
    target_id: Mapped[int] = mapped_column(ForeignKey("characters.id", ondelete="CASCADE"), nullable=False)
    relation_type: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # 关系
    project: Mapped["Project"] = relationship(back_populates="relationships")
    source: Mapped["Character"] = relationship(foreign_keys=[source_id])
    target: Mapped["Character"] = relationship(foreign_keys=[target_id])


class Chapter(Base):
    """章节表"""
    __tablename__ = "chapters"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[Optional[str]] = mapped_column(Text, nullable=True, default="")
    rank: Mapped[int] = mapped_column(Integer, default=0)
    word_count: Mapped[int] = mapped_column(Integer, default=0)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # 章节大纲
    chapter_outline: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    characters_mentioned: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # 关系
    project: Mapped["Project"] = relationship(back_populates="chapters")


class DataTable(Base):
    """
    数据表 - 用于存储 AI 自动提取的结构化数据
    table_type:
        0 = 时空表 (日期, 时间, 地点, 角色)
        1 = 角色特征表 (角色名, 身体特征, 性格, 职业, 爱好, 喜欢的事物, 住所, 其他重要信息)
        2 = 社交关系表 (角色名, 对主角关系, 态度, 好感度)
        3 = 任务表 (角色, 任务, 地点, 持续时间)
        4 = 重要事件表 (角色, 事件简述, 日期, 地点, 情绪)
        5 = 物品表 (拥有人, 物品描述, 物品名, 重要原因)
    """
    __tablename__ = "data_tables"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    table_type: Mapped[int] = mapped_column(Integer, nullable=False)  # 0-5
    rows: Mapped[list] = mapped_column(JSON, nullable=False, default=list)  # Array of row objects
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class Snapshot(Base):
    """
    项目快照表 - 存储项目的完整历史版本
    snapshot_type:
        "auto" - 自动保存的快照
        "manual" - 用户手动创建的快照
    """
    __tablename__ = "snapshots"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    snapshot_type: Mapped[str] = mapped_column(String(20), nullable=False, default="manual")
    # 完整快照数据 (JSON): { project, chapters, characters, relationships, data_tables }
    data: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
