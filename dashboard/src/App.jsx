import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ApiProvider } from './components/ApiProvider'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import UsageAnalytics from './pages/UsageAnalytics'
import ComplianceAlerts from './pages/ComplianceAlerts'
import PromptImprovements from './pages/PromptImprovements'
import Policies from './pages/Policies'
import Login from './pages/Login'
import PromptHistory from './pages/PromptHistory'
import RoleSetup from './pages/RoleSetup'

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading, userProfile, loading } = useAuth();

  // Wait for both Auth0 and user profile to load
  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // Not authenticated → go to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Authenticated but no role set → go to role setup
  // Skip this check if already on role-setup page
  if (!userProfile?.role && window.location.pathname !== '/role-setup') {
    return <Navigate to="/role-setup" replace />;
  }

  return children;
}

function App() {
  return (
    <AuthProvider>
      <ApiProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Route */}
            <Route path="/login" element={<Login />} />

            {/* Role Setup (Protected but before full access) */}
            <Route 
              path="/role-setup" 
              element={
                <ProtectedRoute>
                  <RoleSetup />
                </ProtectedRoute>
              } 
            />

            {/* Protected Routes (Require Auth + Role) */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              {/* Default redirect to dashboard */}
              <Route index element={<Navigate to="/dashboard" replace />} />

              <Route path="dashboard" element={<Dashboard />} />
              <Route path="usage" element={<UsageAnalytics />} />
              <Route path="alerts" element={<ComplianceAlerts />} />
              <Route path="prompts" element={<PromptImprovements />} />
              <Route path="policies" element={<Policies />} />
              <Route path="history" element={<PromptHistory />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ApiProvider>
    </AuthProvider>
  )
}

export default App