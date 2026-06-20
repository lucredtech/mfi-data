import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { parseApiError } from '../utils/apiError';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      toast.error(parseApiError(err, {
        401: 'Incorrect email or password. Please try again.',
        429: 'Too many sign-in attempts. Please wait 15 minutes and try again.',
        default: 'Sign-in failed. Please try again.',
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>Lucred</div>
        <p style={styles.subtitle}>Sign in to your B2B portal</p>
        <form onSubmit={submit}>
          <label style={styles.label}>Email</label>
          <input style={styles.input} type="email" required value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <label style={styles.label}>Password</label>
          <input style={styles.input} type="password" required value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <button style={styles.btn} disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#64748b' }}>
          No account? <Link to="/register" style={{ color: '#0ea5e9' }}>Register your MFI</Link>
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
