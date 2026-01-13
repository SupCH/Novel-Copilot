"""
章节管理 API 路由
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.schemas import Chapter, Project
from models.dto import ChapterCreate, ChapterUpdate, ChapterResponse, ChapterReorder

router = APIRouter(prefix="/api", tags=["Chapters"])


def count_words(text: str) -> int:
    """计算字数（中文字符 + 英文单词）"""
    if not text:
        return 0
    # 简单统计：中文字符 + 空格分隔的英文单词
    chinese_chars = sum(1 for char in text if '\u4e00' <= char <= '\u9fff')
    english_words = len([w for w in text.split() if w.isascii() and w.isalpha()])
    return chinese_chars + english_words


@router.get("/projects/{project_id}/chapters", response_model=list[ChapterResponse])
async def list_chapters(project_id: int, db: AsyncSession = Depends(get_db)):
    """获取项目所有章节（按 rank 排序）"""
    # 检查项目是否存在
    project = await db.execute(select(Project).where(Project.id == project_id))
    if not project.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")
    
    result = await db.execute(
        select(Chapter).where(Chapter.project_id == project_id).order_by(Chapter.rank)
    )
    return result.scalars().all()


@router.post("/projects/{project_id}/chapters", response_model=ChapterResponse, status_code=status.HTTP_201_CREATED)
async def create_chapter(project_id: int, data: ChapterCreate, db: AsyncSession = Depends(get_db)):
    """创建新章节"""
    # 检查项目是否存在
    project = await db.execute(select(Project).where(Project.id == project_id))
    if not project.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")
    
    # 获取当前最大 rank
    result = await db.execute(
        select(Chapter.rank).where(Chapter.project_id == project_id).order_by(Chapter.rank.desc()).limit(1)
    )
    max_rank = result.scalar() or 0
    
    chapter_data = data.model_dump()
    if chapter_data.get("rank", 0) == 0:
        chapter_data["rank"] = max_rank + 1
    
    chapter_data["word_count"] = count_words(chapter_data.get("content", ""))
    
    chapter = Chapter(project_id=project_id, **chapter_data)
    db.add(chapter)
    await db.flush()
    await db.refresh(chapter)
    return chapter


@router.get("/chapters/{chapter_id}", response_model=ChapterResponse)
async def get_chapter(chapter_id: int, db: AsyncSession = Depends(get_db)):
    """获取章节详情"""
    result = await db.execute(select(Chapter).where(Chapter.id == chapter_id))
    chapter = result.scalar_one_or_none()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    return chapter


@router.put("/chapters/{chapter_id}", response_model=ChapterResponse)
async def update_chapter(chapter_id: int, data: ChapterUpdate, db: AsyncSession = Depends(get_db)):
    """更新章节内容"""
    result = await db.execute(select(Chapter).where(Chapter.id == chapter_id))
    chapter = result.scalar_one_or_none()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    
    update_data = data.model_dump(exclude_unset=True)
    
    # 如果更新了内容，重新计算字数
    if "content" in update_data:
        update_data["word_count"] = count_words(update_data["content"])
    
    for key, value in update_data.items():
        setattr(chapter, key, value)
    
    await db.flush()
    await db.refresh(chapter)
    return chapter


@router.delete("/chapters/{chapter_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chapter(chapter_id: int, db: AsyncSession = Depends(get_db)):
    """删除章节"""
    result = await db.execute(select(Chapter).where(Chapter.id == chapter_id))
    chapter = result.scalar_one_or_none()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    
    await db.delete(chapter)


@router.put("/chapters/reorder", response_model=list[ChapterResponse])
async def reorder_chapters(data: ChapterReorder, db: AsyncSession = Depends(get_db)):
    """批量更新章节排序"""
    chapters = []
    for rank, chapter_id in enumerate(data.chapter_ids, start=1):
        result = await db.execute(select(Chapter).where(Chapter.id == chapter_id))
        chapter = result.scalar_one_or_none()
        if chapter:
            chapter.rank = rank
            chapters.append(chapter)
    
    await db.flush()
    return chapters
