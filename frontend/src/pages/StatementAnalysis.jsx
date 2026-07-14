import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import CustomerSelect from '../components/CustomerSelect';
import { parseApiError } from '../utils/apiError';

const BANKS = [
  { value: "moniepoint", label: "Moniepoint" },
  { value: "kuda", label: "Kuda" },
  { value: "vbank", label: "Vbank" },
  { value: "uba", label: "UBA" },
  { value: "optimus", label: "Optimus" },
  { value: "parallex", label: "Parallex" },
  { value: "gtb", label: "GTB" },
  { value: "opay", label: "Opay" },
  { value: "fidelity", label: "Fidelity" },
  { value: "sterling", label: "Sterling" },
  { value: "providus", label: "Providus" },
  { value: "smartcash", label: "Airtel Smartcash" },
  { value: "access", label: "Access" },
  { value: "fcmb", label: "FCMB" },
  { value: "firstbank", label: "First Bank" },
  { value: "nova", label: "Nova Bank" },
  { value: "palmpay", label: "Palmpay" },
  { value: "ecobank", label: "Ecobank" },
  { value: "wema", label: "Wema Bank" },
  { value: "premium", label: "Premium Trust" },
];

function BankSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = BANKS.filter(b => b.label.toLowerCase().includes(search.toLowerCase()));
  const selected = BANKS.find(b => b.value === value);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setSearch(''); }}
        style={{ ...s.input, textAlign: 'left', cursor: 'pointer', color: selected ? '#0f172a' : '#94a3b8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' }}
      >
        <span>{selected ? selected.label : 'Select a bank'}</span>
        <span style={{ fontSize: 10, color: '#94a3b8' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 50, overflow: 'hidden' }}>
          <div style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9' }}>
            <input
              autoFocus
              type="text"
              placeholder="Search banks…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #e2e8f0', borderRadius: 7, padding: '7px 10px', fontSize: 13, outline: 'none' }}
            />
          </div>
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {filtered.length === 0 && <div style={{ padding: '12px 14px', fontSize: 13, color: '#94a3b8' }}>No banks found</div>}
            {filtered.map(b => (
              <div
                key={b.value}
                onClick={() => { onChange(b.value); setOpen(false); }}
                style={{ padding: '10px 14px', fontSize: 13, cursor: 'pointer', fontWeight: b.value === value ? 700 : 400, color: b.value === value ? '#0ea5e9' : '#334155', background: b.value === value ? '#f0f9ff' : 'transparent' }}
                onMouseEnter={e => { if (b.value !== value) e.currentTarget.style.background = '#f8fafc'; }}
                onMouseLeave={e => { if (b.value !== value) e.currentTarget.style.background = 'transparent'; }}
              >
                {b.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function StatementAnalysis() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [meta, setMeta] = useState({ email: '', accountName: '', bankName: '', password: '' });
  const [customerId, setCustomerId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [walletError, setWalletError] = useState(false);
  const [result, setResult] = useState(null);
  const [resultId, setResultId] = useState(null);
  const inputRef = useRef();

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) validateAndSet(dropped);
  };

  const validateAndSet = (f) => {
    const allowed = ['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(f.type) && !f.name.match(/\.(pdf|xlsx|xls|csv|doc|docx)$/i)) return toast.error('Only PDF, spreadsheet, or document files accepted');
    if (f.size > 10 * 1024 * 1024) return toast.error('File must be under 10MB');
    setFile(f);
    setResult(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return toast.error('Please select a bank statement file');
    setWalletError(false);
    setLoading(true);
    try {
      const form = new FormData();
      form.append('statement', file);
      if (meta.password) form.append('password', meta.password);
      if (meta.email) form.append('email', meta.email);
      if (meta.accountName) form.append('accountName', meta.accountName);
      if (meta.bankName) form.append('bankName', meta.bankName);
      if (customerId) form.append('customerId', customerId);

      // Let axios set Content-Type automatically so multipart boundary is included
      const { data } = await api.post('/v1/statement/upload-analyze', form);
      setResult(data.data);
      setResultId(data.resultId || null);
      toast.success('Analysis complete');
    } catch (err) {
      if (err?.response?.status === 402) { setWalletError(true); return; }
      toast.error(parseApiError(err, {
        400: 'The statement could not be processed. Please check the file and try again.',
        413: 'The file is too large. Please upload a file under 10MB.',
        415: 'Unsupported file format. Please upload a PDF, CSV, XLSX, or DOCX statement.',
        default: 'Statement analysis failed. Please try again or contact support if the issue persists.',
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 style={s.h1}>Bank Statement Analysis</h1>
      <p style={s.sub}>Upload a borrower's bank statement to get income, spending, and creditworthiness analysis.</p>

      {walletError && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontWeight: 700, color: '#dc2626' }}>Insufficient wallet balance</span>
            <span style={{ color: '#7f1d1d', fontSize: 13, marginLeft: 8 }}>Statement analysis costs ₦500. Top up your wallet to continue.</span>
          </div>
          <Link to="/dashboard/billing" style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', background: '#fee2e2', padding: '6px 14px', borderRadius: 8, textDecoration: 'none', whiteSpace: 'nowrap' }}>Top up →</Link>
        </div>
      )}

      <div style={s.grid}>
        {/* Upload form */}
        <div style={s.card}>
          <form onSubmit={submit}>
            {/* Drop zone */}
            <div
              style={{ ...s.dropzone, ...(dragging ? s.dropzoneActive : {}), ...(file ? s.dropzoneFilled : {}) }}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current.click()}
            >
              <input ref={inputRef} type="file" accept=".pdf,.xlsx,.xls,.csv,.docx,.doc" style={{ display: 'none' }}
                onChange={(e) => e.target.files[0] && validateAndSet(e.target.files[0])} />
              {file ? (
                <div>
                  <div style={s.fileIcon}>PDF</div>
                  <div style={s.fileName}>{file.name}</div>
                  <div style={s.fileSize}>{(file.size / 1024).toFixed(0)} KB</div>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }} style={s.removeBtn}>
                    Remove
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ fontWeight: 600, color: '#334155', marginBottom: 4 }}>Drop bank statement here</div>
                  <div style={{ fontSize: 13, color: '#94a3b8' }}>or click to browse · PDF, XLSX, XLS, CSV, DOCX · max 10MB</div>
                </div>
              )}
            </div>

            {/* Customer link */}
            <div style={{ marginTop: 20 }}>
              <CustomerSelect
                value={customerId}
                onChange={(id, customer) => {
                  setCustomerId(id);
                  if (customer) {
                    setMeta((m) => ({
                      ...m,
                      email: m.email || customer.email || '',
                      accountName: m.accountName || customer.name || '',
                    }));
                  }
                }}
              />
            </div>

            {/* Metadata */}
            <div style={{ marginTop: 4 }}>
              <div style={s.sectionLabel}>Borrower Details (optional)</div>
              {[
                { key: 'email', label: 'Borrower Email', placeholder: 'borrower@example.com', type: 'email' },
                { key: 'accountName', label: 'Account Name', placeholder: 'John Doe', type: 'text' },
                { key: 'password', label: 'Statement Password (optional)', placeholder: 'Leave blank if none', type: 'password' },
              ].map(({ key, label, placeholder, type }) => (
                <div key={key} style={{ marginBottom: 12 }}>
                  <label style={s.label}>{label}</label>
                  <input style={s.input} type={type} placeholder={placeholder} value={meta[key]}
                    onChange={(e) => setMeta({ ...meta, [key]: e.target.value })} />
                </div>
              ))}
              <div style={{ marginBottom: 12 }}>
                <label style={s.label}>Bank Name</label>
                <BankSelect value={meta.bankName} onChange={v => setMeta({ ...meta, bankName: v })} />
              </div>
            </div>

            <button style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
              {loading ? 'Analysing…' : 'Analyse Statement'}
            </button>
          </form>
        </div>

        {/* Results */}
        <div>
          {!result && !loading && (
            <div style={s.emptyResult}>
              <div style={{ fontWeight: 600, color: '#334155' }}>Results will appear here</div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>Upload a statement and click Analyse</div>
            </div>
          )}

          {loading && (
            <div style={s.emptyResult}>
              <div style={{ fontSize: 13, color: '#64748b' }}>Analysing statement…</div>
            </div>
          )}

          {result && <ResultPanel data={result} resultId={resultId} onViewDetail={() => navigate(`/dashboard/statements/${resultId}`)} />}
        </div>
      </div>
    </div>
  );
}

