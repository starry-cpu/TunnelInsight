"""
History API - 历史记录管理
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from typing import Optional
from datetime import datetime, timedelta

from app.api.deps import get_current_active_user
from app.crud.base import CRUDBase
from app.database import get_db
from app.models.user import User
from app.models.defect import DefectRecord
from app.models.tunnel import Tunnel
from app.schemas.defects import DefectRecordResponse
from app.schemas.common import ApiResponse
from app.utils.file_path import get_image_url

router = APIRouter()
defect_crud = CRUDBase(DefectRecord)


@router.get("", response_model=ApiResponse)
async def get_history_list(
    skip: int = Query(0, ge=0, description="跳过记录数"),
    limit: int = Query(10, ge=1, le=100, description="返回记录数"),
    q: Optional[str] = Query(None, description="搜索关键词"),
    tunnel_id: Optional[str] = Query(None, description="按隧道ID筛选"),
    tunnel_name: Optional[str] = Query(None, description="按隧道名称筛选"),
    date_from: Optional[str] = Query(None, description="开始日期 (ISO 8601)"),
    date_to: Optional[str] = Query(None, description="结束日期 (ISO 8601)"),
    defect_type: Optional[str] = Query(None, description="按缺陷类型筛选"),
    severity: Optional[str] = Query(None, description="按严重程度筛选"),
    sort_by: str = Query("created_at", description="排序字段"),
    sort_order: str = Query("desc", description="排序方向 (asc/desc)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """获取历史记录列表"""

    # 使用 JOIN 查询，一次性获取隧道信息
    query = (
        select(DefectRecord, Tunnel.name.label('tunnel_name'))
        .outerjoin(Tunnel, DefectRecord.tunnel_id == Tunnel.id)
        .where(DefectRecord.user_id == current_user.id)
    )

    # 搜索条件
    if q:
        query = query.where(
            or_(
                DefectRecord.final_result.ilike(f"%{q}%"),
                DefectRecord.defect_type.ilike(f"%{q}%"),
                Tunnel.name.ilike(f"%{q}%"),
            )
        )

    # 隧道筛选
    if tunnel_id:
        query = query.where(DefectRecord.tunnel_id == tunnel_id)

    # 按隧道名称筛选
    if tunnel_name:
        query = query.where(Tunnel.name.ilike(f"%{tunnel_name}%"))

    # 日期范围
    if date_from:
        try:
            start_date = datetime.fromisoformat(date_from)
            query = query.where(DefectRecord.created_at >= start_date)
        except ValueError:
            pass

    if date_to:
        try:
            end_date = datetime.fromisoformat(date_to)
            query = query.where(DefectRecord.created_at <= end_date)
        except ValueError:
            pass

    # 缺陷类型筛选
    if defect_type:
        query = query.where(DefectRecord.defect_type == defect_type)

    # 严重程度筛选
    if severity:
        query = query.where(DefectRecord.severity == severity)

    # 排序
    order_column = getattr(DefectRecord, sort_by, DefectRecord.created_at)
    if sort_order == "desc":
        query = query.order_by(order_column.desc())
    else:
        query = query.order_by(order_column.asc())

    # 总数查询（需要使用相同的 JOIN 条件）
    from sqlalchemy import text
    count_query = (
        select(func.count())
        .select_from(DefectRecord.__table__.outerjoin(Tunnel.__table__))
        .where(DefectRecord.user_id == current_user.id)
    )

    # 应用相同的筛选条件到计数查询
    if q:
        count_query = count_query.where(
            or_(
                DefectRecord.final_result.ilike(f"%{q}%"),
                DefectRecord.defect_type.ilike(f"%{q}%"),
                Tunnel.name.ilike(f"%{q}%"),
            )
        )
    if tunnel_id:
        count_query = count_query.where(DefectRecord.tunnel_id == tunnel_id)
    if tunnel_name:
        count_query = count_query.where(Tunnel.name.ilike(f"%{tunnel_name}%"))
    if date_from:
        try:
            start_date = datetime.fromisoformat(date_from)
            count_query = count_query.where(DefectRecord.created_at >= start_date)
        except ValueError:
            pass
    if date_to:
        try:
            end_date = datetime.fromisoformat(date_to)
            count_query = count_query.where(DefectRecord.created_at <= end_date)
        except ValueError:
            pass
    if defect_type:
        count_query = count_query.where(DefectRecord.defect_type == defect_type)
    if severity:
        count_query = count_query.where(DefectRecord.severity == severity)

    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # 分页
    query = query.offset(skip).limit(limit)

    # 执行查询
    result = await db.execute(query)
    rows = result.all()

    # 构建响应数据
    records_with_tunnel = []
    for row in rows:
        record, tunnel_name = row

        record_dict = {
            "id": str(record.id),
            "user_id": str(record.user_id),
            "tunnel_id": str(record.tunnel_id) if record.tunnel_id else None,
            "tunnel_name": tunnel_name,  # 从 JOIN 中获取
            "location_id": str(record.location_id) if record.location_id else None,
            "image_path": get_image_url(record.image_path),
            "final_result": record.final_result,
            "raw_response": record.raw_response,
            "model_used": record.model_used,
            "inference_time_ms": record.inference_time_ms,
            "settings": record.settings_json,
            "defect_type": record.defect_type,
            "severity": record.severity,
            "stake_mark": record.stake_mark,
            "direction": record.direction,
            "created_at": record.created_at.isoformat(),
            "updated_at": record.updated_at.isoformat(),
            # RAG fields
            "repair_suggestion": record.repair_suggestion,
            "suggestion_sources": record.suggestion_sources,
            "rag_model_used": record.rag_model_used,
            "rag_query_time_ms": record.rag_query_time_ms,
        }
        records_with_tunnel.append(record_dict)

    return ApiResponse(
        success=True,
        data={
            "items": records_with_tunnel,
            "pagination": {
                "total": total,
                "skip": skip,
                "limit": limit,
                "has_next": total > skip + limit,
                "has_prev": skip > 0,
            }
        }
    )


@router.get("/stats", response_model=ApiResponse)
async def get_history_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """获取历史记录统计数据"""

    # 总记录数
    total_query = select(func.count()).select_from(DefectRecord).where(
        DefectRecord.user_id == current_user.id
    )
    total_result = await db.execute(total_query)
    total_records = total_result.scalar()

    # 今日记录数
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_query = select(func.count()).select_from(DefectRecord).where(
        and_(
            DefectRecord.user_id == current_user.id,
            DefectRecord.created_at >= today,
        )
    )
    today_result = await db.execute(today_query)
    today_records = today_result.scalar()

    # 本周记录数
    week_start = today - timedelta(days=today.weekday())
    week_query = select(func.count()).select_from(DefectRecord).where(
        and_(
            DefectRecord.user_id == current_user.id,
            DefectRecord.created_at >= week_start,
        )
    )
    week_result = await db.execute(week_query)
    week_records = week_result.scalar()

    # 唯一隧道数
    tunnels_query = select(func.count(func.distinct(DefectRecord.tunnel_id))).where(
        and_(
            DefectRecord.user_id == current_user.id,
            DefectRecord.tunnel_id.isnot(None),
        )
    )
    tunnels_result = await db.execute(tunnels_query)
    unique_tunnels = tunnels_result.scalar()

    # 缺陷类型统计
    defect_types_query = (
        select(
            DefectRecord.defect_type,
            func.count(DefectRecord.id).label("count")
        )
        .where(
            and_(
                DefectRecord.user_id == current_user.id,
                DefectRecord.defect_type.isnot(None),
            )
        )
        .group_by(DefectRecord.defect_type)
        .order_by(func.count(DefectRecord.id).desc())
        .limit(5)
    )
    defect_types_result = await db.execute(defect_types_query)
    top_defect_types = [
        {"type": row.defect_type, "count": row.count}
        for row in defect_types_result.all()
    ]

    # 严重程度统计
    severity_query = (
        select(
            DefectRecord.severity,
            func.count(DefectRecord.id).label("count")
        )
        .where(
            and_(
                DefectRecord.user_id == current_user.id,
                DefectRecord.severity.isnot(None),
            )
        )
        .group_by(DefectRecord.severity)
    )
    severity_result = await db.execute(severity_query)
    severity_distribution = {
        row.severity: row.count for row in severity_result.all()
    }

    return ApiResponse(
        success=True,
        data={
            "total_records": total_records,
            "today_records": today_records,
            "week_records": week_records,
            "unique_tunnels": unique_tunnels,
            "top_defect_types": top_defect_types,
            "severity_distribution": severity_distribution,
        }
    )


@router.get("/{record_id}", response_model=ApiResponse)
async def get_history_detail(
    record_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """获取历史记录详情"""

    # 查询记录
    record = await defect_crud.get(db, record_id)

    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Record not found"
        )

    # 检查权限
    if str(record.user_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    # 构建响应
    record_dict = {
        "id": str(record.id),
        "user_id": str(record.user_id),
        "tunnel_id": str(record.tunnel_id) if record.tunnel_id else None,
        "location_id": str(record.location_id) if record.location_id else None,
        "image_path": get_image_url(record.image_path),
        "final_result": record.final_result,
        "raw_response": record.raw_response,
        "model_used": record.model_used,
        "inference_time_ms": record.inference_time_ms,
        "settings": record.settings_json,
        "defect_type": record.defect_type,
        "severity": record.severity,
        "stake_mark": record.stake_mark,
        "direction": record.direction,
        "created_at": record.created_at.isoformat(),
        "updated_at": record.updated_at.isoformat(),
        # RAG fields
        "repair_suggestion": record.repair_suggestion,
        "suggestion_sources": record.suggestion_sources,
        "rag_model_used": record.rag_model_used,
        "rag_query_time_ms": record.rag_query_time_ms,
    }

    # 获取隧道信息
    if record.tunnel_id:
        tunnel_query = select(Tunnel).where(Tunnel.id == record.tunnel_id)
        tunnel_result = await db.execute(tunnel_query)
        tunnel = tunnel_result.scalar_one_or_none()
        if tunnel:
            record_dict["tunnel"] = {
                "id": str(tunnel.id),
                "name": tunnel.name,
                "location": tunnel.location,
            }

    return ApiResponse(
        success=True,
        data=record_dict
    )


@router.delete("/{record_id}", response_model=ApiResponse, status_code=status.HTTP_200_OK)
async def delete_history_record(
    record_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """删除历史记录"""

    # 查询记录
    record = await defect_crud.get(db, record_id)

    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Record not found"
        )

    # 检查权限
    if str(record.user_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    # 删除记录
    await defect_crud.delete(db, record_id)

    return ApiResponse(
        success=True,
        data={"message": "Record deleted successfully"}
    )
