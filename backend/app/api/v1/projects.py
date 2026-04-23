from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case

from app.api.deps import get_current_active_user
from app.crud.base import CRUDBase
from app.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.tunnel import Tunnel
from app.models.defect import DefectRecord
from app.schemas.projects import (
    ProjectCreate, ProjectUpdate, ProjectResponse, ProjectDetailResponse, TunnelBrief
)
from app.schemas.tunnels import SeverityCounts
from app.schemas.common import ApiResponse
from app.services.status_calculator import status_calculator, StatusCalculator

router = APIRouter()
project_crud = CRUDBase(Project)


def get_project_status(severity_counts: dict) -> dict:
    """Get status info from severity counts"""
    if not status_calculator.is_initialized:
        # Fallback to hardcoded
        if severity_counts.get('critical', 0) > 0 or severity_counts.get('high', 0) > 0:
            return {'key': 'critical', 'label': '严重警告', 'color': 'error'}
        if severity_counts.get('medium', 0) > 0:
            return {'key': 'warning', 'label': '一般警告', 'color': 'warning'}
        if severity_counts.get('low', 0) > 0:
            return {'key': 'minor', 'label': '轻微警告', 'color': 'processing'}
        return {'key': 'normal', 'label': '运行正常', 'color': 'success'}

    status_result = status_calculator.calculate_status(severity_counts)
    if status_result.get('status_key'):
        return {
            'key': status_result['status_key'],
            'label': status_result['status_label'],
            'color': status_result['status_color']
        }
    return {'key': 'normal', 'label': '运行正常', 'color': 'success'}


