import { Outlet, NavLink, Navigate } from 'react-router-dom'
import { LayoutDashboard, BarChart3, AlertTriangle, Lightbulb, Shield, LogOut } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

function Layout() {
  const { isAuthenticated, user, logout } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="dashboard-container">
      <nav className="sidebar">
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>
            AI Governance
          </h1>
          <p style={{ color: '#888', fontSize: '14px' }}>Enterprise Control Center</p>
        </div>

        {/* User Info */}
        <div style={{
          padding: '12px',
          background: '#2a2a2a',
          borderRadius: '8px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img 
              src={user.picture} 
              alt={user.name}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%'
              }}
            />
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: 'white' }}>
                {user.name}
              </div>
              <div style={{ fontSize: '12px', color: '#888', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.email}
              </div>
            </div>
          </div>
        </div>
        
        <div>
          <NavLink to="/dashboard" className="nav-link">
            <LayoutDashboard size={20} />
            Dashboard
          </NavLink>
          
          <NavLink to="/usage" className="nav-link">
            <BarChart3 size={20} />
            Usage Analytics
          </NavLink>
          
          <NavLink to="/alerts" className="nav-link">
            <AlertTriangle size={20} />
            Compliance Alerts
          </NavLink>
          
          <NavLink to="/prompts" className="nav-link">
            <Lightbulb size={20} />
            Prompt Improvements
          </NavLink>
          
          <NavLink to="/policies" className="nav-link">
            <Shield size={20} />
            Policies
          </NavLink>
          <NavLink to="/history" className="nav-link"> <Shield size={20} /> Prompt History</NavLink>
          {/* Logout */}
          <button
            onClick={logout}
            className="nav-link"
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              marginTop: '20px',
              color: '#ccc',
              textAlign: 'left'
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