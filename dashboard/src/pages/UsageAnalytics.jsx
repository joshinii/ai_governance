/**
 * Usage Analytics Page
 * Detailed view of AI tool usage with charts
 */
import { useState, useEffect } from 'react'
import { analyticsApi } from '../services/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

function UsageAnalytics() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [days, setDays] = useState(7)

  useEffect(() => {
    loadAnalytics()
  }, [days])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      const data = await analyticsApi.getUsageStats(days)
      setStats(data)
      setError(null)
    } catch (err) {
      setError('Failed to load analytics: ' + err.message)
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

  // Prepare chart data
  const toolData = stats?.prompts_by_tool 
    ? Object.entries(stats.prompts_by_tool).map(([name, value]) => ({ name, value }))
    : []

  const riskData = stats?.prompts_by_risk
    ? Object.entries(stats.prompts_by_risk).map(([name, value]) => ({ name, value }))
    : []

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700' }}>Usage Analytics</h1>
        
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
          <div className="stat-label">Total Prompts</div>
          <div className="stat-value">{stats?.total_prompts || 0}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Low Risk</div>
          <div className="stat-value" style={{ color: '#10b981' }}>
            {stats?.prompts_by_risk?.low || 0}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Medium Risk</div>
          <div className="stat-value" style={{ color: '#f59e0b' }}>
            {stats?.prompts_by_risk?.medium || 0}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">High Risk</div>
          <div className="stat-value" style={{ color: '#ef4444' }}>
            {stats?.prompts_by_risk?.high || 0}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* AI Tools Usage Chart */}
        <div className="card">
          <h2 className="card-title" style={{ marginBottom: '20px' }}>Usage by AI Tool</h2>
          {toolData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={toolData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#2563eb" name="Prompts" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              No data available
            </div>
          )}
        </div>

        {/* Risk Distribution Chart */}
        <div className="card">
          <h2 className="card-title" style={{ marginBottom: '20px' }}>Risk Distribution</h2>
          {riskData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={riskData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {riskData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              No data available
            </div>
          )}
        </div>
      </div>

      {/* Top Users Table */}
      <div className="card">
        <h2 className="card-title" style={{ marginBottom: '20px' }}>Top Users by Activity</h2>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>User Email</th>
                <th>Total Prompts</th>
                <th>Activity</th>
              </tr>
            </thead>
            <tbody>
              {stats?.top_users?.map((user, index) => (
                <tr key={index}>
                  <td>#{index + 1}</td>
                  <td>{user.email}</td>
                  <td>{user.count}</td>
                  <td>
                    <div style={{ 
                      width: '100%', 
                      background: '#e5e7eb', 
                      height: '8px', 
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${(user.count / stats.total_prompts * 100)}%`,
                        background: '#2563eb',
                        height: '100%'
                      }} />
                    </div>
                  </td>
                </tr>
              ))}
              {(!stats?.top_users || stats.top_users.length === 0) && (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', color: '#666' }}>
                    No users found
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

export default UsageAnalytics
