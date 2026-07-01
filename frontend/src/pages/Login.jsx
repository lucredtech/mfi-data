import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { parseApiError } from '../utils/apiError';

const STATS = [
  { label: 'BVN Checks Today', value: '2,847', color: '#38bdf8' },
  { label: 'Bureau Queries', value: '1,203', color: '#a78bfa' },
  { label: 'Statements Analysed', value: '419', color: '#34d399' },
  { label: 'Avg Risk Score', value: '72 / 100', color: '#fbbf24' },
];

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
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        .auth-input:focus { border-color: rgba(14,165,233,0.5) !important; box-shadow: 0 0 0 3px rgba(14,165,233,0.08) !important; outline: none; }
        .auth-input { transition: border-color 0.15s, box-shadow 0.15s; }
        .tab-btn:hover { color: #e2e8f0 !important; }
        .sign-btn:hover:not(:disabled) { background: #0284c7 !important; }
        @media (max-width: 860px) {
          .auth-panel { display: none !important; }
          .auth-layout { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div className="auth-layout" style={s.layout}>
        {/* Left panel */}
        <div className="auth-panel" style={s.panel}>
          <div style={s.panelGlow} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <Link to="/" style={s.panelLogo}>
              <div style={s.logoMark}>L</div>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>Lucred Credit Engine</span>
            </Link>
            <div style={{ marginTop: 56 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#0ea5e9', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 20 }}>Live Platform Stats</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {STATS.map(({ label, value, color }) => (
                  <div key={label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#64748b' }}>{label}</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color, fontFamily: "'DM Mono', monospace" }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 48 }}>
              <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.7 }}>
                Trusted by licensed MFIs across Nigeria to run credit assessments, identity verification, and bank statement analysis.
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 24 }}>
                {[['BVN', '#38bdf8'], ['NIN', '#a78bfa'], ['Bureau', '#34d399'], ['Statement', '#fbbf24']].map(([tag, color]) => (
                  <span key={tag} style={{ fontSize: 10, fontWeight: 700, color, background: `${color}18`, border: `1px solid ${color}33`, padding: '3px 10px', borderRadius: 20, letterSpacing: 0.5 }}>{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right form */}
        <div style={s.formSide}>
          <div style={s.card}>
            <div style={s.cardLogo}>
              <div style={s.logoMark}>L</div>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>Lucred Credit Engine</span>
            </div>
            <h1 style={s.heading}>Welcome back</h1>
            <p style={s.sub}>Sign in to your account</p>

            {/* Tab switcher */}
            <div style={s.tabs}>
              {[['org', 'Organisation'], ['member', 'Team Member']].map(([t, label]) => (
                <button key={t} type="button" className="tab-btn" onClick={() => setTab(t)} style={{
                  ...s.tab, ...(tab === t ? s.tabActive : {})
                }}>{label}</button>
              ))}
            </div>

            <form onSubmit={tab === 'org' ? submitOrg : submitMember} style={{ marginTop: 24 }}>
              <div style={s.field}>
                <label style={s.label}>Email</label>
                <input
                  className="auth-input"
                  style={s.input}
                  type="email"
                  placeholder="you@mfi.ng"
                  required
                  value={form.email}
                  onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div style={s.field}>
                <label style={s.label}>Password</label>
                <input
                  className="auth-input"
                  style={s.input}
                  type="password"
                  placeholder="••••••••"
                  required
                  value={form.password}
                  onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                />
              </div>
              <button className="sign-btn" style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in →'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#475569' }}>
              <Link to="/forgot-password" style={{ color: '#64748b', textDecoration: 'none' }}>Forgot password?</Link>
              {tab === 'org' && (
                <span style={{ marginLeft: 12 }}>No account? <Link to="/register" style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 600 }}>Register your MFI</Link></span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: '#060d18', fontFamily: "'Sora', -apple-system, sans-serif", display: 'flex', alignItems: 'stretch' },
  layout: { display: 'grid', gridTemplateColumns: '420px 1fr', width: '100%' },
  panel: { position: 'relative', overflow: 'hidden', background: '#0b1120', borderRight: '1px solid rgba(255,255,255,0.06)', padding: '3rem 2.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  panelGlow: { position: 'absolute', top: -100, left: -100, width: 500, height: 500, background: 'radial-gradient(circle, rgba(14,165,233,0.08) 0%, transparent 65%)', pointerEvents: 'none' },
  panelLogo: { display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' },
  logoMark: { width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #0ea5e9, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: '#fff', flexShrink: 0 },
  formSide: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 2rem' },
  card: { width: '100%', maxWidth: 400 },
  cardLogo: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36, display: 'none' },
  heading: { fontSize: 26, fontWeight: 800, color: '#f1f5f9', margin: '0 0 6px', letterSpacing: -0.5 },
  sub: { fontSize: 14, color: '#64748b', margin: '0 0 28px' },
  tabs: { display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 3, gap: 2 },
  tab: { flex: 1, padding: '8px 0', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: 'transparent', color: '#64748b', fontFamily: "'Sora', sans-serif', transition: 'all 0.15s'" },
  tabActive: { background: '#0b1120', color: '#e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)' },
  field: { marginBottom: 18 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { width: '100%', padding: '11px 14px', background: '#0b1120', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9, fontSize: 14, color: '#e2e8f0', boxSizing: 'border-box', fontFamily: "'Sora', sans-serif" },
  btn: { width: '100%', padding: '13px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 9, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: "'Sora', sans-serif", transition: 'background 0.15s' },
};
