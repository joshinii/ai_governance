"""
Prompt History API Routes
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from datetime import datetime, timedelta

from ...models.database import PromptHistory, User, get_db
from ...models.schemas import (
    PromptHistoryCreate,
    PromptHistoryResponse,
    PromptHistoryListResponse,
    PromptHistoryStats
)
from ...core.security import get_current_user

router = APIRouter(prefix="/prompt-history", tags=["Prompt History"])


@router.post("/", response_model=PromptHistoryResponse, status_code=201)
async def create_prompt_history(
    history_data: PromptHistoryCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new prompt history entry.

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
    # Verify requesting user email matches
    if history_data.user_email != current_user.email:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only create history for yourself"
        )

    # Find or create user
    user = db.query(User).filter(User.email == current_user.email).first()
    if not user:
        user = User(
            email=current_user.email,
            name=current_user.get("name"),
            picture=current_user.get("picture"),
            org_id=current_user.get("org_id", 1),
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
    user_email: Optional[str] = Query(None, description="Filter by user email (admin only)"),
    tool: Optional[str] = Query(None, description="Filter by AI tool"),
    had_pii: Optional[bool] = Query(None, description="Filter by PII presence"),
    days: int = Query(30, description="Number of days to look back", ge=1, le=365),
    page: int = Query(1, description="Page number", ge=1),
    page_size: int = Query(50, description="Items per page", ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
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
    # Get requesting user
    requesting_user = db.query(User).filter(
        User.email == current_user.email
    ).first()

    if not requesting_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Build query
    query = db.query(PromptHistory)

    # Date filter
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    query = query.filter(PromptHistory.timestamp >= cutoff_date)

    # User filter - determine which user's history to retrieve
    filter_user_id = requesting_user.id

    if user_email and user_email != current_user.email:
        # Only admins can view other users' history
        if requesting_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own history"
            )
        # Find the requested user
        target_user = db.query(User).filter(User.email == user_email).first()
        if not target_user:
            return PromptHistoryListResponse(total=0, page=page, page_size=page_size, items=[])
        filter_user_id = target_user.id

    query = query.filter(PromptHistory.user_id == filter_user_id)
    
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
    user_email: Optional[str] = Query(None, description="Filter by user email (admin only)"),
    days: int = Query(30, description="Number of days to look back", ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
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
    # Get requesting user
    requesting_user = db.query(User).filter(
        User.email == current_user.email
    ).first()

    if not requesting_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Build base query
    query = db.query(PromptHistory)
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    query = query.filter(PromptHistory.timestamp >= cutoff_date)

    # User filter - determine which user's stats to retrieve
    filter_user_id = requesting_user.id

    if user_email and user_email != current_user.email:
        # Only admins can view other users' stats
        if requesting_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own stats"
            )
        # Find the requested user
        user = db.query(User).filter(User.email == user_email).first()
        if user:
            filter_user_id = user.id

    query = query.filter(PromptHistory.user_id == filter_user_id)
    
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
    current_user: dict = Depends(get_current_user)
):
    """
    Get a specific prompt history entry by ID
    
    Returns full details including all variants offered.
    """
    # Get requesting user
    requesting_user = db.query(User).filter(
        User.email == current_user.email
    ).first()

    if not requesting_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    history = db.query(PromptHistory).filter(PromptHistory.id == history_id).first()

    if not history:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prompt history not found"
        )

    # Check permissions - users can only view their own, admins can view all
    if requesting_user.role != "admin" and requesting_user.id != history.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own history"
        )

    return history


@router.delete("/{history_id}", status_code=204)
async def delete_prompt_history(
    history_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a prompt history entry.

    Users can only delete their own entries. Admins can delete any entry.

    Permanently removes a prompt history record. Use with caution.
    """
    # Get requesting user
    requesting_user = db.query(User).filter(
        User.email == current_user.email
    ).first()

    if not requesting_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    history = db.query(PromptHistory).filter(PromptHistory.id == history_id).first()

    if not history:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prompt history not found"
        )

    # Check permissions
    if requesting_user.role != "admin" and requesting_user.id != history.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own history"
        )

    db.delete(history)
    db.commit()

    return None
