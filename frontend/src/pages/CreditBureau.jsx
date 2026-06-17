import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL || 'https://mfi-data-production.up.railway.app';

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('token')}` };
}

const fmt = (v) => (v !== undefined && v !== null ? Number(v).toLocaleString() : '—');

export default function CreditBureau() {
  const [form, setForm] = useState({ bvn: '', firstName: '', lastName: '', dateOfBirth: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [q, setQ] = useState('');
  const navigate = useNavigate();

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const fetchHistory = useCallback(async (search = '') => {
    setHistoryLoading(true);
    try {
      const { data } = await axios.get(`${API}/api/customers/analyses/bureau`, {
        params: search ? { q: search } : {},
        headers: authHeaders(),
      });
      setHistory(data.results);
    } catch {
      // silently fail
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
    if (form.bvn.length !== 11) return toast.error('BVN must be 11 digits');
    const apiKey = localStorage.getItem('apiKey');
    if (!apiKey) return toast.error('No API key found. Please re-login.');

    setLoading(true);
    setResult(null);
    try {
      const { data } = await axios.post(
        `${API}/v1/credit-bureau/check`,
        {
          bvn: form.bvn,
          firstName: form.firstName || undefined,
          lastName: form.lastName || undefined,
          dateOfBirth: form.dateOfBirth || undefined,
        },
        { headers: { 'X-Api-Key': apiKey } },
      );
      setResult(data.data || data);
      toast.success('Bureau check complete and saved');
      fetchHistory();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Bureau check failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Credit Bureau Check</h1>
          <p style={s.sub}>Pull a borrower's credit history and outstanding obligations. Every result is saved automatically.</p>
        </div>
      </div>

      <div style={s.layout}>
        {/* Form */}
        <div style={s.formCard}>
          <div style={s.cardTitle}>Run a Bureau Check</div>
          <form onSubmit={handleSubmit}>
            <div style={s.row}>
              <div style={s.field}>
                <label style={s.label}>BVN (11 digits) *</label>
                <input
                  style={s.input}
                  type="text"
                  maxLength={11}
                  placeholder="e.g. 22222222222"
                  value={form.bvn}
                  onChange={(e) => setForm((f) => ({ ...f, bvn: e.target.value.replace(/\D/g, '') }))}
                  required
                />
              </div>
              <div style={s.field}>
                <label style={s.label}>Date of Birth (optional)</label>
                <input style={s.input} type="text" placeholder="YYYY-MM-DD" value={form.dateOfBirth} onChange={set('dateOfBirth')} />
              </div>
            </div>
            <div style={s.row}>
              <div style={s.field}>
                <label style={s.label}>First Name (optional)</label>
                <input style={s.input} type="text" placeholder="e.g. Amaka" value={form.firstName} onChange={set('firstName')} />
              </div>
              <div style={s.field}>
                <label style={s.label}>Last Name (optional)</label>
                <input style={s.input} type="text" placeholder="e.g. Obi" value={form.lastName} onChange={set('lastName')} />
              </div>
            </div>
            <button style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} type="submit" disabled={loading}>
              {loading ? 'Fetching report…' : 'Run Bureau Check →'}
            </button>
          </form>
        </div>

        {/* Latest result */}
        {result && <BureauResult data={result} />}

        {/* History */}
        <div style={s.historyCard}>
          <div style={s.historyHeader}>
            <div style={s.cardTitle}>Bureau Check History</div>
            <input
              style={s.search}
              placeholder="Search by BVN…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          {historyLoading ? (
            <div style={s.empty}>Loading…</div>
          ) : history.length === 0 ? (
            <div style={s.empty}>No bureau checks yet. Run your first check above.</div>
          ) : (
            <table style={s.table}>
              <thead>
                <tr>
                  {['BVN', 'Credit Score', 'Customer', 'Status', 'Date', ''].map((h) => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((r, i) => {
                  const score = r.result?.creditScore ?? r.result?.summary?.creditScore;
                  return (
                    <tr key={r._id} style={{ background: i % 2 ? '#f8fafc' : '#fff' }}>
                      <td style={s.td}>{r.bvn ? `••••${r.bvn.slice(-4)}` : '—'}</td>
                      <td style={s.td}><span style={{ fontWeight: 700, color: '#6d28d9' }}>{score ?? '—'}</span></td>
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
                        {r.result && (
                          <span
                            style={{ color: '#0ea5e9', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
                            onClick={() => setResult(r.result)}
                          >
                            View
                          </span>
                        )}
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

function BureauResult({ data }) {
  const summary = data.summary || data;
  const loans = data.loans || data.activeLoans || [];
  const history = data.repaymentHistory || data.creditHistory || [];

  return (
    <div style={s.resultCard}>
      <div style={s.scoreBanner}>
        <div>
          <div style={s.scoreNum}>{summary.creditScore ?? data.creditScore ?? '—'}</div>
          <div style={s.scoreLabel}>Credit Score</div>
        </div>
        <div style={s.scoreDetails}>
          {[
            ['Total Facilities', summary.totalFacilities ?? data.totalFacilities],
            ['Active Loans', summary.activeLoans ?? data.activeLoans],
            ['Total Outstanding', summary.totalOutstanding !== undefined ? `₦${fmt(summary.totalOutstanding)}` : undefined],
            ['Overdue Amount', summary.overdueAmount !== undefined ? `₦${fmt(summary.overdueAmount)}` : undefined],
            ['Delinquency', summary.delinquencyStatus ?? data.delinquencyStatus],
            ['Bureau Status', summary.status ?? data.status],
          ].filter(([, v]) => v !== undefined && v !== null).map(([label, value]) => (
            <div key={label} style={s.scoreDetailItem}>
              <div style={s.infoLabel}>{label}</div>
              <div style={s.infoValueWhite}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {loans.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={s.sectionLabel}>Active Loan Facilities</div>
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>{['Lender', 'Type', 'Amount', 'Outstanding', 'Overdue', 'Status', 'Start', 'End'].map((h) => <th key={h} style={s.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {loans.map((loan, i) => (
                  <tr key={i} style={{ background: i % 2 ? '#f8fafc' : '#fff' }}>
                    <td style={s.td}>{loan.lender ?? loan.bank ?? '—'}</td>
                    <td style={s.td}>{loan.type ?? loan.loanType ?? '—'}</td>
                    <td style={s.td}>₦{fmt(loan.amount ?? loan.loanAmount)}</td>
                    <td style={s.td}>₦{fmt(loan.outstanding ?? loan.outstandingBalance)}</td>
                    <td style={s.td}>₦{fmt(loan.overdue ?? loan.overdueAmount ?? 0)}</td>
                    <td style={s.td}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: (loan.status || '').toLowerCase() === 'performing' ? '#dcfce7' : '#fee2e2', color: (loan.status || '').toLowerCase() === 'performing' ? '#16a34a' : '#dc2626' }}>
                        {loan.status ?? '—'}
                      </span>
                    </td>
                    <td style={s.td}>{loan.startDate ?? '—'}</td>
                    <td style={s.td}>{loan.endDate ?? loan.maturityDate ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {loans.length === 0 && history.length === 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={s.sectionLabel}>Full Response</div>
          <pre style={{ background: '#f8fafc', borderRadius: 8, padding: '1rem', fontSize: 12, overflowX: 'auto', color: '#334155' }}>{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}
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
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 0 },
  field: { marginBottom: 14 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  input: { width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', fontSize: 14, color: '#0f172a', boxSizing: 'border-box', outline: 'none' },
  btn: { background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 24px', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginTop: 4 },
  resultCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '1.75rem' },
  scoreBanner: { display: 'flex', alignItems: 'center', gap: 32, background: 'linear-gradient(135deg, #0f172a, #1e3a5f)', borderRadius: 12, padding: '1.5rem 2rem', marginBottom: 4 },
  scoreNum: { fontSize: 52, fontWeight: 800, color: '#38bdf8', lineHeight: 1 },
  scoreLabel: { fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 },
  scoreDetails: { display: 'flex', flexWrap: 'wrap', gap: 16, flex: 1 },
  scoreDetailItem: { background: 'rgba(255,255,255,0.07)', borderRadius: 8, padding: '10px 14px', minWidth: 120 },
  infoLabel: { fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  infoValueWhite: { fontSize: 14, fontWeight: 600, color: '#fff' },
  sectionLabel: { fontSize: 12, fontWeight: 700, color: '#0ea5e9', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  tableWrap: { overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 10 },
  historyCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '1.75rem' },
  historyHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  search: { border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', width: 220 },
  empty: { padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: 14 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { background: '#f8fafc', color: '#94a3b8', padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 },
  td: { padding: '12px 14px', borderBottom: '1px solid #f1f5f9', fontSize: 14, color: '#334155' },
};
