import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import Login from './pages/Login/Login';
import OwnerDashboard from './pages/Dashboard/OwnerDashboard';
import TeacherDashboard from './pages/Dashboard/TeacherDashboard';
import Lessons from './pages/Lessons/Lessons';
import Schedule from './pages/Schedule/Schedule';
import Branches from './pages/Branches/Branches';
import Departments from './pages/Departments/Departments';
import Teachers from './pages/Teachers/Teachers';
import TeacherAccounts from './pages/TeacherAccounts/TeacherAccounts';
import Instructions from './pages/Instructions/Instructions';
import Settings from './pages/Settings/Settings';
import Salary from './pages/Salary/Salary';
import Slots from './pages/Slots/Slots';
import CRMBranches from './pages/CRM/CRMBranches';
import CRMBranchChats from './pages/CRM/CRMBranchChats';
import CRMAllChats from './pages/CRM/CRMAllChats';
import CRMChatView from './pages/CRM/CRMChatView';
import CRMNotifications from './pages/CRM/CRMNotifications';
import CRMSettings from './pages/CRM/CRMSettings';
import Accounting from './pages/Accounting/Accounting';
import { ThemeProvider } from './context/ThemeContext';
import './App.css';

const DashboardRoute = () => {
  const { isOwner } = useAuth();
  return isOwner ? <OwnerDashboard /> : <TeacherDashboard />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <ThemeProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardRoute />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/lessons"
            element={
              <ProtectedRoute>
                <Lessons />
              </ProtectedRoute>
            }
          />

          <Route
            path="/schedule"
            element={
              <ProtectedRoute>
                <Schedule />
              </ProtectedRoute>
            }
          />

          <Route
            path="/slots"
            element={
              <ProtectedRoute>
                <Slots />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/branches"
            element={
              <ProtectedRoute requireRole="OWNER">
                <Branches />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/departments"
            element={
              <ProtectedRoute requireRole="OWNER">
                <Departments />
              </ProtectedRoute>
            }
          />

          <Route
            path="/salary"
            element={
              <ProtectedRoute requireRole="OWNER">
                <Salary />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/teachers"
            element={
              <ProtectedRoute requireRole="OWNER">
                <Teachers />
              </ProtectedRoute>
            }
          />

          <Route
            path="/teacher-accounts"
            element={
              <ProtectedRoute requireRole="OWNER">
                <TeacherAccounts />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/instructions"
            element={
              <ProtectedRoute>
                <Instructions />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/settings"
            element={
              <ProtectedRoute requireRole="OWNER">
                <Settings />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/crm"
            element={
              <ProtectedRoute requireCrmAccess>
                <CRMBranches />
              </ProtectedRoute>
            }
          />
          <Route
            path="/crm/notifications"
            element={
              <ProtectedRoute requireCrmAccess>
                <CRMNotifications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/crm/settings"
            element={
              <ProtectedRoute requireCrmAccess>
                <CRMSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/crm/branches/:branchId/chats"
            element={
              <ProtectedRoute requireCrmAccess>
                <CRMBranchChats />
              </ProtectedRoute>
            }
          />
          <Route
            path="/crm/chats"
            element={
              <ProtectedRoute requireCrmAccess>
                <CRMAllChats />
              </ProtectedRoute>
            }
          />
          <Route
            path="/crm/chats/:chatId"
            element={
              <ProtectedRoute requireCrmAccess>
                <CRMChatView />
              </ProtectedRoute>
            }
          />

          <Route
            path="/accounting"
            element={
              <ProtectedRoute requireRole="OWNER">
                <Accounting />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        </ThemeProvider>
      </Router>
    </AuthProvider>
  );
}

export default App;
