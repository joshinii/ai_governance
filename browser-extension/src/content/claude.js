/**
 * Content script for Claude
 * Monitors and intercepts prompts on claude.ai
 */

const config = CONFIG;
const piiDetector = new PIIDetector();
const apiClient = new APIClient(config);
const variantModal = new VariantModal();

console.log('[AI Governance] Claude monitor active');

/**
 * Find the prompt input
 */
function getPromptInput() {
  // Claude uses a contenteditable div
  return document.querySelector('div[contenteditable="true"]') ||
         document.querySelector('textarea');
}

/**
 * Get text from contenteditable div
 */
function getInputText(element) {
  if (element.tagName === 'TEXTAREA') {
    return element.value;
  }
  return element.innerText || element.textContent || '';
}

/**
 * Set text in contenteditable div
 */
function setInputText(element, text) {
  if (element.tagName === 'TEXTAREA') {
    element.value = text;
  } else {
    element.innerText = text;
  }
  // Trigger input event
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * Find send button
 */
function getSendButton() {
  const buttons = Array.from(document.querySelectorAll('button'));
  return buttons.find(btn => {
    const text = btn.textContent.toLowerCase();
    const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
    return text.includes('send') || ariaLabel.includes('send');
  });
}

/**
 * Intercept prompt submission
 */
async function interceptPrompt(event) {
  const input = getPromptInput();
  if (!input) return;

  const originalPrompt = getInputText(input).trim();
  if (!originalPrompt) return;

  event.preventDefault();
  event.stopPropagation();

  try {
    // Check for PII
    if (config.FEATURES.PII_DETECTION) {
      const piiResult = piiDetector.detect(originalPrompt);
      
      if (piiResult.hasPII && piiResult.riskLevel === 'high') {
        alert(`⚠️ PII Detected!\n\n${piiResult.summary}\n\nPlease remove sensitive information before submitting.`);
        
        await apiClient.createAlert({
          violationType: 'pii_detected',
          details: {
            tool: 'claude',
            piiTypes: piiResult.findings.map(f => f.type),
            riskLevel: piiResult.riskLevel
          }
        });
        
        return;
      }
    }

    // Get prompt variants
    let chosenPrompt = originalPrompt;
    
    if (config.FEATURES.PROMPT_VARIANTS && originalPrompt.length > 10) {
      try {
        const variantData = await apiClient.getPromptVariants(originalPrompt, 'claude');
        
        chosenPrompt = await variantModal.show({
          originalPrompt: originalPrompt,
          variants: variantData.variants
        });

        await apiClient.logPromptChoice({
          originalPrompt: originalPrompt,
          chosenVariant: chosenPrompt,
          variants: variantData.variants.map(v => ({
            text: v.text,
            improvements: v.improvements
          }))
        });

        if (chosenPrompt !== originalPrompt) {
          setInputText(input, chosenPrompt);
        }
      } catch (error) {
        console.error('[AI Governance] Failed to get variants:', error);
      }
    }

    // Log usage
    if (config.FEATURES.USAGE_LOGGING) {
      const promptHash = await apiClient.hashPrompt(chosenPrompt);
      await apiClient.logUsage({
        tool: 'claude',
        promptHash: promptHash,
        riskLevel: 'low'
      });
    }

    // Submit
    const sendBtn = getSendButton();
    if (sendBtn) {
      sendBtn.click();
    }

  } catch (error) {
    console.error('[AI Governance] Error:', error);
    const sendBtn = getSendButton();
    if (sendBtn) {
      sendBtn.click();
    }
  }
}

/**
 * Initialize monitoring
 */
function initialize() {
  console.log('[AI Governance] Initializing Claude monitor...');

  document.addEventListener('click', (event) => {
    const target = event.target;
    
    if (target.tagName === 'BUTTON') {
      const text = target.textContent.toLowerCase();
      const ariaLabel = (target.getAttribute('aria-label') || '').toLowerCase();
      if (text.includes('send') || ariaLabel.includes('send')) {
        interceptPrompt(event);
      }
    }
  }, true);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      const input = getPromptInput();
      if (input && document.activeElement === input) {
        interceptPrompt(event);
      }
    }
  }, true);

  console.log('[AI Governance] Claude monitor initialized');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
