/**
 * Content script for ChatGPT
 * Uses shared ContentCore
 */

const config = CONFIG; // Loaded from config.js

// Platform specific configuration
const PLATFORM_CONFIG = {
  name: 'chatgpt',
  selectors: {
    // ChatGPT specific selectors
    input: '#prompt-textarea',
    sendButton: 'button[data-testid="send-button"]'
  }
};

// Initialize
const core = new ContentCore(PLATFORM_CONFIG);