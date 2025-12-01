/**
 * Configuration for the extension
 * Update these values based on your Auth0 and backend deployment
 */

const CONFIG = {
  // Backend API URL
  API_URL: 'https://blah-subsequent-personal-synthetic.trycloudflare.com',

  // Auth0 Configuration
  AUTH0_DOMAIN: 'dev-y75lecimhanaeqy7.us.auth0.com',
  AUTH0_CLIENT_ID: 'b2Q5VZ2pv4Ve8YralLn1dUtAHeEnpJGl',
  AUTH0_API_AUDIENCE: 'https://blah-subsequent-personal-synthetic.trycloudflare.com',

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
