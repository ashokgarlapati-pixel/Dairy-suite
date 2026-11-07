import React, { createContext, useContext, useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize session from localStorage or fetch profile from backend
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem('dairy_auth_token');
        const storedUser = localStorage.getItem('dairy_auth_user');

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));

          // Verify token validity with backend
          try {
            const res = await axiosClient.get('/auth/me');
            if (res.data?.user) {
              setUser(res.data.user);
              localStorage.setItem('dairy_auth_user', JSON.stringify(res.data.user));
            }
          } catch (verifyErr) {
            // Token expired or invalid
            console.warn('Session verification failed, logging out:', verifyErr);
            localStorage.removeItem('dairy_auth_token');
            localStorage.removeItem('dairy_auth_user');
            setToken(null);
            setUser(null);
          }
        }
      } catch (err) {
        console.error('Failed to load session:', err);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  /**
   * Real backend login call
   */
  const login = async (email, password, rememberMe = false) => {
    const res = await axiosClient.post('/auth/login', {
      email,
      password,
      rememberMe
    });

    const { user: userData, accessToken, defaultRoute } = res.data;

    setToken(accessToken);
    setUser(userData);

    localStorage.setItem('dairy_auth_token', accessToken);
    localStorage.setItem('dairy_auth_user', JSON.stringify(userData));

    return { user: userData, defaultRoute };
  };

  /**
   * Real backend logout call
   */
  const logout = async () => {
    try {
      await axiosClient.post('/auth/logout');
    } catch (e) {
      // Ignore network errors on logout
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem('dairy_auth_token');
      localStorage.removeItem('dairy_auth_user');
      window.location.href = '/login';
    }
  };

  /**
   * Switch simulated role for rapid testing of RBAC UI
   */
  const switchRole = (newRole) => {
    if (user) {
      const updated = { ...user, role: newRole };
      setUser(updated);
      localStorage.setItem('dairy_auth_user', JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user && !!token,
        role: user?.role || 'MAINTENANCE_ADMIN',
        orgScope: user?.orgScope || {},
        login,
        logout,
        switchRole
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
