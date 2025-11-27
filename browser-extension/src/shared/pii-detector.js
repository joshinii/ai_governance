/**
 * Client-side PII (Personally Identifiable Information) Detection
 * Runs in browser - no data sent to server for detection
 */

class PIIDetector {
  constructor() {
    // Regex patterns for common PII
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
      },
      ipAddress: {
        regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
        type: 'IP Address',
        risk: 'medium'
      },
      apiKey: {
        regex: /\b(sk-[a-zA-Z0-9]{20,}|[a-zA-Z0-9]{32,})\b/g,
        type: 'API Key/Token',
        risk: 'high'
      },
      // Common name patterns (simplified - catches "My name is X")
      name: {
        regex: /(?:my name is|i am|i'm|call me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
        type: 'Personal Name',
        risk: 'medium'
      }
    };
  }

  /**
   * Detect PII in text
   * @param {string} text - Text to analyze
   * @returns {Object} Detection results
   */
  detect(text) {
    const findings = [];
    let riskLevel = 'low';

    // Check each pattern
    for (const [key, pattern] of Object.entries(this.patterns)) {
      const matches = text.match(pattern.regex);
      
      if (matches && matches.length > 0) {
        findings.push({
          type: pattern.type,
          count: matches.length,
          risk: pattern.risk,
          examples: matches.slice(0, 2) // First 2 examples
        });

        // Update overall risk level
        if (pattern.risk === 'high' && riskLevel !== 'high') {
          riskLevel = 'high';
        } else if (pattern.risk === 'medium' && riskLevel === 'low') {
          riskLevel = 'medium';
        }
      }
    }

    return {
      hasPII: findings.length > 0,
      riskLevel: findings.length > 0 ? riskLevel : 'low',
      findings: findings,
      summary: this._generateSummary(findings)
    };
  }

  /**
   * Redact PII from text
   * @param {string} text - Text to redact
   * @returns {string} Redacted text
   */
  redact(text) {
    let redacted = text;

    for (const [key, pattern] of Object.entries(this.patterns)) {
      redacted = redacted.replace(pattern.regex, (match) => {
        return `[${pattern.type.toUpperCase()}]`;
      });
    }

    return redacted;
  }

  /**
   * Generate summary message
   * @private
   */
  _generateSummary(findings) {
    if (findings.length === 0) {
      return 'No PII detected';
    }

    const types = findings.map(f => f.type);
    return `Detected: ${types.join(', ')}`;
  }
}

// Export for use in content scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PIIDetector;
}
