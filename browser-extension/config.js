const CONFIG = {
  // Backend API URL - Update in popup settings, not here
  API_URL: 'https://sunshineless-beckett-axial.ngrok-free.dev',

  // Frontend Dashboard URL - Update in popup settings, not here
  DASHBOARD_URL: 'https://articulative-protozoonal-emersyn.ngrok-free.dev',

  // Auth0 Configuration - Update in popup settings, not here
  AUTH0_DOMAIN: 'dev-y75lecimhanaeqy7.us.auth0.com',
  AUTH0_CLIENT_ID: 'WhzBlOdMwksEotPnSN7y7OJktRnUzi3u',
  AUTH0_API_AUDIENCE: 'https://sunshineless-beckett-axial.ngrok-free.dev',

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

// Export as ES module for service worker
// Service worker has "type": "module" in manifest.json, so it can import this file
// Content scripts should NOT load this file - they get config from background via messaging
export default CONFIG;
