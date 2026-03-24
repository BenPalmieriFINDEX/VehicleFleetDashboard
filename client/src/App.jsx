import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import FleetRegister from './pages/FleetRegister';
import VehicleDetail from './pages/VehicleDetail';
import PersonalUse from './pages/PersonalUse';
import Contracts from './pages/Contracts';
import Reporting from './pages/Reporting';
import ImportData from './pages/ImportData';
import AIAssistant from './pages/AIAssistant';
import Alerts from './pages/Alerts';
import UsageLog from './pages/UsageLog';
import Settings from './pages/Settings';
import UserManagement from './pages/UserManagement';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-findex-midnight">
        <div className="text-center">
          <div className="text-3xl font-bold tracking-widest mb-3">
            <span className="border-b-[3px] border-findex-orange pb-0.5">FIN</span>DEX
          </div>
          <div className="text-gray-500 text-sm">Loading...</div>
        </div>
      </div>
    );
  }
  return user ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="fleet" element={<FleetRegister />} />
        <Route path="fleet/:registration" element={<VehicleDetail />} />
        <Route path="personal-use" element={<PersonalUse />} />
        <Route path="contracts" element={<Contracts />} />
        <Route path="reporting" element={<Reporting />} />
        <Route path="import" element={<ImportData />} />
        <Route path="assistant" element={<AIAssistant />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="usage-log" element={<UsageLog />} />
        <Route path="settings" element={<Settings />} />
        <Route path="users" element={<UserManagement />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
