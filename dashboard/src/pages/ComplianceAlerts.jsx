/**
 * Compliance Alerts Page
 * Shows policy violations and security alerts
 */
import { useState, useEffect } from 'react'
import { alertsApi } from '../services/api'
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

function ComplianceAlerts() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all') // all, resolved, unresolved

  useEffect(() => {
    loadAlerts()
  }, [filter])

  const loadAlerts = async () => {
    try {
      setLoading(true)
      const filters = { days: 30 }
      if (filter === 'resolved') filters.resolved = true
      if (filter === 'unresolved') filters.resolved = false
      
      const data = await alertsApi.getAlerts(filters)
      setAlerts(data)
      setError(null)
    } catch (err) {
      setError('Failed to load alerts: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleResolve = async (alertId) => {
    try {
      await alertsApi.resolveAlert(alertId)
      // Reload alerts
      loadAlerts()
    } catch (err) {
      alert('Failed to resolve alert: ' + err.message)
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

  const unresolvedCount = alerts.filter(a => !a.resolved).length
  const resolvedCount = alerts.filter(a => a.resolved).length

  return (
    <div>
      <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '30px' }}>
        Compliance Alerts
      </h1>

      {/* Summary Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Alerts</div>
          <div className="stat-value">{alerts.length}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Unresolved</div>
          <div className="stat-value" style={{ color: '#ef4444' }}>
            {unresolvedCount}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Resolved</div>
          <div className="stat-value" style={{ color: '#10b981' }}>
            {resolvedCount}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Resolution Rate</div>
          <div className="stat-value">
            {alerts.length > 0 ? Math.round((resolvedCount / alerts.length) * 100) : 0}%
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <button
            className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter('all')}
          >
            All Alerts
          </button>
          <button
            className={`btn ${filter === 'unresolved' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter('unresolved')}
          >
            Unresolved ({unresolvedCount})
          </button>
          <button
            className={`btn ${filter === 'resolved' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter('resolved')}
          >
            Resolved ({resolvedCount})
          </button>
        </div>

        {/* Alerts Table */}
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>User</th>
                <th>Details</th>
                <th>Time</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => (
                <tr key={alert.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertTriangle size={16} color="#ef4444" />
                      <span style={{ textTransform: 'capitalize' }}>
                        {alert.violation_type.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </td>
                  <td>{alert.user_id}</td>
                  <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {JSON.stringify(alert.details)}
                  </td>
                  <td>{new Date(alert.timestamp).toLocaleString()}</td>
                  <td>
                    {alert.resolved ? (
                      <span className="badge resolved">
                        <CheckCircle size={12} style={{ display: 'inline', marginRight: '4px' }} />
                        Resolved
                      </span>
                    ) : (
                      <span className="badge high">
                        <XCircle size={12} style={{ display: 'inline', marginRight: '4px' }} />
                        Open
                      </span>
                    )}
                  </td>
                  <td>
                    {!alert.resolved && (
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleResolve(alert.id)}
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        Resolve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {alerts.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                    No alerts found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default ComplianceAlerts
