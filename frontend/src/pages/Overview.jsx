import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'https://mfi-data-production.up.railway.app';

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('token')}` };
}

export default function Overview() {
  const { client } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [statements, setStatements] = useState([]);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/api/customers/analyses/stats`, { headers: authHeaders() });
      setStats(data);
    } catch {
      // backend not yet connected
    }
  }, []);

  const fetchStatements = useCallback(async (q = '') => {
    setSearching(true);
    try {
      const { data } = await api.get('/api/statements', { params: q ? { q } : {} });
      setStatements(data.statements);
    } catch {
      // backend not yet connected
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchStatements();
  }, [fetchStats, fetchStatements]);

  useEffect(() => {
    const t = setTimeout(() => fetchStatements(search), 350);
    return () => clearTimeout(t);
  }, [search, fetchStatements]);

  return (
    <div>
      <h1 style={s.h1}>Welcome, {client?.organizationName}</h1>
      <p style={s.sub}>Your credit analysis dashboard</p>

      {/* Stat cards */}
      <div style={s.statRow}>
        <StatCard
          label="Customers"
          value={stats?.customers ?? '—'}
          sub="Borrower profiles"
          color="#0ea5e9"
          onClick={() => navigate('/dashboard/customers')}
        />
        <StatCard
          label="Statement Analyses"
          value={stats?.statements?.total ?? '—'}
          sub={stats ? `${stats.statements.failed} failed` : ''}
          color="#6d28d9"
          onClick={() => navigate('/dashboard/statement')}
        />
        <StatCard
          label="BVN Verifications"
          value={stats?.bvn?.total ?? '—'}
          sub={stats ? `${stats.bvn.failed} failed` : ''}
          color="#16a34a"
          onClick={() => navigate('/dashboard/bvn')}
        />
        <StatCard
          label="Bureau Checks"
          value={stats?.bureau?.total ?? '—'}
          sub={stats ? `${stats.bureau.failed} failed` : ''}
          color="#f59e0b"
          onClick={() => navigate('/dashboard/credit-bureau')}
        />
      </div>

      {/* Recent statement analyses */}
      <div style={s.box}>
        <div style={s.boxHeader}>
          <h3 style={s.boxTitle}>Recent Statement Analyses</h3>
          <input
            style={s.search}
            placeholder="Search by name, email, bank…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {searching && <p style={s.hint}>Searching…</p>}

        {!searching && statements.length === 0 && (
          <div style={s.empty}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📄</div>
            <div style={{ fontWeight: 600, color: '#334155' }}>No analyses yet</div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
              {search ? 'No results for that search.' : 'Upload a bank statement to get started.'}
            </div>
          </div>
        )}

        {statements.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Account Name', 'Email', 'Bank', 'File', 'Status', 'Date', ''].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {statements.map((st) => (
                <tr key={st._id} style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/dashboard/statements/${st._id}`)}>
                  <td style={s.td}>{st.accountName || '—'}</td>
                  <td style={s.td}>{st.email || '—'}</td>
                  <td style={s.td}>{st.bankName ? capitalize(st.bankName) : '—'}</td>
                  <td style={s.td}>{st.filename || '—'}</td>
                  <td style={s.td}>
                    <span style={{
                      ...s.badge,
                      background: st.status === 'success' ? '#dcfce7' : '#fee2e2',
                      color: st.status === 'success' ? '#16a34a' : '#dc2626',
                    }}>
                      {st.status}
                    </span>
                  </td>
                  <td style={s.td}>{new Date(st.createdAt).toLocaleString()}</td>
                  <td style={s.td}>
                    <span style={{ color: '#0ea5e9', fontWeight: 600, fontSize: 12 }}>View →</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
  statRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 },
  card: { background: '#fff', borderRadius: 12, padding: '1.25rem 1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', transition: 'box-shadow 0.15s' },
  box: { background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' },
  boxHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  boxTitle: { fontSize: 15, fontWeight: 600, color: '#0f172a', margin: 0 },
  search: { padding: '8px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, width: 260, outline: 'none' },
  hint: { color: '#94a3b8', fontSize: 13 },
  empty: { textAlign: 'center', padding: '3rem 0' },
  th: { textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600 },
  td: { padding: '12px 12px', borderBottom: '1px solid #f1f5f9', color: '#334155' },
  badge: { padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
};
