/**
 * Prompt Improvements Page
 * Shows statistics on prompt variant adoption
 */
import { useState, useEffect } from 'react'
import { analyticsApi } from '../services/api'
import { TrendingUp, Target, Award } from 'lucide-react'

function PromptImprovements() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [days, setDays] = useState(7)

  useEffect(() => {
    loadStats()
  }, [days])

  const loadStats = async () => {
    try {
      setLoading(true)
      const data = await analyticsApi.getPromptStats(days)
      setStats(data)
      setError(null)
    } catch (err) {
      setError('Failed to load prompt statistics: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    )
  }

  if (error) {
    return <div className="error">{error}</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700' }}>Prompt Improvements</h1>
        
        <select 
          value={days} 
          onChange={(e) => setDays(Number(e.target.value))}
          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db' }}
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Summary Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">
            <Target size={16} style={{ display: 'inline', marginRight: '4px' }} />
            Total Suggestions
          </div>
          <div className="stat-value">{stats?.total_suggestions || 0}</div>
          <div className="stat-label" style={{ marginTop: '8px' }}>
            Shown to users
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">
            <Award size={16} style={{ display: 'inline', marginRight: '4px' }} />
            Variants Chosen
          </div>
          <div className="stat-value" style={{ color: '#10b981' }}>
            {stats?.variants_chosen || 0}
          </div>
          <div className="stat-label" style={{ marginTop: '8px' }}>
            Users picked improved version
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Original Kept</div>
          <div className="stat-value">{stats?.original_chosen || 0}</div>
          <div className="stat-label" style={{ marginTop: '8px' }}>
            Users kept original
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">
            <TrendingUp size={16} style={{ display: 'inline', marginRight: '4px' }} />
            Adoption Rate
          </div>
          <div className="stat-value" style={{ color: '#2563eb' }}>
            {stats?.adoption_rate || 0}%
          </div>
          <div className="stat-label" style={{ marginTop: '8px' }}>
            Overall improvement
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="card">
        <h2 className="card-title" style={{ marginBottom: '20px' }}>Key Insights</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Adoption Progress */}
          <div style={{ padding: '20px', background: '#f9fafb', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
              Adoption Progress
            </h3>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', color: '#666' }}>Variants Chosen</span>
                <span style={{ fontSize: '14px', fontWeight: '600' }}>
                  {stats?.adoption_rate || 0}%
                </span>
              </div>
              <div style={{ 
                width: '100%', 
                background: '#e5e7eb', 
                height: '12px', 
                borderRadius: '6px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${stats?.adoption_rate || 0}%`,
                  background: '#10b981',
                  height: '100%',
                  transition: 'width 0.3s'
                }} />
              </div>
            </div>
            <p style={{ fontSize: '14px', color: '#666', lineHeight: '1.6' }}>
              {stats?.adoption_rate >= 70 
                ? '🎉 Excellent! Users are finding the suggestions very helpful.'
                : stats?.adoption_rate >= 50
                ? '👍 Good adoption rate. Keep improving suggestions.'
                : '⚠️ Low adoption. Review suggestion quality.'}
            </p>
          </div>

          {/* Impact Summary */}
          <div style={{ padding: '20px', background: '#f9fafb', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
              Impact Summary
            </h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li style={{ marginBottom: '12px', display: 'flex', alignItems: 'start' }}>
                <span style={{ color: '#10b981', marginRight: '8px', fontSize: '18px' }}>✓</span>
                <div>
                  <strong style={{ fontSize: '14px' }}>{stats?.variants_chosen || 0}</strong>
                  <span style={{ fontSize: '14px', color: '#666' }}> prompts improved</span>
                </div>
              </li>
              <li style={{ marginBottom: '12px', display: 'flex', alignItems: 'start' }}>
                <span style={{ color: '#2563eb', marginRight: '8px', fontSize: '18px' }}>📈</span>
                <div>
                  <strong style={{ fontSize: '14px' }}>Higher quality</strong>
                  <span style={{ fontSize: '14px', color: '#666' }}> AI interactions</span>
                </div>
              </li>
              <li style={{ display: 'flex', alignItems: 'start' }}>
                <span style={{ color: '#f59e0b', marginRight: '8px', fontSize: '18px' }}>💡</span>
                <div>
                  <strong style={{ fontSize: '14px' }}>Learning effect</strong>
                  <span style={{ fontSize: '14px', color: '#666' }}> Users improving skills</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Breakdown */}
      <div className="card">
        <h2 className="card-title" style={{ marginBottom: '20px' }}>Adoption Breakdown</h2>
        
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Metric</th>
                <th>Count</th>
                <th>Percentage</th>
                <th>Visual</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Improved Variants Selected</strong></td>
                <td>{stats?.variants_chosen || 0}</td>
                <td style={{ color: '#10b981', fontWeight: '600' }}>
                  {stats?.adoption_rate || 0}%
                </td>
                <td>
                  <div style={{ 
                    width: '100%', 
                    background: '#e5e7eb', 
                    height: '8px', 
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${stats?.adoption_rate || 0}%`,
                      background: '#10b981',
                      height: '100%'
                    }} />
                  </div>
                </td>
              </tr>
              <tr>
                <td><strong>Original Prompts Kept</strong></td>
                <td>{stats?.original_chosen || 0}</td>
                <td style={{ color: '#6b7280', fontWeight: '600' }}>
                  {stats?.total_suggestions > 0 
                    ? ((stats.original_chosen / stats.total_suggestions) * 100).toFixed(1)
                    : 0}%
                </td>
                <td>
                  <div style={{ 
                    width: '100%', 
                    background: '#e5e7eb', 
                    height: '8px', 
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${stats?.total_suggestions > 0 
                        ? (stats.original_chosen / stats.total_suggestions) * 100
                        : 0}%`,
                      background: '#6b7280',
                      height: '100%'
                    }} />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Note for POC */}
      {stats?.total_suggestions === 0 && (
        <div style={{ 
          padding: '20px', 
          background: '#eff6ff', 
          border: '1px solid #bfdbfe',
          borderRadius: '8px',
          marginTop: '20px'
        }}>
          <p style={{ margin: 0, color: '#1e40af' }}>
            <strong>Note:</strong> Prompt improvement data will appear here once users start using the browser extension
            and the prompt variant feature generates suggestions.
          </p>
        </div>
      )}
    </div>
  )
}

export default PromptImprovements
