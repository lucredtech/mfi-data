import { useState, useRef } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function StatementAnalysis() {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [meta, setMeta] = useState({ email: '', accountName: '', bankName: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const inputRef = useRef();

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) validateAndSet(dropped);
  };

  const validateAndSet = (f) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowed.includes(f.type)) return toast.error('Only PDF, JPEG, or PNG files accepted');
    if (f.size > 10 * 1024 * 1024) return toast.error('File must be under 10MB');
    setFile(f);
    setResult(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return toast.error('Please select a bank statement file');
    setLoading(true);
    try {
      const form = new FormData();
      form.append('statement', file);
      if (meta.email) form.append('email', meta.email);
      if (meta.accountName) form.append('accountName', meta.accountName);
      if (meta.bankName) form.append('bankName', meta.bankName);

      // Use the MFI's API key from localStorage for direct B2B call
      const apiKey = localStorage.getItem('apiKey');
      const { data } = await api.post('/v1/statement/upload-analyze', form, {
        headers: { 'X-Api-Key': apiKey, 'Content-Type': 'multipart/form-data' },
      });
      setResult(data.data);
      toast.success('Analysis complete');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 style={s.h1}>Bank Statement Analysis</h1>
      <p style={s.sub}>Upload a borrower's bank statement (PDF or image) to get income, spending, and creditworthiness analysis.</p>

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
              <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }}
                onChange={(e) => e.target.files[0] && validateAndSet(e.target.files[0])} />
              {file ? (
                <div>
                  <div style={s.fileIcon}>📄</div>
                  <div style={s.fileName}>{file.name}</div>
                  <div style={s.fileSize}>{(file.size / 1024).toFixed(0)} KB</div>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }} style={s.removeBtn}>
                    Remove
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>📂</div>
                  <div style={{ fontWeight: 600, color: '#334155', marginBottom: 4 }}>Drop bank statement here</div>
                  <div style={{ fontSize: 13, color: '#94a3b8' }}>or click to browse · PDF, JPEG, PNG · max 10MB</div>
                </div>
              )}
            </div>

            {/* Metadata */}
            <div style={{ marginTop: 20 }}>
              <div style={s.sectionLabel}>Borrower Details (optional)</div>
              {[
                { key: 'email', label: 'Borrower Email', placeholder: 'borrower@example.com', type: 'email' },
                { key: 'accountName', label: 'Account Name', placeholder: 'John Doe', type: 'text' },
                { key: 'bankName', label: 'Bank Name', placeholder: 'Access Bank', type: 'text' },
              ].map(({ key, label, placeholder, type }) => (
                <div key={key} style={{ marginBottom: 12 }}>
                  <label style={s.label}>{label}</label>
                  <input style={s.input} type={type} placeholder={placeholder} value={meta[key]}
                    onChange={(e) => setMeta({ ...meta, [key]: e.target.value })} />
                </div>
              ))}
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
              <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
              <div style={{ fontWeight: 600, color: '#334155' }}>Results will appear here</div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>Upload a statement and click Analyse</div>
            </div>
          )}

          {loading && (
            <div style={s.emptyResult}>
              <div style={{ fontSize: 13, color: '#64748b' }}>Analysing statement…</div>
            </div>
          )}

          {result && <ResultPanel data={result} />}
        </div>
      </div>
    </div>
  );
}

function ResultPanel({ data }) {
  const fmt = (v) => v !== undefined && v !== null ? v.toLocaleString() : '—';

  return (
    <div>
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
};
