import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'https://mfi-data-production.up.railway.app';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true); setError('');
    try {
      await axios.post(`${API}/api/auth/reset-password`, { token, password });
      setDone(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.response?.data?.error || 'Reset failed. The link may have expired.');
    } finally { setLoading(false); }
  }

  if (!token) return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>Lucred Credit Engine</div>
        <div style={{ color: '#dc2626', fontWeight: 600 }}>Invalid reset link. Please request a new one.</div>
        <Link to="/forgot-password" style={{ display: 'block', marginTop: 16, color: '#0ea5e9', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>Request new link →</Link>
      </div>
    </div>
  );

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>Lucred Credit Engine</div>
        <h1 style={s.h1}>Set new password</h1>
        <p style={s.sub}>Choose a strong password for your account.</p>

        {done ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>✅</div>
            <div style={{ fontWeight: 700, color: '#16a34a', marginBottom: 6 }}>Password updated!</div>
            <div style={{ fontSize: 13, color: '#64748b' }}>Redirecting you to login…</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={s.label}>New password</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters" style={s.input} />
            </div>
            <div>
              <label style={s.label}>Confirm password</label>
              <input type="password" required value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat your new password" style={s.input} />
            </div>
            {error && <div style={s.error}>{error}</div>}
            <button type="submit" disabled={loading} style={{ ...s.btn, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Resetting…' : 'Reset password'}
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
};
