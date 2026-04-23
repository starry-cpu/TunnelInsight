from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from typing import List, Optional

from app.api.deps import get_current_active_user
from app.crud.base import CRUDBase
from app.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.tunnel import Tunnel
from app.models.defect import DefectRecord
from app.schemas.tunnels import TunnelCreate, TunnelUpdate, TunnelResponse, SeverityCounts
from app.schemas.common import ApiResponse, PaginatedResponse
from app.services.status_calculator import StatusCalculator

router = APIRouter()
tunnel_crud = CRUDBase(Tunnel)


async def get_severity_counts(db: AsyncSession, tunnel_id: str) -> dict:
    """
    获取隧道的缺陷严重程度统计（按桩号+方向去重，只取最近一次）

    MySQL-compatible implementation using subquery to get latest defect
    for each unique (stake_mark, direction) combination.
    """
    from sqlalchemy import text

    # Use MySQL-compatible subquery approach
    # This query:
    # 1. Finds the latest created_at for each (stake_mark, direction) pair
    # 2. Joins back to get the severity of those latest records
    # 3. Aggregates the severity counts
    query = text("""
        SELECT
            COALESCE(SUM(CASE WHEN d.severity = 'low' THEN 1 ELSE 0 END), 0) as low,
            COALESCE(SUM(CASE WHEN d.severity = 'medium' THEN 1 ELSE 0 END), 0) as medium,
            COALESCE(SUM(CASE WHEN d.severity = 'high' THEN 1 ELSE 0 END), 0) as high,
            COALESCE(SUM(CASE WHEN d.severity = 'critical' THEN 1 ELSE 0 END), 0) as critical,
            COUNT(d.id) as total,
            MAX(d.created_at) as last_analysis,
            COUNT(DISTINCT
                CONCAT(
                    COALESCE(d.stake_mark, ''),
                    '-',
                    COALESCE(d.direction, '')
                )
            ) as unique_locations
        FROM defect_records d
        INNER JOIN (
            SELECT
                stake_mark,
                direction,
                MAX(created_at) as max_created_at
            FROM defect_records
            WHERE tunnel_id = :tunnel_id
            GROUP BY stake_mark, direction
        ) latest ON (
            (d.stake_mark = latest.stake_mark OR (d.stake_mark IS NULL AND latest.stake_mark IS NULL))
            AND (d.direction = latest.direction OR (d.direction IS NULL AND latest.direction IS NULL))
            AND d.created_at = latest.max_created_at
            AND d.tunnel_id = :tunnel_id
        )
        WHERE d.tunnel_id = :tunnel_id
    """)

    result = await db.execute(query, {"tunnel_id": tunnel_id})
    row = result.one()

    return {
        'low': int(row.low),
        'medium': int(row.medium),
        'high': int(row.high),
        'critical': int(row.critical),
        'total': int(row.total),
        'last_analysis_at': row.last_analysis,
        'unique_location_count': int(row.unique_locations) if row.total > 0 else 0,
    }


