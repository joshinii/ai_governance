/**
 * Popup UI script
 * Displays stats and provides controls
 * Includes configuration management for dynamic API URLs and Auth0 settings
 */

// Dynamic configuration import
let CONFIG = null;

// Initialize configuration
async function initializeConfig() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_CONFIG' });
    CONFIG = response;
  } catch (error) {
    console.warn('Failed to get config from background, using fallback:', error);
    // Fallback to loading from config.js if available
    if (typeof CONFIG === 'undefined') {
      CONFIG = getDefaultConfig();
    }
  }
}

function getDefaultConfig() {
  // Fallback defaults - should match config.js
  return {
    API_URL: 'https://sunshineless-beckett-axial.ngrok-free.dev',
    AUTH0_DOMAIN: 'dev-y75lecimhanaeqy7.us.auth0.com',
    AUTH0_CLIENT_ID: 'WhzBlOdMwksEotPnSN7y7OJktRnUzi3u',
    AUTH0_API_AUDIENCE: 'https://sunshineless-beckett-axial.ngrok-free.dev',
    FEATURES: {
      PII_DETECTION: true,
      PROMPT_VARIANTS: true,
      USAGE_LOGGING: true,
      PROMPT_HISTORY: true
    },
    AI_TOOLS: {
      'chat.openai.com': 'chatgpt',
      'chatgpt.com': 'chatgpt',
      'claude.ai': 'claude',
      'gemini.google.com': 'gemini',
      'copilot.microsoft.com': 'copilot'
    }
  };
}

