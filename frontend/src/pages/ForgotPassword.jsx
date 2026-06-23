import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'https://mfi-data-production.up.railway.app';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await axios.post(`${API}/api/auth/forgot-password`, { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally { setLoading(false); }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>Lucred</div>
        <h1 style={s.h1}>Reset your password</h1>
        <p style={s.sub}>Enter the email you used to register and we'll send a reset link.</p>

        {sent ? (
          <div style={s.success}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>📬</div>
            <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>Check your inbox</div>
            <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
              If <strong>{email}</strong> is registered, a reset link is on its way.
              Check your spam folder if you don't see it within a few minutes.
            </div>
            <Link to="/login" style={{ display: 'inline-block', marginTop: 20, color: '#0ea5e9', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>← Back to login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={s.label}>Email address</label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@yourorg.com"
                style={s.input}
              />
            </div>
            {error && <div style={s.error}>{error}</div>}
            <button type="submit" disabled={loading} style={{ ...s.btn, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
            <Link to="/login" style={{ textAlign: 'center', color: '#64748b', fontSize: 13, textDecoration: 'none' }}>← Back to login</Link>
          </form>
        )}
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Inter,sans-serif' },
  card: { background: '#fff', borderRadius: 16, padding: '2.5rem 2rem', width: '100%', maxWidth: 420, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' },
  logo: { fontSize: 22, fontWeight: 800, color: '#0ea5e9', marginBottom: 24 },
  h1: { fontSize: 20, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' },
  sub: { fontSize: 13, color: '#64748b', lineHeight: 1.6, marginBottom: 24, marginTop: 0 },
  label: { display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none' },
  btn: { padding: '11px 0', borderRadius: 8, border: 'none', background: '#0ea5e9', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  error: { background: '#fee2e2', color: '#dc2626', borderRadius: 8, padding: '9px 14px', fontSize: 13 },
  success: { textAlign: 'center', padding: '1rem 0' },
};
