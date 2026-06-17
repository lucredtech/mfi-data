import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AdminProvider, useAdmin } from './context/AdminContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Overview from './pages/Overview';
import ApiKeys from './pages/ApiKeys';
import Usage from './pages/Usage';
import Docs from './pages/Docs';
import StatementAnalysis from './pages/StatementAnalysis';
import StatementDetail from './pages/StatementDetail';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import AdminLogin from './pages/admin/AdminLogin';
import AdminOverview from './pages/admin/AdminOverview';
import AdminClients from './pages/admin/AdminClients';
import AdminClientDetail from './pages/admin/AdminClientDetail';

function PrivateRoute({ children }) {
  const { client, loading } = useAuth();
  if (loading) return null;
  return client ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { admin, loading } = useAdmin();
  if (loading) return null;
  return admin ? children : <Navigate to="/admin/login" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<PrivateRoute><Layout><Overview /></Layout></PrivateRoute>} />
        <Route path="/dashboard/api-keys" element={<PrivateRoute><Layout><ApiKeys /></Layout></PrivateRoute>} />
        <Route path="/dashboard/statement" element={<PrivateRoute><Layout><StatementAnalysis /></Layout></PrivateRoute>} />
        <Route path="/dashboard/statements/:id" element={<PrivateRoute><Layout><StatementDetail /></Layout></PrivateRoute>} />
        <Route path="/dashboard/usage" element={<PrivateRoute><Layout><Usage /></Layout></PrivateRoute>} />
        <Route path="/dashboard/docs" element={<PrivateRoute><Layout><Docs /></Layout></PrivateRoute>} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminRoute><AdminLayout><AdminOverview /></AdminLayout></AdminRoute>} />
        <Route path="/admin/clients" element={<AdminRoute><AdminLayout><AdminClients /></AdminLayout></AdminRoute>} />
        <Route path="/admin/clients/:id" element={<AdminRoute><AdminLayout><AdminClientDetail /></AdminLayout></AdminRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <AdminProvider><AuthProvider><App /></AuthProvider></AdminProvider>
);
