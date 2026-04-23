"""API routes for severity and status level configuration."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.deps import get_current_active_user
from app.database import get_db
from app.models.user import User
from app.models.severity_level import SeverityLevel
from app.models.status_level import StatusLevel
from app.models.defect import DefectRecord
from app.schemas.config import (
    SeverityLevelCreate,
    SeverityLevelUpdate,
    SeverityLevelResponse,
    StatusLevelCreate,
    StatusLevelUpdate,
    StatusLevelResponse,
)
from app.schemas.common import ApiResponse
from app.crud.severity_level import severity_level
from app.crud.status_level import status_level
from app.services.status_calculator import status_calculator

router = APIRouter()


# =============================================================================
# Severity Level Endpoints
# =============================================================================

@router.get("/severity", response_model=ApiResponse)
async def list_severity_levels(
    include_inactive: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List all severity levels."""
    if include_inactive:
        levels = await severity_level.get_all(db)
    else:
        levels = await severity_level.get_all_active(db)

    return ApiResponse(
        success=True,
        data={
            "items": [SeverityLevelResponse.model_validate(level) for level in levels],
            "total": len(levels),
        }
    )


@router.post("/severity", response_model=ApiResponse, status_code=status.HTTP_201_CREATED)
async def create_severity_level(
    level_in: SeverityLevelCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new severity level."""
    # Check if key already exists
    existing = await severity_level.get_by_key(db, level_in.key)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Severity level with key '{level_in.key}' already exists"
        )

    # Auto-assign sort_order if not provided
    if level_in.sort_order == 0:
        max_order = await severity_level.get_max_sort_order(db)
        level_in.sort_order = max_order + 1

    level = await severity_level.create(db, level_in)

    # Refresh the status calculator cache
    await status_calculator.refresh_cache(db)

    return ApiResponse(
        success=True,
        data={"severity_level": SeverityLevelResponse.model_validate(level)}
    )


@router.put("/severity/{level_id}", response_model=ApiResponse)
async def update_severity_level(
    level_id: str,
    level_in: SeverityLevelUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update a severity level."""
    level = await severity_level.get(db, level_id)
    if not level:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Severity level not found"
        )

    # Check if new key conflicts with existing
    if level_in.key and level_in.key != level.key:
        existing = await severity_level.get_by_key(db, level_in.key)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Severity level with key '{level_in.key}' already exists"
            )

    updated_level = await severity_level.update(db, level, level_in)

    # Refresh the status calculator cache
    await status_calculator.refresh_cache(db)

    return ApiResponse(
        success=True,
        data={"severity_level": SeverityLevelResponse.model_validate(updated_level)}
    )


@router.delete("/severity/{level_id}", response_model=ApiResponse)
async def delete_severity_level(
    level_id: str,
    migrate_to: str = Query(None, description="ID of severity level to migrate defects to"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Delete a severity level.

    If migrate_to is provided, all defects with this severity will be updated
    to the new severity level. Otherwise, deletion will fail if there are
    any defects using this severity.
    """
    level = await severity_level.get(db, level_id)
    if not level:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Severity level not found"
        )

    # Check if there are defects using this severity
    defects_count_result = await db.execute(
        select(DefectRecord).where(DefectRecord.severity == level.key).limit(1)
    )
    has_defects = defects_count_result.scalar_one_or_none() is not None

    if has_defects:
        if migrate_to:
            # Validate migrate_to level exists
            target_level = await severity_level.get(db, migrate_to)
            if not target_level:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Target severity level for migration not found"
                )

            # Migrate defects
            await db.execute(
                DefectRecord.__table__.update()
                .where(DefectRecord.severity == level.key)
                .values(severity=target_level.key)
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete severity level with associated defects. "
                       "Provide migrate_to parameter to migrate defects."
            )

    await severity_level.delete(db, level_id)

    # Refresh the status calculator cache
    await status_calculator.refresh_cache(db)

    return ApiResponse(
        success=True,
        data={"message": f"Severity level '{level.key}' deleted"}
    )


# =============================================================================
# Status Level Endpoints
# =============================================================================

@router.get("/status", response_model=ApiResponse)
async def list_status_levels(
    include_inactive: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List all status levels."""
    if include_inactive:
        levels = await status_level.get_all(db)
    else:
        levels = await status_level.get_all_active(db)

    return ApiResponse(
        success=True,
        data={
            "items": [StatusLevelResponse.model_validate(level) for level in levels],
            "total": len(levels),
        }
    )


@router.post("/status", response_model=ApiResponse, status_code=status.HTTP_201_CREATED)
async def create_status_level(
    level_in: StatusLevelCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new status level."""
    # Check if key already exists
    existing = await status_level.get_by_key(db, level_in.key)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Status level with key '{level_in.key}' already exists"
        )

    # Auto-assign sort_order if not provided
    if level_in.sort_order == 0:
        max_order = await status_level.get_max_sort_order(db)
        level_in.sort_order = max_order + 1

    level = await status_level.create(db, level_in)

    # Refresh the status calculator cache
    await status_calculator.refresh_cache(db)

    return ApiResponse(
        success=True,
        data={"status_level": StatusLevelResponse.model_validate(level)}
    )


@router.put("/status/{level_id}", response_model=ApiResponse)
async def update_status_level(
    level_id: str,
    level_in: StatusLevelUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update a status level."""
    level = await status_level.get(db, level_id)
    if not level:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Status level not found"
        )

    # Check if new key conflicts with existing
    if level_in.key and level_in.key != level.key:
        existing = await status_level.get_by_key(db, level_in.key)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Status level with key '{level_in.key}' already exists"
            )

    updated_level = await status_level.update(db, level, level_in)

    # Refresh the status calculator cache
    await status_calculator.refresh_cache(db)

    return ApiResponse(
        success=True,
        data={"status_level": StatusLevelResponse.model_validate(updated_level)}
    )


@router.delete("/status/{level_id}", response_model=ApiResponse)
async def delete_status_level(
    level_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Delete a status level.

    Note: Status is calculated dynamically, so there are no direct foreign key
    constraints. However, deleting a status level may affect existing projects
    or tunnels that have scores in this range.
    """
    level = await status_level.get(db, level_id)
    if not level:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Status level not found"
        )

    await status_level.delete(db, level_id)

    # Refresh the status calculator cache
    await status_calculator.refresh_cache(db)

    return ApiResponse(
        success=True,
        data={"message": f"Status level '{level.key}' deleted"}
    )
