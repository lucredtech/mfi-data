import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function AcceptInvite() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');

  const [invite, setInvite] = useState(null);   // { email, role, orgName }
  const [status, setStatus] = useState('loading'); // loading | ready | invalid | done
  const [form, setForm] = useState({ name: '', password: '', confirm: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }
    api.get(`/api/auth/invite?token=${token}`)
      .then(({ data }) => { setInvite(data); setStatus('ready'); })
      .catch(() => setStatus('invalid'));
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return; }
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setSaving(true);
    try {
      const { data } = await api.post('/api/auth/accept-invite', { token, name: form.name, password: form.password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('client', JSON.stringify(data.client));
      setStatus('done');
      setTimeout(() => { navigate('/dashboard'); window.location.reload(); }, 1200);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to accept invite');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ fontFamily: 'Inter,sans-serif', minHeight: '100vh', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: '2.5rem 2rem', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', maxWidth: 420, width: '100%' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#6d28d9', marginBottom: 20 }}>Lucred Credit Engine</div>

        {status === 'loading' && <p style={{ color: '#64748b' }}>Validating invite…</p>}

        {status === 'invalid' && (
          <>
            <div style={{ fontSize: 36, marginBottom: 12 }}>❌</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>Invite invalid or expired</h2>
            <p style={{ color: '#64748b', fontSize: 14 }}>This invite link has expired or already been used. Ask your admin to resend it.</p>
          </>
        )}

        {status === 'done' && (
          <>
            <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>Welcome aboard!</h2>
            <p style={{ color: '#64748b', fontSize: 14 }}>Redirecting to dashboard…</p>
          </>
        )}

        {status === 'ready' && invite && (
          <>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
              Join {invite.orgName}
            </h2>
            <p style={{ color: '#64748b', fontSize: 13, marginBottom: 24 }}>
              You've been invited as a <strong style={{ color: '#6d28d9', textTransform: 'capitalize' }}>{invite.role}</strong> · {invite.email}
            </p>
            <form onSubmit={submit}>
              {[
                { key: 'name', label: 'Your name', type: 'text', placeholder: 'Amaka Obi' },
                { key: 'password', label: 'Create password', type: 'password', placeholder: 'At least 8 characters' },
                { key: 'confirm', label: 'Confirm password', type: 'password', placeholder: 'Repeat password' },
              ].map(({ key, label, type, placeholder }) => (
                <div key={key} style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>{label}</label>
                  <input
                    type={type} placeholder={placeholder} required
                    value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
                  />
                </div>
              ))}
              <button disabled={saving} style={{ width: '100%', padding: 11, background: '#6d28d9', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Activating…' : 'Activate Account'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
