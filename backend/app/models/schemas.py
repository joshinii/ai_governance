"""
Pydantic schemas for request/response validation
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


# ============================================
# ENUMS
# ============================================

class UserRole(str, Enum):
    """User role enum matching database"""
    SECURITY_TEAM = "security_team"
    TEAM_LEAD = "team_lead"
    EMPLOYEE = "employee"


# ============================================
# USER SCHEMAS
# ============================================

class UserRegister(BaseModel):
    """User registration schema"""
    email: EmailStr
    name: Optional[str] = None
    picture: Optional[str] = None
    org_id: int = 1
    role: UserRole = Field(default=UserRole.EMPLOYEE)


class UserResponse(BaseModel):
    """User response schema"""
    id: int
    email: str  # Changed from EmailStr to allow Auth0 IDs
    name: Optional[str]
    picture: Optional[str]
    role: str
    team_id: Optional[int]
    org_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class UserProfile(BaseModel):
    """Extended user profile"""
    id: int
    email: str  # Changed from EmailStr to allow Auth0 IDs
    name: Optional[str]
    picture: Optional[str]
    role: str
    team_id: Optional[int]
    org_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    """User update schema"""
    name: Optional[str] = None
    picture: Optional[str] = None
    role: Optional[UserRole] = None
    team_id: Optional[int] = None


# ============================================
# TEAM SCHEMAS
# ============================================

class TeamResponse(BaseModel):
    """Team response schema"""
    id: int
    name: str
    description: Optional[str]
    org_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class TeamCreate(BaseModel):
    """Team creation schema"""
    name: str
    description: Optional[str] = None
    org_id: int = 1


# ============================================
# ORGANIZATION SCHEMAS
# ============================================

class OrganizationResponse(BaseModel):
    """Organization response schema"""
    id: int
    name: str
    short_name: Optional[str]
    domain: Optional[str]
    
    class Config:
        from_attributes = True


# ============================================
# USAGE LOG SCHEMAS
# ============================================

class UsageLogCreate(BaseModel):
    """Create usage log"""
    tool: str
    prompt_hash: str
    risk_level: str = "low"


class UsageLogResponse(BaseModel):
    """Usage log response"""
    id: int
    user_id: int
    tool: str
    prompt_hash: str
    risk_level: str
    timestamp: datetime
    
    class Config:
        from_attributes = True


# ============================================
# PROMPT LOG SCHEMAS
# ============================================

class VariantSchema(BaseModel):
    """Prompt variant schema"""
    text: str
    score: float
    improvements: List[str] = []


class PromptLogCreate(BaseModel):
    """Create prompt log"""
    user_email: str
    original_prompt: str
    chosen_variant: str
    variants: List[VariantSchema]
    variant_index: int = -1
    improvement_score: Optional[float] = None


class PromptLogResponse(BaseModel):
    """Prompt log response"""
    id: int
    user_id: int
    original_prompt: str
    chosen_variant: str
    variant_index: int
    improvement_score: Optional[float]
    timestamp: datetime
    
    class Config:
        from_attributes = True


# ============================================
# PROMPT HISTORY SCHEMAS
# ============================================

class PromptHistoryCreate(BaseModel):
    """Create prompt history entry"""
    user_email: str
    original_prompt: str
    final_prompt: str
    tool: str
    variants_offered: Optional[List[dict]] = None
    variant_selected: int = -1
    original_score: Optional[float] = None
    final_score: Optional[float] = None
    had_pii: bool = False
    pii_types: Optional[List[str]] = None
    session_id: Optional[str] = None


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
    """Paginated prompt history list"""
    total: int
    page: int
    page_size: int
    items: List[PromptHistoryResponse]


class PromptHistoryStats(BaseModel):
    """Prompt history statistics"""
    total_prompts: int
    avg_improvement: float
    pii_incidents: int
    variant_adoption_rate: float
    top_tools: List[dict]
    recent_prompts: List[PromptHistoryResponse]


# ============================================
# ALERT SCHEMAS
# ============================================

class AlertCreate(BaseModel):
    """Create alert"""
    user_email: str
    violation_type: str
    details: dict


class AlertResponse(BaseModel):
    """Alert response"""
    id: int
    user_id: int
    violation_type: str
    details: dict
    resolved: bool
    timestamp: datetime
    
    class Config:
        from_attributes = True


# ============================================
# POLICY SCHEMAS
# ============================================

class PolicyCreate(BaseModel):
    """Create policy"""
    org_id: int
    name: str
    description: Optional[str] = None
    policy_type: str
    rules: dict
    is_active: bool = True


class PolicyResponse(BaseModel):
    """Policy response"""
    id: int
    org_id: int
    name: str
    description: Optional[str]
    policy_type: str
    rules: dict
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============================================
# ANALYTICS SCHEMAS
# ============================================

class UsageStats(BaseModel):
    """Usage statistics"""
    total_prompts: int
    unique_users: int
    prompts_by_tool: dict
    prompts_by_risk: dict
    top_users: List[dict]


class PromptImprovementStats(BaseModel):
    """Prompt improvement statistics"""
    total_suggestions: int
    variants_chosen: int
    originals_kept: int
    adoption_rate: float
    avg_improvement: float
    top_improvements: List[dict]


# ============================================
# PROMPT VARIANT SCHEMAS
# ============================================

class PromptVariantRequest(BaseModel):
    """Request for prompt variants"""
    original_prompt: str
    context: str = "general"


class PromptVariantResponse(BaseModel):
    """Prompt variant response"""
    text: str
    score: float
    improvements: List[str]
    strategy: str


class PromptVariantsResponse(BaseModel):
    """Multiple variants response"""
    original_prompt: str
    context: str
    original_quality: dict
    variants: List[PromptVariantResponse]
    metadata: dict