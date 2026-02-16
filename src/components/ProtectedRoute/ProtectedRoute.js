import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children, requireRole, requireCrmAccess }) => {
  const { isAuthenticated, loading, user, crmAccess } = useAuth();

  if (loading) {
    return <div style={{ padding: '48px', textAlign: 'center' }}>Загрузка...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireRole && user?.role !== requireRole) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireCrmAccess && !crmAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
