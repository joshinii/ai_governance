/**
 * API Client for communicating with backend
 * Handles all HTTP requests to the governance backend using Auth0 JWT
 */

class APIClient {
  constructor(config, auth0Client) {
    this.baseURL = config.API_URL;
    this.auth0Client = auth0Client;
  }

  /**
   * Make authenticated request to backend with Auth0 JWT
   * @private
   */
  async _request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;

    // Get Auth0 JWT token
    const token = await this.auth0Client.getToken();

    if (!token) {
      throw new Error('Not authenticated. Please login first.');
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid
        await this.auth0Client.clearToken();
        throw new Error('Authentication expired. Please login again.');
      }
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Log AI tool usage
   * User email is extracted from JWT token
   * @param {Object} data - Usage data
   */
  async logUsage(data) {
    return this._request('/usage-logs/', {
      method: 'POST',
      body: JSON.stringify({
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
   * Log prompt history entry
   * User email is extracted from JWT token
   * @param {Object} data - Prompt history data
   */
  async logPromptHistory(data) {
    return this._request('/prompt-history/', {
      method: 'POST',
      body: JSON.stringify({
        original_prompt: data.originalPrompt,
        final_prompt: data.finalPrompt,
        tool: data.tool,
        variants_offered: data.variantsOffered,
        variant_selected: data.variantSelected,
        original_score: data.originalScore,
        final_score: data.finalScore,
        had_pii: data.hadPII,
        pii_types: data.piiTypes,
        session_id: data.sessionId
      })
    });
  }

  /**
   * Create compliance alert
   * User email is extracted from JWT token
   * @param {Object} data - Alert data
   */
  async createAlert(data) {
    return this._request('/alerts', {
      method: 'POST',
      body: JSON.stringify({
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
