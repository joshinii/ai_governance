"""
Authentication and token validation endpoints.

Provides endpoints for:
- Token information and validation
- JWKS endpoint information
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from typing import Optional
from ...core.security import verify_token, extract_auth0_sub
from ...models.database import User, get_db
from sqlalchemy.orm import Session

router = APIRouter(prefix="/auth", tags=["Authentication"])

security = HTTPBearer()


@router.get("/token-info")
async def get_token_info(
    payload: dict = Depends(verify_token),
    current_user: User = Depends(None)  # Placeholder for get_current_user
) -> dict:
    """
    Get decoded token information and claims.

    This endpoint validates the current token and returns its decoded claims.
    Useful for:
    - Extension token validation
    - Debugging authentication issues
    - Verifying token expiration and audience claims

    Args:
        payload: Verified JWT payload

    Returns:
        Token information containing:
        - sub: Auth0 subject claim (for identity linking)
        - email: User email
        - aud: Token audience
        - iat: Issued at timestamp
        - exp: Expiration timestamp
        - iss: Issuer
        - name: User name (if available)
        - picture: User picture URL (if available)

    Raises:
        HTTPException 401: If token is invalid or expired
    """
    auth0_sub = extract_auth0_sub(payload)

    return {
        "sub": auth0_sub,
        "email": payload.get("email"),
        "aud": payload.get("aud"),
        "iat": payload.get("iat"),
        "exp": payload.get("exp"),
        "iss": payload.get("iss"),
        "name": payload.get("name"),
        "picture": payload.get("picture"),
        "nickname": payload.get("nickname"),
    }


@router.get("/token-validate")
async def validate_token(
    payload: dict = Depends(verify_token)
) -> dict:
    """
    Validate the current token.

    This endpoint performs full token validation and returns validation status.
    Used by extensions or clients to verify token is valid before use.

    Args:
        payload: Verified JWT payload

    Returns:
        Validation status:
        - valid: Whether token is valid
        - exp: Token expiration timestamp
        - aud: Token audience
        - sub: Auth0 subject claim

    Raises:
        HTTPException 401: If token is invalid or expired
    """
    import time

    current_time = int(time.time())
    exp_time = payload.get("exp", 0)

    return {
        "valid": True,
        "exp": exp_time,
        "expires_in": max(0, exp_time - current_time),
        "aud": payload.get("aud"),
        "sub": extract_auth0_sub(payload),
    }
