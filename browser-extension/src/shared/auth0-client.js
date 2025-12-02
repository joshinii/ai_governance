/**
 * Auth0 Authentication Client for Browser Extension
 * Handles Auth0 token retrieval and JWT management
 */

class Auth0Client {
  constructor(config) {
    this.domain = config.AUTH0_DOMAIN;
    this.clientId = config.AUTH0_CLIENT_ID;
    this.audience = config.AUTH0_API_AUDIENCE;
    this.apiUrl = config.API_URL;  // Backend API URL for token and logout endpoints
    this.redirectUri = chrome.runtime.getURL('src/auth/auth-callback.html');
    this.tokenKey = 'auth0_token';
    this.expiryKey = 'auth0_token_expiry';
  }

  /**
   * Get stored token if valid
   * @returns {Promise<string|null>} - JWT token or null if expired/missing
   */
  async getToken() {
    return new Promise((resolve) => {
      chrome.storage.local.get([this.tokenKey, this.expiryKey], (items) => {
        const token = items[this.tokenKey];
        const expiry = items[this.expiryKey];

        if (!token || !expiry) {
          resolve(null);
          return;
        }

        // Check if token is expired
        if (Date.now() > expiry) {
          this.clearToken();
          resolve(null);
          return;
        }

        resolve(token);
      });
    });
  }

  /**
   * Store token in extension storage
   * @param {string} token - JWT token from Auth0
   * @param {number} expiresIn - Expiration time in seconds
   */
  async setToken(token, expiresIn = 86400) {
    return new Promise((resolve) => {
      const expiry = Date.now() + (expiresIn * 1000);
      chrome.storage.local.set({
        [this.tokenKey]: token,
        [this.expiryKey]: expiry
      }, resolve);
    });
  }

  /**
   * Clear stored token
   */
  async clearToken() {
    return new Promise((resolve) => {
      chrome.storage.local.remove([this.tokenKey, this.expiryKey], resolve);
    });
  }

  /**
   * Check if user is authenticated
   * @returns {Promise<boolean>}
   */
  async isAuthenticated() {
    const token = await this.getToken();
    return token !== null;
  }

  /**
   * Get user info from stored token
   * @returns {Promise<Object|null>} - User object with email, name, etc.
   */
  async getUserInfo() {
    const token = await this.getToken();
    if (!token) return null;

    try {
      // Decode JWT payload (without verification, since we trust Auth0)
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const payload = JSON.parse(atob(parts[1]));
      return {
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        sub: payload.sub
      };
    } catch (error) {
      console.error('Failed to decode token:', error);
      return null;
    }
  }

  /**
   * Validate token format (JWT structure)
   * @param {string} token - JWT token to validate
   * @returns {boolean} - True if token has valid JWT structure
   */
  validateTokenFormat(token) {
    try {
      const parts = token.split('.');
      // JWT must have 3 parts separated by dots: header.payload.signature
      if (parts.length !== 3) {
        console.error('Invalid JWT format: wrong number of segments');
        return false;
      }

      // Try to decode parts to ensure they're valid base64
      atob(parts[0]); // header
      atob(parts[1]); // payload
      // parts[2] is signature, no need to decode

      return true;
    } catch (error) {
      console.error('Invalid JWT format:', error);
      return false;
    }
  }

  /**
   * Validate token expiration
   * @param {string} token - JWT token to check
   * @returns {Object} - { valid: boolean, expiresIn: number, expiredAt: number }
   */
  validateTokenExpiration(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return { valid: false, expiresIn: 0, expiredAt: 0 };
      }

