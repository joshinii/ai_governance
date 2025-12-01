/**
 * API service for communicating with backend
 * All API calls go through this service with Auth0 JWT authentication
 */
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'https://blah-subsequent-personal-synthetic.trycloudflare.com'

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Store for Auth0 token getter (set by ApiProvider wrapper component)
let getAccessTokenFn = null;

/**
 * Set the Auth0 token getter function
 * Called by ApiProvider component wrapper
 * @param {Function} tokenFn - Async function that returns Auth0 access token
 */
export function setAccessTokenGetter(tokenFn) {
  getAccessTokenFn = tokenFn;
}

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  if (getAccessTokenFn) {
    try {
      const token = await getAccessTokenFn();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('[API] Failed to get access token:', error);
    }
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('[API] Unauthorized - token may be expired');
      // Could trigger re-auth here
    } else if (error.response?.status === 403) {
      console.error('[API] Forbidden - insufficient permissions');
    }
    return Promise.reject(error);
  }
);

// Set auth token directly (alternative to using getter)
api.setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// Users API
export const usersApi = {
  // Get current user profile
  getCurrentUser: async () => {
    const response = await api.get('/users/me');
    return response.data;
  },

  // Update current user's role (POC only)
  updateMyRole: async (role) => {
    const response = await api.patch('/users/me/role', { new_role: role });
    return response.data;
  },

  // Update another user's role (security team only)
  updateUserRole: async (userId, role) => {
    const response = await api.patch(`/users/${userId}/role?new_role=${encodeURIComponent(role)}`);
    return response.data;
  },

  // Get accessible user IDs for filtering
  getAccessibleUserIds: async () => {
    const response = await api.get('/users/accessible-users/ids');
    return response.data;
  },

  // List users (filtered by permissions)
  listUsers: async (teamId = null) => {
    const params = teamId ? `?team_id=${teamId}` : '';
    const response = await api.get(`/users/${params}`);
    return response.data;
  },

  // Get teams (team leads and security only)
  getTeams: async () => {
    const response = await api.get('/users/teams');
    return response.data;
  },

  // Get team members
  getTeamMembers: async (teamId) => {
    const response = await api.get(`/users/team/${teamId}/members`);
    return response.data;
  }
};

// Usage Logs API
export const usageApi = {
  // Get usage logs with filters (role-based access)
  getLogs: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.user_email) params.append('user_email', filters.user_email);
    if (filters.tool) params.append('tool', filters.tool);
    if (filters.days) params.append('days', filters.days);
    
    const response = await api.get(`/usage-logs/?${params}`);
    return response.data;
  },
  
  // Get usage statistics (role-based)
  getStats: async (days = 7) => {
    const response = await api.get(`/usage-logs/stats?days=${days}`);
    return response.data;
  },
  
  // Create usage log (called by extension)
  createLog: async (logData) => {
    const response = await api.post('/usage-logs/', logData);
    return response.data;
  }
};

// Analytics API
export const analyticsApi = {
  // Get usage statistics
  getUsageStats: async (days = 7) => {
    const response = await api.get(`/analytics/usage?days=${days}`);
    return response.data;
  },
  
  // Get prompt improvement statistics
  getPromptStats: async (days = 7) => {
    const response = await api.get(`/analytics/prompt-improvements?days=${days}`);
    return response.data;
  }
};

// Policies API
export const policiesApi = {
  // Get policies for an organization
  getPolicies: async (orgId = 1) => {
    const response = await api.get(`/policies/${orgId}`);
    return response.data;
  },
  
  // Create new policy
  createPolicy: async (policyData) => {
    const response = await api.post('/policies', policyData);
    return response.data;
  }
};

// Alerts API
export const alertsApi = {
  // Get alerts with filters
  getAlerts: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.resolved !== undefined) params.append('resolved', filters.resolved);
    if (filters.days) params.append('days', filters.days);

    const response = await api.get(`/alerts?${params}`);
    return response.data;
  },

  // Create alert
  createAlert: async (alertData) => {
    const response = await api.post('/alerts', alertData);
    return response.data;
  },

  // Resolve alert
  resolveAlert: async (alertId) => {
    const response = await api.patch(`/alerts/${alertId}/resolve`);
    return response.data;
  }
};

// Prompt History API
export const promptHistoryApi = {
  // Get prompt history with filters and pagination
  getHistory: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.tool) params.append('tool', filters.tool);
    if (filters.had_pii !== undefined) params.append('had_pii', filters.had_pii);
    if (filters.days) params.append('days', filters.days);
    if (filters.page) params.append('page', filters.page);
    if (filters.page_size) params.append('page_size', filters.page_size);

    const response = await api.get(`/prompt-history/?${params}`);
    return response.data;
  },

  // Get prompt history statistics
  getStats: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.days) params.append('days', filters.days);

    const response = await api.get(`/prompt-history/stats?${params}`);
    return response.data;
  },

  // Get specific prompt history entry
  getById: async (historyId) => {
    const response = await api.get(`/prompt-history/${historyId}`);
    return response.data;
  },

  // Delete prompt history entry
  delete: async (historyId) => {
    const response = await api.delete(`/prompt-history/${historyId}`);
    return response.data;
  }
};

export default api;