/**
 * Background service worker
 * Handles extension lifecycle, Auth0 authentication, and badge updates
 */

// Import configuration from config.js
import CONFIG from '../../config.js';

console.log('[AI Governance] Background service worker loaded');

// Track stats
let stats = {
  promptsMonitored: 0,
  piiBlocked: 0,
  variantsUsed: 0
};

// Load stats from storage on startup
chrome.storage.local.get(['stats', 'lastStatsReset'], (result) => {
  if (result.stats) {
    stats = result.stats;
  }
  resetDailyStats();
});

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[AI Governance] Message received:', message);

  switch (message.type) {
    case 'PROMPT_MONITORED':
      stats.promptsMonitored++;
      saveStats();
      updateBadge();
      break;

    case 'PII_BLOCKED':
      stats.piiBlocked++;
      saveStats();
      updateBadge();
      break;

    case 'VARIANT_USED':
      stats.variantsUsed++;
      saveStats();
      updateBadge();
      break;

    case 'GET_STATS':
      sendResponse(stats);
      break;

    case 'AUTH0_LOGIN':
      handleAuth0Login(sendResponse);
      return true; // Will respond asynchronously

    case 'AUTH0_LOGOUT':
      handleAuth0Logout(sendResponse);
      return true;

    case 'IS_AUTHENTICATED':
      checkAuthentication(sendResponse);
      return true;

    case 'AUTH0_CALLBACK':
      handleAuth0Callback(message, sendResponse);
      return true;

    case 'GET_CONFIG':
      // Return configuration available in the extension (config.js)
      try {
        sendResponse(CONFIG);
      } catch (err) {
        console.error('[BG] GET_CONFIG error', err);
        sendResponse(null);
      }
      return false;

    case 'VALIDATE_TOKEN':
      // Validate token before use (format, expiration, claims)
      validateStoredToken(sendResponse);
      return true;

    case 'API_REQUEST':
      // Forward API requests from content scripts; attach auth token and API key
      (async () => {
        try {
          const { method = 'GET', path = '/', body = null, headers = {} } = message.payload || {};
          const config = await getConfig();

          // Validate and refresh token if needed before making API request
          const tokenValidation = await validateAndRefreshToken(config);
          if (!tokenValidation.valid) {
            console.warn('[BG] Token invalid or expired:', tokenValidation.error);
            sendResponse({
              ok: false,
              status: 401,
              error: 'Authentication required. Please login.'
            });
            return;
          }

          // Get stored token
          const items = await new Promise((resolve) => chrome.storage.local.get(['auth0_token'], resolve));
          const token = items.auth0_token;

          const fetchHeaders = {
            'Content-Type': 'application/json',
            ...headers
          };

          if (token) fetchHeaders['Authorization'] = `Bearer ${token}`;
          if (config && config.API_KEY) fetchHeaders['X-API-Key'] = config.API_KEY;

          const url = (config && config.API_URL) ? `${config.API_URL.replace(/\/$/, '')}${path}` : path;

          const res = await fetch(url, {
            method,
            headers: fetchHeaders,
            body: body ? JSON.stringify(body) : undefined
          });

          let data = null;
          const text = await res.text();
          try { data = JSON.parse(text); } catch (e) { data = text; }

          sendResponse({ ok: res.ok, status: res.status, data });
        } catch (err) {
          console.error('[BG] API_REQUEST error', err);
          sendResponse({ ok: false, error: err.message });
        }
      })();
      return true;
  }

  return false;
});

/**
 * Handle Auth0 login initiation
 */
