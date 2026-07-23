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

  const emptyPolicy = { minCreditScore: '', maxLoanAmount: '', maxDTI: '', maxDelinquencies: '', minMonthlyIncome: '', minMonthlyCashInflow: '', maxMonthlyExpenses: '', requiredChecks: [] };
  const [policy, setPolicy]     = useState(emptyPolicy);
  const [policySaving, setPolicySaving] = useState(false);

  useEffect(() => {
    api.get('/api/auth/me').then(({ data }) => {
      setProfile(data.client);
      setForm({ organizationName: data.client.organizationName || '', contactPerson: data.client.contactPerson || '', phone: data.client.phone || '' });
      setSlug(data.client.onboardingSlug || '');
    }).catch(() => toast.error('Failed to load settings'));
    api.get('/api/auth/loan-policy').then(({ data }) => {
      const p = data.loanPolicy || {};
      setPolicy({ minCreditScore: p.minCreditScore ?? '', maxLoanAmount: p.maxLoanAmount ?? '', maxDTI: p.maxDTI ?? '', maxDelinquencies: p.maxDelinquencies ?? '', minMonthlyIncome: p.minMonthlyIncome ?? '', minMonthlyCashInflow: p.minMonthlyCashInflow ?? '', maxMonthlyExpenses: p.maxMonthlyExpenses ?? '', requiredChecks: p.requiredChecks || [] });
    }).catch(() => {});
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

  async function savePolicy(e) {
    e.preventDefault();
    setPolicySaving(true);
    try {
      await api.put('/api/auth/loan-policy', { ...policy });
      toast.success('Loan policy saved');
    } catch { toast.error('Failed to save loan policy'); }
    finally { setPolicySaving(false); }
  }

  function toggleCheck(key) {
    setPolicy(p => ({ ...p, requiredChecks: p.requiredChecks.includes(key) ? p.requiredChecks.filter(c => c !== key) : [...p.requiredChecks, key] }));
  }

  async function saveSlug() {
    if (!slug.trim()) return;
    setSlugSaving(true);
    try {
      const { data } = await api.patch('/api/auth/settings/onboarding-slug', { slug: slug.trim() });
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

      <div style={{ ...s.card, border: '1.5px solid #bae6fd', background: '#f0f9ff' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ ...s.cardTitle, color: '#0369a1', marginBottom: 4 }}>🔗 Customer Self-Onboard Link</h2>
            <p style={{ fontSize: 13, color: '#0369a1', marginTop: 0, marginBottom: 16 }}>
              Share this link with customers so they can fill out their own onboarding form. Supports both individual and SME customers. Data flows directly into your dashboard.
            </p>
          </div>
        </div>
        {slug ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, background: '#fff', border: '1.5px solid #bae6fd', borderRadius: 10, padding: '12px 16px' }}>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#0369a1', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              https://engine.lucred.co/onboard/{slug}
            </span>
            <button onClick={copyLink} style={{ flexShrink: 0, padding: '8px 18px', border: 'none', borderRadius: 8, background: copied ? '#22c55e' : '#0ea5e9', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' }}>
              {copied ? '✓ Copied!' : 'Copy Link'}
            </button>
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1.5px dashed #bae6fd', borderRadius: 10, padding: '14px 16px', marginBottom: 16, fontSize: 13, color: '#64748b', textAlign: 'center' }}>
            Set a slug below to generate your onboarding link.
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ ...s.label, color: '#0369a1' }}>Custom Slug</label>
            <input
              value={slug}
              onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
              placeholder="e.g. acme-microfinance"
              style={{ ...s.input, borderColor: '#bae6fd', background: '#fff' }}
            />
            <p style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Lowercase letters, numbers, hyphens only. Changing this breaks existing shared links.</p>
          </div>
          <button onClick={saveSlug} disabled={slugSaving || !slug.trim()} style={{ ...s.btn, marginBottom: 22, flexShrink: 0, opacity: slugSaving || !slug.trim() ? 0.6 : 1 }}>
            {slugSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div style={s.card}>
        <h2 style={s.cardTitle}>Loan Approval Policy</h2>
        <p style={{ fontSize: 13, color: '#64748b', marginTop: -10, marginBottom: 20 }}>
          Set your institution's lending thresholds. All fields are optional — only configured parameters will be checked during loan review. Leave blank to skip that criterion.
        </p>
        <form onSubmit={savePolicy} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {[
              { key: 'minCreditScore',       label: 'Min Credit Score',         placeholder: 'e.g. 600',      hint: 'FirstCentral XScore minimum' },
              { key: 'maxLoanAmount',         label: 'Max Loan Amount (₦)',      placeholder: 'e.g. 5000000',  hint: 'Maximum facility to approve' },
              { key: 'maxDTI',               label: 'Max DTI (%)',              placeholder: 'e.g. 40',       hint: 'Debt-to-income ratio ceiling' },
              { key: 'maxDelinquencies',      label: 'Max Delinquent Facilities',placeholder: 'e.g. 0',        hint: 'Non-performing loans allowed' },
              { key: 'minMonthlyIncome',      label: 'Min Monthly Income (₦)',   placeholder: 'e.g. 150000',   hint: 'Average monthly salary/income' },
              { key: 'minMonthlyCashInflow',  label: 'Min Monthly Cash Inflow (₦)', placeholder: 'e.g. 200000', hint: 'Total inflows from statement' },
              { key: 'maxMonthlyExpenses',    label: 'Max Monthly Expenses (₦)', placeholder: 'e.g. 300000',  hint: 'Total outflows from statement' },
            ].map(({ key, label, placeholder, hint }) => (
              <div key={key}>
                <label style={s.label}>{label}</label>
                <input
                  type="number" min="0"
                  value={policy[key]}
                  onChange={e => setPolicy(p => ({ ...p, [key]: e.target.value }))}
                  placeholder={placeholder}
                  style={s.input}
                />
                <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{hint}</p>
              </div>
            ))}
          </div>

          <div>
            <label style={s.label}>Required Checks</label>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 0, marginBottom: 10 }}>Customer must have completed these checks before the review suggestion can pass.</p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[['bvn','BVN Verification'],['nin','NIN Verification'],['bureau','Credit Bureau']].map(([key, label]) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#334155', cursor: 'pointer', background: policy.requiredChecks.includes(key) ? '#e0f2fe' : '#f8fafc', border: `1.5px solid ${policy.requiredChecks.includes(key) ? '#0ea5e9' : '#e2e8f0'}`, borderRadius: 8, padding: '8px 14px' }}>
                  <input type="checkbox" checked={policy.requiredChecks.includes(key)} onChange={() => toggleCheck(key)} style={{ accentColor: '#0ea5e9' }} />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <button type="submit" disabled={policySaving} style={{ ...s.btn, opacity: policySaving ? 0.6 : 1, alignSelf: 'flex-start' }}>
            {policySaving ? 'Saving…' : 'Save policy'}
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
