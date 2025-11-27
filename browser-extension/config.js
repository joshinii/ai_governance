/**
 * Configuration for the extension
 * Update these values based on your backend deployment
 */

const CONFIG = {
  // Backend API URL
  API_URL: 'http://localhost:8000',
  
  // API Key for authentication
  API_KEY: 'dev-secret-key-change-in-production',
  
  // User email (in production, get from SSO or login)
  // For POC, set this to test user email
  USER_EMAIL: 'joshini.mn@gmail.com',
  
  // Organization ID
  ORG_ID: 1,
  
  // Feature flags
  FEATURES: {
    PII_DETECTION: true,
    PROMPT_VARIANTS: true,
    USAGE_LOGGING: true
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
