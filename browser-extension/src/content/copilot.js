/**
 * Content script for Microsoft Copilot
 * Simplified - uses same interception logic
 */

const config = CONFIG;
const piiDetector = new PIIDetector();
const apiClient = new APIClient(config);
const variantModal = new VariantModal();

console.log('[AI Governance] Copilot monitor active');

function initialize() {
  console.log('[AI Governance] Copilot monitor initialized (basic)');
  
  // Note: Copilot's UI may vary - this is a placeholder
  // In production, would need specific selectors for Copilot
  
  alert('[AI Governance] Monitoring active on Copilot. Full integration coming soon.');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
