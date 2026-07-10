import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function Settings() {
  const [profile, setProfile] = useState(null);
  const [form, setForm]       = useState({ organizationName: '', contactPerson: '', phone: '' });
  const [saving, setSaving]   = useState(false);
  const [pwForm, setPwForm]   = useState({ current: '', next: '', confirm: '' });
  const [savingPw, setSavingPw] = useState(false);
  const [resending, setResending] = useState(false);
  const [slug, setSlug]         = useState('');
  const [slugSaving, setSlugSaving] = useState(false);
  const [copied, setCopied]     = useState(false);

  useEffect(() => {
    api.get('/api/auth/me').then(({ data }) => {
      setProfile(data.client);
      setForm({ organizationName: data.client.organizationName || '', contactPerson: data.client.contactPerson || '', phone: data.client.phone || '' });
      setSlug(data.client.onboardingSlug || '');
    }).catch(() => toast.error('Failed to load settings'));
  }, []);

  async function saveProfile(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.patch('/api/auth/me', form);
      setProfile(data.client);
      toast.success('Organisation details updated');
    } catch { toast.error('Failed to save changes'); }
    finally { setSaving(false); }
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

  async function saveSlug() {
    if (!slug.trim()) return;
    setSlugSaving(true);
    try {
      const { data } = await api.patch('/api/settings/onboarding-slug', { slug: slug.trim() });
      setSlug(data.onboardingSlug || data.slug);
      toast.success('Onboarding link updated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update link');
    } finally { setSlugSaving(false); }
  }

  function copyLink() {
    const link = `https://engine.lucred.co/onboard/${slug}`;
    navigator.clipboard.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  async function resendVerification() {
    setResending(true);
    try {
      await api.post('/api/auth/resend-verification');
      toast.success('Verification email sent — check your inbox');
    } catch { toast.error('Failed to resend. Try again later.'); }
    finally { setResending(false); }
  }

  if (!profile) return <p style={{ color: '#94a3b8' }}>Loading…</p>;

  return (
    <div style={{ maxWidth: 640 }}>
      <h1 style={s.h1}>Settings</h1>
      <p style={s.sub}>Manage your organisation details and account security.</p>

      {!profile.emailVerified && (
        <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 10, padding: '12px 16px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: '#92400e', fontWeight: 600 }}>
            ⚠️ Email not verified — API access is blocked until you verify.
          </span>
          <button onClick={resendVerification} disabled={resending} style={{ fontSize: 12, fontWeight: 700, color: '#92400e', background: 'none', border: '1px solid #fbbf24', borderRadius: 7, padding: '6px 12px', cursor: 'pointer' }}>
            {resending ? 'Sending…' : 'Resend Email'}
          </button>
        </div>
      )}

      <div style={s.card}>
        <h2 style={s.cardTitle}>Organisation details</h2>
        <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { key: 'organizationName', label: 'Organisation name' },
            { key: 'contactPerson',    label: 'Contact person' },
            { key: 'phone',            label: 'Phone number' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label style={s.label}>{label}</label>
              <input
                value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                style={s.input}
                required={key !== 'phone'}
              />
            </div>
          ))}
          <div>
            <label style={s.label}>Email address</label>
            <input value={profile.email} readOnly style={{ ...s.input, background: '#f8fafc', color: '#94a3b8', cursor: 'not-allowed' }} />
            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Contact support to change your email address.</p>
          </div>
          <button type="submit" disabled={saving} style={{ ...s.btn, opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>

      <div style={s.card}>
        <h2 style={s.cardTitle}>Change password</h2>
        <form onSubmit={changePassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { key: 'current', label: 'Current password' },
            { key: 'next',    label: 'New password' },
            { key: 'confirm', label: 'Confirm new password' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label style={s.label}>{label}</label>
              <input type="password" value={pwForm[key]} onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))} style={s.input} required />
            </div>
          ))}
          <button type="submit" disabled={savingPw} style={{ ...s.btn, opacity: savingPw ? 0.6 : 1 }}>
            {savingPw ? 'Changing…' : 'Change password'}
          </button>
        </form>
      </div>

      <div style={s.card}>
        <h2 style={s.cardTitle}>Customer Onboarding Link</h2>
        <p style={{ fontSize: 13, color: '#64748b', marginTop: 0, marginBottom: 16 }}>
          Share this link with your customers so they can self-onboard. Their data will flow directly into your dashboard.
        </p>
        {slug && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, background: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: 10, padding: '10px 14px' }}>
            <span style={{ flex: 1, fontSize: 13, color: '#0369a1', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              https://engine.lucred.co/onboard/{slug}
            </span>
            <button onClick={copyLink} style={{ flexShrink: 0, padding: '6px 14px', border: 'none', borderRadius: 7, background: copied ? '#22c55e' : '#0ea5e9', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <label style={s.label}>Custom Slug</label>
            <input
              value={slug}
              onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
              placeholder="e.g. acme-microfinance"
              style={s.input}
            />
            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Lowercase letters, numbers, hyphens only. Changing this breaks existing shared links.</p>
          </div>
          <button onClick={saveSlug} disabled={slugSaving || !slug.trim()} style={{ ...s.btn, marginTop: 18, flexShrink: 0, opacity: slugSaving || !slug.trim() ? 0.6 : 1 }}>
            {slugSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div style={{ ...s.card, border: '1px solid #fee2e2' }}>
        <h2 style={{ ...s.cardTitle, color: '#dc2626' }}>Danger zone</h2>
        <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
          To close your account or request data deletion, email <a href="mailto:support@lucred.co" style={{ color: '#0ea5e9' }}>support@lucred.co</a>.
        </p>
      </div>
    </div>
  );
}

const s = {
  h1:        { fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 },
  sub:       { color: '#64748b', fontSize: 14, marginTop: 4, marginBottom: 28 },
  card:      { background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: 20 },
  cardTitle: { fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 18px' },
  label:     { display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  input:     { width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none', background: '#fff' },
  btn:       { padding: '10px 24px', borderRadius: 8, border: 'none', background: '#0f172a', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
};
