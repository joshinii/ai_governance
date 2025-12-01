/**
 * Content script for Claude
 * Uses shared ContentCore
 */

const config = CONFIG;

const PLATFORM_CONFIG = {
  name: 'claude',
  selectors: {
    // Claude uses contenteditable divs
    input: 'div[contenteditable="true"][enterkeyhint="enter"], fieldset div[contenteditable="true"], div[contenteditable="true"]',
    // Claude send button
    sendButton: 'button[aria-label*="Send"], button[aria-label*="send"], button:has(svg)'
  }
};

const core = new ContentCore(PLATFORM_CONFIG);
