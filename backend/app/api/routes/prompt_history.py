"""
Prompt History API Routes
Create: backend/app/api/routes/prompt_history.py
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from datetime import datetime, timedelta

from ...models.database import PromptHistory, User
from ...models.schemas import (
    PromptHistoryCreate, 
    PromptHistoryResponse,
    PromptHistoryListResponse,
    PromptHistoryStats
)
from ...core.security import verify_api_key
from ..routes.usage import get_db

router = APIRouter(prefix="/prompt-history", tags=["Prompt History"])


@router.post("/", response_model=PromptHistoryResponse, status_code=201)
async def create_prompt_history(
    history_data: PromptHistoryCreate,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """
    Create a new prompt history entry
    
    Logs complete prompt details including:
    - Original and final prompts
    - Variants offered and selected
    - Quality scores and improvements
    - PII detection results
    
    **Example:**
    ```json
    {
      "user_email": "john.doe@company.com",
      "original_prompt": "write code",
      "final_prompt": "Write Python code to...",
      "tool": "chatgpt",
      "variant_selected": 1,
      "original_score": 45.0,
      "final_score": 85.0,
      "had_pii": false
    }
    ```
    """
    # Find or create user
    user = db.query(User).filter(User.email == history_data.user_email).first()
    if not user:
        user = User(
            email=history_data.user_email,
            org_id=1,
            role="employee"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    # Calculate improvement delta
    improvement_delta = None
    if history_data.original_score and history_data.final_score:
        improvement_delta = history_data.final_score - history_data.original_score
    
    # Create history entry
    history = PromptHistory(
        user_id=user.id,
        original_prompt=history_data.original_prompt,
        final_prompt=history_data.final_prompt,
        tool=history_data.tool,
        variants_offered=history_data.variants_offered,
        variant_selected=history_data.variant_selected,
        original_score=history_data.original_score,
        final_score=history_data.final_score,
        improvement_delta=improvement_delta,
        had_pii=history_data.had_pii,
        pii_types=history_data.pii_types,
        session_id=history_data.session_id
    )
    
    db.add(history)
    db.commit()
    db.refresh(history)
    
    return history


@router.get("/", response_model=PromptHistoryListResponse)
async def get_prompt_history(
    user_email: Optional[str] = Query(None, description="Filter by user email"),
    tool: Optional[str] = Query(None, description="Filter by AI tool"),
    had_pii: Optional[bool] = Query(None, description="Filter by PII presence"),
    days: int = Query(30, description="Number of days to look back", ge=1, le=365),
    page: int = Query(1, description="Page number", ge=1),
    page_size: int = Query(50, description="Items per page", ge=1, le=100),
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """
    Get prompt history with filters and pagination
    
    Returns a paginated list of prompt history entries.
    
    **Query Parameters:**
    - `user_email`: Filter by specific user
    - `tool`: Filter by AI tool (chatgpt, claude, gemini)
    - `had_pii`: Filter by PII presence (true/false)
    - `days`: Look back period (default: 30 days)
    - `page`: Page number (default: 1)
    - `page_size`: Items per page (default: 50, max: 100)
    
    **Example:**
    ```
    GET /prompt-history/?user_email=john@company.com&tool=chatgpt&page=1&page_size=20
    ```
    """
    # Build query
    query = db.query(PromptHistory)
    
    # Date filter
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    query = query.filter(PromptHistory.timestamp >= cutoff_date)
    
    # User filter
    if user_email:
        user = db.query(User).filter(User.email == user_email).first()
        if user:
            query = query.filter(PromptHistory.user_id == user.id)
        else:
            return PromptHistoryListResponse(total=0, page=page, page_size=page_size, items=[])
    
    # Tool filter
    if tool:
        query = query.filter(PromptHistory.tool == tool)
    
    # PII filter
    if had_pii is not None:
        query = query.filter(PromptHistory.had_pii == had_pii)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * page_size
    items = query.order_by(desc(PromptHistory.timestamp)).offset(offset).limit(page_size).all()
    
    return PromptHistoryListResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=items
    )


@router.get("/stats", response_model=PromptHistoryStats)
async def get_prompt_history_stats(
    user_email: Optional[str] = Query(None, description="Filter by user email"),
    days: int = Query(30, description="Number of days to look back", ge=1, le=365),
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """
    Get prompt history statistics
    
    Returns aggregated statistics including:
    - Total prompts
    - Average improvement score
    - PII incidents
    - Variant adoption rate
    - Top tools used
    - Recent prompts
    
    **Example Response:**
    ```json
    {
      "total_prompts": 1247,
      "avg_improvement": 23.5,
      "pii_incidents": 12,
      "variant_adoption_rate": 0.67,
      "top_tools": [
        {"tool": "chatgpt", "count": 850},
        {"tool": "claude", "count": 397}
      ],
      "recent_prompts": [...]
    }
    ```
    """
    # Build base query
    query = db.query(PromptHistory)
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    query = query.filter(PromptHistory.timestamp >= cutoff_date)
    
    # User filter
    if user_email:
        user = db.query(User).filter(User.email == user_email).first()
        if user:
            query = query.filter(PromptHistory.user_id == user.id)
    
    # Total prompts
    total_prompts = query.count()
    
    # Average improvement
    avg_improvement = db.query(func.avg(PromptHistory.improvement_delta)).filter(
        PromptHistory.timestamp >= cutoff_date,
        PromptHistory.improvement_delta.isnot(None)
    ).scalar() or 0.0
    
    # PII incidents
    pii_query = query.filter(PromptHistory.had_pii == True)
    pii_incidents = pii_query.count()
    
    # Variant adoption rate (percentage that chose a variant over original)
    variant_count = query.filter(PromptHistory.variant_selected >= 0).count()
    variant_adoption_rate = (variant_count / total_prompts) if total_prompts > 0 else 0.0
    
    # Top tools
    top_tools_data = db.query(
        PromptHistory.tool,
        func.count(PromptHistory.id).label('count')
    ).filter(
        PromptHistory.timestamp >= cutoff_date
    ).group_by(
        PromptHistory.tool
    ).order_by(
        desc('count')
    ).limit(5).all()
    
    top_tools = [{"tool": tool, "count": count} for tool, count in top_tools_data]
    
    # Recent prompts
    recent_prompts = query.order_by(desc(PromptHistory.timestamp)).limit(10).all()
    
    return PromptHistoryStats(
        total_prompts=total_prompts,
        avg_improvement=float(avg_improvement),
        pii_incidents=pii_incidents,
        variant_adoption_rate=variant_adoption_rate,
        top_tools=top_tools,
        recent_prompts=recent_prompts
    )


@router.get("/{history_id}", response_model=PromptHistoryResponse)
async def get_prompt_history_detail(
    history_id: int,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """
    Get a specific prompt history entry by ID
    
    Returns full details including all variants offered.
    """
    history = db.query(PromptHistory).filter(PromptHistory.id == history_id).first()
    
    if not history:
        raise HTTPException(status_code=404, detail="Prompt history not found")
    
    return history


@router.delete("/{history_id}", status_code=204)
async def delete_prompt_history(
    history_id: int,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """
    Delete a prompt history entry
    
    Permanently removes a prompt history record. Use with caution.
    """
    history = db.query(PromptHistory).filter(PromptHistory.id == history_id).first()
    
    if not history:
        raise HTTPException(status_code=404, detail="Prompt history not found")
    
    db.delete(history)
    db.commit()
    
    return None
