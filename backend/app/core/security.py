from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import requests
from functools import wraps
from typing import Callable, Optional
import os
from datetime import datetime
from .config import settings
from sqlalchemy.orm import Session
from ..models.database import get_db

security = HTTPBearer()

# Auth0 configuration from environment variables or settings
AUTH0_DOMAIN = os.getenv("AUTH0_DOMAIN") or settings.AUTH0_DOMAIN
AUTH0_API_AUDIENCE = os.getenv("AUTH0_API_AUDIENCE") or settings.AUTH0_API_AUDIENCE
ALGORITHMS = ["RS256"]

# Cache the JWKS
jwks_cache = None
jwks_cache_time = None
JWKS_CACHE_TTL = 3600  # Cache for 1 hour

def get_jwks():
    """Get JWKS with caching"""
    global jwks_cache, jwks_cache_time
    now = datetime.now().timestamp()

    if jwks_cache is None or (jwks_cache_time and now - jwks_cache_time > JWKS_CACHE_TTL):
        try:
            jwks_url = f"https://{AUTH0_DOMAIN}/.well-known/jwks.json"
            response = requests.get(jwks_url, timeout=10)
            response.raise_for_status()
            jwks_cache = response.json()
            jwks_cache_time = now  
            
        except requests.RequestException as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Unable to fetch Auth0 JWKS: {str(e)}"
            )
    return jwks_cache

async def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """
    Verify Auth0 JWT token and return payload.

    Args:
        credentials: Bearer token from Authorization header

    Returns:
        JWT payload containing user information

    Raises:
        HTTPException: If token is invalid or expired
    """
    token = credentials.credentials

    try:
        # Get signing key
        jwks = get_jwks()
        unverified_header = jwt.get_unverified_header(token)
        rsa_key = {}

        # Find the key with matching kid
        for key in jwks.get("keys", []):
            if key.get("kid") == unverified_header.get("kid"):
                rsa_key = {
                    "kty": key.get("kty"),
                    "kid": key.get("kid"),
                    "use": key.get("use"),
                    "n": key.get("n"),
                    "e": key.get("e")
                }
                break

        if not rsa_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unable to find appropriate signing key"
            )

        # Verify token signature and claims
        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=ALGORITHMS,
            audience=AUTH0_API_AUDIENCE,
            issuer=f"https://{AUTH0_DOMAIN}/"
        )
        return payload

    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token verification failed: {str(e)}"
        )

async def get_current_user(
    payload: dict = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """
    Get or create current user from JWT payload.
    Auto-creates user in database if doesn't exist (first login).

    Args:
        payload: Verified JWT payload
        db: Database session

    Returns:
        User object from database with role and permissions
    """
    from ..models.database import User, Organization, UserRole
    
    # Get email from token - try multiple fields
    email = payload.get("email") or payload.get("https://your-domain.com/email")
    
    # If no email, use Auth0 sub as identifier (convert to email-like format)
    if not email:
        sub = payload.get("sub")
        if sub:
            # Convert Auth0 ID to valid email format: auth0|xxx -> auth0-xxx@auth0.local
            email = sub.replace("|", "-") + "@auth0.local"
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token does not contain user email or subject"
            )

    # Find existing user
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        # Auto-create user on first login
        name = payload.get("name") or payload.get("nickname") or email.split("@")[0]
        picture = payload.get("picture", "")
        
        # Determine organization from email domain
        email_domain = email.split('@')[-1] if '@' in email else None
        org = None
        
        # Only try to match org if it's a real email domain (not auth0.local)
        if email_domain and email_domain != "auth0.local":
            org = db.query(Organization).filter(
                Organization.domain == email_domain
            ).first()
        
        # Default to SJSU (id=1) if no org found
        org_id = org.id if org else 1
        
        # Create new user with employee role by default
        user = User(
            email=email,
            name=name,
            picture=picture,
            role=UserRole.EMPLOYEE,  # Default role
            org_id=org_id
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    return user

def require_role(*allowed_roles):
    """
    Dependency to require specific roles.
    
    Usage:
        @router.get("/admin-only")
        def admin_endpoint(current_user = Depends(require_role(UserRole.SECURITY_TEAM))):
            ...
    """
    from ..models.database import UserRole
    
    def role_checker(current_user = Depends(get_current_user)):
        # Convert to role values
        allowed_role_values = [
            role if hasattr(role, 'value') else role 
            for role in allowed_roles
        ]
        
        user_role = current_user.role if hasattr(current_user.role, 'value') else current_user.role
        
        if user_role not in allowed_role_values:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required roles: {allowed_role_values}"
            )
        
        return current_user
    
    return role_checker