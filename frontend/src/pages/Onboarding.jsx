import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from '../services/api';

const api = axios.create({ baseURL: API_BASE });

// ── Helpers ───────────────────────────────────────────────────────────────────
function storageKey(slug) { return `lucred_onboard_${slug}_token`; }
function saveToken(slug, token) { localStorage.setItem(storageKey(slug), token); }
function loadToken(slug) { return localStorage.getItem(storageKey(slug)); }
function clearToken(slug) { localStorage.removeItem(storageKey(slug)); }

// ── Sub-components ────────────────────────────────────────────────────────────
function ProgressBar({ step, total }) {
  return (
    <div style={{ width: '100%', background: '#e2e8f0', borderRadius: 99, height: 5, marginBottom: 32 }}>
      <div style={{ width: `${Math.round((step / total) * 100)}%`, background: '#0ea5e9', borderRadius: 99, height: '100%', transition: 'width 0.4s' }} />
    </div>
  );
}

function StepHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 14, color: '#64748b' }}>{subtitle}</div>}
    </div>
  );
}

function Field({ label, children, required }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
        {label}{required && <span style={{ color: '#ef4444', marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const inp = { width: '100%', boxSizing: 'border-box', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'inherit', background: '#fff' };
const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 };

function VerificationChip({ status, label }) {
  const cfg = {
    pending:  { bg: '#f1f5f9', color: '#64748b', icon: '·', text: 'Pending' },
    running:  { bg: '#fef3c7', color: '#92400e', icon: '⏳', text: 'Verifying…' },
    success:  { bg: '#dcfce7', color: '#15803d', icon: '✓', text: 'Verified' },
    failed:   { bg: '#fee2e2', color: '#dc2626', icon: '✗', text: 'Failed' },
  }[status] || { bg: '#f1f5f9', color: '#64748b', icon: '·', text: status };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, background: cfg.bg, color: cfg.color, borderRadius: 20, padding: '3px 12px' }}>
      {cfg.icon} {label}: {cfg.text}
    </span>
  );
}

function NextBtn({ onClick, loading, disabled, label = 'Continue →' }) {
  return (
    <button onClick={onClick} disabled={loading || disabled} style={{ width: '100%', marginTop: 24, padding: '13px', background: loading || disabled ? '#94a3b8' : '#0ea5e9', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: loading || disabled ? 'not-allowed' : 'pointer' }}>
      {loading ? 'Please wait…' : label}
    </button>
  );
}

