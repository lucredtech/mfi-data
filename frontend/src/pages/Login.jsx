import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { parseApiError } from '../utils/apiError';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('org');
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const submitOrg = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      toast.error(parseApiError(err, {
        401: 'Incorrect email or password.',
        429: 'Too many attempts. Please wait 15 minutes.',
        default: 'Sign-in failed. Please try again.',
      }));
    } finally { setLoading(false); }
  };

  const submitMember = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/member-login', form);
      localStorage.setItem('token', data.token);
      localStorage.setItem('client', JSON.stringify(data.client));
      navigate('/dashboard');
      window.location.reload();
    } catch (err) {
      toast.error(parseApiError(err, {
        401: 'Incorrect email or password.',
        403: 'Your organisation account is suspended.',
        default: 'Sign-in failed. Please try again.',
      }));
    } finally { setLoading(false); }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>Lucred</div>

        <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 8, padding: 3, marginBottom: 24, gap: 2 }}>
          {[['org', 'Organisation'], ['member', 'Team Member']].map(([t, label]) => (
            <button key={t} type="button" onClick={() => setTab(t)} style={{
              flex: 1, padding: '7px 0', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              background: tab === t ? '#fff' : 'transparent',
              color: tab === t ? '#0f172a' : '#64748b',
              boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}>{label}</button>
          ))}
        </div>

        <form onSubmit={tab === 'org' ? submitOrg : submitMember}>
          <label style={styles.label}>Email</label>
          <input style={styles.input} type="email" required value={form.email}
            onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
          <label style={styles.label}>Password</label>
          <input style={styles.input} type="password" required value={form.password}
            onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} />
          <button style={styles.btn} disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#64748b' }}>
          <Link to="/forgot-password" style={{ color: '#94a3b8' }}>Forgot password?</Link>
          {tab === 'org' && <>&nbsp;·&nbsp; No account? <Link to="/register" style={{ color: '#0ea5e9' }}>Register your MFI</Link></>}
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', fontFamily: 'Inter, sans-serif' },
  card: { background: '#fff', borderRadius: 12, padding: '2.5rem', width: 380, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' },
  logo: { fontSize: 24, fontWeight: 800, color: '#0f172a', marginBottom: 4 },
  subtitle: { color: '#64748b', fontSize: 14, marginBottom: 24, marginTop: 0 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, marginBottom: 16, boxSizing: 'border-box', outline: 'none' },
  btn: { width: '100%', padding: '11px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer' },
};