// Load stats from background worker
async function loadStats() {
  try {
    const stats = await chrome.runtime.sendMessage({ type: 'GET_STATS' });

    const promptsEl = document.getElementById('prompts-count');
    if (promptsEl) promptsEl.textContent = stats.promptsMonitored || 0;
    
    const piiEl = document.getElementById('pii-count');
    if (piiEl) piiEl.textContent = stats.piiBlocked || 0;
    
    const variantsEl = document.getElementById('variants-count');
    if (variantsEl) variantsEl.textContent = stats.variantsUsed || 0;
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}

// Load current configuration into the form
async function loadConfigurationForm() {
  if (!CONFIG) await initializeConfig();

  const apiUrlEl = document.getElementById('config-api-url');
  if (apiUrlEl) apiUrlEl.value = CONFIG.API_URL || '';
  
  const auth0DomainEl = document.getElementById('config-auth0-domain');
  if (auth0DomainEl) auth0DomainEl.value = CONFIG.AUTH0_DOMAIN || '';
  
  const auth0ClientIdEl = document.getElementById('config-auth0-client-id');
  if (auth0ClientIdEl) auth0ClientIdEl.value = CONFIG.AUTH0_CLIENT_ID || '';
  
  const auth0AudienceEl = document.getElementById('config-auth0-audience');
  if (auth0AudienceEl) auth0AudienceEl.value = CONFIG.AUTH0_API_AUDIENCE || '';
}

// Toggle configuration panel visibility
const toggleConfigBtn = document.getElementById('toggle-config');
if (toggleConfigBtn) {
  toggleConfigBtn.addEventListener('click', async () => {
    const panel = document.getElementById('config-panel');
    const button = document.getElementById('toggle-config');

    panel.classList.toggle('hidden');
    button.textContent = panel.classList.contains('hidden') ? 'Show Configuration' : 'Hide Configuration';

    if (!panel.classList.contains('hidden')) {
      await loadConfigurationForm();
    }
  });
}

// Save configuration
const saveConfigBtn = document.getElementById('save-config');
if (saveConfigBtn) {
  saveConfigBtn.addEventListener('click', async () => {
    const config = {
      API_URL: (document.getElementById('config-api-url')?.value || '').trim(),
      AUTH0_DOMAIN: (document.getElementById('config-auth0-domain')?.value || '').trim(),
      AUTH0_CLIENT_ID: (document.getElementById('config-auth0-client-id')?.value || '').trim(),
      AUTH0_API_AUDIENCE: (document.getElementById('config-auth0-audience')?.value || '').trim(),
      FEATURES: CONFIG?.FEATURES || {},
      AI_TOOLS: CONFIG?.AI_TOOLS || {}
    };

    const statusEl = document.getElementById('config-status');

    // Validate inputs
    if (!config.API_URL || !config.AUTH0_DOMAIN || !config.AUTH0_CLIENT_ID || !config.AUTH0_API_AUDIENCE) {
      if (statusEl) {
        statusEl.textContent = '❌ All configuration fields are required';
        statusEl.style.color = '#dc2626';
      }
      return;
    }

    try {
      // Validate URLs
      new URL(config.API_URL);
      new URL(config.AUTH0_API_AUDIENCE);
    } catch (error) {
      if (statusEl) {
        statusEl.textContent = '❌ Invalid URL format. Please check your input.';
        statusEl.style.color = '#dc2626';
      }
      return;
    }

    try {
      // Send configuration to background script to save
      const response = await chrome.runtime.sendMessage({
        type: 'SAVE_CONFIG',
        config: config
      });

      if (response.success) {
        CONFIG = config;
        if (statusEl) {
          statusEl.textContent = '✅ Configuration saved successfully!';
          statusEl.style.color = '#10b981';

          setTimeout(() => {
            statusEl.textContent = '';
          }, 3000);
        }
      } else {
        if (statusEl) {
          statusEl.textContent = '❌ Failed to save configuration: ' + (response.error || 'Unknown error');
          statusEl.style.color = '#dc2626';
        }
      }
    } catch (error) {
      if (statusEl) {
        statusEl.textContent = '❌ Error saving configuration: ' + error.message;
        statusEl.style.color = '#dc2626';
      }
    }
  });
}

// Reset configuration to defaults
const resetConfigBtn = document.getElementById('reset-config');
if (resetConfigBtn) {
  resetConfigBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to reset to default configuration?')) {
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'RESET_CONFIG'
        });

        if (response.success) {
          CONFIG = getDefaultConfig();
          await loadConfigurationForm();
          const statusEl = document.getElementById('config-status');
          if (statusEl) {
            statusEl.textContent = '✅ Configuration reset to defaults';
            statusEl.style.color = '#10b981';

            setTimeout(() => {
              statusEl.textContent = '';
            }, 3000);
          }
        }
      } catch (error) {
        const statusEl = document.getElementById('config-status');
        if (statusEl) {
          statusEl.textContent = '❌ Error resetting configuration: ' + error.message;
          statusEl.style.color = '#dc2626';
        }
      }
    }
  });
}

// View dashboard button - use dynamic URL from config
const viewDashboardBtn = document.getElementById('view-dashboard');
if (viewDashboardBtn) {
  viewDashboardBtn.addEventListener('click', async () => {
    if (!CONFIG) await initializeConfig();

    try {
      // Get authentication status and user info
      const authState = await chrome.runtime.sendMessage({ type: 'IS_AUTHENTICATED' });

      // Use DASHBOARD_URL from config, fallback to hardcoded value
      let dashboardUrl = CONFIG.DASHBOARD_URL || 'https://articulative-protozoonal-emersyn.ngrok-free.dev';

      // If user is authenticated, append email as query parameter for tracking
      if (authState.authenticated && authState.userInfo && authState.userInfo.email) {
        const url = new URL(dashboardUrl);
        url.searchParams.set('user_email', authState.userInfo.email);
        dashboardUrl = url.toString();
      }

      chrome.tabs.create({
        url: dashboardUrl
      });
    } catch (error) {
      console.error('[Popup] Dashboard navigation error:', error);
      // Fallback to hardcoded if anything fails
      chrome.tabs.create({
        url: 'https://articulative-protozoonal-emersyn.ngrok-free.dev'
      });
    }
  });
}