function FileUploadBox({ label, accept, onChange, file, hint }) {
  const ref = useRef();
  return (
    <div
      onClick={() => ref.current.click()}
      style={{ border: `2px dashed ${file ? '#0ea5e9' : '#cbd5e1'}`, borderRadius: 10, padding: '20px', textAlign: 'center', cursor: 'pointer', background: file ? '#f0f9ff' : '#f8fafc' }}
    >
      <input ref={ref} type="file" accept={accept} style={{ display: 'none' }} onChange={e => e.target.files[0] && onChange(e.target.files[0])} />
      {file ? (
        <div style={{ fontSize: 13, color: '#0ea5e9', fontWeight: 600 }}>📎 {file.name} ({(file.size / 1024).toFixed(0)} KB)</div>
      ) : (
        <div>
          <div style={{ fontWeight: 600, color: '#334155', fontSize: 13 }}>Click to upload {label}</div>
          {hint && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{hint}</div>}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function Onboarding() {
  const { slug } = useParams();
  const [client, setClient] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [session, setSession] = useState(null); // { sessionToken, type, currentStep, completedSteps, data, verifications }
  const [step, setStep] = useState(0); // 0 = type selection
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const pollRef = useRef(null);

  // ── Load client info ──────────────────────────────────────────────────────
  useEffect(() => {
    api.get(`/api/onboard/${slug}`)
      .then(({ data }) => setClient(data))
      .catch(() => setNotFound(true));
  }, [slug]);

  // ── Restore session from localStorage ─────────────────────────────────────
  useEffect(() => {
    if (!client) return;
    const token = loadToken(slug);
    if (!token) return;
    api.get(`/api/onboard/${slug}/session/${token}`)
      .then(({ data }) => {
        setSession(data.session);
        setStep(data.session.currentStep + 1 || 1);
      })
      .catch(() => clearToken(slug));
  }, [client, slug]);

  // ── Poll verification status ───────────────────────────────────────────────
  const startPolling = useCallback((token) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await api.get(`/api/onboard/${slug}/session/${token}/status`);
        setSession(s => s ? { ...s, verifications: data.verifications } : s);
        const allDone = Object.values(data.verifications || {}).every(v => v !== 'running');
        if (allDone) { clearInterval(pollRef.current); pollRef.current = null; }
      } catch { clearInterval(pollRef.current); }
    }, 3000);
  }, [slug]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // ── Start / resume session ─────────────────────────────────────────────────
  async function startSession(type) {
    setLoading(true); setError('');
    try {
      const token = loadToken(slug);
      const { data } = await api.post(`/api/onboard/${slug}/start`, { type, sessionToken: token || undefined });
      saveToken(slug, data.sessionToken);
      setSession(data);
      setStep(data.currentStep > 0 ? data.currentStep : 1);
    } catch { setError('Failed to start session. Please try again.'); }
    finally { setLoading(false); }
  }

  // ── Submit a step ──────────────────────────────────────────────────────────
  async function submitStep(stepName, payload, isFormData = false) {
    if (!session) return;
    setLoading(true); setError('');
    try {
      const url = `/api/onboard/${slug}/session/${session.sessionToken}/step/${stepName}`;
      const { data } = isFormData
        ? await api.post(url, payload, { headers: payload.getHeaders ? payload.getHeaders() : { 'Content-Type': 'multipart/form-data' } })
        : await api.post(url, payload);
      setSession(prev => ({ ...prev, ...data.session, verifications: { ...(prev?.verifications || {}), ...(data.session?.verifications || {}) } }));
      startPolling(session.sessionToken);
      setStep(s => s + 1);
    } catch (err) {
      setError(err?.response?.data?.error || 'Something went wrong. Please try again.');
    } finally { setLoading(false); }
  }

  async function completeSession() {
    if (!session) return;
    try {
      await api.post(`/api/onboard/${slug}/session/${session.sessionToken}/complete`);
      clearToken(slug);
      setStep(99); // done screen
    } catch { setStep(99); }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (notFound) return <NotFound />;
  if (!client) return <LoadingScreen />;

  const isIndividual = session?.type === 'individual';
  const isSME = session?.type === 'sme';
  const totalSteps = isIndividual ? 4 : isSME ? 7 : 1;
  const v = session?.verifications || {};

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontWeight: 800, fontSize: 17, color: '#0f172a' }}>
          <span style={{ color: '#0ea5e9' }}>Lucred</span> · {client.organizationName}
        </div>
        <div style={{ fontSize: 12, color: '#94a3b8' }}>Secure onboarding powered by Lucred Credit Engine</div>
      </div>

      <div style={{ maxWidth: 560, margin: '40px auto', padding: '0 16px' }}>
        {step > 0 && step < 99 && <ProgressBar step={step} total={totalSteps} />}

        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* ── Step 0: Type selection ─────────────────────────────────────── */}
        {step === 0 && (
          <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Welcome</div>
            <div style={{ fontSize: 14, color: '#64748b', marginBottom: 28 }}>
              {client.organizationName} has invited you to complete your onboarding. Select how you're applying:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                { type: 'individual', icon: '👤', title: 'Individual', sub: 'Personal loan or credit application' },
                { type: 'sme',       icon: '🏢', title: 'Business (SME)', sub: 'Business loan or credit application' },
              ].map(({ type, icon, title, sub }) => (
                <button key={type} onClick={() => startSession(type)} disabled={loading}
                  style={{ background: '#fff', border: '2px solid #e2e8f0', borderRadius: 14, padding: '24px 16px', cursor: 'pointer', textAlign: 'center', transition: 'border-color 0.15s', opacity: loading ? 0.6 : 1 }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#0ea5e9'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                >
                  <div style={{ fontSize: 36, marginBottom: 10 }}>{icon}</div>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 15, marginBottom: 4 }}>{title}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{sub}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Individual Steps ───────────────────────────────────────────── */}
        {isIndividual && step === 1 && <IndividualPersonalStep onNext={d => submitStep('personal', d)} loading={loading} session={session} />}
        {isIndividual && step === 2 && <IndividualBureauStep onNext={() => submitStep('bureau', {})} loading={loading} verifications={v} />}
        {isIndividual && step === 3 && <StatementStep onNext={(fd) => submitStep('statement', fd, true)} loading={loading} />}
        {isIndividual && step === 4 && <DoneStep orgName={client.organizationName} onComplete={completeSession} />}

        {/* ── SME Steps ─────────────────────────────────────────────────── */}
        {isSME && step === 1 && <SMEBusinessStep onNext={d => submitStep('business', d)} loading={loading} session={session} />}
        {isSME && step === 2 && <StatementStep onNext={(fd) => submitStep('statement', fd, true)} loading={loading} />}
        {isSME && step === 3 && <SMEBusinessBureauStep onNext={() => submitStep('business-bureau', {})} loading={loading} verifications={v} />}
        {isSME && step === 4 && <SMEDirectorsStep onNext={d => submitStep('directors', d)} loading={loading} verifications={v} />}
        {isSME && step === 5 && <SMEFinancialsStep onNext={(fd) => submitStep('financials', fd, true)} loading={loading} />}
        {isSME && step === 6 && <SMEGuarantorStep onNext={d => submitStep('guarantor', d)} loading={loading} />}
        {isSME && step === 7 && <DoneStep orgName={client.organizationName} onComplete={completeSession} />}

        {step === 99 && <SuccessScreen orgName={client.organizationName} />}
      </div>
    </div>
  );
}

