import React from 'react';
import ReactDOM from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import { AdminProvider, useAdmin } from './context/AdminContext';
import Landing from './pages/Landing';
import Pricing from './pages/Pricing';
import Login from './pages/Login';
import Register from './pages/Register';
import Overview from './pages/Overview';
import ApiKeys from './pages/ApiKeys';
import Usage from './pages/Usage';
import Docs from './pages/Docs';
import StatementAnalysis from './pages/StatementAnalysis';
import StatementDetail from './pages/StatementDetail';
import BVNVerification from './pages/BVNVerification';
import NINVerification from './pages/NINVerification';
import CreditBureau from './pages/CreditBureau';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import AdminLogin from './pages/admin/AdminLogin';
import Privacy from './pages/Privacy';
import AdminOverview from './pages/admin/AdminOverview';
import AdminClients from './pages/admin/AdminClients';
import AdminClientDetail from './pages/admin/AdminClientDetail';
import NotFound from './pages/NotFound';
import AuditLog from './pages/AuditLog'
import LoanPipeline from './pages/LoanPipeline'
import BulkVerify from './pages/BulkVerify'
import PublicDocs from './pages/PublicDocs';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Terms from './pages/Terms';
import Security from './pages/Security';
import Support from './pages/Support';
import FeatureRequest from './pages/FeatureRequest';
import AdminFeatureRequests from './pages/admin/AdminFeatureRequests';
import AdminAuditLog from './pages/admin/AdminAuditLog';
import Webhooks from './pages/Webhooks';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Profile from './pages/Profile';
import Referral from './pages/Referral';
import Billing from './pages/Billing';
import Changelog from './pages/Changelog';

function PrivateRoute({ children }) {
  const { client, loading } = useAuth();
  if (loading) return null;
  return client ? <ErrorBoundary>{children}</ErrorBoundary> : <Navigate to="/login" replace />;
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
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/dashboard" element={<PrivateRoute><Layout><Overview /></Layout></PrivateRoute>} />
        <Route path="/dashboard/api-keys" element={<PrivateRoute><Layout><ApiKeys /></Layout></PrivateRoute>} />
        <Route path="/dashboard/statement" element={<PrivateRoute><Layout><StatementAnalysis /></Layout></PrivateRoute>} />
        <Route path="/dashboard/statements/:id" element={<PrivateRoute><Layout><StatementDetail /></Layout></PrivateRoute>} />
        <Route path="/dashboard/bvn" element={<PrivateRoute><Layout><BVNVerification /></Layout></PrivateRoute>} />
        <Route path="/dashboard/nin" element={<PrivateRoute><Layout><NINVerification /></Layout></PrivateRoute>} />
        <Route path="/dashboard/credit-bureau" element={<PrivateRoute><Layout><CreditBureau /></Layout></PrivateRoute>} />
        <Route path="/dashboard/customers" element={<PrivateRoute><Layout><Customers /></Layout></PrivateRoute>} />
        <Route path="/dashboard/customers/:id" element={<PrivateRoute><Layout><CustomerDetail /></Layout></PrivateRoute>} />
        <Route path="/dashboard/usage" element={<PrivateRoute><Layout><Usage /></Layout></PrivateRoute>} />
        <Route path="/dashboard/docs" element={<PrivateRoute><Layout><Docs /></Layout></PrivateRoute>} />
        <Route path="/dashboard/audit" element={<PrivateRoute><Layout><AuditLog /></Layout></PrivateRoute>} />
        <Route path="/dashboard/pipeline" element={<PrivateRoute><Layout><LoanPipeline /></Layout></PrivateRoute>} />
        <Route path="/dashboard/bulk-verify" element={<PrivateRoute><Layout><BulkVerify /></Layout></PrivateRoute>} />
        <Route path="/dashboard/webhooks" element={<PrivateRoute><Layout><Webhooks /></Layout></PrivateRoute>} />
        <Route path="/dashboard/feature-request" element={<PrivateRoute><Layout><FeatureRequest /></Layout></PrivateRoute>} />
        <Route path="/dashboard/privacy" element={<PrivateRoute><Layout><Privacy /></Layout></PrivateRoute>} />
        <Route path="/dashboard/profile" element={<PrivateRoute><Layout><Profile /></Layout></PrivateRoute>} />
        <Route path="/dashboard/referral" element={<PrivateRoute><Layout><Referral /></Layout></PrivateRoute>} />
        <Route path="/dashboard/billing" element={<PrivateRoute><Layout><Billing /></Layout></PrivateRoute>} />
        <Route path="/docs" element={<PublicDocs />} />
        <Route path="/changelog" element={<Changelog />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/security" element={<Security />} />
        <Route path="/support" element={<Support />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminRoute><AdminLayout><AdminOverview /></AdminLayout></AdminRoute>} />
        <Route path="/admin/clients" element={<AdminRoute><AdminLayout><AdminClients /></AdminLayout></AdminRoute>} />
        <Route path="/admin/clients/:id" element={<AdminRoute><AdminLayout><AdminClientDetail /></AdminLayout></AdminRoute>} />
        <Route path="/admin/feature-requests" element={<AdminRoute><AdminLayout><AdminFeatureRequests /></AdminLayout></AdminRoute>} />
        <Route path="/admin/audit" element={<AdminRoute><AdminLayout><AdminAuditLog /></AdminLayout></AdminRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <AdminProvider><AuthProvider><App /><Analytics /></AuthProvider></AdminProvider>
);
