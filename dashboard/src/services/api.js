/**
 * API service for communicating with backend
 * All API calls go through this service
 */
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const API_KEY = import.meta.env.VITE_API_KEY || 'dev-secret-key-change-in-production'

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY
  }
})

// Usage Logs API
export const usageApi = {
  // Get usage logs with filters
  getLogs: async (filters = {}) => {
    const params = new URLSearchParams()
    if (filters.user_email) params.append('user_email', filters.user_email)
    if (filters.tool) params.append('tool', filters.tool)
    if (filters.days) params.append('days', filters.days)
    
    const response = await api.get(`/usage-logs/?${params}`)
    return response.data
  },
  
  // Create usage log (called by extension)
  createLog: async (logData) => {
    const response = await api.post('/usage-logs/', logData)
    return response.data
  }
}

// Analytics API
export const analyticsApi = {
  // Get usage statistics
  getUsageStats: async (days = 7) => {
    const response = await api.get(`/analytics/usage?days=${days}`)
    return response.data
  },
  
  // Get prompt improvement statistics
  getPromptStats: async (days = 7) => {
    const response = await api.get(`/analytics/prompt-improvements?days=${days}`)
    return response.data
  }
}

// Policies API
export const policiesApi = {
  // Get policies for an organization
  getPolicies: async (orgId = 1) => {
    const response = await api.get(`/policies/${orgId}`)
    return response.data
  },
  
  // Create new policy
  createPolicy: async (policyData) => {
    const response = await api.post('/policies', policyData)
    return response.data
  }
}

// Alerts API
export const alertsApi = {
  // Get alerts with filters
  getAlerts: async (filters = {}) => {
    const params = new URLSearchParams()
    if (filters.resolved !== undefined) params.append('resolved', filters.resolved)
    if (filters.days) params.append('days', filters.days)
    
    const response = await api.get(`/alerts?${params}`)
    return response.data
  },
  
  // Create alert
  createAlert: async (alertData) => {
    const response = await api.post('/alerts', alertData)
    return response.data
  },
  
  // Resolve alert
  resolveAlert: async (alertId) => {
    const response = await api.patch(`/alerts/${alertId}/resolve`)
    return response.data
  }
}

export default api
