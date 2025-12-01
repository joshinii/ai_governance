/**
 * Content script for Google Gemini
 * Uses shared ContentCore
 */

const config = CONFIG;

const PLATFORM_CONFIG = {
  name: 'gemini',
  selectors: {
    // Gemini uses a contenteditable div
    // Try multiple selectors for better compatibility
    input: 'rich-textarea div[contenteditable="true"], div.ql-editor[contenteditable="true"], div[contenteditable="true"][role="textbox"], div[contenteditable="true"]',
    // Send button variations
    sendButton: 'button[aria-label*="Send"], button[aria-label*="submit"], button.send-button, button[type="submit"]'
  }
};

const core = new ContentCore(PLATFORM_CONFIG);
