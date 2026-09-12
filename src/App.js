import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import Login from './pages/Login/Login';
import OwnerDashboard from './pages/Dashboard/OwnerDashboard';
import TeacherDashboard from './pages/Dashboard/TeacherDashboard';
import Lessons from './pages/Lessons/Lessons';
import Calendar from './pages/Calendar/Calendar';
import Branches from './pages/Branches/Branches';
import Departments from './pages/Departments/Departments';
import Teachers from './pages/Teachers/Teachers';
import TeacherAccounts from './pages/TeacherAccounts/TeacherAccounts';
import Instructions from './pages/Instructions/Instructions';
import Settings from './pages/Settings/Settings';
import Salary from './pages/Salary/Salary';
import Slots from './pages/Slots/Slots';
import CRMBranches from './pages/CRM/CRMBranches';
import CRMSettings from './pages/CRM/CRMSettings';
import CRMSearch from './pages/CRM/CRMSearch';
import CRMLeads from './pages/CRM/CRMLeads';
import CRMProspects from './pages/CRM/CRMProspects';
import Accounting from './pages/Accounting/Accounting';
import Invoices from './pages/Invoices/Invoices';
import BranchPortal from './pages/BranchPortal/BranchPortal';
import BranchAccounts from './pages/BranchAccounts/BranchAccounts';
import Analytics from './pages/Analytics/Analytics';
import CurriculumPlans from './pages/Curriculum/CurriculumPlans';
import { ThemeProvider } from './context/ThemeContext';
import './App.css';

const DashboardRoute = () => {
  const { isOwner, isBranch } = useAuth();
  if (isBranch) return <Navigate to="/branch/overview" replace />;
  return isOwner ? <OwnerDashboard /> : <TeacherDashboard />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <ThemeProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/branch" element={<Navigate to="/branch/overview" replace />} />
          <Route path="/branch/:section" element={<ProtectedRoute requireRole="BRANCH"><BranchPortal /></ProtectedRoute>} />
          <Route path="/branch-accounts" element={<ProtectedRoute requireRole="OWNER"><BranchAccounts /></ProtectedRoute>} />
          <Route path="/accounting/invoices" element={<ProtectedRoute requireRole="OWNER"><Invoices /></ProtectedRoute>} />
          
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

          <Route path="/schedule" element={<Navigate to="/calendar" replace />} />

          <Route
            path="/calendar"
            element={
              <ProtectedRoute>
                <Calendar />
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
            path="/curriculum"
            element={
              <ProtectedRoute>
                <CurriculumPlans />
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
            path="/crm/settings"
            element={
              <ProtectedRoute requireCrmAccess>
                <CRMSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/crm/search"
            element={
              <ProtectedRoute requireCrmAccess>
                <CRMSearch />
              </ProtectedRoute>
            }
          />
          <Route
            path="/crm/leads"
            element={
              <ProtectedRoute requireCrmAccess>
                <CRMLeads />
              </ProtectedRoute>
            }
          />
          <Route
            path="/crm/prospects"
            element={
              <ProtectedRoute requireCrmAccess>
                <CRMProspects />
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

          <Route
            path="/analytics"
            element={
              <ProtectedRoute requireRole="OWNER">
                <Analytics />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        </ThemeProvider>
      </Router>
    </AuthProvider>
  );
}

export default App;
