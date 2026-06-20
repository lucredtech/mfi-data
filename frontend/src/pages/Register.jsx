import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { parseApiError } from '../utils/apiError';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ organizationName: '', email: '', password: '', contactPerson: '', phone: '' });
  const [loading, setLoading] = useState(false);

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await register(form);
      toast.success(`Welcome! Your API key: ${data.apiKey}`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(parseApiError(err, {
        409: 'An account with this email already exists. Please sign in instead.',
        429: 'Too many registration attempts. Please try again in a few minutes.',
        default: 'Registration failed. Please check your details and try again.',
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>Lucred</div>
        <p style={styles.subtitle}>Register your MFI for API access</p>
        <form onSubmit={submit}>
          {[
            { key: 'organizationName', label: 'Organization Name', type: 'text' },
            { key: 'contactPerson', label: 'Contact Person', type: 'text' },
            { key: 'email', label: 'Work Email', type: 'email' },
            { key: 'phone', label: 'Phone (optional)', type: 'tel' },
            { key: 'password', label: 'Password', type: 'password' },
          ].map(({ key, label, type }) => (
            <div key={key}>
              <label style={styles.label}>{label}</label>
              <input style={styles.input} type={type} value={form[key]} onChange={update(key)}
                required={key !== 'phone'} />
            </div>
          ))}
          <button style={styles.btn} disabled={loading}>{loading ? 'Creating account…' : 'Create account'}</button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#64748b' }}>
          Have an account? <Link to="/login" style={{ color: '#0ea5e9' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', fontFamily: 'Inter, sans-serif' },
  card: { background: '#fff', borderRadius: 12, padding: '2.5rem', width: 420, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' },
  logo: { fontSize: 24, fontWeight: 800, color: '#0f172a', marginBottom: 4 },
  subtitle: { color: '#64748b', fontSize: 14, marginBottom: 24, marginTop: 0 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, marginBottom: 16, boxSizing: 'border-box', outline: 'none' },
  btn: { width: '100%', padding: '11px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer' },
};