async def get_project_severity_counts(db: AsyncSession, project_id: str) -> dict:
    """获取项目下所有隧道的缺陷统计（汇总各隧道的去重数据）"""
    from sqlalchemy import text

    # 使用子查询获取每个隧道中每个(stake_mark, direction)的最新记录
    # 然后汇总所有隧道的去重数据
    query = text("""
        WITH latest_defects AS (
            SELECT d.*
            FROM defect_records d
            INNER JOIN tunnels t ON d.tunnel_id = t.id
            INNER JOIN (
                SELECT tunnel_id, stake_mark, direction, MAX(created_at) as max_created_at
                FROM defect_records
                WHERE tunnel_id IN (SELECT id FROM tunnels WHERE project_id = :project_id)
                GROUP BY tunnel_id, stake_mark, direction
            ) latest ON d.tunnel_id = latest.tunnel_id
                AND (d.stake_mark = latest.stake_mark OR (d.stake_mark IS NULL AND latest.stake_mark IS NULL))
                AND (d.direction = latest.direction OR (d.direction IS NULL AND latest.direction IS NULL))
                AND d.created_at = latest.max_created_at
            WHERE t.project_id = :project_id
        )
        SELECT
            COALESCE(SUM(CASE WHEN severity = 'low' THEN 1 ELSE 0 END), 0) as low,
            COALESCE(SUM(CASE WHEN severity = 'medium' THEN 1 ELSE 0 END), 0) as medium,
            COALESCE(SUM(CASE WHEN severity = 'high' THEN 1 ELSE 0 END), 0) as high,
            COALESCE(SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END), 0) as critical,
            COUNT(*) as total,
            MAX(created_at) as last_analysis,
            COUNT(DISTINCT CONCAT(COALESCE(stake_mark, ''), '-', COALESCE(direction, ''), '-', COALESCE(tunnel_id, ''))) as unique_locations
        FROM latest_defects
    """)

    result = await db.execute(query, {"project_id": project_id})
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
async def get_projects(
    skip: int = 0,
    limit: int = 20,
    search: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """获取用户所有项目"""
    query = select(Project).where(Project.user_id == current_user.id)

    if search:
        query = query.where(Project.name.ilike(f"%{search}%"))

    # 总数
    count_query = select(func.count()).select_from(query.alias())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # 分页
    query = query.offset(skip).limit(limit).order_by(Project.updated_at.desc())
    result = await db.execute(query)
    projects = result.scalars().all()

    # 构建响应
    project_list = []
    for project in projects:
        # 获取隧道数量
        tunnel_count_result = await db.execute(
            select(func.count()).where(Tunnel.project_id == project.id)
        )
        tunnel_count = tunnel_count_result.scalar() or 0

        # 获取缺陷统计
        stats = await get_project_severity_counts(db, str(project.id))

        severity_counts = {
            "low": stats['low'],
            "medium": stats['medium'],
            "high": stats['high'],
            "critical": stats['critical'],
        }
        health_index = StatusCalculator.calculate_health_index(
            severity_counts, stats['unique_location_count']
        )

        project_dict = {
            "id": str(project.id),
            "user_id": str(project.user_id),
            "name": project.name,
            "description": project.description,
            "tunnel_count": tunnel_count,
            "total_defects": stats['total'],
            "severity_counts": severity_counts,
            "unique_location_count": stats['unique_location_count'],
            "health_index": health_index,
            "status": get_project_status(severity_counts),
            "created_at": project.created_at.isoformat(),
            "updated_at": project.updated_at.isoformat(),
        }
        project_list.append(ProjectResponse(**project_dict))

    return ApiResponse(
        success=True,
        data={
            "items": project_list,
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
async def create_project(
    project_in: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """创建新项目"""
    project_data = project_in.model_dump()
    project_data["user_id"] = current_user.id

    project = await project_crud.create(db, project_data)

    return ApiResponse(
        success=True,
        data={"project": ProjectResponse.model_validate(project)}
    )


@router.get("/{project_id}", response_model=ApiResponse)
async def get_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """获取项目详情（含隧道列表）"""
    from app.api.v1.tunnels import get_severity_counts

    project = await project_crud.get(db, project_id)

    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    if str(project.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="无权访问此项目")

    # 获取项目下的隧道
    tunnels_result = await db.execute(
        select(Tunnel).where(Tunnel.project_id == project_id).order_by(Tunnel.created_at)
    )
    tunnels = tunnels_result.scalars().all()

    # 获取每个隧道的统计信息
    tunnel_list = []
    for tunnel in tunnels:
        stats = await get_severity_counts(db, str(tunnel.id))
        severity_counts = {
            "low": stats['low'],
            "medium": stats['medium'],
            "high": stats['high'],
            "critical": stats['critical'],
        }
        health_index = StatusCalculator.calculate_health_index(
            severity_counts, stats['unique_location_count']
        )
        tunnel_list.append({
            "id": str(tunnel.id),
            "name": tunnel.name,
            "location": tunnel.location,
            "length_km": float(tunnel.length_km) if tunnel.length_km else None,
            "total_defects": stats['total'],
            "severity_counts": severity_counts,
            "unique_location_count": stats['unique_location_count'],
            "health_index": health_index,
        })

    # 获取项目汇总统计
    stats = await get_project_severity_counts(db, project_id)

    severity_counts = {
        "low": stats['low'],
        "medium": stats['medium'],
        "high": stats['high'],
        "critical": stats['critical'],
    }
    project_health_index = StatusCalculator.calculate_health_index(
        severity_counts, stats['unique_location_count']
    )

    project_dict = {
        "id": str(project.id),
        "user_id": str(project.user_id),
        "name": project.name,
        "description": project.description,
        "tunnel_count": len(tunnels),
        "total_defects": stats['total'],
        "severity_counts": severity_counts,
        "unique_location_count": stats['unique_location_count'],
        "health_index": project_health_index,
        "status": get_project_status(severity_counts),
        "created_at": project.created_at.isoformat(),
        "updated_at": project.updated_at.isoformat(),
        "tunnels": tunnel_list,
    }

    return ApiResponse(
        success=True,
        data={"project": ProjectDetailResponse(**project_dict)}
    )


@router.put("/{project_id}", response_model=ApiResponse)
async def update_project(
    project_id: str,
    project_in: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """更新项目"""
    project = await project_crud.get(db, project_id)

    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    if str(project.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="无权更新此项目")

    updated_project = await project_crud.update(db, project, project_in)

    return ApiResponse(
        success=True,
        data={"project": ProjectResponse.model_validate(updated_project)}
    )


@router.delete("/{project_id}", response_model=ApiResponse)
async def delete_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """删除项目（级联删除所有隧道）"""
    project = await project_crud.get(db, project_id)

    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    if str(project.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="无权删除此项目")

    # 检查项目下是否有隧道
    tunnel_count_result = await db.execute(
        select(func.count()).where(Tunnel.project_id == project_id)
    )
    tunnel_count = tunnel_count_result.scalar() or 0

    # 删除项目（级联删除会自动删除隧道）
    await project_crud.delete(db, project_id)

    return ApiResponse(
        success=True,
        data={
            "message": "项目已删除",
            "deleted_tunnels": tunnel_count
        }
    )
