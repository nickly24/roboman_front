import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!authService.isAuthenticated()) {
      setLoading(false);
      return undefined;
    }
    // Roles and branch access must reflect the server, including revoked access.
    authService.getCurrentUser().then(data => {
      if (!active) return;
      const current = { role: data.user.role, user: data.user, profile: data.profile };
      localStorage.setItem('user_data', JSON.stringify(current));
      setUser(current);
    }).catch(() => {
      if (!active) return;
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      setUser(null);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const login = async (login, password) => {
    try {
      const userData = await authService.login(login, password);
      setUser(userData);
      return userData;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    isOwner: user?.role === 'OWNER',
    isTeacher: user?.role === 'TEACHER',
    isBranch: user?.role === 'BRANCH',
    crmAccess: user?.role === 'OWNER' && !!(user?.user?.crm_access === 1 || user?.user?.crm_access === true),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