// Test connection button - use dynamic API URL
const testConnectionBtn = document.getElementById('test-connection');
if (testConnectionBtn) {
  testConnectionBtn.addEventListener('click', async () => {
    if (!CONFIG) await initializeConfig();

    const button = document.getElementById('test-connection');
    button.textContent = 'Testing...';
    button.disabled = true;

    try {
      const response = await fetch(CONFIG.API_URL + '/health', {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        alert('✅ Backend connection successful!\n\nStatus: ' + data.status);
      } else {
        alert('❌ Backend connection failed!\n\nStatus: ' + response.status);
      }
    } catch (error) {
      alert('❌ Cannot reach backend!\n\nMake sure backend is running on ' + CONFIG.API_URL + '\n\nError: ' + error.message);
    } finally {
      button.textContent = 'Test Backend Connection';
      button.disabled = false;
    }
  });
}

// Login button
const loginBtn = document.getElementById('login-button');
if (loginBtn) {
  loginBtn.addEventListener('click', async () => {
    const button = document.getElementById('login-button');
    button.textContent = 'Logging in...';
    button.disabled = true;

    try {
      // Send message to background script to trigger Auth0 login
      const result = await chrome.runtime.sendMessage({ type: 'AUTH0_LOGIN' });

      if (result.success) {
        alert('✅ Login successful!\n\nYou can now use the extension.');
        loadStats();
      } else {
        alert('❌ Login failed!\n\nError: ' + result.error);
      }
    } catch (error) {
      alert('❌ Login error!\n\nError: ' + error.message);
    } finally {
      button.textContent = 'Login with Auth0';
      button.disabled = false;
    }
  });
}

// Logout button
const logoutBtn = document.getElementById('logout-button');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    const button = document.getElementById('logout-button');
    button.textContent = 'Logging out...';
    button.disabled = true;

    try {
      // Send message to background script to trigger logout
      await chrome.runtime.sendMessage({ type: 'AUTH0_LOGOUT' });
      alert('✅ Logged out successfully!');
      updateAuthUI();
      loadStats();
    } catch (error) {
      alert('❌ Logout error!\n\nError: ' + error.message);
    } finally {
      button.textContent = 'Logout';
      button.disabled = false;
    }
  });
}

// Update UI based on authentication status
async function updateAuthUI() {
  try {
    const isAuthenticated = await chrome.runtime.sendMessage({ type: 'IS_AUTHENTICATED' });
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');
    const userInfo = document.getElementById('user-info');

    if (isAuthenticated.authenticated) {
      loginButton.style.display = 'none';
      logoutButton.style.display = 'block';
      if (isAuthenticated.userInfo) {
        userInfo.textContent = `Logged in as: ${isAuthenticated.userInfo.email}`;
        userInfo.style.display = 'block';
      }
    } else {
      loginButton.style.display = 'block';
      logoutButton.style.display = 'none';
      userInfo.style.display = 'none';
    }
  } catch (error) {
    console.error('Failed to update auth UI:', error);
  }
}

// Update auth UI on load
updateAuthUI();

// Settings link
document.getElementById('settings-link').addEventListener('click', (e) => {
  e.preventDefault();
  // Scroll to settings
  document.querySelector('.settings-section').scrollIntoView({ behavior: 'smooth' });
});

// Load user email
async function loadEmail() {
  chrome.storage.local.get(['userEmail'], (result) => {
    if (result.userEmail) {
      document.getElementById('user-email').value = result.userEmail;
    }
  });
}

// Save user email
document.getElementById('save-email').addEventListener('click', () => {
  const email = document.getElementById('user-email').value.trim();
  const status = document.getElementById('save-status');
  
  if (!email) {
    status.textContent = 'Please enter a valid email';
    status.style.color = '#dc2626';
    return;
  }
  
  chrome.storage.local.set({ userEmail: email }, () => {
    status.textContent = 'Email saved successfully!';
    status.style.color = '#10b981';
    
    // Clear status after 2 seconds
    setTimeout(() => {
      status.textContent = '';
    }, 2000);
  });
});

// Load stats and email on popup open
loadStats();
loadEmail();

// Refresh stats every 2 seconds while popup is open
setInterval(loadStats, 2000);
