/**
 * Dashboard Overview Page
 * Shows high-level statistics and quick insights
 */
import { useState, useEffect } from 'react'
import { analyticsApi, alertsApi } from '../services/api'
import { TrendingUp, Users, AlertCircle, CheckCircle } from 'lucide-react'

function Dashboard() {
  const [stats, setStats] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const [usageStats, alertsData] = await Promise.all([
        analyticsApi.getUsageStats(7),
        alertsApi.getAlerts({ resolved: false, days: 7 })
      ])
      setStats(usageStats)
      
      // Handle both array and object responses
      const alertsArray = Array.isArray(alertsData) ? alertsData : []
      setAlerts(alertsArray.slice(0, 5)) // Show only 5 recent alerts
      setError(null)
    } catch (err) {
      setError('Failed to load dashboard data: ' + err.message)
      setAlerts([]) // Set empty array on error to prevent .map error
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
      <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '30px' }}>
        Dashboard Overview
      </h1>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total AI Prompts (7 days)</div>
          <div className="stat-value">{stats?.total_prompts || 0}</div>
          <div className="stat-change positive">
            <TrendingUp size={14} style={{ display: 'inline', marginRight: '4px' }} />
            Last 7 days
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Active Users</div>
          <div className="stat-value">{stats?.top_users?.length || 0}</div>
          <div className="stat-label" style={{ marginTop: '8px' }}>
            <Users size={14} style={{ display: 'inline', marginRight: '4px' }} />
            Using AI tools
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Open Alerts</div>
          <div className="stat-value" style={{ color: alerts.length > 0 ? '#ef4444' : '#10b981' }}>
            {alerts.length}
          </div>
          <div className="stat-label" style={{ marginTop: '8px' }}>
            <AlertCircle size={14} style={{ display: 'inline', marginRight: '4px' }} />
            Requires attention
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">High Risk Prompts</div>
          <div className="stat-value">{stats?.prompts_by_risk?.high || 0}</div>
          <div className="stat-label" style={{ marginTop: '8px' }}>
            PII detected
          </div>
        </div>
      </div>

      {/* AI Tools Usage */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">AI Tools Usage</h2>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>AI Tool</th>
                <th>Prompts</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              {stats?.prompts_by_tool && Object.entries(stats.prompts_by_tool).map(([tool, count]) => {
                const percentage = ((count / stats.total_prompts) * 100).toFixed(1)
                return (
                  <tr key={tool}>
                    <td style={{ textTransform: 'capitalize', fontWeight: '600' }}>{tool}</td>
                    <td>{count}</td>
                    <td>{percentage}%</td>
                  </tr>
                )
              })}
              {(!stats?.prompts_by_tool || Object.keys(stats.prompts_by_tool).length === 0) && (
                <tr>
                  <td colSpan="3" style={{ textAlign: 'center', color: '#666' }}>
                    No data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Users */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Top Users</h2>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Prompts</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {stats?.top_users?.map((user, index) => (
                <tr key={index}>
                  <td>{user.email}</td>
                  <td>{user.count}</td>
                  <td>
                    <span className="badge low">
                      <CheckCircle size={12} style={{ display: 'inline', marginRight: '4px' }} />
                      Active
                    </span>
                  </td>
                </tr>
              ))}
              {(!stats?.top_users || stats.top_users.length === 0) && (
                <tr>
                  <td colSpan="3" style={{ textAlign: 'center', color: '#666' }}>
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Alerts */}
      {alerts.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Recent Alerts</h2>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => (
                  <tr key={alert.id}>
                    <td style={{ textTransform: 'capitalize' }}>
                      {alert.violation_type.replace('_', ' ')}
                    </td>
                    <td>{new Date(alert.timestamp).toLocaleString()}</td>
                    <td>
                      <span className="badge high">Unresolved</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
