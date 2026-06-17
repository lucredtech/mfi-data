import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import toast from 'react-hot-toast';

export default function AdminLogin() {
  const { login } = useAdmin();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/admin');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>Lucred</div>
        <div style={s.badge}>Admin Panel</div>
        <p style={s.subtitle}>Sign in to manage MFI clients</p>
        <form onSubmit={submit}>
          <label style={s.label}>Email</label>
          <input style={s.input} type="email" required value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <label style={s.label}>Password</label>
          <input style={s.input} type="password" required value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <button style={s.btn} disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1e1b4b', fontFamily: 'Inter, sans-serif' },
  card: { background: '#fff', borderRadius: 12, padding: '2.5rem', width: 380, boxShadow: '0 4px 24px rgba(0,0,0,0.2)' },
  logo: { fontSize: 24, fontWeight: 800, color: '#0f172a' },
  badge: { display: 'inline-block', fontSize: 11, fontWeight: 700, background: '#ede9fe', color: '#6d28d9', padding: '2px 10px', borderRadius: 20, marginTop: 6, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  subtitle: { color: '#64748b', fontSize: 14, marginBottom: 24, marginTop: 0 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, marginBottom: 16, boxSizing: 'border-box' },
  btn: { width: '100%', padding: '11px', background: '#6d28d9', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer' },
};
