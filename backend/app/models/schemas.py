from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


# Existing schemas...
class UsageLogCreate(BaseModel):
    user_email: EmailStr
    tool: str
    prompt_hash: str
    risk_level: RiskLevel = RiskLevel.LOW


class UsageLogResponse(BaseModel):
    id: int
    user_id: int
    tool: str
    prompt_hash: str
    risk_level: str
    timestamp: datetime
    
    class Config:
        from_attributes = True


# Enhanced Prompt Log schemas
class PromptVariant(BaseModel):
    """Single prompt variant"""
    text: str
    improvements: List[str]
    score: float


class PromptLogCreate(BaseModel):
    """Create prompt log"""
    user_email: EmailStr
    original_prompt: str
    chosen_variant: str
    variants: List[PromptVariant]
    variant_index: int = Field(..., description="-1 for original, 0-2 for variant")
    improvement_score: Optional[float] = None


class PromptLogResponse(BaseModel):
    id: int
    user_id: int
    original_prompt: str
    chosen_variant: str
    variant_index: int
    improvement_score: Optional[float]
    timestamp: datetime
    
    class Config:
        from_attributes = True


# NEW: Prompt History schemas
class PromptHistoryCreate(BaseModel):
    """Create prompt history entry"""
    user_email: EmailStr = Field(..., example="john.doe@company.com")
    
    # Prompt details
    original_prompt: str = Field(..., example="write code to sort array")
    final_prompt: str = Field(..., example="Write Python code to sort an array...")
    tool: str = Field(..., example="chatgpt")
    
    # Variant selection
    variants_offered: Optional[List[Dict[str, Any]]] = Field(default=None)
    variant_selected: int = Field(..., example=0, description="-1=original, 0-2=variant")
    
    # Quality metrics
    original_score: Optional[float] = Field(default=None, example=45.0)
    final_score: Optional[float] = Field(default=None, example=85.0)
    
    # PII detection
    had_pii: bool = Field(default=False)
    pii_types: Optional[List[str]] = Field(default=None, example=["email"])
    
    # Context
    session_id: Optional[str] = Field(default=None)
    
    class Config:
        json_schema_extra = {
            "example": {
                "user_email": "john.doe@company.com",
                "original_prompt": "write code to sort array",
                "final_prompt": "Write Python code to sort an array in ascending order...",
                "tool": "chatgpt",
                "variant_selected": 1,
                "original_score": 45.0,
                "final_score": 85.0,
                "had_pii": False
            }
        }


class PromptHistoryResponse(BaseModel):
    """Prompt history response"""
    id: int
    user_id: int
    original_prompt: str
    final_prompt: str
    tool: str
    variant_selected: int
    original_score: Optional[float]
    final_score: Optional[float]
    improvement_delta: Optional[float]
    had_pii: bool
    pii_types: Optional[List[str]]
    timestamp: datetime
    
    class Config:
        from_attributes = True


class PromptHistoryListResponse(BaseModel):
    """List of prompt history with pagination"""
    total: int
    page: int
    page_size: int
    items: List[PromptHistoryResponse]


class PromptHistoryStats(BaseModel):
    """Statistics for prompt history"""
    total_prompts: int
    avg_improvement: float
    pii_incidents: int
    variant_adoption_rate: float
    top_tools: List[Dict[str, Any]]
    recent_prompts: List[PromptHistoryResponse]


# Policy schemas
class PolicyCreate(BaseModel):
    org_id: int
    name: str
    rules_json: dict


class PolicyResponse(BaseModel):
    id: int
    org_id: int
    name: str
    rules_json: dict
    active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# Alert schemas
class AlertCreate(BaseModel):
    user_email: EmailStr
    violation_type: str
    details: Optional[dict] = None


class AlertResponse(BaseModel):
    id: int
    user_id: int
    violation_type: str
    details: Optional[dict]
    resolved: bool
    timestamp: datetime
    
    class Config:
        from_attributes = True

# Analytics Schemas
class UsageStats(BaseModel):
    """Usage statistics response"""
    total_prompts: int
    unique_users: int
    prompts_by_tool: Dict[str, int]
    prompts_by_risk: Dict[str, int]
    top_users: List[Dict[str, Any]]
    
    class Config:
        json_schema_extra = {
            "example": {
                "total_prompts": 1247,
                "unique_users": 45,
                "prompts_by_tool": {"chatgpt": 850, "claude": 397},
                "prompts_by_risk": {"low": 1200, "medium": 35, "high": 12},
                "top_users": [
                    {"email": "john@company.com", "count": 245}
                ]
            }
        }


class PromptImprovementStats(BaseModel):
    """Prompt improvement statistics"""
    total_suggestions: int
    variants_chosen: int
    originals_kept: int
    adoption_rate: float
    avg_improvement: float
    top_improvements: List[Dict[str, Any]]
    
    class Config:
        json_schema_extra = {
            "example": {
                "total_suggestions": 543,
                "variants_chosen": 412,
                "originals_kept": 131,
                "adoption_rate": 0.76,
                "avg_improvement": 23.5,
                "top_improvements": [
                    {
                        "original": "write code",
                        "chosen": "Write Python code to...",
                        "improvement": 45.0
                    }
                ]
            }
        }