import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { parseApiError } from '../utils/apiError';

const TRUST_ITEMS = [
  { icon: '🔒', text: 'All data encrypted in transit and at rest' },
  { icon: '🛡', text: 'NDPR-compliant. No data sold to third parties' },
  { icon: '⚡', text: 'Live API access within 1–2 business days' },
  { icon: '✓', text: '3 free analyses every month, no card required' },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const ref = searchParams.get('ref') || '';
  const [form, setForm] = useState({ organizationName: '', email: '', password: '', contactPerson: '', phone: '' });
  const [loading, setLoading] = useState(false);

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register({ ...form, ...(ref ? { ref } : {}) });
      toast.success('Application submitted! Check your email — our team will review and contact you within 1–2 business days.');
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
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        .auth-input:focus { border-color: rgba(14,165,233,0.5) !important; box-shadow: 0 0 0 3px rgba(14,165,233,0.08) !important; outline: none; }
        .reg-btn:hover:not(:disabled) { background: #0284c7 !important; }
        @media (max-width: 900px) {
          .reg-panel { display: none !important; }
          .reg-layout { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div className="reg-layout" style={s.layout}>
        {/* Left panel */}
        <div className="reg-panel" style={s.panel}>
          <div style={s.panelGlow} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <Link to="/" style={s.panelLogo}>
              <div style={s.logoMark}>L</div>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>Lucred Credit Engine</span>
            </Link>

            <div style={{ marginTop: 56 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', lineHeight: 1.35, marginBottom: 12, letterSpacing: -0.5 }}>
                The credit intelligence layer for Nigerian lenders.
              </div>
              <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.75, marginBottom: 36 }}>
                BVN verification, NIN checks, credit bureau data, and bank statement analysis — all in one API.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {TRUST_ITEMS.map(({ icon, text }) => (
                  <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{icon}</div>
                    <span style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>{text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 48, padding: '18px 20px', background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)', borderRadius: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#34d399', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Free Tier</div>
              <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>
                Start with <strong style={{ color: '#34d399' }}>3 free analyses every month</strong>. No card needed. Top up when you're ready to scale.
              </div>
            </div>
          </div>
        </div>

        {/* Right form */}
        <div style={s.formSide}>
          <div style={s.card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
              <div style={{ ...s.logoMark, display: 'none' }}>L</div>
            </div>

            <h1 style={s.heading}>Register your MFI</h1>
            <p style={s.sub}>Get API access to identity verification, credit bureau, and statement analysis.</p>

            <form onSubmit={submit}>
              {[
                { key: 'organizationName', label: 'Organisation Name', type: 'text', placeholder: 'e.g. Sunlight MFB Ltd' },
                { key: 'contactPerson', label: 'Contact Person', type: 'text', placeholder: 'Full name' },
                { key: 'email', label: 'Work Email', type: 'email', placeholder: 'you@mfi.ng' },
                { key: 'phone', label: 'Phone (optional)', type: 'tel', placeholder: '+234 800 000 0000' },
                { key: 'password', label: 'Password', type: 'password', placeholder: '8+ characters' },
              ].map(({ key, label, type, placeholder }) => (
                <div key={key} style={s.field}>
                  <label style={s.label}>{label}</label>
                  <input
                    className="auth-input"
                    style={s.input}
                    type={type}
                    placeholder={placeholder}
                    value={form[key]}
                    onChange={update(key)}
                    required={key !== 'phone'}
                  />
                </div>
              ))}
              <button className="reg-btn" style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
                {loading ? 'Creating account…' : 'Create account →'}
              </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#475569' }}>
              Have an account? <Link to="/login" style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
            </p>
            <p style={{ textAlign: 'center', fontSize: 11, color: '#334155', marginTop: 14, lineHeight: 1.6 }}>
              By creating an account you agree to our{' '}
              <Link to="/terms" style={{ color: '#64748b', textDecoration: 'none' }}>Terms of Service</Link>
              {' '}and{' '}
              <Link to="/privacy-policy" style={{ color: '#64748b', textDecoration: 'none' }}>Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: '#060d18', fontFamily: "'Sora', -apple-system, sans-serif", display: 'flex', alignItems: 'stretch' },
  layout: { display: 'grid', gridTemplateColumns: '400px 1fr', width: '100%' },
  panel: { position: 'relative', overflow: 'hidden', background: '#0b1120', borderRight: '1px solid rgba(255,255,255,0.06)', padding: '3rem 2.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  panelGlow: { position: 'absolute', bottom: -100, right: -100, width: 500, height: 500, background: 'radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 65%)', pointerEvents: 'none' },
  panelLogo: { display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' },
  logoMark: { width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #0ea5e9, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: '#fff', flexShrink: 0 },
  formSide: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 2rem', overflowY: 'auto' },
  card: { width: '100%', maxWidth: 420 },
  heading: { fontSize: 24, fontWeight: 800, color: '#f1f5f9', margin: '0 0 8px', letterSpacing: -0.5 },
  sub: { fontSize: 13, color: '#64748b', margin: '0 0 28px', lineHeight: 1.6 },
  field: { marginBottom: 16 },
  label: { display: 'block', fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { width: '100%', padding: '11px 14px', background: '#0b1120', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9, fontSize: 14, color: '#e2e8f0', boxSizing: 'border-box', fontFamily: "'Sora', sans-serif", transition: 'border-color 0.15s, box-shadow 0.15s' },
  btn: { width: '100%', padding: '13px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 9, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: "'Sora', sans-serif", transition: 'background 0.15s', marginTop: 4 },
};
