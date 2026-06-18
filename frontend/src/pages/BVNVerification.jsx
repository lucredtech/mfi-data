import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { exportBVNHistoryCSV } from '../services/exportCSV';
import CustomerSelect from '../components/CustomerSelect';

const API = import.meta.env.VITE_API_URL || 'https://mfi-data-production.up.railway.app';

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('token')}` };
}

export default function BVNVerification() {
  const [bvn, setBvn] = useState('');
  const [customerId, setCustomerId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [q, setQ] = useState('');
  const navigate = useNavigate();

  const fetchHistory = useCallback(async (search = '') => {
    setHistoryLoading(true);
    try {
      const { data } = await axios.get(`${API}/api/customers/analyses/bvn`, {
        params: search ? { q: search } : {},
        headers: authHeaders(),
      });
      setHistory(data.results);
    } catch {
      // silently fail — history is supplemental
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  useEffect(() => {
    const t = setTimeout(() => fetchHistory(q), 350);
    return () => clearTimeout(t);
  }, [q, fetchHistory]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (bvn.length !== 11) return toast.error('BVN must be 11 digits');
    const apiKey = localStorage.getItem('apiKey');
    if (!apiKey) return toast.error('No API key found. Please re-login.');

    setLoading(true);
    setResult(null);
    try {
      const { data } = await axios.post(
        `${API}/v1/identity/verify-bvn`,
        { bvn, customerId: customerId || undefined },
        { headers: { 'X-Api-Key': apiKey } },
      );
      setResult(data.data || data);
      toast.success('BVN verified and saved');
      fetchHistory();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Verification failed');
    } finally {
      setLoading(false);
    }
  }

  const infoFields = result ? [
    ['First Name', result.firstName],
    ['Last Name', result.lastName],
    ['Middle Name', result.middleName],
    ['Date of Birth', result.dateOfBirth],
    ['Gender', result.gender],
    ['Phone Number', result.phoneNumber],
    ['Email', result.email],
    ['Enrollment Bank', result.enrollmentBank],
    ['Enrollment Branch', result.enrollmentBranch],
    ['Registration Date', result.registrationDate],
    ['NIN', result.nin],
    ['Watch Listed', result.watchListed !== undefined ? String(result.watchListed) : undefined],
    ['Account Level', result.levelOfAccount],
  ].filter(([, v]) => v !== undefined && v !== null && v !== '') : [];

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>BVN Verification</h1>
          <p style={s.sub}>Verify a borrower's Bank Verification Number. Every result is saved automatically.</p>
        </div>
      </div>

      <div style={s.layout}>
        {/* Form */}
        <div style={s.formCard}>
          <div style={s.cardTitle}>Verify a BVN</div>
          <CustomerSelect
            value={customerId}
            onChange={(id, customer) => {
              setCustomerId(id);
              if (customer?.bvn) setBvn(customer.bvn);
            }}
          />
          <form onSubmit={handleSubmit}>
            <div style={s.field}>
              <label style={s.label}>BVN (11 digits) *</label>
              <input
                style={s.input}
                type="text"
                maxLength={11}
                placeholder="e.g. 22222222222"
                value={bvn}
                onChange={(e) => setBvn(e.target.value.replace(/\D/g, ''))}
                required
              />
              <div style={s.hint}>{bvn.length}/11 digits</div>
            </div>
            <button style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} type="submit" disabled={loading}>
              {loading ? 'Verifying…' : 'Verify BVN →'}
            </button>
          </form>
        </div>

        {/* Latest result */}
        {result && (
          <div style={s.resultCard}>
            <div style={s.resultHeader}>
              <div style={{
                ...s.badge,
                background: result.isValid !== false ? '#dcfce7' : '#fee2e2',
                color: result.isValid !== false ? '#16a34a' : '#dc2626',
              }}>
                {result.isValid !== false ? '✓ Valid BVN' : '✗ Invalid BVN'}
              </div>
              <div style={s.cardTitle}>Identity Details</div>
            </div>
            <div style={s.grid}>
              {infoFields.map(([label, value]) => (
                <div key={label} style={s.infoRow}>
                  <div style={s.infoLabel}>{label}</div>
                  <div style={s.infoValue}>{value}</div>
                </div>
              ))}
            </div>
            {result.image && (
              <div style={{ marginTop: 20 }}>
                <div style={s.sectionLabel}>Photo</div>
                <img src={`data:image/jpeg;base64,${result.image}`} alt="BVN Photo" style={s.photo} />
              </div>
            )}
          </div>
        )}

        {/* History */}
        <div style={s.historyCard}>
          <div style={s.historyHeader}>
            <div style={s.cardTitle}>Verification History</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {history.length > 0 && (
                <button style={s.csvBtn} onClick={() => exportBVNHistoryCSV(history)}>↓ CSV</button>
              )}
              <input
                style={s.search}
                placeholder="Search by BVN…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>
          {historyLoading ? (
            <div style={s.empty}>Loading…</div>
          ) : history.length === 0 ? (
            <div style={s.empty}>No verifications yet. Run your first BVN check above.</div>
          ) : (
            <table style={s.table}>
              <thead>
                <tr>
                  {['Name (BVN Result)', 'BVN', 'Customer', 'Status', 'Date', ''].map((h) => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((r, i) => {
                  const name = r.result?.firstName
                    ? `${r.result.firstName} ${r.result.lastName || ''}`.trim()
                    : '—';
                  return (
                    <tr key={r._id} style={{ background: i % 2 ? '#f8fafc' : '#fff' }}>
                      <td style={s.td}><span style={{ fontWeight: 600, color: '#0f172a' }}>{name}</span></td>
                      <td style={s.td}>{r.bvn ? `••••${r.bvn.slice(-4)}` : '—'}</td>
                      <td style={s.td}>
                        {r.customer ? (
                          <span
                            style={{ color: '#0ea5e9', fontWeight: 600, cursor: 'pointer' }}
                            onClick={() => navigate(`/dashboard/customers/${r.customer._id}`)}
                          >
                            {r.customer.name}
                          </span>
                        ) : <span style={{ color: '#94a3b8' }}>—</span>}
                      </td>
                      <td style={s.td}>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20,
                          background: r.status === 'success' ? '#dcfce7' : '#fee2e2',
                          color: r.status === 'success' ? '#16a34a' : '#dc2626',
                        }}>
                          {r.status}
                        </span>
                      </td>
                      <td style={s.td}>{new Date(r.createdAt).toLocaleString()}</td>
                      <td style={s.td}>
                        <div style={{ display: 'flex', gap: 10 }}>
                          {r.result?.firstName && (
                            <span
                              style={{ color: '#0ea5e9', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
                              onClick={() => setResult(r.result)}
                            >
                              View
                            </span>
                          )}
                          {r.status === 'success' && (
                            <span
                              style={{ color: '#6d28d9', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
                              onClick={async () => {
                                const { default: exportBVNCertPDF } = await import('../services/exportBVNCertPDF');
                                exportBVNCertPDF(r);
                              }}
                            >
                              PDF
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { padding: '2rem', maxWidth: 1000, margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' },
  title: { fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 4px' },
  sub: { fontSize: 14, color: '#64748b', margin: 0 },
  layout: { display: 'flex', flexDirection: 'column', gap: 20 },
  formCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '1.75rem' },
  cardTitle: { fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 16 },
  field: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  input: { width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', fontSize: 14, color: '#0f172a', boxSizing: 'border-box', outline: 'none' },
  hint: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
  btn: { background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 24px', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginTop: 4 },
  resultCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '1.75rem' },
  resultHeader: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 },
  badge: { fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 },
  infoRow: { background: '#f8fafc', borderRadius: 8, padding: '10px 14px' },
  infoLabel: { fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  infoValue: { fontSize: 14, fontWeight: 600, color: '#0f172a' },
  sectionLabel: { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  photo: { width: 100, height: 100, borderRadius: 8, objectFit: 'cover', border: '2px solid #e2e8f0' },
  historyCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '1.75rem' },
  historyHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  csvBtn: { background: '#f0fdf4', color: '#16a34a', border: '1.5px solid #16a34a', borderRadius: 8, padding: '6px 14px', fontWeight: 700, fontSize: 12, cursor: 'pointer' },
  search: { border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', width: 220 },
  empty: { padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: 14 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { background: '#f8fafc', color: '#94a3b8', padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 },
  td: { padding: '12px 14px', borderBottom: '1px solid #f1f5f9', fontSize: 14, color: '#334155' },
};
