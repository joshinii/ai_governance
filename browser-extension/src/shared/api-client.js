/**
 * API Client for communicating with backend
 * Handles all HTTP requests to the governance backend
 */

class APIClient {
  constructor(config) {
    this.baseURL = config.API_URL;
    this.apiKey = config.API_KEY;
    this.userEmail = config.USER_EMAIL;
  }

  /**
   * Make authenticated request to backend
   * @private
   */
  async _request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
      ...options.headers
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Log AI tool usage
   * @param {Object} data - Usage data
   */
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

  /**
   * Get prompt variants (improved versions)
   * @param {string} originalPrompt - User's original prompt
   * @param {string} context - AI tool context
   */
  async getPromptVariants(originalPrompt, context) {
    const params = new URLSearchParams({
      original_prompt: originalPrompt,
      context: context || 'general'
    });

    return this._request(`/prompt-variants/?${params}`, {
      method: 'POST'
    });
  }

  /**
   * Log which prompt variant user chose
   * @param {Object} data - Prompt selection data
   */
  async logPromptChoice(data) {
    return this._request('/prompt-variants/log', {
      method: 'POST',
      body: JSON.stringify({
        user_email: this.userEmail,
        original_prompt: data.originalPrompt,
        chosen_variant: data.chosenVariant,
        variants: data.variants
      })
    });
  }

  /**
   * Create compliance alert
   * @param {Object} data - Alert data
   */
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

  /**
   * Get policies for organization
   * @param {number} orgId - Organization ID
   */
  async getPolicies(orgId) {
    return this._request(`/policies/${orgId}`);
  }

  /**
   * Hash prompt for privacy
   * @param {string} text - Prompt text
   */
  async hashPrompt(text) {
    // Use SubtleCrypto for SHA-256 hashing
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }
}

// Export for use in content scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = APIClient;
}
