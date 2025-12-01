import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, User } from 'lucide-react';

export default function RoleSetup() {
  // Ensure Tailwind is loaded
  useEffect(() => {
    if (!document.getElementById('tailwind-cdn')) {
      const link = document.createElement('link');
      link.id = 'tailwind-cdn';
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css';
      document.head.appendChild(link);
    }
  }, []);
  const { userProfile, updateRole, loading } = useAuth();
  const [selectedRole, setSelectedRole] = useState('');
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const roles = [
    {
      value: 'security_team',
      name: 'Security Team',
      icon: Shield,
      color: 'red',
      description: 'View and manage all data across the entire organization',
      permissions: [
        'View all users and teams',
        'Access organization-wide analytics',
        'View all compliance alerts',
        'Manage policies and settings',
        'Full dashboard access'
      ]
    },
    {
      value: 'team_lead',
      name: 'Team Lead',
      icon: Users,
      color: 'blue',
      description: 'Manage and view your team\'s data and members',
      permissions: [
        'View own and team dashboard',
        'View team members\' analytics',
        'View team compliance alerts',
        'Manage team members',
        'View team prompt history'
      ]
    },
    {
      value: 'employee',
      name: 'Employee',
      icon: User,
      color: 'gray',
      description: 'View your own personal data and activity',
      permissions: [
        'View personal dashboard',
        'View own usage analytics',
        'View own compliance alerts',
        'View own prompt history',
        'Manage personal preferences'
      ]
    }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRole) {
      setError('Please select a role');
      return;
    }

    setUpdating(true);
    setError('');
    
    try {
      await updateRole(selectedRole);
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to update role:', error);
      setError('Failed to update role. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // If user already has a non-default role, redirect to dashboard
  if (userProfile?.role && userProfile.role !== 'employee') {
    navigate('/dashboard');
    return null;
  }

  const getColorClasses = (color) => {
    const colors = {
      red: {
        border: 'border-red-500',
        bg: 'bg-red-50',
        text: 'text-red-600',
        icon: 'text-red-500'
      },
      blue: {
        border: 'border-blue-500',
        bg: 'bg-blue-50',
        text: 'text-blue-600',
        icon: 'text-blue-500'
      },
      gray: {
        border: 'border-gray-500',
        bg: 'bg-gray-50',
        text: 'text-gray-600',
        icon: 'text-gray-500'
      }
    };
    return colors[color] || colors.gray;
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-gray-800 rounded-lg shadow-2xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Shield className="w-12 h-12 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome to AI Governance
          </h1>
          <p className="text-gray-400">
            Please select your role to continue to the dashboard
          </p>
          {userProfile && (
            <p className="text-sm text-gray-500 mt-2">
              Logged in as: {userProfile.email}
            </p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-900 border border-red-700 rounded-lg">
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        {/* Role Selection Form */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 mb-8">
            {roles.map((role) => {
              const colors = getColorClasses(role.color);
              const Icon = role.icon;
              const isSelected = selectedRole === role.value;
              
              return (
                <label
                  key={role.value}
                  className={`block border-2 rounded-lg p-6 cursor-pointer transition-all ${
                    isSelected
                      ? `${colors.border} bg-gray-700`
                      : 'border-gray-600 hover:border-gray-500 bg-gray-750'
                  }`}
                >
                  <div className="flex items-start">
                    <input
                      type="radio"
                      name="role"
                      value={role.value}
                      checked={isSelected}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="mt-1 mr-4"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Icon className={`w-6 h-6 ${isSelected ? colors.icon : 'text-gray-400'}`} />
                        <h3 className="text-lg font-semibold text-white">
                          {role.name}
                        </h3>
                        {role.value === 'employee' && (
                          <span className="text-xs bg-gray-600 text-gray-300 px-2 py-1 rounded">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 mb-3">
                        {role.description}
                      </p>
                      <div className="space-y-1">
                        {role.permissions.map((perm, idx) => (
                          <div key={idx} className="flex items-center text-sm text-gray-300">
                            <svg className="w-4 h-4 mr-2 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            {perm}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!selectedRole || updating}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition"
          >
            {updating ? 'Setting up your account...' : 'Continue to Dashboard'}
          </button>
        </form>

        {/* Info Note */}
        <div className="mt-6 p-4 bg-yellow-900 border border-yellow-700 rounded-lg">
          <p className="text-sm text-yellow-200">
            <strong>Note:</strong> This is a one-time setup for the POC. In production, roles would be assigned by administrators based on your position.
          </p>
        </div>
      </div>
    </div>
  );
}