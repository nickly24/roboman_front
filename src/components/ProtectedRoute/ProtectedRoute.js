import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children, requireRole, requireCrmAccess }) => {
  const { isAuthenticated, loading, user, crmAccess } = useAuth();
  const { pathname } = useLocation();

  if (loading) {
    return <div style={{ padding: '48px', textAlign: 'center' }}>Загрузка...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role === 'BRANCH' && !pathname.startsWith('/branch/')) {
    return <Navigate to="/branch/overview" replace />;
  }

  if (requireRole && user?.role !== requireRole) {
    return <Navigate to={user?.role === 'BRANCH' ? '/branch/overview' : '/dashboard'} replace />;
  }

  if (requireCrmAccess && !crmAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
