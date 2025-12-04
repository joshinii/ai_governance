/**
 * Dynamic configuration loader for browser extension
 * Loads configuration from Chrome storage (user-configurable) with fallback to hardcoded defaults
 * Allows users to configure API URLs, Auth0 credentials, etc. without modifying code
 */

/**
 * Load configuration from Chrome storage
 * Returns user-configured values if available, otherwise returns defaults
 * @returns {Promise<Object>} Configuration object with all required settings
 */
export async function loadConfig() {
  try {
    // Try to load from chrome.storage.sync (user settings)
    const stored = await chrome.storage.sync.get('extensionConfig');

    if (stored.extensionConfig && isValidConfig(stored.extensionConfig)) {
      console.log('[Config] Loaded user configuration from chrome.storage');
      return stored.extensionConfig;
    }
  } catch (error) {
    console.warn('[Config] Failed to load from chrome.storage:', error);
  }

  // Fallback to default configuration
  return getDefaultConfig();
}

/**
 * Get default configuration
 * Returns hardcoded defaults that match config.js
 * @returns {Object} Default configuration object
 */
export function getDefaultConfig() {
  // Hardcoded defaults (should match config.js)
  // Content scripts get config from background, not from config.js directly
  return {
    API_URL: 'https://sunshineless-beckett-axial.ngrok-free.dev',
    DASHBOARD_URL: 'https://articulative-protozoonal-emersyn.ngrok-free.dev',
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

/**
 * Validate that configuration has all required fields
 * @param {Object} config - Configuration object to validate
 * @returns {boolean} True if config is valid
 */
export function isValidConfig(config) {
  const required = ['API_URL', 'AUTH0_DOMAIN', 'AUTH0_CLIENT_ID', 'AUTH0_API_AUDIENCE'];

  for (const field of required) {
    if (!config[field] || typeof config[field] !== 'string' || config[field].trim() === '') {
      console.warn(`[Config] Invalid config: missing or empty "${field}"`);
      return false;
    }
  }

  // Validate URL format
  try {
    new URL(config.API_URL);
    new URL(`https://${config.AUTH0_DOMAIN}`);
    new URL(config.AUTH0_API_AUDIENCE);
  } catch (error) {
    console.warn('[Config] Invalid config: invalid URL format:', error);
    return false;
  }

  return true;
}

/**
 * Save configuration to Chrome storage
 * @param {Object} config - Configuration object to save
 * @returns {Promise<void>}
 */
export async function saveConfig(config) {
  if (!isValidConfig(config)) {
    throw new Error('Invalid configuration: missing required fields or invalid URLs');
  }

  try {
    await chrome.storage.sync.set({ extensionConfig: config });
    console.log('[Config] Configuration saved to chrome.storage');
  } catch (error) {
    console.error('[Config] Failed to save configuration:', error);
    throw error;
  }
}

/**
 * Reset configuration to defaults
 * @returns {Promise<void>}
 */
export async function resetConfig() {
  try {
    await chrome.storage.sync.remove('extensionConfig');
    console.log('[Config] Configuration reset to defaults');
  } catch (error) {
    console.error('[Config] Failed to reset configuration:', error);
    throw error;
  }
}

/**
 * Get configuration from background script
 * Useful for content scripts that need current config
 * @returns {Promise<Object>} Configuration object
 */
export async function getConfigFromBackground() {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(
        { type: 'GET_CONFIG' },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(response);
          }
        }
      );
    } catch (error) {
      reject(error);
    }
  });
}

// Export the configuration object itself for backward compatibility
let cachedConfig = null;

/**
 * Get and cache configuration
 * Caches the config object for performance
 * @returns {Promise<Object>} Configuration object
 */
export async function getConfig() {
  if (cachedConfig) {
    return cachedConfig;
  }

  cachedConfig = await loadConfig();
  return cachedConfig;
}

/**
 * Invalidate configuration cache
 * Call this after updating config to refresh cache
 */
export function invalidateConfigCache() {
  cachedConfig = null;
}
