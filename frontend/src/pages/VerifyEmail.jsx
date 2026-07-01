import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'https://mfi-data-production.up.railway.app';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState('loading'); // loading | success | error

  useEffect(() => {
    const token = params.get('token');
    if (!token) { setStatus('error'); return; }
    axios.post(`${API}/api/auth/verify-email`, { token })
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, []);

  return (
    <div style={{ fontFamily: 'Inter,sans-serif', minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '2.5rem 2rem', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', maxWidth: 400, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#6d28d9', marginBottom: 20 }}>Lucred Credit Engine</div>
        {status === 'loading' && <p style={{ color: '#64748b' }}>Verifying your email…</p>}
        {status === 'success' && (
          <>
            <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>Email verified!</h2>
            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>Your account is now fully activated. You can close this tab or go to your dashboard.</p>
            <Link to="/dashboard" style={{ display: 'inline-block', background: '#6d28d9', color: '#fff', padding: '10px 24px', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
              Go to Dashboard →
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <div style={{ fontSize: 40, marginBottom: 16 }}>❌</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>Link invalid or expired</h2>
            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>This verification link has expired or already been used. Log in and request a new one from your profile.</p>
            <Link to="/login" style={{ display: 'inline-block', background: '#0f172a', color: '#fff', padding: '10px 24px', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
              Back to Login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
