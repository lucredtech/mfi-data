import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Overview from './pages/Overview';
import ApiKeys from './pages/ApiKeys';
import Usage from './pages/Usage';
import Docs from './pages/Docs';
import StatementAnalysis from './pages/StatementAnalysis';
import Layout from './components/Layout';

function PrivateRoute({ children }) {
  const { client, loading } = useAuth();
  if (loading) return null;
  return client ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<PrivateRoute><Layout><Overview /></Layout></PrivateRoute>} />
        <Route path="/dashboard/api-keys" element={<PrivateRoute><Layout><ApiKeys /></Layout></PrivateRoute>} />
        <Route path="/dashboard/statement" element={<PrivateRoute><Layout><StatementAnalysis /></Layout></PrivateRoute>} />
        <Route path="/dashboard/usage" element={<PrivateRoute><Layout><Usage /></Layout></PrivateRoute>} />
        <Route path="/dashboard/docs" element={<PrivateRoute><Layout><Docs /></Layout></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <AuthProvider><App /></AuthProvider>
);
