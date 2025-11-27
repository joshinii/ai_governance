/**
 * Authentication Context using Auth0
 * Handles SSO login/logout
 */
import { createContext, useContext } from 'react';
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  // For POC, using mock auth
  // In production, use real Auth0 config
  
  const mockAuth = {
    isAuthenticated: true,
    user: {
      email: localStorage.getItem('user_email') || 'demo@company.com',
      name: localStorage.getItem('user_name') || 'Demo User',
      picture: 'https://ui-avatars.com/api/?name=Demo+User'
    },
    loginWithRedirect: () => {
      const email = prompt('Enter your email:');
      const name = prompt('Enter your name:');
      if (email && name) {
        localStorage.setItem('user_email', email);
        localStorage.setItem('user_name', name);
        window.location.reload();
      }
    },
    logout: () => {
      localStorage.removeItem('user_email');
      localStorage.removeItem('user_name');
      window.location.reload();
    }
  };

  return (
    <AuthContext.Provider value={mockAuth}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

// For production with real Auth0:
/*
export function AuthProvider({ children }) {
  return (
    <Auth0Provider
      domain="your-tenant.auth0.com"
      clientId="your-client-id"
      redirectUri={window.location.origin}
      audience="https://your-api.com"
    >
      {children}
    </Auth0Provider>
  );
}

export function useAuth() {
  return useAuth0();
}
*/