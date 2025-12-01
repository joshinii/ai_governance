// Configuration is loaded from config.js (global CONFIG object)
// If CONFIG is not available, use these fallback defaults
let config = null;

// Load config from background script or use global CONFIG
async function initializeConfig() {
  try {
    // Try to get config from background script (handles user overrides in chrome.storage)
    const response = await chrome.runtime.sendMessage({ type: 'GET_CONFIG' });
    config = {
      ...response,
      API_KEY: 'dev-secret-key-change-in-production',
      USER_EMAIL: 'joshini.mn@gmail.com',
      ORG_ID: 1
    };
  } catch (error) {
    // Fallback to global CONFIG if available
    if (typeof CONFIG !== 'undefined') {
      config = {
        ...CONFIG,
        API_KEY: 'dev-secret-key-change-in-production',
        USER_EMAIL: 'joshini.mn@gmail.com',
        ORG_ID: 1
      };
    } else {
      // Last resort defaults
      config = {
        API_URL: 'https://sunshineless-beckett-axial.ngrok-free.dev',
        API_KEY: 'dev-secret-key-change-in-production',
        USER_EMAIL: 'joshini.mn@gmail.com',
        ORG_ID: 1,
        FEATURES: {
          PII_DETECTION: true,
          PROMPT_VARIANTS: true,
          USAGE_LOGGING: true,
          PROMPT_HISTORY: true
        }
      };
    }
  }
}

// Initialize config immediately
initializeConfig();

console.log('[AI Governance] ChatGPT monitor active');

// Generate session ID for tracking
const SESSION_ID = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Flag to prevent multiple simultaneous interceptions
let isIntercepting = false;
let lastProcessedPrompt = null;
let lastProcessedTime = 0;

// PII Detection
class PIIDetector {
  constructor() {
    this.patterns = {
      email: {
        regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        type: 'Email Address',
        risk: 'high'
      },
      phone: {
        regex: /\b(\+\d{1,3}[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}\b/g,
        type: 'Phone Number',
        risk: 'high'
      },
      ssn: {
        regex: /\b\d{3}-\d{2}-\d{4}\b/g,
        type: 'Social Security Number',
        risk: 'high'
      },
      creditCard: {
        regex: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
        type: 'Credit Card Number',
        risk: 'high'
      }
    };
  }

  detect(text) {
    const findings = [];
    let riskLevel = 'low';

    for (const [key, pattern] of Object.entries(this.patterns)) {
      const matches = text.match(pattern.regex);
      if (matches && matches.length > 0) {
        findings.push({
          type: pattern.type,
          count: matches.length,
          risk: pattern.risk
        });
        if (pattern.risk === 'high') {
          riskLevel = 'high';
        }
      }
    }

    return {
      hasPII: findings.length > 0,
      riskLevel: riskLevel,
      findings: findings,
      summary: findings.length > 0 
        ? `Detected: ${findings.map(f => f.type).join(', ')}`
        : 'No PII detected'
    };
  }
}

// Prompt Analyzer
class PromptAnalyzer {
  analyze(prompt) {
    const wordCount = prompt.split(/\s+/).length;
    const hasVague = /\b(something|things?|stuff|good|bad)\b/i.test(prompt);
    const hasOutputFormat = /\b(format|structure|organize|list|table|json|csv)\b/i.test(prompt);
    const hasLength = /\b(brief|detailed|short|long|paragraph|sentences?|words?)\b/i.test(prompt);
    const hasContext = /\b(context|background|for|because|in order to)\b/i.test(prompt);
    
    let promptType = 'general';
    if (/\b(write|code|function|script|program)\b/i.test(prompt)) {
      promptType = 'code_generation';
    } else if (/\b(write|story|essay|article|blog)\b/i.test(prompt)) {
      promptType = 'creative_writing';
    } else if (/\b(analyze|explain|compare|evaluate)\b/i.test(prompt)) {
      promptType = 'analysis';
    } else if (/\b(summarize|overview|tldr)\b/i.test(prompt)) {
      promptType = 'summarization';
    }
    
    let qualityScore = 100;
    if (hasVague) qualityScore -= 15;
    if (!hasOutputFormat) qualityScore -= 15;
    if (!hasLength) qualityScore -= 10;
    if (!hasContext && wordCount < 15) qualityScore -= 10;
    if (wordCount < 5) qualityScore -= 20;
    
    return {
      word_count: wordCount,
      has_vague_language: hasVague,
      has_output_format: hasOutputFormat,
      has_length_constraint: hasLength,
      has_context: hasContext,
      prompt_type: promptType,
      quality_score: Math.max(0, qualityScore)
    };
  }
}

// API Client
class APIClient {
  constructor(config) {
    this.baseURL = config.API_URL;
    this.apiKey = config.API_KEY;
    this.userEmail = config.USER_EMAIL;
  }

