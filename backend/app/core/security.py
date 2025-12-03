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


# ============================================
# JWT VERIFIER CLASS - Consolidated JWT Logic
# ============================================

class JWTVerifier:
    """
    Encapsulates Auth0 JWT verification with JWKS caching.
    Handles token validation with RS256 signature verification.
    """

    def __init__(self, auth0_domain: str, auth0_audience: str, cache_ttl: int = 3600):
        self.auth0_domain = auth0_domain
        self.auth0_audience = auth0_audience
        self.cache_ttl = cache_ttl
        self.jwks_cache = None
        self.jwks_cache_time = None
        self.algorithms = ["RS256"]

    def get_jwks(self) -> dict:
        """
        Fetch and cache Auth0 JWKS (JSON Web Key Set).

        Returns:
            JWKS dictionary containing the signing keys

        Raises:
            HTTPException: If unable to fetch JWKS from Auth0
        """
        now = datetime.now().timestamp()

        # Return cached JWKS if valid
        if self.jwks_cache and self.jwks_cache_time:
            if now - self.jwks_cache_time < self.cache_ttl:
                return self.jwks_cache

        # Fetch fresh JWKS from Auth0
        try:
            jwks_url = f"https://{self.auth0_domain}/.well-known/jwks.json"
            response = requests.get(jwks_url, timeout=10)
            response.raise_for_status()
            self.jwks_cache = response.json()
            self.jwks_cache_time = now
            return self.jwks_cache

        except requests.RequestException as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Unable to fetch Auth0 JWKS: {str(e)}"
            )

    def get_signing_key(self, token_kid: str) -> dict:
        """
        Extract the RSA signing key matching the token's key ID.

        Args:
            token_kid: Key ID from the token header

        Returns:
            RSA key dictionary

        Raises:
            HTTPException: If key cannot be found
        """
        jwks = self.get_jwks()

        for key in jwks.get("keys", []):
            if key.get("kid") == token_kid:
                return {
                    "kty": key.get("kty"),
                    "kid": key.get("kid"),
                    "use": key.get("use"),
                    "n": key.get("n"),
                    "e": key.get("e")
                }

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unable to find appropriate signing key"
        )

    def verify(self, token: str) -> dict:
        """
        Verify Auth0 JWT token signature and claims.

        Args:
            token: JWT token string

        Returns:
            Decoded token payload containing user information

        Raises:
            HTTPException: If token is invalid, expired, or has invalid claims
        """
        try:
            # Get token header
            unverified_header = jwt.get_unverified_header(token)
            token_kid = unverified_header.get("kid")

            if not token_kid:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token missing 'kid' in header"
                )

            # Get signing key
            rsa_key = self.get_signing_key(token_kid)

            # Verify signature and claims
            payload = jwt.decode(
                token,
                rsa_key,
                algorithms=self.algorithms,
                audience=self.auth0_audience,
                issuer=f"https://{self.auth0_domain}/"
            )
            return payload

        except JWTError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid or expired token: {str(e)}"
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Token verification failed: {str(e)}"
            )


# Initialize global JWT verifier
jwt_verifier = JWTVerifier(AUTH0_DOMAIN, AUTH0_API_AUDIENCE)


# ============================================
# BACKWARD COMPATIBLE FUNCTION WRAPPERS
# ============================================

# Legacy JWKS cache for backward compatibility
jwks_cache = None
jwks_cache_time = None
JWKS_CACHE_TTL = 3600  # Cache for 1 hour

def get_jwks():
    """Get JWKS with caching (kept for backward compatibility)"""
    return jwt_verifier.get_jwks()


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
    return jwt_verifier.verify(token)

def extract_auth0_sub(token_payload: dict) -> Optional[str]:
    """
    Extract raw Auth0 'sub' claim from token payload.
    Used for identity linking across different Auth0 applications.

    Args:
        token_payload: Decoded JWT payload

    Returns:
        Auth0 subject claim (e.g., 'auth0|...' or 'google-oauth2|...') or None
    """
    return token_payload.get("sub")


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

    # Extract auth0_sub for identity linking
    auth0_sub = extract_auth0_sub(payload)

    # Get email from token - try multiple fields
    email = payload.get("email") or payload.get("https://your-domain.com/email")

    # If no email, use Auth0 sub as identifier (convert to email-like format)
    if not email:
        if auth0_sub:
            # Convert Auth0 ID to valid email format: auth0|xxx -> auth0-xxx@auth0.local
            email = auth0_sub.replace("|", "-") + "@auth0.local"
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

        # Default to first available organization if no match found
        if not org:
            org = db.query(Organization).first()
            if not org:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="No organization found in database. Please contact administrator."
                )

        org_id = org.id

        # Create new user with employee role by default
        user = User(
            email=email,
            name=name,
            picture=picture,
            role=UserRole.EMPLOYEE,  # Default role
            org_id=org_id,
            auth0_sub=auth0_sub  # Store Auth0 sub for identity linking
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Update auth0_sub if it was None (for existing users)
        if user.auth0_sub is None and auth0_sub:
            user.auth0_sub = auth0_sub
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