      const payload = JSON.parse(atob(parts[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      const expiresAt = payload.exp;

      if (!expiresAt) {
        console.warn('Token missing exp claim');
        return { valid: false, expiresIn: 0, expiredAt: 0 };
      }

      const expiresIn = expiresAt - currentTime;
      const isValid = expiresIn > 0;

      return {
        valid: isValid,
        expiresIn: Math.max(0, expiresIn),
        expiredAt: expiresAt * 1000 // Convert to milliseconds
      };
    } catch (error) {
      console.error('Failed to validate token expiration:', error);
      return { valid: false, expiresIn: 0, expiredAt: 0 };
    }
  }

  /**
   * Validate token claims (audience, issuer, etc.)
   * @param {string} token - JWT token to validate
   * @returns {Promise<Object>} - Validation result
   */
  async validateTokenClaims(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return {
          valid: false,
          error: 'Invalid JWT format',
          audience: null,
          issuer: null
        };
      }

      const payload = JSON.parse(atob(parts[1]));

      // Check audience claim
      const hasCorrectAudience = payload.aud === this.audience;
      if (!hasCorrectAudience) {
        console.warn(`Audience mismatch. Expected: ${this.audience}, Got: ${payload.aud}`);
      }

      // Check issuer claim
      const expectedIssuer = `https://${this.domain}/`;
      const hasCorrectIssuer = payload.iss === expectedIssuer;
      if (!hasCorrectIssuer) {
        console.warn(`Issuer mismatch. Expected: ${expectedIssuer}, Got: ${payload.iss}`);
      }

      return {
        valid: hasCorrectAudience && hasCorrectIssuer,
        error: !hasCorrectAudience ? 'Audience mismatch' : !hasCorrectIssuer ? 'Issuer mismatch' : null,
        audience: payload.aud,
        issuer: payload.iss,
        email: payload.email,
        sub: payload.sub
      };
    } catch (error) {
      console.error('Failed to validate token claims:', error);
      return {
        valid: false,
        error: error.message,
        audience: null,
        issuer: null
      };
    }
  }

  /**
   * Validate token against backend /auth/token-validate endpoint
   * Confirms token is valid server-side and has not been revoked
   * @returns {Promise<Object>} - Validation result from backend
   */
  async validateTokenWithBackend(token = null) {
    try {
      if (!token) {
        token = await this.getToken();
        if (!token) {
          return {
            valid: false,
            error: 'No token available'
          };
        }
      }

      const endpoint = `${this.apiUrl}/auth/token-validate`;
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        return {
          valid: false,
          error: `Backend validation failed: ${response.statusText}`,
          status: response.status
        };
      }

      const data = await response.json();
      return {
        valid: true,
        ...data
      };
    } catch (error) {
      console.error('Backend token validation error:', error);
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Comprehensive token validation
   * Validates format, expiration, claims, and backend validation
   * @returns {Promise<Object>} - Complete validation result
   */
  async validateToken() {
    const token = await this.getToken();

    if (!token) {
      return {
        authenticated: false,
        error: 'No token found',
        formatValid: false,
        expirationValid: false,
        claimsValid: false,
        backendValid: false
      };
    }

    // Check format
    const formatValid = this.validateTokenFormat(token);
    if (!formatValid) {
      return {
        authenticated: false,
        error: 'Invalid token format',
        formatValid: false,
        expirationValid: false,
        claimsValid: false,
        backendValid: false
      };
    }

    // Check expiration
    const expirationCheck = this.validateTokenExpiration(token);
    if (!expirationCheck.valid) {
      console.log('Token expired, attempting refresh...');
      return {
        authenticated: false,
        error: 'Token expired',
        formatValid: true,
        expirationValid: false,
        claimsValid: false,
        backendValid: false,
        expiresIn: expirationCheck.expiresIn
      };
    }

    // Check claims
    const claimsCheck = await this.validateTokenClaims(token);
    if (!claimsCheck.valid) {
      return {
        authenticated: false,
        error: claimsCheck.error,
        formatValid: true,
        expirationValid: true,
        claimsValid: false,
        backendValid: false
      };
    }

    // Check with backend
    const backendCheck = await this.validateTokenWithBackend(token);
    if (!backendCheck.valid) {
      console.warn('Backend validation failed:', backendCheck.error);
      // Backend validation failure might indicate token revocation
      // Consider clearing token and requiring re-authentication
    }

    return {
      authenticated: true,
      error: null,
      formatValid: true,
      expirationValid: true,
      claimsValid: true,
      backendValid: backendCheck.valid,
      backendError: backendCheck.error,
      expiresIn: expirationCheck.expiresIn,
      userInfo: claimsCheck
    };
  }

  /**
   * Initiate Auth0 authentication flow
   * Opens Auth0 login page in a popup
   * @returns {Promise<boolean>} - True if authentication successful
   */
  async authenticate() {
    try {
      // Generate authorization URL
      const state = this._generateRandomString();
      const nonce = this._generateRandomString();

      // Store state and nonce for verification
      await this._setAuthState({ state, nonce });

      const authUrl = this._getAuthorizationUrl(state, nonce);

      // Open Auth0 login in a popup
      return await this._openAuthPopup(authUrl);
    } catch (error) {
      console.error('Authentication error:', error);
      return false;
    }
  }

  /**
   * Handle Auth0 callback with authorization code
   * @param {string} code - Authorization code from Auth0
   * @returns {Promise<boolean>} - True if token exchange successful
   */
  async handleCallback(code) {
    try {
      const state = sessionStorage.getItem('auth0_state');
      const nonce = sessionStorage.getItem('auth0_nonce');

      // In a real application, you would exchange the code for a token on the backend
      // For now, we'll use the code to fetch a token via a backend endpoint
      const tokenEndpoint = `${this.apiUrl}/auth/token`;

      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code, state, nonce })
      });

      if (!response.ok) {
        throw new Error('Token exchange failed');
      }

      const data = await response.json();

      // Store token
      await this.setToken(data.access_token, data.expires_in);

      // Clear session storage
      sessionStorage.removeItem('auth0_state');
      sessionStorage.removeItem('auth0_nonce');

      return true;
    } catch (error) {
      console.error('Callback handling error:', error);
      return false;
    }
  }

  /**
   * Logout user
   */
  async logout() {
    await this.clearToken();

    // Call backend logout endpoint
    try {
      const token = await this.getToken();
      if (token) {
        const logoutEndpoint = `${this.apiUrl}/users/logout`;
        await fetch(logoutEndpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
    } catch (error) {
      console.warn('Logout endpoint error:', error);
    }
  }

  /**
   * Get authorization URL
   * @private
   */
  _getAuthorizationUrl(state, nonce) {
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      scope: 'openid profile email offline_access',
      state,
      nonce,
      audience: this.audience
    });

    return `https://${this.domain}/authorize?${params}`;
  }

  /**
   * Open Auth0 login popup
   * @private
   */
  async _openAuthPopup(url) {
    return new Promise((resolve) => {
      const width = 500;
      const height = 700;
      const left = (screen.width - width) / 2;
      const top = (screen.height - height) / 2;

      const popup = window.open(
        url,
        'auth0-login',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Check if popup closed
      const checkPopup = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkPopup);
          resolve(this.getToken() !== null);
        }
      }, 1000);
    });
  }

  /**
   * Store auth state
   * @private
   */
  async _setAuthState(state) {
    return new Promise((resolve) => {
      chrome.storage.session.set(state, resolve);
    });
  }

  /**
   * Generate random string for state/nonce
   * @private
   */
  _generateRandomString() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
}

// Export for use in content scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Auth0Client;
}