  async _request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
      ...options.headers
    };

    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    return response.json();
  }

  async logUsage(data) {
    return this._request('/usage-logs/', {
      method: 'POST',
      body: JSON.stringify({
        user_email: this.userEmail,
        tool: data.tool,
        prompt_hash: data.promptHash,
        risk_level: data.riskLevel || 'low'
      })
    });
  }

  async getPromptVariants(originalPrompt, context) {
    const params = new URLSearchParams({
      original_prompt: originalPrompt,
      context: context || 'general'
    });
    return this._request(`/prompt-variants/?${params}`, { method: 'POST' });
  }

  async logPromptHistory(data) {
    return this._request('/prompt-history/', {
      method: 'POST',
      body: JSON.stringify({
        user_email: this.userEmail,
        original_prompt: data.originalPrompt,
        final_prompt: data.finalPrompt,
        tool: data.tool,
        variants_offered: data.variantsOffered,
        variant_selected: data.variantSelected,
        original_score: data.originalScore,
        final_score: data.finalScore,
        had_pii: data.hadPII,
        pii_types: data.piiTypes,
        session_id: SESSION_ID
      })
    });
  }

  async logPromptLog(data) {
    return this._request('/prompt-logs/', {
      method: 'POST',
      body: JSON.stringify({
        user_email: this.userEmail,
        original_prompt: data.originalPrompt,
        chosen_variant: data.chosenVariant,
        variants: data.variants,
        variant_index: data.variantIndex,
        improvement_score: data.improvementScore
      })
    });
  }

  async createAlert(data) {
    return this._request('/alerts', {
      method: 'POST',
      body: JSON.stringify({
        user_email: this.userEmail,
        violation_type: data.violationType,
        details: data.details
      })
    });
  }

  async hashPrompt(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

const piiDetector = new PIIDetector();
const promptAnalyzer = new PromptAnalyzer();
const apiClient = new APIClient(config);

function getPromptInput() {
  return document.querySelector('#prompt-textarea') ||
         document.querySelector('div[contenteditable="true"]') ||
         document.querySelector('textarea');
}

function getInputText(element) {
  if (!element) return '';
  if (element.tagName === 'TEXTAREA') {
    return element.value;
  }
  return element.innerText || element.textContent || '';
}

function setInputText(element, text) {
  if (!element) return;
  if (element.tagName === 'TEXTAREA') {
    element.value = text;
  } else {
    element.innerText = text;
  }
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

function getSendButton() {
  // Look for the send button specifically
  const sendBtn = document.querySelector('button[data-testid="send-button"]') ||
                  document.getElementById('composer-submit-button') ||
                  document.querySelector('button[aria-label="Send prompt"]');
  
  if (sendBtn && sendBtn.offsetParent !== null) {
    return sendBtn;
  }
  
  return null;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// PII Alert Modal
function showPIIAlert(piiResult) {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.id = 'ai-gov-pii-alert';
    
    const style = document.createElement('style');
    style.textContent = `
      #ai-gov-pii-alert {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999999;
      }
      #ai-gov-pii-alert .alert-box {
        background: white;
        padding: 32px;
        border-radius: 12px;
        max-width: 500px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.4);
      }
      #ai-gov-pii-alert h2 {
        color: #dc2626;
        margin: 0 0 16px 0;
        font-size: 24px;
      }
      #ai-gov-pii-alert p {
        margin: 0 0 16px 0;
        line-height: 1.6;
        color: #1f2937;
      }
      #ai-gov-pii-alert .pii-list {
        background: #fef2f2;
        border: 1px solid #fecaca;
        padding: 12px;
        border-radius: 8px;
        margin-bottom: 20px;
      }
      #ai-gov-pii-alert button {
        width: 100%;
        padding: 12px;
        background: #dc2626;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
      }
      #ai-gov-pii-alert button:hover {
        background: #b91c1c;
      }
    `;
    modal.appendChild(style);
    
    const alertBox = document.createElement('div');
    alertBox.className = 'alert-box';
    alertBox.innerHTML = `
      <h2>⚠️ PII Detected!</h2>
      <p>We detected sensitive information in your prompt:</p>
      <div class="pii-list">
        ${piiResult.findings.map(f => `<div>• ${f.type}</div>`).join('')}
      </div>
      <p>Please remove this sensitive information before submitting.</p>
    `;
    
    const okBtn = document.createElement('button');
    okBtn.textContent = 'OK, I understand';
    okBtn.addEventListener('click', () => {
      console.log('[AI Governance] PII alert closed');
      document.body.removeChild(modal);
      resolve();
    });
    
    alertBox.appendChild(okBtn);
    modal.appendChild(alertBox);
    
    // Close on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        console.log('[AI Governance] PII alert closed (overlay)');
        document.body.removeChild(modal);
        resolve();
      }
    });
    
    document.body.appendChild(modal);
  });
}

