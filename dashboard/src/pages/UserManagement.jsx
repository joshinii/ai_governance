/**
 * User Management Page
 * Admin interface for managing users and roles
 * Access: Security Team only
 */

import { useState, useEffect } from 'react'
import { usersApi } from '../services/api'
import { AlertCircle, Search, Edit2, Check, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

function UserManagement() {
  const { user, isSecurityTeam } = useAuth()
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingUserId, setEditingUserId] = useState(null)
  const [editingRole, setEditingRole] = useState(null)

  const ROLES = ['security_team', 'team_lead', 'employee']

  useEffect(() => {
    if (isSecurityTeam) {
      loadUsers()
    } else {
      setError('You do not have permission to access user management. Only Security Team members can access this feature.')
      setLoading(false)
    }
  }, [isSecurityTeam])

  useEffect(() => {
    const filtered = users.filter(u =>
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    setFilteredUsers(filtered)
  }, [searchTerm, users])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const data = await usersApi.listUsers()
      setUsers(data)
      setError(null)
    } catch (err) {
      setError('Failed to load users: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (userId, newRole) => {
    try {
      await usersApi.updateUserRole(userId, newRole)
      setUsers(prevUsers =>
        prevUsers.map(u => u.id === userId ? { ...u, role: newRole } : u)
      )
      setEditingUserId(null)
      setEditingRole(null)
    } catch (err) {
      alert('Failed to update user role: ' + err.message)
    }
  }

  const startEditRole = (userId, currentRole) => {
    setEditingUserId(userId)
    setEditingRole(currentRole)
  }

  const cancelEditRole = () => {
    setEditingUserId(null)
    setEditingRole(null)
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    )
  }

  if (!isSecurityTeam) {
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
              Only Security Team members can access user management.
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

  const roleCounts = {
    security_team: users.filter(u => u.role === 'security_team').length,
    team_lead: users.filter(u => u.role === 'team_lead').length,
    employee: users.filter(u => u.role === 'employee').length
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px', color: '#1a1a1a' }}>
          User Management
        </h1>
        <p style={{ color: '#666', fontSize: '14px' }}>
          Manage users, roles, and access levels across your organization
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
            {users.length}
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>Total Users</div>
        </div>

        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#ef4444', marginBottom: '4px' }}>
            {roleCounts.security_team}
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>Security Team</div>
        </div>

        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#f59e0b', marginBottom: '4px' }}>
            {roleCounts.team_lead}
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>Team Leads</div>
        </div>

        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#10b981', marginBottom: '4px' }}>
            {roleCounts.employee}
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>Employees</div>
        </div>
      </div>

      {/* Search */}
      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '24px'
      }}>
        <div style={{ position: 'relative' }}>
          <Search size={20} style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#666'
          }} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 12px 12px 40px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Users Table */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        {filteredUsers.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                <th style={{
                  padding: '16px',
                  textAlign: 'left',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#374151'
                }}>
                  User
                </th>
                <th style={{
                  padding: '16px',
                  textAlign: 'left',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#374151'
                }}>
                  Email
                </th>
                <th style={{
                  padding: '16px',
                  textAlign: 'left',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#374151'
                }}>
                  Role
                </th>
                <th style={{
                  padding: '16px',
                  textAlign: 'center',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#374151'
                }}>
                  Team
                </th>
                <th style={{
                  padding: '16px',
                  textAlign: 'center',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#374151'
                }}>
                  Joined
                </th>
                <th style={{
                  padding: '16px',
                  textAlign: 'center',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#374151'
                }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{
                    padding: '16px',
                    fontSize: '14px',
                    color: '#1f2937',
                    fontWeight: '500'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {u.picture ? (
                        <img
                          src={u.picture}
                          alt={u.name}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            objectFit: 'cover'
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: '#e5e7eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '16px',
                          fontWeight: '600',
                          color: '#6b7280'
                        }}>
                          {u.name ? u.name.charAt(0).toUpperCase() : '?'}
                        </div>
                      )}
                      {u.name || 'N/A'}
                    </div>
                  </td>
                  <td style={{
                    padding: '16px',
                    fontSize: '14px',
                    color: '#666'
                  }}>
                    {u.email}
                  </td>
                  <td style={{
                    padding: '16px',
                    fontSize: '14px'
                  }}>
                    {editingUserId === u.id ? (
                      <select
                        value={editingRole}
                        onChange={(e) => setEditingRole(e.target.value)}
                        style={{
                          padding: '6px 10px',
                          border: '1px solid #2563eb',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: '500',
                          color: '#2563eb'
                        }}
                      >
                        {ROLES.map(role => (
                          <option key={role} value={role}>
                            {role.replace('_', ' ')}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span style={{
                        display: 'inline-block',
                        padding: '6px 12px',
                        background: u.role === 'security_team' ? '#fee2e2' :
                                   u.role === 'team_lead' ? '#fef3c7' : '#dbeafe',
                        color: u.role === 'security_team' ? '#991b1b' :
                               u.role === 'team_lead' ? '#92400e' : '#1e40af',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        textTransform: 'capitalize'
                      }}>
                        {u.role.replace('_', ' ')}
                      </span>
                    )}
                  </td>
                  <td style={{
                    padding: '16px',
                    fontSize: '14px',
                    textAlign: 'center',
                    color: '#666'
                  }}>
                    {u.team_id ? `Team #${u.team_id}` : '—'}
                  </td>
                  <td style={{
                    padding: '16px',
                    fontSize: '14px',
                    textAlign: 'center',
                    color: '#666'
                  }}>
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td style={{
                    padding: '16px',
                    textAlign: 'center'
                  }}>
                    {editingUserId === u.id ? (
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleRoleChange(u.id, editingRole)}
                          style={{
                            background: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px'
                          }}
                        >
                          <Check size={14} />
                          Save
                        </button>
                        <button
                          onClick={cancelEditRole}
                          style={{
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px'
                          }}
                        >
                          <X size={14} />
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditRole(u.id, u.role)}
                        style={{
                          background: '#e5e7eb',
                          color: '#374151',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '12px',
                          margin: '0 auto'
                        }}
                      >
                        <Edit2 size={14} />
                        Edit Role
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{
            padding: '60px 20px',
            textAlign: 'center',
            color: '#666'
          }}>
            {searchTerm ? (
              <>
                <p style={{ fontSize: '16px', marginBottom: '8px' }}>No users found matching "{searchTerm}"</p>
                <p style={{ fontSize: '14px' }}>Try a different search term</p>
              </>
            ) : (
              <>
                <p style={{ fontSize: '16px', marginBottom: '8px' }}>No users found</p>
                <p style={{ fontSize: '14px' }}>Users will appear here as they join the organization</p>
              </>
            )}
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
        <strong>ℹ️ Role Information:</strong>
        <ul style={{ margin: '8px 0 0 20px', paddingLeft: 0 }}>
          <li><strong>Security Team:</strong> Full access to all organization data, can manage policies and user roles</li>
          <li><strong>Team Lead:</strong> Access to team data and own team members, limited admin functions</li>
          <li><strong>Employee:</strong> Access to own data only, cannot view other users</li>
        </ul>
      </div>
    </div>
  )
}

export default UserManagement
