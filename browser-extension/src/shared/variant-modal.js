/**
 * Modal UI for displaying prompt variants
 * Shows user the 3 improved prompts and lets them choose
 */

class VariantModal {
  constructor() {
    this.modal = null;
    this.resolve = null;
  }

  /**
   * Show loading state
   */
  showLoading() {
    this._createModal({ loading: true });
  }

  /**
   * Close modal programmatically
   */
  close() {
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }
  }

  /**
   * Show modal with variants
   * @param {Object} data - Contains originalPrompt and variants
   * @returns {Promise<string>} Chosen prompt text
   */
  show(data) {
    // If loading modal exists, remove it first
    this.close();
    
    return new Promise((resolve) => {
      this.resolve = resolve;
      this._createModal(data);
    });
  }

  /**
   * Create and inject modal into page
   * @private
   */
  _createModal(data) {
    // Create modal container
    this.modal = document.createElement('div');
    this.modal.id = 'ai-governance-modal';
    
    let content = '';
    
    if (data.loading) {
        content = `
          <div class="ai-gov-body" style="text-align: center; padding: 40px;">
            <div class="ai-gov-spinner"></div>
            <p style="margin-top: 16px; color: #666; font-weight: 500;">Improving your prompt...</p>
          </div>
        `;
    } else {
        content = `
          <div class="ai-gov-header">
            <h2>✨ Improve Your Prompt</h2>
            <button class="ai-gov-close">&times;</button>
          </div>
          
          <div class="ai-gov-body">
            <div class="ai-gov-supermemory-section">
              ${data.variants.some(v => v.used_supermemory) ? `
                <div class="ai-gov-sm-active">
                  <div class="ai-gov-sm-icon">🧠</div>
                  <div class="ai-gov-sm-text">
                    <div class="ai-gov-sm-title">Supermemory Active</div>
                    <div class="ai-gov-sm-subtitle">Variants enhanced with your knowledge graph context</div>
                  </div>
                </div>
              ` : `
                <div class="ai-gov-sm-inactive">
                  <div class="ai-gov-sm-icon">💭</div>
                  <div class="ai-gov-sm-text">
                    <div class="ai-gov-sm-title">No Context Found</div>
                    <div class="ai-gov-sm-subtitle">Supermemory didn't find relevant history for this prompt</div>
                  </div>
                </div>
              `}
            </div>

            <div class="ai-gov-section">
              <label class="ai-gov-label">Your Original Prompt:</label>
              <div class="ai-gov-prompt ai-gov-original">
                ${this._escapeHtml(data.originalPrompt)}
              </div>
            </div>

            <div class="ai-gov-section">
              <label class="ai-gov-label">Choose an Improved Version:</label>
              
              ${data.variants.map((variant, index) => `
                <div class="ai-gov-variant" data-index="${index}">
                  <div class="ai-gov-variant-header">
                    <span class="ai-gov-variant-title">Variant ${index + 1}</span>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        ${variant.used_supermemory ? 
                          `<span class="ai-gov-badge-sm" title="Enhanced with Supermemory context">🧠</span>` 
                          : ''}
                        <span class="ai-gov-score">Score: ${variant.score}/100</span>
                    </div>
                  </div>
                  <div class="ai-gov-prompt">
                    ${this._escapeHtml(variant.text)}
                  </div>
                  <div class="ai-gov-improvements">
                    ${variant.improvements.map(imp => `
                      <span class="ai-gov-badge">✓ ${imp}</span>
                    `).join('')}
                  </div>
                  <button class="ai-gov-btn ai-gov-btn-select" data-index="${index}">
                    Use This Version
                  </button>
                </div>
              `).join('')}
            </div>

            <button class="ai-gov-btn ai-gov-btn-original">
              Keep Original
            </button>
          </div>
        `;
    }

    this.modal.innerHTML = `
      <div class="ai-gov-overlay">
        <div class="ai-gov-modal">
          ${content}
        </div>
      </div>
    `;

    // Inject styles
    this._injectStyles();

    // Add to page
    document.body.appendChild(this.modal);

    // Add event listeners only if not loading
    if (!data.loading) {
        this._attachListeners(data);
    }
  }

  /**
   * Inject modal styles
   * @private
   */
  _injectStyles() {
    if (document.getElementById('ai-gov-styles')) return;

    const style = document.createElement('style');
    style.id = 'ai-gov-styles';
    style.textContent = `
      .ai-gov-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999999;
        animation: fadeIn 0.2s;
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      .ai-gov-modal {
        background: white;
        border-radius: 12px;
        width: 90%;
        max-width: 700px;
        max-height: 85vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        animation: slideUp 0.3s;
      }

      @keyframes slideUp {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }

      .ai-gov-header {
        padding: 20px 24px;
        border-bottom: 1px solid #e5e7eb;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .ai-gov-header h2 {
        margin: 0;
        font-size: 20px;
        font-weight: 600;
        color: #1a1a1a;
      }

      .ai-gov-close {
        background: none;
        border: none;
        font-size: 28px;
        color: #666;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
      }

      .ai-gov-close:hover {
        background: #f3f4f6;
      }

      .ai-gov-body {
        padding: 24px;
      }

      .ai-gov-section {
        margin-bottom: 24px;
      }

      .ai-gov-label {
        display: block;
        font-weight: 600;
        margin-bottom: 12px;
        color: #374151;
        font-size: 14px;
      }

      .ai-gov-prompt {
        padding: 12px 16px;
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        font-size: 14px;
        line-height: 1.6;
        color: #1f2937;
        white-space: pre-wrap;
      }

      .ai-gov-original {
        background: #fffbeb;
        border-color: #fbbf24;
      }

      .ai-gov-variant {
        margin-bottom: 16px;
        padding: 16px;
        border: 2px solid #e5e7eb;
        border-radius: 10px;
        transition: all 0.2s;
      }

      .ai-gov-variant:hover {
        border-color: #3b82f6;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
      }

      .ai-gov-variant-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }

      .ai-gov-variant-title {
        font-weight: 600;
        color: #1f2937;
        font-size: 14px;
      }

      .ai-gov-score {
        font-size: 13px;
        color: #10b981;
        font-weight: 600;
        background: #d1fae5;
        padding: 4px 10px;
        border-radius: 12px;
      }

      .ai-gov-improvements {
        margin-top: 12px;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .ai-gov-supermemory-section {
        margin-bottom: 20px;
        padding: 16px;
        border-radius: 10px;
        border: 2px solid #e5e7eb;
      }

      .ai-gov-sm-active, .ai-gov-sm-inactive {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .ai-gov-sm-active {
        background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%);
        border-color: #db2777;
      }

      .ai-gov-sm-inactive {
        background: #f9fafb;
        border-color: #e5e7eb;
      }

      .ai-gov-sm-icon {
        font-size: 32px;
        line-height: 1;
      }

      .ai-gov-sm-text {
        flex: 1;
      }

      .ai-gov-sm-title {
        font-weight: 600;
        font-size: 15px;
        margin-bottom: 4px;
      }

      .ai-gov-sm-active .ai-gov-sm-title {
        color: #db2777;
      }

      .ai-gov-sm-inactive .ai-gov-sm-title {
        color: #6b7280;
      }

      .ai-gov-sm-subtitle {
        font-size: 13px;
        color: #6b7280;
      }

      .ai-gov-badge {
        display: inline-block;
        padding: 4px 10px;
        background: #eff6ff;
        color: #1e40af;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 500;
      }

      .ai-gov-badge-sm {
        display: inline-block;
        padding: 4px 10px;
        background: #fdf2f8;
        color: #db2777;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
        border: 1px solid #fbcfe8;
      }

      .ai-gov-btn {
        padding: 10px 20px;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }

      .ai-gov-btn-select {
        width: 100%;
        margin-top: 12px;
        background: #3b82f6;
        color: white;
      }

      .ai-gov-btn-select:hover {
        background: #2563eb;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
      }

      .ai-gov-btn-original {
        width: 100%;
        background: #f3f4f6;
        color: #374151;
      }

      .ai-gov-btn-original:hover {
        background: #e5e7eb;
      }
      
      .ai-gov-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #2563eb;
        border-radius: 50%;
        animation: ai-gov-spin 1s linear infinite;
        margin: 0 auto;
      }
      
      @keyframes ai-gov-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;

    document.head.appendChild(style);
  }
  /**
   * Attach event listeners
   * @private
   */
  _attachListeners(data) {
    // Close button
    this.modal.querySelector('.ai-gov-close').addEventListener('click', () => {
      this._close(data.originalPrompt);
    });

    // Select variant buttons
    this.modal.querySelectorAll('.ai-gov-btn-select').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        const chosen = data.variants[index].text;
        this._close(chosen);
      });
    });

    // Keep original button
    this.modal.querySelector('.ai-gov-btn-original').addEventListener('click', () => {
      this._close(data.originalPrompt);
    });

    // Close on overlay click
    this.modal.querySelector('.ai-gov-overlay').addEventListener('click', (e) => {
      if (e.target.classList.contains('ai-gov-overlay')) {
        this._close(data.originalPrompt);
      }
    });
  }

  /**
   * Close modal and resolve promise
   * @private
   */
  _close(chosenPrompt) {
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }
    if (this.resolve) {
      this.resolve(chosenPrompt);
      this.resolve = null;
    }
  }

  /**
   * Escape HTML to prevent XSS
   * @private
   */
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export for use in content scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VariantModal;
}