// ── Individual: Personal Info ──────────────────────────────────────────────────
function IndividualPersonalStep({ onNext, loading, session }) {
  const d = session?.data?.personal || {};
  const [form, setForm] = useState({ name: d.name || '', email: d.email || '', phone: d.phone || '', bvn: d.bvn || '', nin: d.nin || '', address: d.address || '' });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
      <StepHeader title="Personal Information" subtitle="We'll use this to verify your identity and run a credit assessment." />
      <div style={grid2}>
        <Field label="Full Name" required><input style={inp} placeholder="Amaka Obi" value={form.name} onChange={set('name')} /></Field>
        <Field label="Email" required><input style={inp} type="email" placeholder="amaka@example.com" value={form.email} onChange={set('email')} /></Field>
        <Field label="Phone" required><input style={inp} placeholder="08012345678" value={form.phone} onChange={set('phone')} /></Field>
        <Field label="BVN"><input style={inp} placeholder="22222222222" value={form.bvn} onChange={set('bvn')} maxLength={11} /></Field>
        <Field label="NIN"><input style={inp} placeholder="12345678901" value={form.nin} onChange={set('nin')} maxLength={11} /></Field>
      </div>
      <Field label="Address"><input style={inp} placeholder="12 Broad Street, Lagos" value={form.address} onChange={set('address')} /></Field>
      <NextBtn onClick={() => onNext(form)} loading={loading} disabled={!form.name || !form.phone || !form.email} />
    </div>
  );
}

// ── Individual: Bureau ─────────────────────────────────────────────────────────
function IndividualBureauStep({ onNext, loading, verifications: v }) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
      <StepHeader title="Credit Bureau Check" subtitle="We'll pull your credit report from FirstCentral to assess your credit history." />
      <div style={{ background: '#f8fafc', borderRadius: 10, padding: '1.25rem', marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 10 }}>Verification statuses from previous step:</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {v.bvn && <VerificationChip status={v.bvn} label="BVN" />}
          {v.nin && <VerificationChip status={v.nin} label="NIN" />}
        </div>
      </div>
      <p style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Clicking Continue will trigger your credit bureau check. This typically takes a few seconds.</p>
      <NextBtn onClick={onNext} loading={loading} label="Run Credit Bureau Check →" />
    </div>
  );
}

