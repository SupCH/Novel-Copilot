"""
数据表 API 路由
CRUD 操作用于管理 AI 自动提取的结构化数据
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional

from database import get_db
from models.schemas import DataTable

router = APIRouter(prefix="/api/data-tables", tags=["DataTables"])

# 表格类型定义
TABLE_TYPES = {
    0: {"name": "时空表", "columns": ["日期", "时间", "地点", "此地角色"]},
    1: {"name": "角色特征表", "columns": ["角色名", "身体特征", "性格", "职业", "爱好", "喜欢的事物", "住所", "其他重要信息"]},
    2: {"name": "社交关系表", "columns": ["角色名", "对主角关系", "对主角态度", "对主角好感"]},
    3: {"name": "任务表", "columns": ["角色", "任务", "地点", "持续时间"]},
    4: {"name": "重要事件表", "columns": ["角色", "事件简述", "日期", "地点", "情绪"]},
    5: {"name": "物品表", "columns": ["拥有人", "物品描述", "物品名", "重要原因"]},
}


class DataTableResponse(BaseModel):
    id: int
    project_id: int
    table_type: int
    table_name: str
    columns: list[str]
    rows: list[dict]

    class Config:
        from_attributes = True


class UpdateRowsRequest(BaseModel):
    rows: list[dict]


@router.get("/project/{project_id}")
async def list_data_tables(project_id: int, db: AsyncSession = Depends(get_db)):
    """获取项目的所有数据表"""
    result = await db.execute(
        select(DataTable).where(DataTable.project_id == project_id)
    )
    tables = result.scalars().all()
    
    # 确保每种类型的表都存在
    existing_types = {t.table_type for t in tables}
    tables_list = []
    
    for table_type, info in TABLE_TYPES.items():
        if table_type in existing_types:
            table = next(t for t in tables if t.table_type == table_type)
            tables_list.append(DataTableResponse(
                id=table.id,
                project_id=project_id,
                table_type=table_type,
                table_name=info["name"],
                columns=info["columns"],
                rows=table.rows or []
            ))
        else:
            # 创建缺失的表
            new_table = DataTable(
                project_id=project_id,
                table_type=table_type,
                rows=[]
            )
            db.add(new_table)
            await db.flush()
            await db.refresh(new_table)
            tables_list.append(DataTableResponse(
                id=new_table.id,
                project_id=project_id,
                table_type=table_type,
                table_name=info["name"],
                columns=info["columns"],
                rows=[]
            ))
    
    return tables_list


@router.put("/{table_id}")
async def update_data_table(
    table_id: int, 
    data: UpdateRowsRequest, 
    db: AsyncSession = Depends(get_db)
):
    """更新数据表的行"""
    result = await db.execute(select(DataTable).where(DataTable.id == table_id))
    table = result.scalar_one_or_none()
    
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    
    table.rows = data.rows
    await db.flush()
    await db.refresh(table)
    
    info = TABLE_TYPES.get(table.table_type, {"name": "未知", "columns": []})
    return DataTableResponse(
        id=table.id,
        project_id=table.project_id,
        table_type=table.table_type,
        table_name=info["name"],
        columns=info["columns"],
        rows=table.rows
    )


@router.delete("/{table_id}/clear")
async def clear_data_table(
    table_id: int,
    db: AsyncSession = Depends(get_db)
):
    """清空数据表的所有行"""
    result = await db.execute(select(DataTable).where(DataTable.id == table_id))
    table = result.scalar_one_or_none()
    
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    
    table.rows = []
    await db.flush()
    await db.refresh(table)
    
    info = TABLE_TYPES.get(table.table_type, {"name": "未知", "columns": []})
    return {"message": f"已清空 {info['name']}", "table_id": table_id}


@router.delete("/project/{project_id}/clear-all")
async def clear_all_data_tables(
    project_id: int,
    db: AsyncSession = Depends(get_db)
):
    """清空项目的所有数据表"""
    result = await db.execute(
        select(DataTable).where(DataTable.project_id == project_id)
    )
    tables = result.scalars().all()
    
    cleared_count = 0
    for table in tables:
        if table.rows:  # 只清空有数据的表
            table.rows = []
            cleared_count += 1
    
    await db.flush()
    return {"message": f"已清空 {cleared_count} 个数据表", "project_id": project_id}



# 表格操作函数 - 供 AI 解析使用
def apply_table_operations(tables: list[DataTable], operations: list[dict]) -> list[DataTable]:
    """
    应用表格操作
    operations 格式: [{"op": "insert/update/delete", "tableIndex": 0, "rowIndex": 0, "data": {...}}]
    """
    for op in operations:
        table_index = op.get("tableIndex")
        row_index = op.get("rowIndex")
        data = op.get("data", {})
        operation = op.get("op")
        
        # 找到对应的表
        table = next((t for t in tables if t.table_type == table_index), None)
        if not table:
            continue
        
        if operation == "insert":
            table.rows.append(data)
        elif operation == "update" and row_index is not None:
            if 0 <= row_index < len(table.rows):
                table.rows[row_index].update(data)
        elif operation == "delete" and row_index is not None:
            if 0 <= row_index < len(table.rows):
                table.rows.pop(row_index)
    
    return tables
