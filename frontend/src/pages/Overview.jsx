import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import api, { API_BASE as API } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { exportStatementsCSV } from '../services/exportCSV';
import OnboardingBanner from '../components/OnboardingBanner';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts';

function authHeaders() { return { Authorization: `Bearer ${localStorage.getItem('token')}` }; }

const FUNNEL_COLORS = {
  applied: '#1d4ed8', under_review: '#d97706', approved: '#16a34a',
  rejected: '#dc2626', disbursed: '#6d28d9',
};
const VERDICT_COLORS = { ELIGIBLE: '#16a34a', CONDITIONAL: '#d97706', NOT_ELIGIBLE: '#dc2626' };
const FUNNEL_LABEL = { applied: 'Applied', under_review: 'Under Review', approved: 'Approved', rejected: 'Rejected', disbursed: 'Disbursed' };

export default function Overview() {
  const { client } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [statements, setStatements] = useState([]);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/api/customers/analyses/stats`, { headers: authHeaders() });
      setStats(data);
    } catch {}
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/api/customers/analyses/analytics`, { headers: authHeaders() });
      setAnalytics(data);
    } catch {}
  }, []);

  const fetchApiKeys = useCallback(async () => {
    try {
      const { data } = await api.get('/api/keys');
      setHasApiKey((data.keys || data)?.length > 0);
    } catch {}
  }, []);

  const fetchStatements = useCallback(async (q = '') => {
    setSearching(true);
    try {
      const { data } = await api.get('/api/statements', { params: q ? { q } : {} });
      setStatements(data.statements);
    } catch {} finally { setSearching(false); }
  }, []);

  useEffect(() => {
    fetchStats(); fetchAnalytics(); fetchStatements(); fetchApiKeys();
    api.get('/api/wallet').then(({ data }) => setWallet(data.wallet)).catch(() => {});
  }, [fetchStats, fetchAnalytics, fetchStatements, fetchApiKeys]);

  useEffect(() => {
    const t = setTimeout(() => fetchStatements(search), 350);
    return () => clearTimeout(t);
  }, [search, fetchStatements]);

  const hasData = analytics && (
    analytics.trend?.some(t => t.customers > 0 || t.reviews > 0) ||
    analytics.funnel?.some(f => f.count > 0)
  );

  const verdictPie = analytics ? [
    { name: 'Eligible', value: analytics.verdictBreakdown?.ELIGIBLE ?? 0, color: '#16a34a' },
    { name: 'Conditional', value: analytics.verdictBreakdown?.CONDITIONAL ?? 0, color: '#d97706' },
    { name: 'Not Eligible', value: analytics.verdictBreakdown?.NOT_ELIGIBLE ?? 0, color: '#dc2626' },
  ].filter(d => d.value > 0) : [];

  const approvalRate = analytics
    ? (() => {
        const total = (analytics.verdictBreakdown?.ELIGIBLE ?? 0) + (analytics.verdictBreakdown?.CONDITIONAL ?? 0) + (analytics.verdictBreakdown?.NOT_ELIGIBLE ?? 0);
        return total > 0 ? Math.round(((analytics.verdictBreakdown?.ELIGIBLE ?? 0) / total) * 100) : null;
      })()
    : null;

  return (
    <div>
      {showAddCustomer && <AddCustomerModal onClose={() => setShowAddCustomer(false)} onCreated={(c) => { setShowAddCustomer(false); navigate(`/dashboard/customers/${c._id}`); }} />}
      <OnboardingBanner />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div>
          <h1 style={s.h1}>Welcome, {client?.organizationName || client?.name}</h1>
          <p style={s.sub}>Your credit analysis dashboard</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => setShowAddCustomer(true)}
            style={{ padding: '9px 18px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            + Add Customer
          </button>
          <button onClick={() => navigate('/dashboard/statement')}
            style={{ padding: '9px 18px', background: '#6d28d9', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            + Analyse Statement
          </button>
          <button style={s.exportBtn} onClick={async () => {
            const { default: exportSummaryPDF } = await import('../services/exportSummaryPDF');
            exportSummaryPDF({ stats, orgName: client?.organizationName });
          }}>↓ Export Summary PDF</button>
        </div>
      </div>

      {stats && stats.customers === 0 && !stats.statements?.total && !stats.bvn?.total && (
        <div style={{ background: 'linear-gradient(135deg,#f0f9ff,#e0f2fe)', border: '1.5px solid #bae6fd', borderRadius: 14, padding: '2rem', marginBottom: 28, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>👋</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>No data yet — let's get started</div>
          <div style={{ fontSize: 14, color: '#64748b', marginBottom: 20 }}>Add your first borrower to begin verifying identity, pulling bureau reports, and analysing bank statements.</div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/dashboard/customers')} style={{ padding: '10px 22px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>+ Add a customer</button>
            <button onClick={() => navigate('/dashboard/api-keys')} style={{ padding: '10px 22px', background: '#fff', color: '#0f172a', border: '1.5px solid #e2e8f0', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Get API key</button>
          </div>
        </div>
      )}

      {/* Wallet widget */}
      {wallet !== null && (
        <div onClick={() => navigate('/dashboard/billing')} style={{ background: wallet?.balance <= 1000 ? '#fff5f5' : '#f0fdf4', border: `1.5px solid ${wallet?.balance <= 1000 ? '#fecaca' : '#bbf7d0'}`, borderRadius: 12, padding: '14px 20px', marginBottom: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ fontSize: 24 }}>{wallet?.balance <= 1000 ? '⚠️' : '💳'}</div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Wallet Balance</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: wallet?.balance <= 1000 ? '#dc2626' : '#16a34a' }}>₦{(wallet?.balance || 0).toLocaleString()}</div>
            </div>
            {wallet?.balance <= 1000 && (
              <div style={{ fontSize: 13, fontWeight: 600, color: '#dc2626' }}>Low balance — top up to avoid interruptions</div>
            )}
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>View billing →</div>
        </div>
      )}

      {/* Stat cards */}
      <div style={s.statRow}>
        <StatCard label="Customers" value={stats?.customers ?? '—'} sub="Borrower profiles" color="#0ea5e9" onClick={() => navigate('/dashboard/customers')} />
        <StatCard label="Statement Analyses" value={stats?.statements?.total ?? '—'} sub={stats?.statements ? `${stats.statements.failed ?? 0} failed` : ''} color="#6d28d9" onClick={() => navigate('/dashboard/statement')} />
        <StatCard label="BVN Verifications" value={stats?.bvn?.total ?? '—'} sub={stats?.bvn ? `${stats.bvn.failed ?? 0} failed` : ''} color="#16a34a" onClick={() => navigate('/dashboard/bvn')} />
        <StatCard label="NIN Verifications" value={stats?.nin?.total ?? '—'} sub={stats?.nin ? `${stats.nin.failed ?? 0} failed` : ''} color="#6d28d9" onClick={() => navigate('/dashboard/nin')} />
        <StatCard label="Bureau Checks" value={stats?.bureau?.total ?? '—'} sub={stats?.bureau ? `${stats.bureau.failed ?? 0} failed` : ''} color="#f59e0b" onClick={() => navigate('/dashboard/credit-bureau')} />
        {approvalRate !== null && (
          <StatCard label="Approval Rate" value={`${approvalRate}%`} sub="Eligible loan reviews" color="#16a34a" onClick={() => navigate('/dashboard/pipeline')} />
        )}
      </div>

      {/* Analytics charts — only shown when there is data */}
      {hasData && (
        <>
          {/* Row 1: trend + funnel */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16, marginBottom: 16 }}>

            {/* Customer & review trend */}
            <div style={s.box}>
              <h3 style={s.boxTitle}>Activity — Last 6 Months</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={analytics.trend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                  <Bar dataKey="customers" name="New customers" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="reviews" name="Loan reviews" fill="#6d28d9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                {[['#0ea5e9', 'New customers'], ['#6d28d9', 'Loan reviews']].map(([color, label]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#64748b' }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />{label}
                  </div>
                ))}
              </div>
            </div>

            {/* Pipeline funnel */}
            <div style={s.box}>
              <h3 style={s.boxTitle}>Loan Pipeline Funnel</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                {(() => {
                  const total = analytics.funnel.reduce((a, f) => a + f.count, 0) || 1;
                  return analytics.funnel.map(f => (
                    <div key={f.status}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                        <span style={{ fontWeight: 600, color: FUNNEL_COLORS[f.status] }}>{FUNNEL_LABEL[f.status]}</span>
                        <span style={{ color: '#64748b' }}>{f.count}</span>
                      </div>
                      <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(f.count / total) * 100}%`, background: FUNNEL_COLORS[f.status], borderRadius: 4, transition: 'width 0.5s' }} />
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>

          {/* Row 2: eligible trend + verdict breakdown + top borrowers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>

            {/* Eligible approvals trend */}
            {analytics.trend.some(t => t.eligible > 0) && (
              <div style={s.box}>
                <h3 style={s.boxTitle}>Eligible Approvals Trend</h3>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={analytics.trend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                    <Line type="monotone" dataKey="eligible" name="Eligible" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 4, fill: '#16a34a' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Verdict pie */}
            {verdictPie.length > 0 && (
              <div style={s.box}>
                <h3 style={s.boxTitle}>Loan Review Verdicts</h3>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={verdictPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} paddingAngle={3}>
                      {verdictPie.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Top borrowers */}
            {analytics.topBorrowers?.length > 0 && (
              <div style={s.box}>
                <h3 style={s.boxTitle}>Top Approved Borrowers</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  {analytics.topBorrowers.map((b, i) => (
                    <div key={b.customerId} onClick={() => navigate(`/dashboard/customers/${b.customerId}`)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '6px 0', borderBottom: i < analytics.topBorrowers.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg,#0ea5e9,#6d28d9)', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {b.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.name}</div>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', flexShrink: 0 }}>₦{Number(b.loanAmount).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Recent statement analyses */}
      <div style={s.box}>
        <div style={s.boxHeader}>
          <h3 style={s.boxTitle}>Recent Statement Analyses</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {statements.length > 0 && (
              <button style={s.csvBtn} onClick={() => exportStatementsCSV(statements)}>↓ CSV</button>
            )}
            <input style={s.search} placeholder="Search by name, email, bank…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        {searching && <p style={s.hint}>Searching…</p>}
        {!searching && statements.length === 0 && (
          <div style={s.empty}>
            <div style={{ fontWeight: 600, color: '#334155' }}>No analyses yet</div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
              {search ? 'No results for that search.' : 'Upload a bank statement to get started.'}
            </div>
          </div>
        )}
        {statements.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>{['Account Name', 'Email', 'Bank', 'File', 'Status', 'Date', ''].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {statements.map((st) => (
                <tr key={st._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/dashboard/statements/${st._id}`)}>
                  <td style={s.td}>{st.accountName || '—'}</td>
                  <td style={s.td}>{st.email || '—'}</td>
                  <td style={s.td}>{st.bankName ? capitalize(st.bankName) : '—'}</td>
                  <td style={s.td}>{st.filename || '—'}</td>
                  <td style={s.td}>
                    <span style={{ ...s.badge, background: st.status === 'success' ? '#dcfce7' : '#fee2e2', color: st.status === 'success' ? '#16a34a' : '#dc2626' }}>{st.status}</span>
                  </td>
                  <td style={s.td}>{new Date(st.createdAt).toLocaleString()}</td>
                  <td style={s.td}><span style={{ color: '#0ea5e9', fontWeight: 600, fontSize: 12 }}>View →</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function AddCustomerModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', bvn: '', customerType: 'individual' });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const { default: toast } = await import('react-hot-toast');
      const { data } = await api.post('/api/customers', form);
      toast.success('Customer created');
      onCreated(data.customer);
    } catch (err) {
      const { default: toast } = await import('react-hot-toast');
      toast.error(err?.response?.data?.error || 'Failed to create customer');
    } finally {
      setSaving(false);
    }
  }

  const inp = { width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };
  const lbl = { fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: '1.75rem', width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}>Add Customer</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#94a3b8' }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={lbl}>Full Name *</label>
            <input style={inp} placeholder="e.g. Amaka Okafor" value={form.name} onChange={set('name')} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>Email</label>
              <input style={inp} type="email" placeholder="email@example.com" value={form.email} onChange={set('email')} />
            </div>
            <div>
              <label style={lbl}>Phone</label>
              <input style={inp} placeholder="080xxxxxxxx" value={form.phone} onChange={set('phone')} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>BVN</label>
              <input style={inp} placeholder="11-digit BVN" value={form.bvn} onChange={set('bvn')} maxLength={11} />
            </div>
            <div>
              <label style={lbl}>Customer Type</label>
              <select style={inp} value={form.customerType} onChange={set('customerType')}>
                <option value="individual">Individual</option>
                <option value="business">Business</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px', border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer', color: '#374151' }}>Cancel</button>
            <button type="submit" disabled={saving || !form.name.trim()} style={{ flex: 2, padding: '10px', border: 'none', borderRadius: 8, background: saving ? '#7dd3fc' : '#0ea5e9', color: '#fff', fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Creating…' : 'Create & Open Profile →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color, onClick }) {
  return (
    <div style={{ ...s.card, cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
      <div style={{ fontSize: 32, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const s = {
  h1: { fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 },
  sub: { color: '#64748b', fontSize: 14, marginTop: 4, marginBottom: 24 },
  statRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 },
  card: { background: '#fff', borderRadius: 12, padding: '1.25rem 1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', transition: 'box-shadow 0.15s' },
  box: { background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' },
  boxHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  boxTitle: { fontSize: 15, fontWeight: 600, color: '#0f172a', margin: '0 0 4px' },
  search: { padding: '8px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, width: 260, outline: 'none' },
  hint: { color: '#94a3b8', fontSize: 13 },
  empty: { textAlign: 'center', padding: '3rem 0' },
  th: { textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600 },
  td: { padding: '12px 12px', borderBottom: '1px solid #f1f5f9', color: '#334155' },
  badge: { padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  exportBtn: { background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 600, fontSize: 13, cursor: 'pointer', flexShrink: 0 },
  csvBtn: { background: '#f0fdf4', color: '#16a34a', border: '1.5px solid #16a34a', borderRadius: 8, padding: '6px 14px', fontWeight: 700, fontSize: 12, cursor: 'pointer' },
};
