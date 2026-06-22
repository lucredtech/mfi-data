import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL || 'https://mfi-data-production.up.railway.app';
function authHeaders() { return { Authorization: `Bearer ${localStorage.getItem('token')}` }; }

export default function BulkVerify() {
  const [verifyType, setVerifyType] = useState('bvn');
  const [rawInput, setRawInput] = useState('');
  const [preview, setPreview] = useState([]);
  const [results, setResults] = useState([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  function parseInput(text) {
    const lines = text.trim().split('\n').filter(Boolean);
    return lines.map(line => {
      const parts = line.split(',').map(p => p.trim());
      // Expected: customerId,number OR just number (for display only)
      if (parts.length >= 2) return { customerId: parts[0], number: parts[1] };
      return { customerId: '', number: parts[0] };
    }).slice(0, 50);
  }

  function handleParse() {
    const rows = parseInput(rawInput);
    setPreview(rows);
    setResults([]);
  }

  async function handleRun() {
    if (!preview.length) return;
    const validItems = preview.filter(r => r.customerId && r.number);
    if (!validItems.length) {
      toast.error('No valid rows (need customerId,number pairs)');
      return;
    }
    setRunning(true);
    setProgress(0);
    setResults([]);
    try {
      const { data } = await axios.post(`${API}/api/customers/bulk/verify`, {
        items: validItems,
        type: verifyType,
      }, { headers: authHeaders() });
      setResults(data.results || []);
      setProgress(100);
      toast.success(`Completed: ${data.results?.filter(r => r.status === 'success').length} successful`);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Bulk verify failed');
    } finally {
      setRunning(false);
    }
  }

  function downloadCSV() {
    if (!results.length) return;
    const headers = ['customerId', 'number', 'status', 'error', 'firstName', 'lastName', 'dateOfBirth', 'watchListed', 'duplicate_id', 'duplicate_name'];
    const rows = results.map(r => [
      r.customerId, r.number, r.status, r.error || '',
      r.data?.firstName || '', r.data?.lastName || '',
      r.data?.dateOfBirth || '', r.data?.watchListed ?? '',
      r.duplicate?.id || '', r.duplicate?.name || '',
    ]);
    const csv = [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `bulk_${verifyType}_results_${Date.now()}.csv`;
    a.click();
  }

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const watchlistCount = results.filter(r => r.data?.watchListed === true).length;
  const dupCount = results.filter(r => r.duplicate).length;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={s.h1}>Bulk BVN / NIN Verification</h1>
        <p style={s.sub}>Verify up to 50 customers at once. Paste CSV data (customerId,number) — one row per line.</p>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        {/* Type selector */}
        <div style={s.card}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 10 }}>Verification Type</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['bvn', 'nin'].map(t => (
              <button key={t} onClick={() => setVerifyType(t)} style={{ ...s.pill, ...(verifyType === t ? s.pillActive : {}) }}>{t.toUpperCase()}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Input */}
      <div style={s.card}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 8 }}>Paste Data (customerId,{verifyType})</div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>Format: one entry per line. Example: <code>64a1b2c3d4e5f6,22222222222</code></div>
        <textarea
          value={rawInput}
          onChange={e => setRawInput(e.target.value)}
          placeholder={`64a1b2c3d4e5f6,22222222222\n64a1b2c3d4e5f7,33333333333`}
          rows={8}
          style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'monospace', resize: 'vertical', outline: 'none' }}
        />
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <button onClick={handleParse} style={s.btn}>Preview ({parseInput(rawInput).length} rows)</button>
        </div>
      </div>

      {/* Preview table */}
      {preview.length > 0 && (
        <div style={{ ...s.card, marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>Preview — {preview.length} rows</div>
            <button
              onClick={handleRun}
              disabled={running}
              style={{ ...s.btn, background: '#6d28d9', opacity: running ? 0.6 : 1, cursor: running ? 'not-allowed' : 'pointer' }}
            >
              {running ? `Running… (${progress}%)` : `▶ Run ${verifyType.toUpperCase()} Verification`}
            </button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['#', 'Customer ID', verifyType.toUpperCase(), 'Valid?'].map(h => <th key={h} style={s.th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {preview.map((row, i) => (
                <tr key={i} style={{ background: i % 2 ? '#fafafa' : '#fff' }}>
                  <td style={{ ...s.td, color: '#94a3b8', width: 40 }}>{i + 1}</td>
                  <td style={{ ...s.td, fontFamily: 'monospace', fontSize: 12 }}>{row.customerId || <span style={{ color: '#dc2626' }}>missing</span>}</td>
                  <td style={{ ...s.td, fontFamily: 'monospace', fontSize: 12 }}>{row.number || <span style={{ color: '#dc2626' }}>missing</span>}</td>
                  <td style={s.td}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: (row.customerId && row.number) ? '#dcfce7' : '#fee2e2', color: (row.customerId && row.number) ? '#16a34a' : '#dc2626' }}>
                      {(row.customerId && row.number) ? 'OK' : 'Skip'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div style={{ ...s.card, marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Results</div>
              <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                <span style={s.badge('#dcfce7', '#16a34a')}>{successCount} Success</span>
                <span style={s.badge('#fee2e2', '#dc2626')}>{errorCount} Failed</span>
                {watchlistCount > 0 && <span style={s.badge('#fee2e2', '#dc2626')}>⚠ {watchlistCount} Watchlisted</span>}
                {dupCount > 0 && <span style={s.badge('#fef3c7', '#d97706')}>⚠ {dupCount} Duplicates</span>}
              </div>
            </div>
            <button onClick={downloadCSV} style={{ ...s.btn, background: '#0f172a' }}>⬇ Download CSV</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Status', verifyType.toUpperCase(), 'Name', 'DOB', 'Watchlisted', 'Duplicate', 'Notes'].map(h => <th key={h} style={s.th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} style={{ background: r.status === 'error' ? '#fff5f5' : i % 2 ? '#fafafa' : '#fff' }}>
                  <td style={s.td}>
                    <span style={s.badge(r.status === 'success' ? '#dcfce7' : '#fee2e2', r.status === 'success' ? '#16a34a' : '#dc2626')}>
                      {r.status}
                    </span>
                  </td>
                  <td style={{ ...s.td, fontFamily: 'monospace', fontSize: 12 }}>{r.number}</td>
                  <td style={{ ...s.td, fontSize: 13 }}>{r.data ? `${r.data.firstName || ''} ${r.data.lastName || ''}`.trim() || '—' : '—'}</td>
                  <td style={{ ...s.td, fontSize: 12, color: '#64748b' }}>{r.data?.dateOfBirth || '—'}</td>
                  <td style={s.td}>
                    {r.data?.watchListed === true
                      ? <span style={s.badge('#fee2e2', '#dc2626')}>YES</span>
                      : r.data?.watchListed === false ? <span style={s.badge('#f1f5f9', '#64748b')}>No</span>
                      : '—'}
                  </td>
                  <td style={s.td}>
                    {r.duplicate
                      ? <span style={s.badge('#fef3c7', '#d97706')} title={`ID: ${r.duplicate.id}`}>{r.duplicate.name}</span>
                      : <span style={{ color: '#94a3b8', fontSize: 12 }}>None</span>}
                  </td>
                  <td style={{ ...s.td, fontSize: 12, color: '#dc2626' }}>{r.error || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const s = {
  h1: { fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 },
  sub: { color: '#64748b', fontSize: 14, marginTop: 4 },
  card: { background: '#fff', borderRadius: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.06)', padding: '1.25rem 1.5rem' },
  pill: { fontSize: 12, fontWeight: 600, padding: '6px 16px', borderRadius: 20, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer' },
  pillActive: { background: '#0f172a', color: '#fff', border: '1.5px solid #0f172a' },
  btn: { fontSize: 13, fontWeight: 700, padding: '9px 18px', borderRadius: 8, border: 'none', background: '#0ea5e9', color: '#fff', cursor: 'pointer' },
  th: { textAlign: 'left', padding: '10px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  td: { padding: '10px 16px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' },
  badge: (bg, fg) => ({ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: bg, color: fg }),
};