// ── Statement Upload (shared) ──────────────────────────────────────────────────
function StatementStep({ onNext, loading }) {
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState('');
  const [bankName, setBankName] = useState('');

  async function handleNext() {
    if (!file) return;
    const fd = new FormData();
    fd.append('statement', file);
    if (password) fd.append('password', password);
    if (bankName) fd.append('bankName', bankName);
    onNext(fd);
  }

  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
      <StepHeader title="Bank Statement" subtitle="Upload your last 3–6 months bank statement for income and cash flow analysis." />
      <FileUploadBox label="bank statement" accept=".pdf,.xlsx,.xls,.csv,.docx" onChange={setFile} file={file} hint="PDF, XLSX, CSV or DOCX · max 10MB" />
      <div style={{ marginTop: 16 }}>
        <Field label="Bank Name (optional)">
          <input style={inp} placeholder="e.g. GTB, Access, Kuda" value={bankName} onChange={e => setBankName(e.target.value)} />
        </Field>
        <Field label="Statement Password (if protected)">
          <input style={inp} type="password" placeholder="Leave blank if none" value={password} onChange={e => setPassword(e.target.value)} />
        </Field>
      </div>
      <NextBtn onClick={handleNext} loading={loading} disabled={!file} label="Upload & Analyse →" />
    </div>
  );
}

const COMPANY_TYPES = [
  { value: 'COMPANY', label: 'Company (Ltd / Plc)' },
  { value: 'BUSINESS_NAME', label: 'Business Name' },
  { value: 'INCORPORATED_TRUSTEES', label: 'Incorporated Trustees' },
  { value: 'LIMITED_PARTNERSHIP', label: 'Limited Partnership' },
  { value: 'LIMITED_LIABILITY_PARTNERSHIP', label: 'Limited Liability Partnership' },
];

// ── SME: Business Info ─────────────────────────────────────────────────────────
function SMEBusinessStep({ onNext, loading, session }) {
  const d = session?.data?.business || {};
  const [form, setForm] = useState({
    businessName: d.businessName || '',
    email: d.email || '',
    phone: d.phone || '',
    cacNumber: d.cacNumber || '',
    companyType: d.companyType || 'COMPANY',
  });
  const [cacDoc, setCacDoc] = useState(null);
  const [memartDoc, setMemartDoc] = useState(null);
  const [statusReport, setStatusReport] = useState(null);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleNext() {
    if (!form.businessName || !form.cacNumber) return;
    const fd = new FormData();
    fd.append('businessName', form.businessName);
    fd.append('email', form.email);
    fd.append('phone', form.phone);
    fd.append('cacNumber', form.cacNumber);
    fd.append('companyType', form.companyType);
    if (cacDoc) fd.append('cacDocument', cacDoc);
    if (memartDoc) fd.append('memartDocument', memartDoc);
    if (statusReport) fd.append('statusReport', statusReport);
    onNext(fd);
  }

  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
      <StepHeader title="Business Information" subtitle="Provide your registered business details. We'll verify your CAC registration and TIN." />
      <div style={grid2}>
        <Field label="Business Name" required><input style={inp} placeholder="Okeke Ventures Ltd" value={form.businessName} onChange={set('businessName')} /></Field>
        <Field label="CAC / RC Number" required><input style={inp} placeholder="RC1234567" value={form.cacNumber} onChange={set('cacNumber')} /></Field>
        <Field label="Business Email"><input style={inp} type="email" placeholder="info@okekeventures.com" value={form.email} onChange={set('email')} /></Field>
        <Field label="Business Phone"><input style={inp} placeholder="0801 234 5678" value={form.phone} onChange={set('phone')} /></Field>
      </div>
      <Field label="Company Type" required>
        <select style={{ ...inp, color: '#0f172a' }} value={form.companyType} onChange={set('companyType')}>
          {COMPANY_TYPES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
        </select>
      </Field>
      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="CAC Certificate / Registration Document (optional)">
          <FileUploadBox label="CAC document" accept=".pdf,.jpg,.jpeg,.png" onChange={setCacDoc} file={cacDoc} hint="PDF or image · max 10MB" />
        </Field>
        <Field label="Memart (Memorandum & Articles of Association)">
          <FileUploadBox label="Memart document" accept=".pdf,.jpg,.jpeg,.png" onChange={setMemartDoc} file={memartDoc} hint="PDF or image · max 10MB" />
        </Field>
        <Field label="CAC Status Report">
          <FileUploadBox label="Status report" accept=".pdf,.jpg,.jpeg,.png" onChange={setStatusReport} file={statusReport} hint="PDF or image · max 10MB" />
        </Field>
      </div>
      <NextBtn onClick={handleNext} loading={loading} disabled={!form.businessName || !form.cacNumber} />
    </div>
  );
}

