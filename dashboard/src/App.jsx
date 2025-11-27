import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import UsageAnalytics from './pages/UsageAnalytics'
import ComplianceAlerts from './pages/ComplianceAlerts'
import PromptImprovements from './pages/PromptImprovements'
import Policies from './pages/Policies'
import Login from './pages/Login'
import PromptHistory from './pages/PromptHistory'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout />}>
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
    </AuthProvider>
  )
}

export default App