@router.get("", response_model=ApiResponse)
async def get_tunnels(
    skip: int = 0,
    limit: int = 20,
    search: str = None,
    project_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get all tunnels for current user, optionally filtered by project"""
    from sqlalchemy import select, func

    # Build query
    query = select(Tunnel).where(Tunnel.user_id == current_user.id)

    if search:
        query = query.where(Tunnel.name.ilike(f"%{search}%"))

    # 支持按项目筛选
    if project_id:
        query = query.where(Tunnel.project_id == project_id)

    # Get total count
    count_query = select(func.count()).select_from(query.alias())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Get paginated results
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    tunnels = result.scalars().all()

    # Calculate defect counts for each tunnel
    tunnel_list = []
    for tunnel in tunnels:
        # Get severity counts from database
        stats = await get_severity_counts(db, str(tunnel.id))

        severity_counts = {
            "low": stats['low'],
            "medium": stats['medium'],
            "high": stats['high'],
            "critical": stats['critical'],
        }

        # Calculate health index using the static method
        health_index = StatusCalculator.calculate_health_index(
            severity_counts, stats['unique_location_count']
        )

        tunnel_dict = {
            "id": str(tunnel.id),
            "user_id": str(tunnel.user_id),
            "project_id": str(tunnel.project_id),
            "name": tunnel.name,
            "location": tunnel.location,
            "description": tunnel.description,
            "length_km": float(tunnel.length_km) if tunnel.length_km else None,
            "total_defects": stats['total'],
            "severity_counts": severity_counts,
            "unique_location_count": stats['unique_location_count'],
            "health_index": health_index,
            "last_analysis_at": stats['last_analysis_at'].isoformat() if stats['last_analysis_at'] else None,
            "created_at": tunnel.created_at.isoformat(),
            "updated_at": tunnel.updated_at.isoformat(),
        }
        tunnel_list.append(TunnelResponse(**tunnel_dict))

    return ApiResponse(
        success=True,
        data={
            "items": tunnel_list,
            "pagination": {
                "total": total,
                "skip": skip,
                "limit": limit,
                "has_next": skip + limit < total,
                "has_prev": skip > 0,
            }
        }
    )


@router.post("", response_model=ApiResponse, status_code=status.HTTP_201_CREATED)
async def create_tunnel(
    tunnel_in: TunnelCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new tunnel (must specify project_id)"""
    # 验证项目存在且属于当前用户
    project_result = await db.execute(
        select(Project).where(
            Project.id == tunnel_in.project_id,
            Project.user_id == current_user.id
        )
    )
    project = project_result.scalar_one_or_none()

    if not project:
        raise HTTPException(status_code=400, detail="项目不存在或无权访问")

    tunnel_data = tunnel_in.model_dump()
    tunnel_data["user_id"] = current_user.id

    tunnel = await tunnel_crud.create(db, tunnel_data)

    return ApiResponse(
        success=True,
        data={"tunnel": TunnelResponse.model_validate(tunnel)}
    )


@router.get("/{tunnel_id}", response_model=ApiResponse)
async def get_tunnel(
    tunnel_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get a specific tunnel by ID"""
    tunnel = await tunnel_crud.get(db, tunnel_id)

    if not tunnel:
        raise HTTPException(status_code=404, detail="Tunnel not found")

    if str(tunnel.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to access this tunnel")

    # Get severity counts from database
    stats = await get_severity_counts(db, tunnel_id)

    severity_counts = {
        "low": stats['low'],
        "medium": stats['medium'],
        "high": stats['high'],
        "critical": stats['critical'],
    }

    # Calculate health index using the static method
    health_index = StatusCalculator.calculate_health_index(
        severity_counts, stats['unique_location_count']
    )

    tunnel_dict = {
        "id": str(tunnel.id),
        "user_id": str(tunnel.user_id),
        "project_id": str(tunnel.project_id),
        "name": tunnel.name,
        "location": tunnel.location,
        "description": tunnel.description,
        "length_km": float(tunnel.length_km) if tunnel.length_km else None,
        "total_defects": stats['total'],
        "severity_counts": severity_counts,
        "unique_location_count": stats['unique_location_count'],
        "health_index": health_index,
        "last_analysis_at": stats['last_analysis_at'].isoformat() if stats['last_analysis_at'] else None,
        "created_at": tunnel.created_at.isoformat(),
        "updated_at": tunnel.updated_at.isoformat(),
    }

    return ApiResponse(
        success=True,
        data={"tunnel": TunnelResponse(**tunnel_dict)}
    )


@router.put("/{tunnel_id}", response_model=ApiResponse)
async def update_tunnel(
    tunnel_id: str,
    tunnel_in: TunnelUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update a tunnel"""
    tunnel = await tunnel_crud.get(db, tunnel_id)

    if not tunnel:
        raise HTTPException(status_code=404, detail="Tunnel not found")

    if str(tunnel.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to update this tunnel")

    updated_tunnel = await tunnel_crud.update(db, tunnel, tunnel_in)

    return ApiResponse(
        success=True,
        data={"tunnel": TunnelResponse.model_validate(updated_tunnel)}
    )


@router.delete("/{tunnel_id}", response_model=ApiResponse)
async def delete_tunnel(
    tunnel_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a tunnel"""
    tunnel = await tunnel_crud.get(db, tunnel_id)

    if not tunnel:
        raise HTTPException(status_code=404, detail="Tunnel not found")

    if str(tunnel.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to delete this tunnel")

    await tunnel_crud.delete(db, tunnel_id)

    return ApiResponse(
        success=True,
        data={"message": "Tunnel deleted successfully"}
    )
