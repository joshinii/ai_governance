/**
 * Team Management Page
 * View and manage teams and team members
 * Access: Security Team and Team Leads only
 */

import { useState, useEffect } from 'react'
import { usersApi } from '../services/api'
import { Users, ChevronDown, AlertCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

function TeamManagement() {
  const { user, isSecurityTeam, isTeamLead } = useAuth()
  const [teams, setTeams] = useState([])
  const [expandedTeam, setExpandedTeam] = useState(null)
  const [teamMembers, setTeamMembers] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isSecurityTeam || isTeamLead) {
      loadTeams()
    } else {
      setError('You do not have permission to view team management. Only Security Team and Team Leads can access this feature.')
      setLoading(false)
    }
  }, [isSecurityTeam, isTeamLead])

  const loadTeams = async () => {
    try {
      setLoading(true)
      const data = await usersApi.getTeams()
      setTeams(data)
      setError(null)
    } catch (err) {
      setError('Failed to load teams: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadTeamMembers = async (teamId) => {
    try {
      if (teamMembers[teamId]) {
        // Already loaded
        return
      }

      const data = await usersApi.getTeamMembers(teamId)
      setTeamMembers(prev => ({
        ...prev,
        [teamId]: data
      }))
    } catch (err) {
      alert('Failed to load team members: ' + err.message)
    }
  }

  const toggleTeamExpand = async (teamId) => {
    if (expandedTeam === teamId) {
      setExpandedTeam(null)
    } else {
      setExpandedTeam(teamId)
      await loadTeamMembers(teamId)
    }
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    )
  }

  if (!isSecurityTeam && !isTeamLead) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '20px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          color: '#dc2626'
        }}>
          <AlertCircle size={24} />
          <div>
            <p style={{ margin: 0, fontWeight: '600', marginBottom: '4px' }}>Access Denied</p>
            <p style={{ margin: 0, fontSize: '14px' }}>
              Only Security Team and Team Leads can access team management.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{
          padding: '20px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          color: '#dc2626'
        }}>
          {error}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px', color: '#1a1a1a' }}>
          Team Management
        </h1>
        <p style={{ color: '#666', fontSize: '14px' }}>
          View and manage teams across your organization
        </p>
      </div>

      {/* Summary Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '32px'
      }}>
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#2563eb', marginBottom: '4px' }}>
            {teams.length}
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>Total Teams</div>
        </div>

        {isSecurityTeam && (
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#f59e0b', marginBottom: '4px' }}>
              {user?.team_id ? 'Team Lead' : 'No Team'}
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>Your Role</div>
          </div>
        )}
      </div>

      {/* Teams List */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        {teams.length > 0 ? (
          <div>
            {teams.map((team) => (
              <div
                key={team.id}
                style={{
                  borderBottom: '1px solid #e5e7eb',
                  '&:last-child': { borderBottom: 'none' }
                }}
              >
                {/* Team Header */}
                <button
                  onClick={() => toggleTeamExpand(team.id)}
                  style={{
                    width: '100%',
                    padding: '20px',
                    background: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'background 0.2s',
                    fontSize: '16px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        background: '#eff6ff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Users size={20} style={{ color: '#2563eb' }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', color: '#1f2937' }}>
                        {team.name}
                      </div>
                      {team.description && (
                        <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
                          {team.description}
                        </div>
                      )}
                    </div>
                  </div>
                  <ChevronDown
                    size={20}
                    style={{
                      color: '#9ca3af',
                      transform: expandedTeam === team.id ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s'
                    }}
                  />
                </button>

                {/* Team Members */}
                {expandedTeam === team.id && (
                  <div style={{
                    background: '#f9fafb',
                    padding: '20px',
                    borderTop: '1px solid #e5e7eb'
                  }}>
                    {teamMembers[team.id] && teamMembers[team.id].length > 0 ? (
                      <div>
                        <h3 style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          marginBottom: '16px',
                          color: '#374151'
                        }}>
                          {teamMembers[team.id].length} Member{teamMembers[team.id].length !== 1 ? 's' : ''}
                        </h3>
                        <div style={{ display: 'grid', gap: '12px' }}>
                          {teamMembers[team.id].map((member) => (
                            <div
                              key={member.id}
                              style={{
                                padding: '16px',
                                background: 'white',
                                borderRadius: '8px',
                                border: '1px solid #e5e7eb',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {member.picture ? (
                                  <img
                                    src={member.picture}
                                    alt={member.name}
                                    style={{
                                      width: '40px',
                                      height: '40px',
                                      borderRadius: '50%',
                                      objectFit: 'cover'
                                    }}
                                  />
                                ) : (
                                  <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    background: '#e5e7eb',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '18px',
                                    fontWeight: '600',
                                    color: '#6b7280'
                                  }}>
                                    {member.name ? member.name.charAt(0).toUpperCase() : '?'}
                                  </div>
                                )}
                                <div>
                                  <div style={{ fontWeight: '600', fontSize: '14px', color: '#1f2937' }}>
                                    {member.name || member.email}
                                  </div>
                                  <div style={{ fontSize: '13px', color: '#666', marginTop: '2px' }}>
                                    {member.email}
                                  </div>
                                </div>
                              </div>
                              <div style={{
                                padding: '6px 12px',
                                background: '#eff6ff',
                                color: '#1e40af',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '500',
                                textTransform: 'capitalize'
                              }}>
                                {member.role.replace('_', ' ')}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        textAlign: 'center',
                        padding: '32px 20px',
                        color: '#666'
                      }}>
                        <p style={{ margin: 0, fontSize: '14px' }}>No members in this team</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            padding: '60px 20px',
            textAlign: 'center',
            color: '#666'
          }}>
            <Users size={48} style={{ color: '#d1d5db', marginBottom: '16px' }} />
            <p style={{ fontSize: '16px', marginBottom: '8px' }}>No teams found</p>
            <p style={{ fontSize: '14px' }}>Create teams to organize your organization</p>
          </div>
        )}
      </div>

      {/* Information Box */}
      <div style={{
        padding: '16px',
        background: '#f0fdf4',
        border: '1px solid #86efac',
        borderRadius: '8px',
        marginTop: '24px',
        fontSize: '14px',
        color: '#166534'
      }}>
        <strong>ℹ️ Team Information:</strong>
        <ul style={{ margin: '8px 0 0 20px', paddingLeft: 0 }}>
          <li>Team Leads can view their own team members</li>
          <li>Security Team can view all teams and members</li>
          <li>Use this page to understand team structure and member distribution</li>
        </ul>
      </div>
    </div>
  )
}

export default TeamManagement
