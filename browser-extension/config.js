/**
 * Configuration for the extension
 * IMPORTANT: These are default values. Users can override them in the popup settings.
 * Configuration is stored in chrome.storage.sync and can be modified without reloading the extension.
 *
 * To change settings:
 * 1. Click the extension icon in Chrome
 * 2. Click "Show Configuration"
 * 3. Update Backend API URL, Auth0 Domain, Client ID, and API Audience
 * 4. Click "Save Configuration"
 * 5. Changes apply immediately to all tabs
 */

const CONFIG = {
  // Backend API URL - Update in popup settings, not here
  API_URL: 'https://ai-governance.fly.dev',

  // Auth0 Configuration - Update in popup settings, not here
  AUTH0_DOMAIN: 'dev-y75lecimhanaeqy7.us.auth0.com',
  AUTH0_CLIENT_ID: 'WhzBlOdMwksEotPnSN7y7OJktRnUzi3u',
  AUTH0_API_AUDIENCE: 'https://ai-governance.fly.dev',

  // Feature flags
  FEATURES: {
    PII_DETECTION: true,
    PROMPT_VARIANTS: true,
    USAGE_LOGGING: true,
    PROMPT_HISTORY: true
  },

  // Supported AI tools
  AI_TOOLS: {
    'chat.openai.com': 'chatgpt',
    'chatgpt.com': 'chatgpt',
    'claude.ai': 'claude',
    'gemini.google.com': 'gemini',
    'copilot.microsoft.com': 'copilot'
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}

// Export as ES module
export default CONFIG;