// ── SME: Business Bureau ───────────────────────────────────────────────────────
function SMEBusinessBureauStep({ onNext, loading, verifications: v }) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
      <StepHeader title="Business Credit Bureau" subtitle="We'll pull your business credit report from FirstCentral using your CAC/RC number." />
      <div style={{ background: '#f8fafc', borderRadius: 10, padding: '1.25rem', marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 10 }}>Verification statuses:</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {v.cac && <VerificationChip status={v.cac} label="CAC Registration" />}
          {v.statement && <VerificationChip status={v.statement} label="Bank Statement" />}
        </div>
      </div>
      <p style={{ fontSize: 13, color: '#64748b' }}>This will retrieve your business credit history and outstanding obligations from the bureau.</p>
      <NextBtn onClick={onNext} loading={loading} label="Run Business Bureau Check →" />
    </div>
  );
}

// ── SME: Directors ─────────────────────────────────────────────────────────────
function SMEDirectorsStep({ onNext, loading, verifications: v }) {
  const [directors, setDirectors] = useState([{ name: '', bvn: '', idCard: null }]);

  function updateDir(i, k, val) {
    setDirectors(ds => ds.map((d, idx) => idx === i ? { ...d, [k]: val } : d));
  }
  function addDir() { setDirectors(ds => [...ds, { name: '', bvn: '', idCard: null }]); }
  function removeDir(i) { setDirectors(ds => ds.filter((_, idx) => idx !== i)); }

  async function handleNext() {
    const fd = new FormData();
    directors.forEach((d, i) => {
      fd.append(`directors[${i}][name]`, d.name);
      fd.append(`directors[${i}][bvn]`, d.bvn);
      if (d.idCard) fd.append(`directors[${i}][idCard]`, d.idCard);
    });
    onNext(fd);
  }

  const canSubmit = directors.length > 0 && directors[0].name && directors[0].bvn;

  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
      <StepHeader title="Director Information" subtitle="Provide details for at least one director. We'll verify identity and run a credit bureau check on each director." />
      {v.businessBureau && (
        <div style={{ marginBottom: 16 }}>
          <VerificationChip status={v.businessBureau} label="Business Bureau" />
        </div>
      )}
      {directors.map((d, i) => (
        <div key={i} style={{ border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '1.25rem', marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Director {i + 1}{i === 0 ? ' *' : ''}</div>
            {i > 0 && <button onClick={() => removeDir(i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>Remove</button>}
          </div>
          <div style={grid2}>
            <Field label="Full Name" required={i === 0}><input style={inp} placeholder="Chukwuemeka Okafor" value={d.name} onChange={e => updateDir(i, 'name', e.target.value)} /></Field>
            <Field label="BVN" required={i === 0}><input style={inp} placeholder="22222222222" value={d.bvn} onChange={e => updateDir(i, 'bvn', e.target.value)} maxLength={11} /></Field>
          </div>
          <Field label="ID Card (optional — NIN slip, National ID, Passport, Voter's card)">
            <FileUploadBox label="ID card" accept=".pdf,.jpg,.jpeg,.png" onChange={f => updateDir(i, 'idCard', f)} file={d.idCard} hint="PDF or image · max 10MB" />
          </Field>
        </div>
      ))}
      <button onClick={addDir} style={{ width: '100%', padding: '10px', border: '1.5px dashed #cbd5e1', borderRadius: 10, background: 'none', color: '#0ea5e9', fontWeight: 700, fontSize: 13, cursor: 'pointer', marginBottom: 8 }}>
        + Add Another Director
      </button>
      <NextBtn onClick={handleNext} loading={loading} disabled={!canSubmit} label="Verify Directors →" />
    </div>
  );
}

// ── SME: Other Financials ──────────────────────────────────────────────────────
function SMEFinancialsStep({ onNext, loading }) {
  const [files, setFiles] = useState([]);

  function addFile(f) { setFiles(fs => [...fs, f]); }
  function removeFile(i) { setFiles(fs => fs.filter((_, idx) => idx !== i)); }

  async function handleNext() {
    if (files.length === 0) { onNext(new FormData()); return; }
    const fd = new FormData();
    files.forEach(f => fd.append('financials', f));
    onNext(fd);
  }

  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
      <StepHeader title="Other Financial Documents" subtitle="Optional — upload any additional financial statements, management accounts, or audited reports." />
      <div style={{ marginBottom: 16 }}>
        <FileUploadBox label="financial document" accept=".pdf,.xlsx,.xls,.csv,.docx" onChange={addFile} file={null} hint="PDF, XLSX, CSV or DOCX · max 10MB each" />
      </div>
      {files.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {files.map((f, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f0f9ff', borderRadius: 8, marginBottom: 6, fontSize: 13 }}>
              <span style={{ color: '#0ea5e9', fontWeight: 600 }}>📎 {f.name}</span>
              <button onClick={() => removeFile(i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>✕</button>
            </div>
          ))}
        </div>
      )}
      <NextBtn onClick={handleNext} loading={loading} label={files.length === 0 ? 'Skip this step →' : 'Upload & Continue →'} />
    </div>
  );
}

// ── SME: Guarantor ─────────────────────────────────────────────────────────────
function SMEGuarantorStep({ onNext, loading }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', relationship: '' });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
      <StepHeader title="Guarantor Information" subtitle="Optional — provide details of a guarantor who can vouch for this application." />
      <div style={grid2}>
        <Field label="Guarantor Name"><input style={inp} placeholder="Tunde Balogun" value={form.name} onChange={set('name')} /></Field>
        <Field label="Relationship"><input style={inp} placeholder="e.g. Business partner, Director" value={form.relationship} onChange={set('relationship')} /></Field>
        <Field label="Phone"><input style={inp} placeholder="08012345678" value={form.phone} onChange={set('phone')} /></Field>
        <Field label="Email"><input style={inp} type="email" placeholder="tunde@example.com" value={form.email} onChange={set('email')} /></Field>
      </div>
      <Field label="Address"><input style={inp} placeholder="22 Marina Road, Lagos" value={form.address} onChange={set('address')} /></Field>
      <NextBtn onClick={() => onNext(form.name ? form : {})} loading={loading} label={form.name ? 'Save & Continue →' : 'Skip this step →'} />
    </div>
  );
}

// ── Done / Complete ────────────────────────────────────────────────────────────
function DoneStep({ orgName, onComplete }) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: '2.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>You're all done!</div>
      <div style={{ fontSize: 14, color: '#64748b', marginBottom: 28 }}>
        Your information has been submitted to <strong>{orgName}</strong>. Their team will review your application and reach out to you.
      </div>
      <button onClick={onComplete} style={{ padding: '12px 32px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
        Submit Application →
      </button>
    </div>
  );
}

function SuccessScreen({ orgName }) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: '2.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', textAlign: 'center' }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Application Submitted</div>
      <div style={{ fontSize: 14, color: '#64748b' }}>
        Your application has been received by <strong>{orgName}</strong>. You'll be contacted once your assessment is complete.
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <div style={{ fontSize: 14, color: '#64748b' }}>Loading…</div>
    </div>
  );
}

function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Link not found</div>
        <div style={{ fontSize: 14, color: '#64748b' }}>This onboarding link is invalid or has expired. Contact your lender for a new link.</div>
      </div>
    </div>
  );
}
