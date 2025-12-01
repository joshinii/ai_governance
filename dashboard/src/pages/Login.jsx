import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Login() {
  const { isAuthenticated, loginWithRedirect } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div style={{
        background: 'white',
        padding: '48px',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        textAlign: 'center',
        maxWidth: '400px'
      }}>
        <h1 style={{ fontSize: '32px', marginBottom: '16px', color: '#1a1a1a' }}>
          🛡️ AI Governance
        </h1>
        <p style={{ color: '#666', marginBottom: '32px' }}>
          Enterprise AI Monitoring & Control
        </p>
        
        <button
          onClick={() => loginWithRedirect()}
          style={{
            width: '100%',
            padding: '14px',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Sign In with SSO
        </button>

        <p style={{ marginTop: '24px', fontSize: '12px', color: '#999' }}>
          For POC: Click to enter credentials
        </p>
      </div>
    </div>
  );
}

export default Login;
