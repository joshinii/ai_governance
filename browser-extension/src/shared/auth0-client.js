/**
 * Auth0 Authentication Client for Browser Extension
 * Handles Auth0 token retrieval and JWT management
 */

class Auth0Client {
  constructor(config) {
    this.domain = config.AUTH0_DOMAIN;
    this.clientId = config.AUTH0_CLIENT_ID;
    this.audience = config.AUTH0_API_AUDIENCE;
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

      const response = await fetch('https://blah-subsequent-personal-synthetic.trycloudflare.com/auth/token', {
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
        await fetch('https://blah-subsequent-personal-synthetic.trycloudflare.com/users/logout', {
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