// Variant Modal
async function showVariantModal(data) {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.id = 'ai-gov-modal';
    
    const style = document.createElement('style');
    style.textContent = `
      #ai-gov-modal { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 999999; }
      #ai-gov-modal .overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.7); display: flex; align-items: center; justify-content: center; }
      #ai-gov-modal .modal-content { background: white; border-radius: 12px; width: 90%; max-width: 700px; max-height: 85vh; overflow-y: auto; padding: 24px; position: relative; box-shadow: 0 20px 60px rgba(0,0,0,0.4); }
      #ai-gov-modal .close-btn { position: absolute; top: 16px; right: 16px; width: 32px; height: 32px; border-radius: 6px; background: #f3f4f6; color: #666; font-size: 24px; line-height: 1; cursor: pointer; transition: all 0.2s; border: none; }
      #ai-gov-modal .close-btn:hover { background: #e5e7eb; color: #1a1a1a; }
      #ai-gov-modal h2 { margin: 0 40px 20px 0; font-size: 24px; font-weight: 700; color: #1a1a1a; }
      #ai-gov-modal .original-prompt { margin-bottom: 24px; padding: 12px 16px; background: #fffbeb; border: 1px solid #fbbf24; border-radius: 8px; }
      #ai-gov-modal .variant { margin-bottom: 16px; padding: 16px; border: 2px solid #e5e7eb; border-radius: 10px; }
      #ai-gov-modal .variant-text { padding: 12px 16px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; margin: 8px 0; line-height: 1.6; }
      #ai-gov-modal button { width: 100%; padding: 12px; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px; transition: all 0.2s; }
      #ai-gov-modal .select-btn { background: #2563eb; color: white; margin-top: 12px; }
      #ai-gov-modal .select-btn:hover { background: #1d4ed8; }
      #ai-gov-modal .keep-original-btn { background: #f3f4f6; color: #374151; margin-top: 8px; }
    `;
    modal.appendChild(style);
    
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    
    const content = document.createElement('div');
    content.className = 'modal-content';
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-btn';
    closeBtn.innerHTML = '×';
    closeBtn.addEventListener('click', () => {
      console.log('[AI Governance] Modal closed');
      document.body.removeChild(modal);
      resolve({ chosen: data.originalPrompt, index: -1 });
    });
    content.appendChild(closeBtn);
    
    const header = document.createElement('h2');
    header.textContent = '✨ Improve Your Prompt';
    content.appendChild(header);
    
    const originalDiv = document.createElement('div');
    originalDiv.className = 'original-prompt';
    originalDiv.innerHTML = `<strong>Original:</strong><br>${escapeHtml(data.originalPrompt)}`;
    content.appendChild(originalDiv);
    
    data.variants.forEach((variant, index) => {
      const variantDiv = document.createElement('div');
      variantDiv.className = 'variant';
      variantDiv.innerHTML = `
        <div style="margin-bottom:8px;"><strong>Variant ${index + 1}</strong> (Score: ${variant.score}/100)</div>
        <div class="variant-text">${escapeHtml(variant.text)}</div>
        <div style="font-size:12px;color:#666;margin:8px 0;">${variant.improvements.map(i => `✓ ${i}`).join(' • ')}</div>
      `;
      
      const selectBtn = document.createElement('button');
      selectBtn.className = 'select-btn';
      selectBtn.textContent = 'Use This Version';
      selectBtn.addEventListener('click', () => {
        console.log('[AI Governance] Variant selected:', index);
        document.body.removeChild(modal);
        resolve({ chosen: variant.text, index: index, score: variant.score });
      });
      variantDiv.appendChild(selectBtn);
      content.appendChild(variantDiv);
    });
    
    const keepBtn = document.createElement('button');
    keepBtn.className = 'keep-original-btn';
    keepBtn.textContent = 'Keep Original';
    keepBtn.addEventListener('click', () => {
      console.log('[AI Governance] Keeping original');
      document.body.removeChild(modal);
      resolve({ chosen: data.originalPrompt, index: -1 });
    });
    content.appendChild(keepBtn);
    
    overlay.appendChild(content);
    modal.appendChild(overlay);
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        console.log('[AI Governance] Modal closed (overlay)');
        document.body.removeChild(modal);
        resolve({ chosen: data.originalPrompt, index: -1 });
      }
    });
    
    document.body.appendChild(modal);
  });
}

