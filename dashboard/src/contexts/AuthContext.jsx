import { createContext, useContext, useEffect, useState } from 'react';
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react';
import api from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  // Load Auth0 configuration from environment variables
  const auth0Domain = import.meta.env.VITE_AUTH0_DOMAIN || "dev-y75lecimhanaeqy7.us.auth0.com"
  const auth0ClientId = import.meta.env.VITE_AUTH0_CLIENT_ID || "b2Q5VZ2pv4Ve8YralLn1dUtAHeEnpJGl"
  const auth0Audience = import.meta.env.VITE_AUTH0_AUDIENCE || "https://blah-subsequent-personal-synthetic.trycloudflare.com"
  const auth0RedirectUri = import.meta.env.VITE_AUTH0_REDIRECT_URI || window.location.origin

  return (
    <Auth0Provider
      domain={auth0Domain}
      clientId={auth0ClientId}
      authorizationParams={{
        redirect_uri: auth0RedirectUri,
        audience: auth0Audience,
      }}
      onRedirectCallback={(appState) => {
        // After Auth0 login, check if user needs role setup
        window.history.replaceState({}, document.title, appState?.returnTo || "/dashboard");
      }}
    >
      <AuthContextProvider>
        {children}
      </AuthContextProvider>
    </Auth0Provider>
  );
}

function AuthContextProvider({ children }) {
  const auth0 = useAuth0();
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUserProfile() {
      if (auth0.isAuthenticated && !auth0.isLoading) {
        try {
          // Get access token
          const token = await auth0.getAccessTokenSilently();
          
          // Set token in API client
          api.setAuthToken(token);
          
          // Fetch user profile from backend (includes role, team, org)
          const response = await api.get('/users/me');
          setUserProfile(response.data);
          
          console.log('[Auth] User profile loaded:', {
            email: response.data.email,
            role: response.data.role,
            team_id: response.data.team_id
          });
        } catch (error) {
          console.error('[Auth] Failed to load user profile:', error);
          // User might not exist in DB yet - will be created on first API call
        } finally {
          setLoading(false);
        }
      } else if (!auth0.isLoading) {
        setLoading(false);
      }
    }

    loadUserProfile();
  }, [auth0.isAuthenticated, auth0.isLoading]);

  // Helper functions for role checking
  const hasRole = (role) => {
    if (!userProfile) return false;
    return userProfile.role === role;
  };

  const isSecurityTeam = () => hasRole('security_team');
  const isTeamLead = () => hasRole('team_lead');
  const isEmployee = () => hasRole('employee');

  const canViewAllTeams = () => isSecurityTeam();
  const canManageTeam = () => isSecurityTeam() || isTeamLead();

  // Update role (for POC/testing - allows user to select role on first login)
  const updateRole = async (newRole) => {
    try {
      const token = await auth0.getAccessTokenSilently();
      api.setAuthToken(token);
      
      const response = await api.patch('/users/me/role', { new_role: newRole });
      setUserProfile(response.data);
      
      console.log('[Auth] Role updated to:', newRole);
      return response.data;
    } catch (error) {
      console.error('[Auth] Failed to update role:', error);
      throw error;
    }
  };

  const value = {
    // Auth0 properties
    ...auth0,
    
    // User profile from database
    userProfile,
    
    // Combined loading state
    loading: auth0.isLoading || loading,
    
    // Role checking helpers
    hasRole,
    isSecurityTeam,
    isTeamLead,
    isEmployee,
    canViewAllTeams,
    canManageTeam,
    
    // Role management
    updateRole,
    
    // Convenience accessors
    userRole: userProfile?.role,
    userTeam: userProfile?.team_id,
    userOrg: userProfile?.org_id,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}