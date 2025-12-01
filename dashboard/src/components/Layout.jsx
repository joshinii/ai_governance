import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, BarChart3, AlertTriangle, Lightbulb, Shield, LogOut, History } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

function Layout() {
  const { user, userProfile, logout, isSecurityTeam, isTeamLead, isEmployee } = useAuth();

  const getRoleBadge = () => {
    const role = userProfile?.role;
    
    const badges = {
      security_team: { 
        label: 'Security Team', 
        color: 'bg-red-100 text-red-800 border-red-300',
        icon: '🛡️'
      },
      team_lead: { 
        label: 'Team Lead', 
        color: 'bg-blue-100 text-blue-800 border-blue-300',
        icon: '👥'
      },
      employee: { 
        label: 'Employee', 
        color: 'bg-gray-100 text-gray-800 border-gray-300',
        icon: '👤'
      }
    };
    
    return badges[role] || badges.employee;
  };

  const badge = getRoleBadge();

  return (
    <div className="dashboard-container">
      <nav className="sidebar">
        {/* App Title */}
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px', color: 'white' }}>
            AI Governance
          </h1>
          <p style={{ color: '#888', fontSize: '14px' }}>
            {isSecurityTeam() ? 'Security Control Center' : 
             isTeamLead() ? 'Team Dashboard' : 
             'Personal Dashboard'}
          </p>
        </div>

        {/* User Info with Role Badge */}
        <div style={{
          padding: '12px',
          background: '#2a2a2a',
          borderRadius: '8px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img 
              src={user?.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=4299e1&color=fff`}
              alt={user?.name || 'User'}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: '2px solid #4299e1'
              }}
            />
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: 'white' }}>
                {user?.name || 'User'}
              </div>
              <div style={{ fontSize: '12px', color: '#888', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.email}
              </div>
              <div style={{ marginTop: '4px' }}>
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded border ${badge.color}`}>
                  <span>{badge.icon}</span>
                  <span>{badge.label}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Navigation Links */}
        <div>
          <NavLink to="/dashboard" className="nav-link">
            <LayoutDashboard size={20} />
            Dashboard
            {isSecurityTeam() && <span className="text-xs text-gray-400 ml-auto">All</span>}
            {isTeamLead() && <span className="text-xs text-gray-400 ml-auto">Team</span>}
          </NavLink>
          
          <NavLink to="/usage" className="nav-link">
            <BarChart3 size={20} />
            Usage Analytics
            {isSecurityTeam() && <span className="text-xs text-gray-400 ml-auto">All</span>}
            {isTeamLead() && <span className="text-xs text-gray-400 ml-auto">Team</span>}
          </NavLink>
          
          <NavLink to="/alerts" className="nav-link">
            <AlertTriangle size={20} />
            Compliance Alerts
            {isSecurityTeam() && <span className="text-xs text-gray-400 ml-auto">All</span>}
            {isTeamLead() && <span className="text-xs text-gray-400 ml-auto">Team</span>}
          </NavLink>
          
          <NavLink to="/prompts" className="nav-link">
            <Lightbulb size={20} />
            Prompt Improvements
          </NavLink>
          
          <NavLink to="/policies" className="nav-link">
            <Shield size={20} />
            Policies
            {isSecurityTeam() && <span className="text-xs text-gray-400 ml-auto">Manage</span>}
          </NavLink>
          
          <NavLink to="/history" className="nav-link">
            <History size={20} />
            Prompt History
            {isSecurityTeam() && <span className="text-xs text-gray-400 ml-auto">All</span>}
            {isTeamLead() && <span className="text-xs text-gray-400 ml-auto">Team</span>}
          </NavLink>

          {/* Role Info Section (Collapsible) */}
          {userProfile && (
            <div style={{
              marginTop: '20px',
              padding: '12px',
              background: '#1a1a1a',
              borderRadius: '8px',
              fontSize: '12px'
            }}>
              <div style={{ color: '#666', marginBottom: '4px' }}>Access Level</div>
              <div style={{ color: '#aaa' }}>
                {isSecurityTeam() && 'Organization-wide access'}
                {isTeamLead() && 'Team-level access'}
                {isEmployee() && 'Personal data only'}
              </div>
              {userProfile.team_id && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ color: '#666', marginBottom: '4px' }}>Team</div>
                  <div style={{ color: '#aaa' }}>Team #{userProfile.team_id}</div>
                </div>
              )}
            </div>
          )}
          
          {/* Logout */}
          <button
            onClick={() => logout({ returnTo: window.location.origin })}
            className="nav-link"
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              marginTop: '20px',
              color: '#ccc',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
      </nav>
      
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout