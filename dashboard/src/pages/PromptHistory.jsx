/**
 * Prompt History Page
 * Shows complete history of all prompts with search, filters, and details
 * 
 * Create: dashboard/src/pages/PromptHistory.jsx
 */

import { useState, useEffect } from 'react';
import { Search, Filter, Calendar, TrendingUp, AlertCircle, Check, X, Trash2 } from 'lucide-react';
import { promptHistoryApi } from '../services/api';

function PromptHistory() {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [toolFilter, setToolFilter] = useState('');
  const [piiFilter, setPiiFilter] = useState('');
  const [daysFilter, setDaysFilter] = useState(30);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchHistory();
    fetchStats();
  }, [toolFilter, piiFilter, daysFilter, page]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await promptHistoryApi.getHistory({
        days: daysFilter,
        page: page,
        page_size: 20,
        tool: toolFilter || undefined,
        had_pii: piiFilter ? (piiFilter === 'true') : undefined
      });
      // Handle both array and paginated object responses
      if (Array.isArray(response)) {
        setHistory(response);
        setTotalPages(1);
      } else if (response?.items) {
        setHistory(Array.isArray(response.items) ? response.items : []);
        setTotalPages(Math.ceil((response.total || 0) / 20));
      } else {
        setHistory([]);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
      setHistory([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await promptHistoryApi.getStats({
        days: daysFilter
      });
      setStats(response || null);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      setStats(null);
    }
  };

  const filteredHistory = history.filter(item => {
    if (!searchTerm) return true;
    return item.original_prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
           item.final_prompt.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getImprovementColor = (delta) => {
    if (delta > 20) return '#10b981'; // green
    if (delta > 0) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };

  const handleDeletePrompt = async (promptId) => {
    if (!window.confirm('Are you sure you want to delete this prompt history entry? This action cannot be undone.')) {
      return;
    }

    try {
      await promptHistoryApi.delete(promptId);
      setHistory(history.filter(h => h.id !== promptId));
      setSelectedPrompt(null);
    } catch (error) {
      alert('Failed to delete prompt history: ' + error.message);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px', color: '#1a1a1a' }}>
          Prompt History
        </h1>
        <p style={{ color: '#666', fontSize: '14px' }}>
          Complete history of all prompts with quality improvements and PII detection
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#2563eb', marginBottom: '4px' }}>
              {(stats.total_prompts || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>Total Prompts</div>
          </div>

          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#10b981', marginBottom: '4px' }}>
              +{(stats.avg_improvement || 0).toFixed(1)}
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>Avg Quality Improvement</div>
          </div>

          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#f59e0b', marginBottom: '4px' }}>
              {stats.pii_incidents || 0}
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>PII Incidents</div>
          </div>

          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#8b5cf6', marginBottom: '4px' }}>
              {((stats.variant_adoption_rate || 0) * 100).toFixed(0)}%
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>Adoption Rate</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ flex: '1 1 300px', position: 'relative' }}>
            <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
            <input
              type="text"
              placeholder="Search prompts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 40px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            />
          </div>

          {/* Tool Filter */}
          <select
            value={toolFilter}
            onChange={(e) => setToolFilter(e.target.value)}
            style={{
              padding: '10px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
              background: 'white'
            }}
          >
            <option value="">All Tools</option>
            <option value="chatgpt">ChatGPT</option>
            <option value="claude">Claude</option>
            <option value="gemini">Gemini</option>
            <option value="copilot">Copilot</option>
          </select>

          {/* PII Filter */}
          <select
            value={piiFilter}
            onChange={(e) => setPiiFilter(e.target.value)}
            style={{
              padding: '10px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
              background: 'white'
            }}
          >
            <option value="">PII: All</option>
            <option value="true">Has PII</option>
            <option value="false">No PII</option>
          </select>

          {/* Days Filter */}
          <select
            value={daysFilter}
            onChange={(e) => setDaysFilter(Number(e.target.value))}
            style={{
              padding: '10px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
              background: 'white'
            }}
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
        </div>
      </div>

      {/* History Table */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#666' }}>
            Loading history...
          </div>
        ) : filteredHistory.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#666' }}>
            No prompts found
          </div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                    Time
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                    Original Prompt
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                    Tool
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                    Improvement
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                    Variant
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                    PII
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#666' }}>
                      {item.timestamp ? new Date(item.timestamp).toLocaleString() : 'N/A'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#1f2937', maxWidth: '300px' }}>
                      <div style={{ 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap' 
                      }}>
                        {item.original_prompt || 'N/A'}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                      <span style={{
                        background: '#eff6ff',
                        color: '#1e40af',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        {item.tool || 'N/A'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {item.improvement_delta !== null && item.improvement_delta !== undefined && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                          <TrendingUp size={16} style={{ color: getImprovementColor(item.improvement_delta) }} />
                          <span style={{ 
                            fontWeight: '600', 
                            color: getImprovementColor(item.improvement_delta),
                            fontSize: '13px'
                          }}>
                            +{item.improvement_delta.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {item.variant_selected === -1 ? (
                        <span style={{ color: '#666', fontSize: '13px' }}>Original</span>
                      ) : item.variant_selected !== null && item.variant_selected !== undefined ? (
                        <span style={{
                          background: '#d1fae5',
                          color: '#065f46',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          Variant {item.variant_selected + 1}
                        </span>
                      ) : (
                        <span style={{ color: '#666', fontSize: '13px' }}>N/A</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {item.had_pii ? (
                        <AlertCircle size={20} style={{ color: '#ef4444' }} />
                      ) : (
                        <Check size={20} style={{ color: '#10b981' }} />
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button
                        onClick={() => setSelectedPrompt(item)}
                        style={{
                          padding: '6px 12px',
                          background: '#2563eb',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{
                padding: '16px',
                display: 'flex',
                justifyContent: 'center',
                gap: '8px',
                borderTop: '1px solid #e5e7eb'
              }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{
                    padding: '8px 16px',
                    background: page === 1 ? '#e5e7eb' : '#2563eb',
                    color: page === 1 ? '#9ca3af' : 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: page === 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  Previous
                </button>
                <span style={{ padding: '8px 16px', color: '#666' }}>
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{
                    padding: '8px 16px',
                    background: page === totalPages ? '#e5e7eb' : '#2563eb',
                    color: page === totalPages ? '#9ca3af' : 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: page === totalPages ? 'not-allowed' : 'pointer'
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      {selectedPrompt && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '800px',
            maxHeight: '90vh',
            overflow: 'auto',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700' }}>Prompt Details</h2>
              <button
                onClick={() => setSelectedPrompt(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <strong style={{ display: 'block', marginBottom: '8px', color: '#1f2937' }}>
                Original Prompt:
              </strong>
              <div style={{
                padding: '12px',
                background: '#fffbeb',
                border: '1px solid #fbbf24',
                borderRadius: '8px',
                lineHeight: '1.6'
              }}>
                {selectedPrompt.original_prompt || 'N/A'}
              </div>
            </div>

            {selectedPrompt.final_prompt && selectedPrompt.final_prompt !== selectedPrompt.original_prompt && (
              <div style={{ marginBottom: '16px' }}>
                <strong style={{ display: 'block', marginBottom: '8px', color: '#1f2937' }}>
                  Final Prompt (Used):
                </strong>
                <div style={{
                  padding: '12px',
                  background: '#d1fae5',
                  border: '1px solid #10b981',
                  borderRadius: '8px',
                  lineHeight: '1.6'
                }}>
                  {selectedPrompt.final_prompt}
                </div>
              </div>
            )}

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '16px',
              marginTop: '20px'
            }}>
              <div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Tool</div>
                <div style={{ fontSize: '16px', fontWeight: '600' }}>{selectedPrompt.tool || 'N/A'}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Original Score</div>
                <div style={{ fontSize: '16px', fontWeight: '600' }}>{selectedPrompt.original_score ? selectedPrompt.original_score.toFixed(1) : 'N/A'}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Final Score</div>
                <div style={{ fontSize: '16px', fontWeight: '600' }}>{selectedPrompt.final_score ? selectedPrompt.final_score.toFixed(1) : 'N/A'}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Improvement</div>
                <div style={{ 
                  fontSize: '16px', 
                  fontWeight: '600',
                  color: getImprovementColor(selectedPrompt.improvement_delta || 0)
                }}>
                  +{selectedPrompt.improvement_delta ? selectedPrompt.improvement_delta.toFixed(1) : '0.0'}
                </div>
              </div>
            </div>

            {selectedPrompt.had_pii && selectedPrompt.pii_types && Array.isArray(selectedPrompt.pii_types) && (
              <div style={{
                marginTop: '20px',
                padding: '12px',
                background: '#fef2f2',
                border: '1px solid #ef4444',
                borderRadius: '8px'
              }}>
                <strong style={{ color: '#dc2626' }}>⚠️ PII Detected:</strong> {selectedPrompt.pii_types.join(', ')}
              </div>
            )}

            {/* Action Buttons */}
            <div style={{
              marginTop: '24px',
              paddingTop: '16px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setSelectedPrompt(null)}
                style={{
                  padding: '10px 16px',
                  background: '#e5e7eb',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Close
              </button>
              <button
                onClick={() => handleDeletePrompt(selectedPrompt.id)}
                style={{
                  padding: '10px 16px',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Trash2 size={16} />
                Delete Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PromptHistory;
