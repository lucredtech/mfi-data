import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function Profile() {
  const { client: authClient, login } = useAuth();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ organizationName: '', contactPerson: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [savingPw, setSavingPw] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    api.get('/api/auth/me').then(({ data }) => {
      setProfile(data.client);
      setForm({ organizationName: data.client.organizationName || '', contactPerson: data.client.contactPerson || '', phone: data.client.phone || '' });
    }).catch(() => toast.error('Failed to load profile'));
  }, []);

  async function saveProfile(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.patch('/api/auth/me', form);
      setProfile(data.client);
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to save changes');
    } finally { setSaving(false); }
  }

  async function changePassword(e) {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) { toast.error('Passwords do not match'); return; }
    if (pwForm.next.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setSavingPw(true);
    try {
      await api.post('/api/auth/change-password', { currentPassword: pwForm.current, newPassword: pwForm.next });
      toast.success('Password changed successfully');
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change password');
    } finally { setSavingPw(false); }
  }

  if (!profile) return <p style={{ color: '#94a3b8' }}>Loading…</p>;

  const PLAN_COLOR = { free: '#0ea5e9', growth: '#6d28d9', scale: '#16a34a' };
  const plan = profile.plan || 'free';

  async function resendVerification() {
    setResending(true);
    try {
      await api.post('/api/auth/resend-verification');
      toast.success('Verification email sent — check your inbox');
    } catch { toast.error('Failed to resend. Try again later.'); }
    finally { setResending(false); }
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <h1 style={s.h1}>Profile</h1>
      <p style={s.sub}>Manage your organisation details and account settings.</p>

      {!profile?.emailVerified && (
        <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 13, color: '#92400e', fontWeight: 600 }}>
            ⚠️ Your email address is not verified. Check your inbox for the verification link.
          </div>
          <button onClick={resendVerification} disabled={resending} style={{ fontSize: 12, fontWeight: 700, color: '#92400e', background: 'none', border: '1px solid #fbbf24', borderRadius: 7, padding: '6px 12px', cursor: 'pointer', flexShrink: 0 }}>
            {resending ? 'Sending…' : 'Resend Email'}
          </button>
        </div>
      )}

      {/* Plan badge */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '1.25rem 1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Current Plan</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: PLAN_COLOR[plan] ?? '#0f172a', textTransform: 'capitalize' }}>{plan}</div>
        </div>
        <a href="/pricing" style={{ fontSize: 13, fontWeight: 700, color: '#6d28d9', background: '#f5f3ff', padding: '8px 16px', borderRadius: 8, textDecoration: 'none' }}>
          View plans →
        </a>
      </div>

      {/* Organisation details */}
      <div style={s.card}>
        <h2 style={s.cardTitle}>Organisation details</h2>
        <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label="Organisation name" value={form.organizationName} onChange={v => setForm(f => ({ ...f, organizationName: v }))} required />
          <Field label="Contact person" value={form.contactPerson} onChange={v => setForm(f => ({ ...f, contactPerson: v }))} required />
          <Field label="Phone number" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} placeholder="+234 801 234 5678" />
          <div>
            <label style={s.label}>Email</label>
            <div style={{ ...s.input, background: '#f8fafc', color: '#94a3b8', cursor: 'not-allowed' }}>{profile.email}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Email cannot be changed. Contact support if needed.</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={saving} style={{ ...s.btn, opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving…' : 'Save changes'}</button>
          </div>
        </form>
      </div>

      {/* Change password */}
      <div style={s.card}>
        <h2 style={s.cardTitle}>Change password</h2>
        <form onSubmit={changePassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label="Current password" value={pwForm.current} onChange={v => setPwForm(f => ({ ...f, current: v }))} type="password" required />
          <Field label="New password" value={pwForm.next} onChange={v => setPwForm(f => ({ ...f, next: v }))} type="password" placeholder="At least 8 characters" required />
          <Field label="Confirm new password" value={pwForm.confirm} onChange={v => setPwForm(f => ({ ...f, confirm: v }))} type="password" required />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={savingPw} style={{ ...s.btn, opacity: savingPw ? 0.7 : 1 }}>{savingPw ? 'Updating…' : 'Update password'}</button>
          </div>
        </form>
      </div>

      {/* Account info */}
      <div style={{ ...s.card, display: 'flex', gap: 32 }}>
        <div>
          <div style={s.metaLabel}>Member since</div>
          <div style={s.metaVal}>{new Date(profile.createdAt).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
        <div>
          <div style={s.metaLabel}>Account status</div>
          <div style={{ ...s.metaVal, color: profile.status === 'active' ? '#16a34a' : '#dc2626', textTransform: 'capitalize' }}>{profile.status || 'active'}</div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder, required }) {
  return (
    <div>
      <label style={s.label}>{label}{required && <span style={{ color: '#dc2626' }}> *</span>}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        style={s.input}
      />
    </div>
  );
}

const s = {
  h1: { fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 },
  sub: { color: '#64748b', fontSize: 14, marginTop: 4, marginBottom: 24 },
  card: { background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: 20 },
  cardTitle: { fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 20px' },
  label: { display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: { width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none' },
  btn: { padding: '10px 22px', borderRadius: 8, border: 'none', background: '#0f172a', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  metaLabel: { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  metaVal: { fontSize: 14, fontWeight: 600, color: '#0f172a' },
};
