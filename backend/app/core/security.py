"""
Security utilities for API key validation and authentication.
"""
from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader
from .config import settings

# API Key header scheme - expects "X-API-Key" header in requests
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def verify_api_key(api_key: str = Security(api_key_header)) -> str:
    """
    Validate API key from request header.
    
    For POC: Uses a simple secret key comparison.
    In production: Would validate against database of org-specific keys.
    
    Args:
        api_key: The API key from request header
        
    Returns:
        The validated API key
        
    Raises:
        HTTPException: If API key is missing or invalid
    """
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing API key. Include 'X-API-Key' header."
        )
    
    # POC: Simple validation against secret key
    # Production: Query database for org_id associated with this key
    if api_key != settings.API_KEY_SECRET:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid API key"
        )
    
    return api_key
