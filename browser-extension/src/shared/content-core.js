/**
 * Core logic for AI Governance extension
 * Handles interception, PII detection, and UI coordination
 * Shared across all platform-specific content scripts
 */

class ContentCore {
  constructor(platformConfig) {
    this.platform = platformConfig;
    this.config = CONFIG; // Assumes config.js is loaded
    this.piiDetector = new PIIDetector();
    this.apiClient = new APIClient(this.config);
    this.variantModal = new VariantModal();
    
    // State
    this.isIntercepting = false;
    this.isProgrammaticTrigger = false;
    this.lastProcessedPrompt = null;
    this.lastProcessedTime = 0;
    
    this.initialize();
  }

  initialize() {
    console.log(`[AI Governance] Initializing for ${this.platform.name}...`);
    
    // Load user email from settings
    this._loadUserEmail();

    // Attach event listeners
    this._attachListeners();
    
    console.log(`[AI Governance] ${this.platform.name} monitor active`);
  }

  async _loadUserEmail() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['userEmail'], (result) => {
        if (result.userEmail) {
          console.log('[AI Governance] Loaded user email:', result.userEmail);
          this.apiClient.userEmail = result.userEmail;
        }
      });
    }
  }

  _attachListeners() {
    // Listen for storage changes (e.g. user email update)
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes.userEmail) {
          console.log('[AI Governance] User email updated:', changes.userEmail.newValue);
          this.apiClient.userEmail = changes.userEmail.newValue;
        }
      });
    }

    // Click listener for send buttons
    document.addEventListener('click', (event) => {
      // Check if clicked element or parent matches send button selector
      const target = event.target.closest(this.platform.selectors.sendButton);
      if (target) {
        console.log('[AI Governance] Send button clicked');
        this._handleInteraction(event);
      }
    }, true); // Capture phase

    // Keydown listener for Enter key
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        const input = this._getInput();
        if (input && document.activeElement === input) {
          console.log('[AI Governance] Enter pressed in input');
          this._handleInteraction(event);
        }
      }
    }, true); // Capture phase
  }

  _getInput() {
    // Try each platform-specific selector (may be comma-separated list)
    const selectors = this.platform.selectors.input.split(',').map(s => s.trim());
    
    for (const selector of selectors) {
      try {
        const input = document.querySelector(selector);
        if (input) {
          return input;
        }
      } catch (e) {
        // Invalid selector, continue to next
        console.debug(`[AI Governance] Invalid selector: ${selector}`);
      }
    }
    
    // Fallback to common selectors if not found
    return document.querySelector('div[contenteditable="true"]') || 
           document.querySelector('textarea');
  }

  _getInputText(element) {
    if (!element) return '';
    if (element.tagName === 'TEXTAREA') {
      return element.value;
    }
    // For contenteditable divs
    return element.innerText || element.textContent || '';
  }

  _setInputText(element, text) {
    if (!element) return;
    
    if (element.tagName === 'TEXTAREA') {
      element.value = text;
    } else {
      element.innerText = text;
    }
    
    // Trigger input events to notify frameworks (React, etc)
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  async _handleInteraction(event) {
    if (this.isIntercepting) return;

    const input = this._getInput();
    if (!input) return;

    const originalPrompt = this._getInputText(input).trim();
    if (!originalPrompt) return;

    // Check for duplicate processing (debounce)
    const now = Date.now();
    // If we are programmatically triggering, skip interception
    if (this.isProgrammaticTrigger) {
        this.isProgrammaticTrigger = false;
        return;
    }

    if (originalPrompt === this.lastProcessedPrompt && (now - this.lastProcessedTime) < 2000) {
      console.log('[AI Governance] Skipping duplicate prompt');
      return;
    }

    // Stop the event immediately
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    this.isIntercepting = true;
    console.log('[AI Governance] Intercepting prompt...');

    try {
      await this._processPrompt(input, originalPrompt);
    } catch (error) {
      console.error('[AI Governance] Error processing prompt:', error);
      // On error, try to submit anyway to not block user
      this._submitOriginal(event);
    } finally {
      this.isIntercepting = false;
    }
  }

  async _processPrompt(input, originalPrompt) {
    // 1. PII Detection
    const piiResult = this.piiDetector.detect(originalPrompt);
    console.log('[AI Governance] PII Result:', piiResult);

    if (this.config.FEATURES.PII_DETECTION && piiResult.hasPII && piiResult.riskLevel === 'high') {
      await this._handlePII(piiResult);
      return; // Stop processing
    }

    // 2. Prompt Improvement (if enabled)
    let finalPrompt = originalPrompt;
    let variantsOffered = null;
    let variantSelected = -1;

    if (this.config.FEATURES.PROMPT_VARIANTS && originalPrompt.length > 10) {
      try {
        // Show loading modal immediately
        this.variantModal.showLoading();
        
        const variantData = await this.apiClient.getPromptVariants(originalPrompt, this.platform.name);
        
        if (variantData && variantData.variants && variantData.variants.length > 0) {
          // Update modal with variants
          const selection = await this.variantModal.show({
            originalPrompt: originalPrompt,
            variants: variantData.variants
          });
          
          // If user chose a variant (selection is the text string)
          if (selection && selection !== originalPrompt) {
            finalPrompt = selection;
            this._setInputText(input, finalPrompt);
            
            // Find index
            variantSelected = variantData.variants.findIndex(v => v.text === selection);
          }
          variantsOffered = variantData.variants;
        } else {
            // If no variants, close loading
            this.variantModal.close();
        }
      } catch (error) {
        console.warn('[AI Governance] Failed to get variants:', error);
        this.variantModal.close();
      }
    }

    // 3. Log Usage & History
    this._logInteraction(originalPrompt, finalPrompt, piiResult, variantsOffered, variantSelected);

    // 4. Submit
    this.lastProcessedPrompt = finalPrompt;
    this.lastProcessedTime = Date.now();
    
    // Small delay to ensure UI updates
    setTimeout(() => {
      this._triggerSend();
    }, 100);
  }

  async _handlePII(piiResult) {
    // Show Alert
    await this._showPIIAlert(piiResult);
    
    // Log Alert
    try {
      await this.apiClient.createAlert({
        violationType: 'pii_detected',
        details: {
          tool: this.platform.name,
          piiTypes: piiResult.findings.map(f => f.type),
          riskLevel: piiResult.riskLevel
        }
      });
    } catch (e) {
      console.error('Failed to log alert', e);
    }
  }

  _showPIIAlert(piiResult) {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.id = 'ai-gov-pii-alert';
      
      // Reusing styles from previous implementation, but ensuring visibility
      const style = document.createElement('style');
      style.textContent = `
        #ai-gov-pii-alert {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex; align-items: center; justify-content: center;
          z-index: 999999;
        }
        #ai-gov-pii-alert .alert-box {
          background: white; padding: 32px; border-radius: 12px;
          max-width: 500px; box-shadow: 0 20px 60px rgba(0,0,0,0.4);
        }
        #ai-gov-pii-alert h2 { color: #dc2626; margin: 0 0 16px 0; font-size: 24px; }
        #ai-gov-pii-alert p { margin: 0 0 16px 0; line-height: 1.6; color: #1f2937; }
        #ai-gov-pii-alert .pii-list {
          background: #fef2f2; border: 1px solid #fecaca;
          padding: 12px; border-radius: 8px; margin-bottom: 20px;
          color: #b91c1c; /* Dark red for visibility */
        }
        #ai-gov-pii-alert button {
          width: 100%; padding: 12px; background: #dc2626; color: white;
          border: none; border-radius: 8px; font-size: 16px; font-weight: 600;
          cursor: pointer;
        }
        #ai-gov-pii-alert button:hover { background: #b91c1c; }
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
        document.body.removeChild(modal);
        resolve();
      });
      
      alertBox.appendChild(okBtn);
      modal.appendChild(alertBox);
      document.body.appendChild(modal);
    });
  }

  async _logInteraction(original, final, piiResult, variants, selectedIndex) {
    console.error('='*80);
    console.error('[AI Governance] ===== _logInteraction CALLED =====');
    console.error('[AI Governance] Original:', original.substring(0, 50));
    console.error('[AI Governance] Final:', final.substring(0, 50));
    console.error('[AI Governance] Variants:', variants);
    console.error('[AI Governance] Selected Index:', selectedIndex);
    console.error('[AI Governance] Config:', {
        USAGE_LOGGING: this.config.FEATURES.USAGE_LOGGING, 
        PROMPT_HISTORY: this.config.FEATURES.PROMPT_HISTORY 
    });
    console.error('='*80);

    if (!this.config.FEATURES.USAGE_LOGGING) {
      console.error('[AI Governance] USAGE_LOGGING is false, returning early');
      return;
    }

    try {
      // Log History
      if (this.config.FEATURES.PROMPT_HISTORY) {
        console.error('[AI Governance] PROMPT_HISTORY is true, calling logPromptChoice');
        // Use logPromptChoice to store the interaction and the chosen prompt
        await this.apiClient.logPromptChoice({
          originalPrompt: original,
          chosenVariant: final, // 'final' is the text of the chosen variant (or original if unchanged)
          variants: variants || [], // variantsOffered
          variantIndex: selectedIndex // Pass the selected index
        });
        console.error('[AI Governance] logPromptChoice completed');
      } else {
        console.error('[AI Governance] PROMPT_HISTORY is false, skipping');
      }

      // Log Usage
      const hash = await this.apiClient.hashPrompt(final);
      await this.apiClient.logUsage({
        tool: this.platform.name,
        promptHash: hash,
        riskLevel: piiResult.riskLevel
      });
    } catch (e) {
      console.error('[AI Governance] Logging failed:', e);
    }
  }

  _triggerSend() {
    const sendBtn = document.querySelector(this.platform.selectors.sendButton);
    if (sendBtn) {
      console.log('[AI Governance] Triggering click on send button');
      this.isProgrammaticTrigger = true;
      sendBtn.click();
    } else {
      console.error('[AI Governance] Could not find send button to trigger');
    }
  }

  _submitOriginal(event) {
    // If we blocked the event, we might need to manually trigger the action
    // This is complex because we can't easily "resume" a blocked event
    // Best effort: trigger the send button
    this._triggerSend();
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ContentCore;
}
