import logging
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
import time
import uuid
from pathlib import Path

from app.api.deps import get_current_active_user
from app.crud.base import CRUDBase
from app.database import get_db
from app.models.user import User
from app.models.defect import DefectRecord
from app.models.evolution import EvolutionAnalysis
from app.services.evolution_service import evolution_service
from app.schemas.defects import (
    DefectAnalyzeRequest,
    DefectRecordResponse,
    DefectAnalyzeResponse,
    RepairSuggestion,
    AnalysisSettings,
    EvolutionAnalysisRequest,
)
from app.schemas.common import ApiResponse
from app.core.config import settings
from app.services.ai_service import ai_service
from app.services.defect_parser import (
    extract_defect_type,
    extract_severity,
    get_generic_repair_suggestion
)
from app.services.rag_client import rag_client
from app.utils.file_path import get_image_url

logger = logging.getLogger(__name__)

router = APIRouter()
defect_crud = CRUDBase(DefectRecord)


@router.post("/analyze", response_model=ApiResponse, status_code=status.HTTP_201_CREATED)
async def analyze_defect(
    file: UploadFile = File(...),
    tunnel_id: Optional[str] = Form(None),
    location_id: Optional[str] = Form(None),
    stake_mark: Optional[str] = Form(None),
    direction: Optional[str] = Form(None),
    temperature: float = Form(1.0),
    top_k: int = Form(10),
    max_tokens: int = Form(1024),
    top_p: float = Form(0.95),
    instruction: str = Form("你是一位土木工程领域的专家，专注于隧道结构缺陷的识别与评估。"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Analyze a tunnel defect image using AI model"""
    logger.info(f"User {current_user.username} starting image analysis...")

    # Validate file size
    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size is {settings.MAX_UPLOAD_SIZE} bytes"
        )

    # Save uploaded file
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)

    file_id = str(uuid.uuid4())
    file_extension = file.filename.split(".")[-1]
    file_path = upload_dir / f"{file_id}.{file_extension}"

    with open(file_path, "wb") as f:
        f.write(content)

    logger.info(f"Image saved to: {file_path}")

    # Prepare analysis settings
    analysis_settings = {
        "temperature": temperature,
        "top_k": top_k,
        "max_tokens": max_tokens,
        "top_p": top_p,
        "instruction": instruction
    }

    # Perform AI analysis using ai_service
    logger.info("Calling AI service for analysis...")
    try:
        result = await ai_service.analyze_image(str(file_path), analysis_settings)
        logger.info(f"AI analysis completed. Model used: {result.get('model_used')}")
    except Exception as e:
        logger.error(f"AI analysis failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI analysis failed: {str(e)}"
        )

    # Extract defect type and severity using parser
    final_result = result["final_result"]
    defect_type = extract_defect_type(final_result)
    severity = extract_severity(final_result)

    # Query RAG for repair suggestions
    repair_suggestion = None
    rag_available = False
    rag_query_time_ms = 0
    rag_model_used = None

    if settings.RAG_ENABLED:
        try:
            rag_start = time.time()
            rag_result = await rag_client.get_repair_suggestion(
                defect_type=defect_type,
                defect_description=final_result,
                severity=severity
            )
            rag_query_time_ms = int((time.time() - rag_start) * 1000)

            if rag_result:
                repair_suggestion = rag_result.get("suggestion", "")
                rag_available = True
                rag_model_used = "lightrag-qwen2.5"
                logger.info(f"RAG query completed in {rag_query_time_ms}ms")
            else:
                # Fallback to generic suggestion
                repair_suggestion = get_generic_repair_suggestion(defect_type, severity)
                logger.info("Using generic repair suggestion (RAG unavailable)")

        except Exception as e:
            logger.error(f"RAG query failed: {e}")
            # Fallback to generic suggestion
            repair_suggestion = get_generic_repair_suggestion(defect_type, severity)
    else:
        # RAG disabled, use generic suggestion
        repair_suggestion = get_generic_repair_suggestion(defect_type, severity)

    # Create defect record
    defect_data = {
        "user_id": current_user.id,
        "tunnel_id": tunnel_id,
        "location_id": location_id,
        "image_path": str(file_path),
        "final_result": final_result,
        "raw_response": result.get("raw_response", final_result),
        "model_used": result.get("model_used", "unknown"),
        "inference_time_ms": result.get("inference_time_ms", 0),
        "settings_json": analysis_settings,
        "defect_type": defect_type,
        "severity": severity,
        "repair_suggestion": repair_suggestion,
        "rag_model_used": rag_model_used,
        "rag_query_time_ms": rag_query_time_ms,
        "stake_mark": stake_mark,
        "direction": direction,
    }

    defect = await defect_crud.create(db, defect_data)
    logger.info(f"Defect record created with ID: {defect.id}")

    # Build response
    response_data = {
        "id": str(defect.id),
        "image_path": get_image_url(str(file_path)),
        "final_result": defect.final_result,
        "defect_type": defect.defect_type,
        "severity": defect.severity,
        "model_used": defect.model_used,
        "inference_time_ms": defect.inference_time_ms,
        "created_at": defect.created_at.isoformat(),
        "rag_available": rag_available,
        "rag_query_time_ms": rag_query_time_ms,
    }

    if repair_suggestion:
        response_data["repair_suggestion"] = {
            "suggestion": repair_suggestion,
            "sources": [],
            "confidence": 0.8 if rag_available else 0.5,
            "fallback": not rag_available
        }
    else:
        response_data["repair_suggestion"] = None

    return ApiResponse(success=True, data=response_data)


@router.get("/{defect_id}", response_model=ApiResponse)
async def get_defect_record(
    defect_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get a specific defect record by ID"""
    defect = await defect_crud.get(db, defect_id)

    if not defect:
        raise HTTPException(status_code=404, detail="Defect record not found")

    if str(defect.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to access this record")

    return ApiResponse(
        success=True,
        data={"record": DefectRecordResponse.model_validate(defect)}
    )


@router.get("", response_model=ApiResponse)
async def get_defect_records(
    skip: int = 0,
    limit: int = 20,
    tunnel_id: Optional[str] = None,
    stake_mark: Optional[str] = None,
    direction: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get all defect records for current user"""
    from sqlalchemy import select, func

    # Build query
    query = select(DefectRecord).where(DefectRecord.user_id == current_user.id)

    if tunnel_id:
        query = query.where(DefectRecord.tunnel_id == tunnel_id)

    # 按桩号和方向筛选
    if stake_mark:
        query = query.where(DefectRecord.stake_mark == stake_mark)

    if direction:
        query = query.where(DefectRecord.direction == direction)

    # Get total count
    count_query = select(func.count()).select_from(query.alias())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Get paginated results
    query = query.order_by(DefectRecord.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    records = result.scalars().all()

    record_list = [
        DefectRecordResponse.model_validate(record).model_dump()
        for record in records
    ]

    return ApiResponse(
        success=True,
        data={
            "items": record_list,
            "pagination": {
                "total": total,
                "skip": skip,
                "limit": limit,
                "has_next": skip + limit < total,
                "has_prev": skip > 0,
            }
        }
    )


@router.post("/evolution-analysis", response_model=ApiResponse)
async def analyze_evolution(
    request: EvolutionAnalysisRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Analyze defect evolution for records at the same location.

    Requirements:
    - At least 2 records
    - All records must have the same stake_mark and direction
    - All records must belong to the current user
    """
    from sqlalchemy import select

    # 1. 验证记录数量
    if len(request.defect_ids) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "INSUFFICIENT_RECORDS",
                "message": "演变分析至少需要 2 条记录"
            }
        )

    # 2. 获取所有记录
    query = select(DefectRecord).where(
        DefectRecord.id.in_(request.defect_ids),
        DefectRecord.user_id == current_user.id
    )
    result = await db.execute(query)
    records = result.scalars().all()

    # 3. 验证权限
    if len(records) != len(request.defect_ids):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "FORBIDDEN",
                "message": "无权访问部分记录"
            }
        )

    # 4. 验证位置信息完整性
    for record in records:
        if not record.stake_mark or not record.direction:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "MISSING_LOCATION_INFO",
                    "message": "部分记录缺少桩号或方向信息"
                }
            )

    # 5. 验证位置一致性
    first_record = records[0]
    stake_mark = first_record.stake_mark
    direction = first_record.direction

    for record in records[1:]:
        if record.stake_mark != stake_mark or record.direction != direction:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "INCONSISTENT_LOCATION",
                    "message": "所选记录必须属于同一桩号和方向"
                }
            )

    # 6. 执行演变分析
    try:
        analysis_result = await evolution_service.analyze_evolution(list(records))
    except Exception as e:
        logger.error(f"Evolution analysis failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"演变分析失败: {str(e)}"
        )

    # 7. 保存分析结果
    sorted_records = sorted(records, key=lambda r: r.created_at)
    analysis_id = str(uuid.uuid4())

    evolution_record = EvolutionAnalysis(
        id=analysis_id,
        user_id=current_user.id,
        tunnel_id=first_record.tunnel_id,
        stake_mark=stake_mark,
        direction=direction,
        start_date=sorted_records[0].created_at,
        end_date=sorted_records[-1].created_at,
        records_count=len(records),
        analyzed_record_ids=request.defect_ids,
        deterioration_rate=analysis_result["scores"]["deterioration_rate"],
        risk_level=analysis_result["scores"]["risk_level"],
        urgency_score=analysis_result["scores"]["urgency_score"],
        timeline_summary=analysis_result["report"]["timeline_summary"],
        trend=analysis_result["report"]["trend"],
        cause_analysis=analysis_result["report"]["cause_analysis"],
        repair_priority=analysis_result["report"]["repair_priority"],
        future_prediction=analysis_result["report"]["future_prediction"],
        model_used=analysis_result.get("model_used", "unknown"),
        inference_time_ms=analysis_result.get("inference_time_ms", 0),
    )

    db.add(evolution_record)
    await db.commit()
    await db.refresh(evolution_record)

    # 8. 构建响应
    def record_to_dict(record: DefectRecord) -> dict:
        """将 DefectRecord 转换为响应字典，处理 settings_json -> settings 映射"""
        return {
            "id": record.id,
            "user_id": record.user_id,
            "tunnel_id": record.tunnel_id,
            "location_id": record.location_id,
            "image_path": get_image_url(record.image_path),
            "final_result": record.final_result,
            "raw_response": record.raw_response,
            "model_used": record.model_used,
            "inference_time_ms": record.inference_time_ms,
            "settings": record.settings_json or {},
            "defect_type": record.defect_type,
            "stake_mark": record.stake_mark,
            "direction": record.direction,
            "severity": record.severity,
            "repair_suggestion": record.repair_suggestion,
            "suggestion_sources": record.suggestion_sources,
            "rag_model_used": record.rag_model_used,
            "rag_query_time_ms": record.rag_query_time_ms,
            "created_at": record.created_at,
            "updated_at": record.updated_at,
        }

    response_data = {
        "analysis_id": analysis_id,
        "stake_mark": stake_mark,
        "direction": direction,
        "time_range": {
            "start": sorted_records[0].created_at.strftime('%Y-%m-%d'),
            "end": sorted_records[-1].created_at.strftime('%Y-%m-%d'),
        },
        "records_analyzed": len(records),
        "scores": analysis_result["scores"],
        "report": analysis_result["report"],
        "records": [DefectRecordResponse.model_validate(record_to_dict(r)).model_dump() for r in sorted_records],
        "created_at": evolution_record.created_at.isoformat(),
    }

    return ApiResponse(success=True, data=response_data)