function StaleWarning({ data }) {
  const endDateStr = data?.metaData?.endDate;
  if (!endDateStr) return null;
  const ref = new Date(endDateStr);
  if (isNaN(ref.getTime())) return null;
  const daysOld = Math.floor((Date.now() - ref.getTime()) / (24 * 60 * 60 * 1000));
  if (daysOld <= 90) return null;
  return (
    <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: '#92400e', marginBottom: 16 }}>
      <span style={{ fontSize: 18 }}>⚠️</span>
      <div>
        <strong>Stale bank statement ({daysOld} days old)</strong>
        <span style={{ marginLeft: 8 }}>Statement period ended {ref.toLocaleDateString()} — this statement may not reflect the borrower's current financial position.</span>
      </div>
    </div>
  );
}

function ResultPanel({ data, resultId, onViewDetail }) {
  const fmt = (v) => v !== undefined && v !== null ? v.toLocaleString() : '—';

  return (
    <div>
      <StaleWarning data={data} />
      {/* Key metrics */}
      {(data.income !== undefined || data.averageMonthlyIncome !== undefined) && (
        <div style={s.metricsGrid}>
          {[
            { label: 'Monthly Income', value: `₦${fmt(data.income ?? data.averageMonthlyIncome)}` },
            { label: 'Monthly Expenses', value: `₦${fmt(data.expenses ?? data.averageMonthlyExpenses)}` },
            { label: 'Credit Score', value: data.creditScore ?? data.score ?? '—' },
            { label: 'Decision', value: data.recommendation ?? data.decision ?? '—' },
          ].map(({ label, value }) => (
            <div key={label} style={s.metricCard}>
              <div style={s.metricValue}>{value}</div>
              <div style={s.metricLabel}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Raw JSON fallback */}
      <div style={s.rawCard}>
        <div style={s.sectionLabel}>Full Analysis Response</div>
        <pre style={s.pre}>{JSON.stringify(data, null, 2)}</pre>
      </div>

      {/* View full visualized result */}
      {resultId && (
        <button onClick={onViewDetail} style={s.viewDetailBtn}>
          View Full Analysis Dashboard →
        </button>
      )}
    </div>
  );
}

const s = {
  h1: { fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 },
  sub: { color: '#64748b', fontSize: 14, marginTop: 4, marginBottom: 24 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' },
  card: { background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' },
  dropzone: {
    border: '2px dashed #cbd5e1', borderRadius: 10, padding: '2rem 1rem',
    textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s',
    background: '#f8fafc',
  },
  dropzoneActive: { borderColor: '#0ea5e9', background: '#f0f9ff' },
  dropzoneFilled: { borderColor: '#0ea5e9', background: '#f0f9ff', borderStyle: 'solid' },
  fileIcon: { fontSize: 32, marginBottom: 8 },
  fileName: { fontWeight: 600, color: '#0f172a', fontSize: 14 },
  fileSize: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  removeBtn: { marginTop: 10, fontSize: 12, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' },
  sectionLabel: { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 },
  input: { width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' },
  btn: { width: '100%', marginTop: 8, padding: '11px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer' },
  emptyResult: { background: '#fff', borderRadius: 12, padding: '3rem 1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', textAlign: 'center' },
  metricsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 },
  metricCard: { background: '#fff', borderRadius: 10, padding: '1rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', textAlign: 'center' },
  metricValue: { fontSize: 22, fontWeight: 700, color: '#0f172a' },
  metricLabel: { fontSize: 12, color: '#64748b', marginTop: 4 },
  rawCard: { background: '#fff', borderRadius: 12, padding: '1.25rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' },
  pre: { background: '#0f172a', color: '#e2e8f0', padding: '12px', borderRadius: 8, fontSize: 11, fontFamily: 'monospace', overflowX: 'auto', marginTop: 8, maxHeight: 400 },
  viewDetailBtn: { display: 'block', width: '100%', marginTop: 14, padding: '12px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', textAlign: 'center', letterSpacing: 0.2 },
};
