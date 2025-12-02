/**
 * ApiProvider Component
 * 
 * Initializes the API service with Auth0 token getter.
 * Wraps the app to ensure API client has access to Auth0 getAccessToken
 */
import { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { setAccessTokenGetter } from '../services/api';

export function ApiProvider({ children }) {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();

  useEffect(() => {
    // Set the token getter function when Auth0 is ready
    if (isAuthenticated) {
      const getToken = async () => {
        try {
          // Get token with the Auth0 API audience
          const token = await getAccessTokenSilently({
            audience: import.meta.env.VITE_AUTH0_AUDIENCE || 'https://ai-governance.fly.dev',
            scope: 'openid profile email'
          });
          return token;
        } catch (error) {
          console.error('Error getting access token:', error);
          return null;
        }
      };

      // Register the token getter with the API service
      setAccessTokenGetter(getToken);
    }
  }, [isAuthenticated, getAccessTokenSilently]);

  return children;
}
