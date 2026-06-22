import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'https://mfi-data-production.up.railway.app';
function authHeaders() { return { Authorization: `Bearer ${localStorage.getItem('token')}` }; }

const STATUSES = ['applied', 'under_review', 'approved', 'rejected', 'disbursed'];
const STATUS_COLOR = {
  applied: ['#dbeafe', '#1d4ed8'],
  under_review: ['#fef3c7', '#d97706'],
  approved: ['#dcfce7', '#16a34a'],
  rejected: ['#fee2e2', '#dc2626'],
  disbursed: ['#ede9fe', '#6d28d9'],
};
const STATUS_LABEL = { applied: 'Applied', under_review: 'Under Review', approved: 'Approved', rejected: 'Rejected', disbursed: 'Disbursed' };

export default function LoanPipeline() {
  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState({});
  const [activeStatus, setActiveStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  async function load(status) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (search) params.set('q', search);
      const [custRes, statsRes] = await Promise.all([
        axios.get(`${API}/api/customers?${params}`, { headers: authHeaders() }),
        axios.get(`${API}/api/customers/pipeline/stats`, { headers: authHeaders() }),
      ]);
      setCustomers(custRes.data.customers || []);
      setStats(statsRes.data.stats || {});
    } catch {
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(activeStatus); }, [activeStatus]);

  function handleSearch(e) {
    e.preventDefault();
    load(activeStatus);
  }

  const total = Object.values(stats).reduce((a, b) => a + b, 0);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={s.h1}>Loan Pipeline</h1>
        <p style={s.sub}>Track customers through your loan approval process.</p>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={s.statCard('all', activeStatus === '')}>
          <div style={s.statNum}>{total}</div>
          <div style={s.statLabel}>All Customers</div>
        </div>
        {STATUSES.map(st => (
          <div key={st} style={s.statCard(st, activeStatus === st)} onClick={() => setActiveStatus(activeStatus === st ? '' : st)}>
            <div style={{ ...s.statNum, color: STATUS_COLOR[st][1] }}>{stats[st] ?? 0}</div>
            <div style={{ ...s.statLabel, color: STATUS_COLOR[st][1] }}>{STATUS_LABEL[st]}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button style={{ ...s.pill, ...(activeStatus === '' ? s.pillActive : {}) }} onClick={() => setActiveStatus('')}>All</button>
        {STATUSES.map(st => (
          <button key={st} style={{ ...s.pill, ...(activeStatus === st ? { background: STATUS_COLOR[st][0], color: STATUS_COLOR[st][1], border: `1.5px solid ${STATUS_COLOR[st][1]}40` } : {}) }} onClick={() => setActiveStatus(activeStatus === st ? '' : st)}>
            {STATUS_LABEL[st]}
          </button>
        ))}
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or BVN..."
          style={{ flex: 1, maxWidth: 320, padding: '9px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none' }}
        />
        <button type="submit" style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#0f172a', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Search</button>
      </form>

      {/* Table */}
      <div style={s.tableBox}>
        {loading ? (
          <div style={s.empty}>Loading…</div>
        ) : customers.length === 0 ? (
          <div style={s.empty}>No customers found for this filter.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Customer', 'Contact', 'Status', 'Created', ''].map(h => <th key={h} style={s.th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {customers.map((c, i) => {
                const [bg, fg] = STATUS_COLOR[c.status] ?? ['#f1f5f9', '#64748b'];
                return (
                  <tr key={c._id} style={{ background: i % 2 ? '#fafafa' : '#fff' }}>
                    <td style={s.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#0ea5e9,#6d28d9)', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{c.name}</div>
                          {c.bvn && <div style={{ fontSize: 11, color: '#94a3b8' }}>BVN ••••{c.bvn.slice(-4)}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ ...s.td, color: '#64748b', fontSize: 13 }}>
                      {c.email && <div>{c.email}</div>}
                      {c.phone && <div>{c.phone}</div>}
                    </td>
                    <td style={s.td}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: bg, color: fg }}>{STATUS_LABEL[c.status] ?? c.status}</span>
                    </td>
                    <td style={{ ...s.td, fontSize: 12, color: '#94a3b8' }}>{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td style={s.td}>
                      <Link to={`/dashboard/customers/${c._id}`} style={{ fontSize: 12, fontWeight: 600, color: '#0ea5e9', textDecoration: 'none' }}>View →</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const s = {
  h1: { fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 },
  sub: { color: '#64748b', fontSize: 14, marginTop: 4, marginBottom: 0 },
  statCard: (st, active) => ({
    background: active ? (st === 'all' ? '#0f172a' : STATUS_COLOR[st]?.[0] ?? '#f1f5f9') : '#fff',
    border: `1.5px solid ${active ? (st === 'all' ? '#0f172a' : STATUS_COLOR[st]?.[1] ?? '#e2e8f0') : '#e2e8f0'}`,
    borderRadius: 12, padding: '12px 18px', cursor: st !== 'all' ? 'pointer' : 'default',
    minWidth: 100, textAlign: 'center', transition: 'all 0.15s',
  }),
  statNum: { fontSize: 24, fontWeight: 800, color: '#0f172a' },
  statLabel: { fontSize: 11, fontWeight: 600, color: '#64748b', marginTop: 2, textTransform: 'capitalize' },
  pill: { fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 20, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer' },
  pillActive: { background: '#0f172a', color: '#fff', border: '1.5px solid #0f172a' },
  tableBox: { background: '#fff', borderRadius: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.06)', overflow: 'hidden' },
  th: { textAlign: 'left', padding: '10px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  td: { padding: '12px 16px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' },
  empty: { padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: 14 },
};
