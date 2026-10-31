import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('borrowhub_token'));
  const [loading, setLoading] = useState(true);

  // Initialize session: restore existing token or start unauthenticated
  useEffect(() => {
    const initAuth = async () => {
      try {
        const savedToken = localStorage.getItem('borrowhub_token');
        if (savedToken) {
          const profile = await api.getMe();
          setUser(profile.user);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.warn('Initial session check failed, resetting token:', err.message);
        localStorage.removeItem('borrowhub_token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const data = await api.login(email, password);
    localStorage.setItem('borrowhub_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (userData) => {
    const data = await api.register(userData);
    localStorage.setItem('borrowhub_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('borrowhub_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        loading,
        login,
        register,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