async function handleAuth0Login(sendResponse) {
  try {
    // Get Auth0 config
    const config = await getConfig();

    // Generate auth URL
    const state = generateRandomString();
    const nonce = generateRandomString();

    // Store state and nonce
    await chrome.storage.session.set({ auth0_state: state, auth0_nonce: nonce });

    // Build authorization URL
    const authUrl = new URL(`https://${config.AUTH0_DOMAIN}/authorize`);
    authUrl.searchParams.set('client_id', config.AUTH0_CLIENT_ID);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', chrome.runtime.getURL('src/auth/auth-callback.html'));
    authUrl.searchParams.set('scope', 'openid profile email offline_access');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('nonce', nonce);
    authUrl.searchParams.set('audience', config.AUTH0_API_AUDIENCE);

    // Open Auth0 login in a popup
    const popup = await chrome.windows.create({
      url: authUrl.toString(),
      type: 'popup',
      width: 500,
      height: 700
    });

    // Wait for popup to close and check if authenticated
    const checkInterval = setInterval(async () => {
      if (!popup.id) return;

      try {
        await chrome.windows.get(popup.id);
      } catch (error) {
        // Window closed
        clearInterval(checkInterval);
        const isAuth = await isAuthenticated();
        sendResponse({
          success: isAuth,
          error: isAuth ? null : 'Authentication cancelled or failed'
        });
      }
    }, 1000);
  } catch (error) {
    console.error('Auth0 login error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle Auth0 logout
 */
async function handleAuth0Logout(sendResponse) {
  try {
    await chrome.storage.local.remove(['auth0_token', 'auth0_token_expiry']);
    sendResponse({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Check if user is authenticated
 */
async function checkAuthentication(sendResponse) {
  try {
    const isAuth = await isAuthenticated();
    let userInfo = null;

    if (isAuth) {
      userInfo = await getUserInfo();
    }

    sendResponse({
      authenticated: isAuth,
      userInfo: userInfo
    });
  } catch (error) {
    console.error('Authentication check error:', error);
    sendResponse({ authenticated: false });
  }
}

/**
 * Handle Auth0 callback with authorization code
 */
async function handleAuth0Callback(message, sendResponse) {
  try {
    const { code, state } = message;

    // Get stored state
    const stored = await chrome.storage.session.get(['auth0_state']);
    if (stored.auth0_state !== state) {
      throw new Error('State mismatch - possible CSRF attack');
    }

    // Exchange code for token (in production, use backend endpoint)
    const config = await getConfig();

    const response = await fetch(`https://${config.AUTH0_DOMAIN}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: config.AUTH0_CLIENT_ID,
        redirect_uri: chrome.runtime.getURL('src/auth/auth-callback.html'),
        code: code,
        grant_type: 'authorization_code'
      })
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    const data = await response.json();

    // Store token
    const expiry = Date.now() + (data.expires_in * 1000);
    await chrome.storage.local.set({
      auth0_token: data.access_token,
      auth0_token_expiry: expiry
    });

    // Clear session storage
    await chrome.storage.session.remove(['auth0_state', 'auth0_nonce']);

    sendResponse({ success: true });
  } catch (error) {
    console.error('Auth0 callback error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Check if user has valid Auth0 token
 */
async function isAuthenticated() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['auth0_token', 'auth0_token_expiry'], (items) => {
      const token = items.auth0_token;
      const expiry = items.auth0_token_expiry;

      if (!token || !expiry || Date.now() > expiry) {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

/**
 * Get user info from token
 */
async function getUserInfo() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['auth0_token'], (items) => {
      const token = items.auth0_token;
      if (!token) {
        resolve(null);
        return;
      }

      try {
        // Decode JWT
        const parts = token.split('.');
        if (parts.length !== 3) {
          resolve(null);
          return;
        }

        const payload = JSON.parse(atob(parts[1]));
        resolve({
          email: payload.email,
          name: payload.name,
          picture: payload.picture,
          sub: payload.sub
        });
      } catch (error) {
        console.error('Failed to decode token:', error);
        resolve(null);
      }
    });
  });
}

/**
 * Get config from background
 */
async function getConfig() {
  return CONFIG;
}

/**
 * Validate stored token (format, expiration, claims)
 * Returns validation result
 */
function validateStoredToken(callback) {
  (async () => {
    try {
      const items = await new Promise((resolve) =>
        chrome.storage.local.get(['auth0_token', 'auth0_token_expiry'], resolve)
      );

      const token = items.auth0_token;
      const expiry = items.auth0_token_expiry;

      if (!token || !expiry) {
        callback({
          valid: false,
          error: 'No token stored'
        });
        return;
      }

      // Check if expired
      if (Date.now() > expiry) {
        callback({
          valid: false,
          error: 'Token expired',
          expiresIn: 0
        });
        return;
      }

      // Check JWT format
      const parts = token.split('.');
      if (parts.length !== 3) {
        callback({
          valid: false,
          error: 'Invalid token format'
        });
        return;
      }

      // Token is valid
      const expiresIn = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
      callback({
        valid: true,
        expiresIn: expiresIn,
        expiresAt: expiry
      });
    } catch (error) {
      console.error('[BG] Token validation error:', error);
      callback({
        valid: false,
        error: error.message
      });
    }
  })();
}

/**
 * Validate and refresh token if needed before API calls
 * Implements silent refresh strategy: try to refresh silently, then prompt if needed
 */
async function validateAndRefreshToken(config) {
  try {
    const items = await new Promise((resolve) =>
      chrome.storage.local.get(['auth0_token', 'auth0_token_expiry'], resolve)
    );

    const token = items.auth0_token;
    const expiry = items.auth0_token_expiry;

    // No token stored
    if (!token || !expiry) {
      return {
        valid: false,
        error: 'No token available - login required',
        needsLogin: true
      };
    }

    // Check if expired
    if (Date.now() > expiry) {
      console.log('[BG] Token expired, will need re-authentication');
      return {
        valid: false,
        error: 'Token expired - login required',
        needsLogin: true
      };
    }

    // Check if token expires soon (within 5 minutes)
    const timeUntilExpiry = expiry - Date.now();
    if (timeUntilExpiry < 5 * 60 * 1000) {
      console.log('[BG] Token expires soon, attempting validation with backend');

      // Validate with backend to ensure token is still valid
      try {
        const response = await fetch(`${config.API_URL}/auth/token-validate`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          console.warn('[BG] Backend validation failed:', response.statusText);
          return {
            valid: false,
            error: 'Token validation failed',
            needsLogin: true
          };
        }

        const data = await response.json();
        return {
          valid: true,
          expiresIn: data.expires_in || timeUntilExpiry / 1000
        };
      } catch (error) {
        console.warn('[BG] Backend validation error:', error.message);
        // Backend validation failure - require re-auth
        return {
          valid: false,
          error: 'Cannot validate token',
          needsLogin: true
        };
      }
    }

    // Token is valid
    return {
      valid: true,
      expiresIn: Math.floor(timeUntilExpiry / 1000)
    };
  } catch (error) {
    console.error('[BG] Token refresh error:', error);
    return {
      valid: false,
      error: error.message
    };
  }
}

/**
 * Generate random string for state/nonce
 */
function generateRandomString() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

function saveStats() {
  chrome.storage.local.set({ stats: stats });
}

function updateBadge() {
  chrome.action.setBadgeText({ 
    text: stats.promptsMonitored > 0 ? stats.promptsMonitored.toString() : '' 
  });
  chrome.action.setBadgeBackgroundColor({ color: '#2563eb' });
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[AI Governance] Extension installed');
    chrome.tabs.create({
      url: chrome.runtime.getURL('src/popup/popup.html')
    });
  }
});

function resetDailyStats() {
  chrome.storage.local.get(['lastStatsReset'], (result) => {
    const now = new Date();
    const lastReset = result.lastStatsReset ? new Date(result.lastStatsReset) : null;
    
    if (!lastReset || lastReset.getDate() !== now.getDate()) {
      stats = {
        promptsMonitored: 0,
        piiBlocked: 0,
        variantsUsed: 0
      };
      chrome.storage.local.set({ 
        stats: stats,
        lastStatsReset: now.toISOString() 
      });
      updateBadge();
    }
  });
}

setInterval(resetDailyStats, 60 * 60 * 1000);