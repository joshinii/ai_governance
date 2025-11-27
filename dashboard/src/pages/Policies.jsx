/**
 * Policies Page
 * Manage organization AI usage policies
 */
import { useState, useEffect } from 'react'
import { policiesApi } from '../services/api'
import { Shield, Plus } from 'lucide-react'

function Policies() {
  const [policies, setPolicies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newPolicy, setNewPolicy] = useState({
    name: '',
    block_pii: true,
    allowed_tools: ['chatgpt', 'claude', 'gemini']
  })

  useEffect(() => {
    loadPolicies()
  }, [])

  const loadPolicies = async () => {
    try {
      setLoading(true)
      const data = await policiesApi.getPolicies(1) // Org ID 1 for POC
      setPolicies(data)
      setError(null)
    } catch (err) {
      setError('Failed to load policies: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePolicy = async (e) => {
    e.preventDefault()
    try {
      await policiesApi.createPolicy({
        org_id: 1,
        name: newPolicy.name,
        rules: {
          block_pii: newPolicy.block_pii,
          allowed_tools: newPolicy.allowed_tools
        }
      })
      setShowCreateForm(false)
      setNewPolicy({ name: '', block_pii: true, allowed_tools: ['chatgpt', 'claude', 'gemini'] })
      loadPolicies()
    } catch (err) {
      alert('Failed to create policy: ' + err.message)
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
        <h1 style={{ fontSize: '28px', fontWeight: '700' }}>Policies</h1>
        
        <button 
          className="btn btn-primary"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          <Plus size={16} style={{ display: 'inline', marginRight: '8px' }} />
          Create Policy
        </button>
      </div>

      {/* Create Policy Form */}
      {showCreateForm && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2 className="card-title" style={{ marginBottom: '20px' }}>Create New Policy</h2>
          
          <form onSubmit={handleCreatePolicy}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                Policy Name
              </label>
              <input
                type="text"
                value={newPolicy.name}
                onChange={(e) => setNewPolicy({...newPolicy, name: e.target.value})}
                placeholder="e.g., Engineering Team Policy"
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={newPolicy.block_pii}
                  onChange={(e) => setNewPolicy({...newPolicy, block_pii: e.target.checked})}
                  style={{ marginRight: '8px' }}
                />
                <span style={{ fontSize: '14px' }}>Block PII (Personally Identifiable Information)</span>
              </label>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                Allowed AI Tools
              </label>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {['chatgpt', 'claude', 'gemini', 'copilot'].map(tool => (
                  <label key={tool} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={newPolicy.allowed_tools.includes(tool)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewPolicy({
                            ...newPolicy, 
                            allowed_tools: [...newPolicy.allowed_tools, tool]
                          })
                        } else {
                          setNewPolicy({
                            ...newPolicy,
                            allowed_tools: newPolicy.allowed_tools.filter(t => t !== tool)
                          })
                        }
                      }}
                      style={{ marginRight: '6px' }}
                    />
                    <span style={{ fontSize: '14px', textTransform: 'capitalize' }}>{tool}</span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" className="btn btn-primary">
                Create Policy
              </button>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Policies List */}
      <div className="card">
        <h2 className="card-title" style={{ marginBottom: '20px' }}>
          <Shield size={20} style={{ display: 'inline', marginRight: '8px' }} />
          Active Policies
        </h2>

        {policies.length > 0 ? (
          <div style={{ display: 'grid', gap: '16px' }}>
            {policies.map((policy) => (
              <div 
                key={policy.id}
                style={{
                  padding: '20px',
                  background: '#f9fafb',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>
                      {policy.name}
                    </h3>
                    <p style={{ fontSize: '13px', color: '#666' }}>
                      Created: {new Date(policy.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="badge low">Active</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                      PII Protection
                    </p>
                    <p style={{ fontSize: '14px', color: '#666' }}>
                      {policy.rules_json.block_pii ? '✓ Enabled' : '✗ Disabled'}
                    </p>
                  </div>

                  <div>
                    <p style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                      Allowed Tools
                    </p>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {policy.rules_json.allowed_tools?.map(tool => (
                        <span 
                          key={tool}
                          style={{
                            padding: '4px 10px',
                            background: 'white',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '12px',
                            textTransform: 'capitalize'
                          }}
                        >
                          {tool}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            color: '#666'
          }}>
            <Shield size={48} style={{ color: '#d1d5db', marginBottom: '16px' }} />
            <p style={{ fontSize: '16px', marginBottom: '8px' }}>No policies configured</p>
            <p style={{ fontSize: '14px' }}>Create your first policy to start governing AI usage</p>
          </div>
        )}
      </div>

      {/* Default Policy Info */}
      <div style={{ 
        padding: '16px', 
        background: '#eff6ff', 
        border: '1px solid #bfdbfe',
        borderRadius: '8px',
        marginTop: '20px'
      }}>
        <p style={{ margin: 0, fontSize: '14px', color: '#1e40af' }}>
          <strong>💡 Tip:</strong> Policies are automatically applied to all users in your organization. 
          The browser extension will enforce these rules in real-time.
        </p>
      </div>
    </div>
  )
}

export default Policies
