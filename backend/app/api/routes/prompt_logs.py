from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ...models.database import PromptLog, User, get_db
from ...models.schemas import PromptLogCreate, PromptLogResponse
from ...core.security import get_current_user

router = APIRouter(prefix="/prompt-logs", tags=["Prompt Logs"])


@router.post("/", response_model=PromptLogResponse, status_code=201)
async def create_prompt_log(
    log_data: PromptLogCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new prompt log entry.

    Called when user selects a prompt variant or keeps original.
    User info extracted from Auth0 JWT.

    Args:
        log_data: Prompt log details
        db: Database session
        current_user: Current authenticated user

    Returns:
        Created prompt log record
    """
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

    # Create log
    prompt_log = PromptLog(
        user_id=user.id,
        original_prompt=log_data.original_prompt,
        chosen_variant=log_data.chosen_variant,
        variants_json=[v.dict() for v in log_data.variants],
        variant_index=log_data.variant_index,
        improvement_score=log_data.improvement_score
    )

    db.add(prompt_log)
    db.commit()
    db.refresh(prompt_log)

    return prompt_log