// Main interception function
async function interceptPrompt(event) {
  // Prevent multiple simultaneous interceptions
  if (isIntercepting) {
    console.log('[AI Governance] Already intercepting, ignoring duplicate event');
    return;
  }
  
  const input = getPromptInput();
  if (!input) {
    console.log('[AI Governance] No input found');
    return;
  }

  const originalPrompt = getInputText(input).trim();
  if (!originalPrompt) {
    console.log('[AI Governance] Empty prompt');
    return;
  }

  // ADD THIS: Check if we just processed this exact prompt
  const now = Date.now();
  if (originalPrompt === lastProcessedPrompt && (now - lastProcessedTime) < 2000) {
    console.log('[AI Governance] Already processed this prompt recently, allowing through');
    return; // Don't prevent default - let it go through
  }

  // Prevent default and stop propagation
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  // Set flag
  isIntercepting = true;
  console.log('[AI Governance] Intercepting prompt:', originalPrompt.substring(0, 30) + '...');

  try {
    // Analyze original prompt
    const originalAnalysis = promptAnalyzer.analyze(originalPrompt);
    const originalScore = originalAnalysis.quality_score;
    
    // Check PII
    const piiResult = piiDetector.detect(originalPrompt);
    console.log('[AI Governance] PII check:', piiResult);
    
    if (config.FEATURES.PII_DETECTION && piiResult.hasPII && piiResult.riskLevel === 'high') {
      console.log('[AI Governance] High-risk PII detected, showing alert');
      
      // Show PII alert modal
      await showPIIAlert(piiResult);
      
      // Log alert
      try {
        await apiClient.createAlert({
          violationType: 'pii_detected',
          details: {
            tool: 'chatgpt',
            piiTypes: piiResult.findings.map(f => f.type),
            riskLevel: piiResult.riskLevel
          }
        });
      } catch (error) {
        console.error('[AI Governance] Failed to log alert:', error);
      }
      
      chrome.runtime.sendMessage({ type: 'PII_BLOCKED' });
      
      // Reset flag and return (don't submit)
      isIntercepting = false;
      console.log('[AI Governance] Prompt blocked due to PII');
      return;
    }

    let chosenPrompt = originalPrompt;
    let variantIndex = -1;
    let finalScore = originalScore;
    let variantsOffered = null;

    // Get variants
    if (config.FEATURES.PROMPT_VARIANTS && originalPrompt.length > 10) {
      try {
        console.log('[AI Governance] Fetching variants...');
        const variantData = await apiClient.getPromptVariants(originalPrompt, 'chatgpt');
        console.log('[AI Governance] Variants received:', variantData.variants.length);
        
        variantsOffered = variantData.variants;
        
        const selection = await showVariantModal({
          originalPrompt: originalPrompt,
          variants: variantData.variants
        });

        chosenPrompt = selection.chosen;
        variantIndex = selection.index;
        finalScore = selection.score || originalScore;

        if (chosenPrompt !== originalPrompt) {
          setInputText(input, chosenPrompt);
          chrome.runtime.sendMessage({ type: 'VARIANT_USED' });
        }
      } catch (error) {
        console.error('[AI Governance] Variant error:', error);
      }
    }

    // Log complete prompt history
    if (config.FEATURES.PROMPT_HISTORY) {
      try {
        await apiClient.logPromptHistory({
          originalPrompt: originalPrompt,
          finalPrompt: chosenPrompt,
          tool: 'chatgpt',
          variantsOffered: variantsOffered,
          variantSelected: variantIndex,
          originalScore: originalScore,
          finalScore: finalScore,
          hadPII: piiResult.hasPII,
          piiTypes: piiResult.hasPII ? piiResult.findings.map(f => f.type) : null
        });
        console.log('[AI Governance] Prompt history logged');
      } catch (error) {
        console.error('[AI Governance] History logging error:', error);
      }
    }

    // ALSO log to prompt_logs for analytics (if variant was offered)
    if (variantsOffered && variantsOffered.length > 0) {
      try {
        await apiClient.logPromptLog({
          originalPrompt: originalPrompt,
          chosenVariant: chosenPrompt,
          variants: variantsOffered,
          variantIndex: variantIndex,
          improvementScore: finalScore - originalScore
        });
        console.log('[AI Governance] Prompt log recorded');
      } catch (error) {
        console.error('[AI Governance] Prompt log error:', error);
      }
    }

    // Log usage
    if (config.FEATURES.USAGE_LOGGING) {
      const promptHash = await apiClient.hashPrompt(chosenPrompt);
      await apiClient.logUsage({
        tool: 'chatgpt',
        promptHash: promptHash,
        riskLevel: piiResult.riskLevel
      });
      chrome.runtime.sendMessage({ type: 'PROMPT_MONITORED' });
    }
    // Update last processed
    lastProcessedPrompt = chosenPrompt;
    lastProcessedTime = Date.now();

    // Submit - Find send button at submission time
    setTimeout(() => {
      // Look for the send button (after typing, it should have changed from voice mode)
      const sendBtn = document.querySelector('button[data-testid="send-button"]') ||
                      document.getElementById('composer-submit-button') ||
                      document.querySelector('button[aria-label="Send prompt"]');
      
      if (sendBtn) {
        console.log('[AI Governance] Submitting via:', sendBtn.getAttribute('aria-label') || sendBtn.id);
        sendBtn.click();
      } else {
        console.error('[AI Governance] Send button not found after processing!');
        
        // Fallback: try to find any button with "send" in label
        const buttons = Array.from(document.querySelectorAll('button'));
        const fallbackBtn = buttons.find(b => {
          const label = (b.getAttribute('aria-label') || '').toLowerCase();
          return label.includes('send') && b.offsetParent !== null;
        });
        
        if (fallbackBtn) {
          console.log('[AI Governance] Using fallback button');
          fallbackBtn.click();
        } else {
          console.error('[AI Governance] No send button found at all!');
        }
      }
    }, 100);

  } catch (error) {
    console.error('[AI Governance] Error:', error);
    // On error, try to submit anyway
    const sendBtn = document.querySelector('button[data-testid="send-button"]') ||
                    document.getElementById('composer-submit-button');
    if (sendBtn) sendBtn.click();
  } finally {
    // Always reset flag
    isIntercepting = false;
  }
}

function initialize() {
  console.log('[AI Governance] Initializing...');

  // Log what we're finding
  const input = getPromptInput();
  const sendBtn = getSendButton();
  console.log('[AI Governance] Found input:', !!input);
  console.log('[AI Governance] Found send button:', !!sendBtn);

  document.addEventListener('click', (event) => {
    const target = event.target.closest('button');
    if (target) {
      const sendBtn = getSendButton();
      if (sendBtn === target) {
        console.log('[AI Governance] Send button clicked');
        const input = getPromptInput();
        const text = getInputText(input);
        console.log('[AI Governance] Prompt text:', text ? text.substring(0, 30) + '...' : 'empty');
        if (input && text.trim()) {
          interceptPrompt(event);
        }
      }
    }
  }, true);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      const input = getPromptInput();
      if (input && document.activeElement === input) {
        const text = getInputText(input);
        if (text.trim()) {
          console.log('[AI Governance] Enter pressed with text');
          interceptPrompt(event);
        }
      }
    }
  }, true);

  console.log('[AI Governance] Initialized');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}