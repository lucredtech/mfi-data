import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'https://mfi-data-production.up.railway.app';
function authHeaders() { return { Authorization: `Bearer ${localStorage.getItem('token')}` }; }

const STATUSES = ['applied', 'under_review', 'approved', 'rejected', 'disbursed'];
const STATUS_COLOR = {
  applied:      ['#dbeafe', '#1d4ed8'],
  under_review: ['#fef3c7', '#d97706'],
  approved:     ['#dcfce7', '#16a34a'],
  rejected:     ['#fee2e2', '#dc2626'],
  disbursed:    ['#ede9fe', '#6d28d9'],
};
const STATUS_LABEL = {
  applied: 'Applied', under_review: 'Under Review', approved: 'Approved',
  rejected: 'Rejected', disbursed: 'Disbursed',
};

export default function LoanPipeline() {
  const { isViewer } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [stats, setStats]         = useState({});
  const [activeStatus, setActiveStatus] = useState('');
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [view, setView]           = useState('list'); // 'list' | 'kanban'
  const [selected, setSelected]   = useState(new Set());
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const load = useCallback(async (status, q) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (q) params.set('q', q);
      const [custRes, statsRes] = await Promise.all([
        axios.get(`${API}/api/customers?${params}`, { headers: authHeaders() }),
        axios.get(`${API}/api/customers/pipeline/stats`, { headers: authHeaders() }),
      ]);
      setCustomers(custRes.data.customers || []);
      setStats(statsRes.data.stats || {});
      setSelected(new Set());
    } catch {
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(activeStatus, search); }, [activeStatus]);

  function handleSearch(e) {
    e.preventDefault();
    load(activeStatus, search);
  }

  async function changeStatus(customerId, newStatus) {
    setUpdatingId(customerId);
    try {
      await axios.patch(`${API}/api/customers/${customerId}/status`, { status: newStatus }, { headers: authHeaders() });
      setCustomers(prev => prev.map(c => c._id === customerId ? { ...c, status: newStatus } : c));
      // refresh stats silently
      axios.get(`${API}/api/customers/pipeline/stats`, { headers: authHeaders() })
        .then(r => setStats(r.data.stats || {})).catch(() => {});
      toast.success(`Moved to ${STATUS_LABEL[newStatus]}`);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  }

  async function bulkUpdate() {
    if (!bulkStatus || selected.size === 0) return;
    setBulkLoading(true);
    try {
      await axios.patch(`${API}/api/customers/bulk/status`, { ids: [...selected], status: bulkStatus }, { headers: authHeaders() });
      toast.success(`Updated ${selected.size} customers to ${STATUS_LABEL[bulkStatus]}`);
      await load(activeStatus, search);
      setBulkStatus('');
    } catch {
      toast.error('Bulk update failed');
    } finally {
      setBulkLoading(false);
    }
  }

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === customers.length) setSelected(new Set());
    else setSelected(new Set(customers.map(c => c._id)));
  }

  const total = Object.values(stats).reduce((a, b) => a + b, 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={s.h1}>Loan Pipeline</h1>
          <p style={s.sub}>Track customers through your loan approval process.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ ...s.viewBtn, ...(view === 'list' ? s.viewBtnActive : {}) }} onClick={() => setView('list')}>☰ List</button>
          <button style={{ ...s.viewBtn, ...(view === 'kanban' ? s.viewBtnActive : {}) }} onClick={() => setView('kanban')}>⬜ Board</button>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={s.statCard('all', activeStatus === '')} onClick={() => setActiveStatus('')}>
          <div style={s.statNum}>{total}</div>
          <div style={s.statLabel}>All</div>
        </div>
        {STATUSES.map(st => (
          <div key={st} style={s.statCard(st, activeStatus === st)} onClick={() => setActiveStatus(activeStatus === st ? '' : st)}>
            <div style={{ ...s.statNum, color: STATUS_COLOR[st][1] }}>{stats[st] ?? 0}</div>
            <div style={{ ...s.statLabel, color: STATUS_COLOR[st][1] }}>{STATUS_LABEL[st]}</div>
          </div>
        ))}
      </div>

      {/* Search + filters (list view) */}
      {view === 'list' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <button style={{ ...s.pill, ...(activeStatus === '' ? s.pillActive : {}) }} onClick={() => setActiveStatus('')}>All</button>
            {STATUSES.map(st => (
              <button key={st} style={{ ...s.pill, ...(activeStatus === st ? { background: STATUS_COLOR[st][0], color: STATUS_COLOR[st][1], border: `1.5px solid ${STATUS_COLOR[st][1]}40` } : {}) }} onClick={() => setActiveStatus(activeStatus === st ? '' : st)}>
                {STATUS_LABEL[st]}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or BVN…"
              style={{ flex: 1, maxWidth: 320, padding: '9px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none' }} />
            <button type="submit" style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#0f172a', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Search</button>
          </form>
        </>
      )}

      {/* Bulk action bar — hidden for viewers */}
      {!isViewer && selected.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, background: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: 10, padding: '10px 16px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#0284c7' }}>{selected.size} selected</span>
          <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)}
            style={{ fontSize: 13, padding: '6px 12px', borderRadius: 8, border: '1.5px solid #bae6fd', outline: 'none', background: '#fff', color: '#0f172a' }}>
            <option value="">Move to…</option>
            {STATUSES.map(st => <option key={st} value={st}>{STATUS_LABEL[st]}</option>)}
          </select>
          <button onClick={bulkUpdate} disabled={!bulkStatus || bulkLoading}
            style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: bulkStatus ? '#0ea5e9' : '#cbd5e1', color: '#fff', fontWeight: 700, fontSize: 13, cursor: bulkStatus ? 'pointer' : 'default' }}>
            {bulkLoading ? 'Updating…' : 'Apply'}
          </button>
          <button onClick={() => setSelected(new Set())}
            style={{ marginLeft: 'auto', fontSize: 12, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}>Clear</button>
        </div>
      )}

      {/* List view */}
      {view === 'list' && (
        <div style={s.tableBox}>
          {loading ? (
            <div style={s.empty}>Loading…</div>
          ) : customers.length === 0 ? (
            <div style={s.empty}>No customers found for this filter.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...s.th, width: 36 }}>
                    <input type="checkbox" checked={selected.size === customers.length && customers.length > 0}
                      onChange={toggleAll} style={{ cursor: 'pointer' }} />
                  </th>
                  {['Customer', 'Contact', 'Status', 'Created', ''].map(h => <th key={h} style={s.th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {customers.map((c, i) => {
                  const [bg, fg] = STATUS_COLOR[c.status] ?? ['#f1f5f9', '#64748b'];
                  return (
                    <tr key={c._id} style={{ background: selected.has(c._id) ? '#f0f9ff' : i % 2 ? '#fafafa' : '#fff' }}>
                      <td style={{ ...s.td, width: 36 }}>
                        <input type="checkbox" checked={selected.has(c._id)} onChange={() => toggleSelect(c._id)} style={{ cursor: 'pointer' }} />
                      </td>
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
                        {isViewer ? (
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: bg, color: fg, border: `1.5px solid ${fg}40` }}>{STATUS_LABEL[c.status]}</span>
                        ) : (
                        <select
                          value={c.status}
                          disabled={updatingId === c._id}
                          onChange={e => changeStatus(c._id, e.target.value)}
                          style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: bg, color: fg, border: `1.5px solid ${fg}40`, outline: 'none', cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none' }}>
                          {STATUSES.map(st => <option key={st} value={st}>{STATUS_LABEL[st]}</option>)}
                        </select>
                        )}
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
      )}

      {/* Kanban board view */}
      {view === 'kanban' && (
        <KanbanBoard customers={customers} loading={loading} onStatusChange={changeStatus} updatingId={updatingId} />
      )}
    </div>
  );
}

function KanbanBoard({ customers, loading, onStatusChange, updatingId }) {
  if (loading) return <div style={s.empty}>Loading…</div>;

  const byStatus = {};
  STATUSES.forEach(st => { byStatus[st] = []; });
  customers.forEach(c => { if (byStatus[c.status]) byStatus[c.status].push(c); });

  return (
    <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 8, alignItems: 'flex-start' }}>
      {STATUSES.map(st => {
        const [bg, fg] = STATUS_COLOR[st];
        const cards = byStatus[st];
        return (
          <div key={st} style={{ minWidth: 220, maxWidth: 260, flex: '0 0 220px', background: '#f8fafc', borderRadius: 14, border: '1.5px solid #e2e8f0', overflow: 'hidden' }}>
            {/* Column header */}
            <div style={{ padding: '10px 14px', background: bg, borderBottom: `2px solid ${fg}30`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: fg, textTransform: 'uppercase', letterSpacing: 0.5 }}>{STATUS_LABEL[st]}</span>
              <span style={{ fontSize: 12, fontWeight: 700, background: '#fff', color: fg, borderRadius: 20, padding: '1px 8px', border: `1.5px solid ${fg}30` }}>{cards.length}</span>
            </div>
            {/* Cards */}
            <div style={{ padding: '10px 10px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 80 }}>
              {cards.length === 0 && <div style={{ fontSize: 12, color: '#cbd5e1', textAlign: 'center', padding: '12px 0' }}>No customers</div>}
              {cards.map(c => (
                <KanbanCard key={c._id} customer={c} onStatusChange={onStatusChange} updating={updatingId === c._id} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({ customer: c, onStatusChange, updating }) {
  const [showMove, setShowMove] = useState(false);
  const nextStatuses = STATUSES.filter(st => st !== c.status);

  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1.5px solid #e2e8f0', padding: '10px 12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#0ea5e9,#6d28d9)', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {c.name.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
          {c.phone && <div style={{ fontSize: 11, color: '#94a3b8' }}>{c.phone}</div>}
        </div>
      </div>
      {c.bvn && <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 6 }}>BVN ••••{c.bvn.slice(-4)}</div>}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <Link to={`/dashboard/customers/${c._id}`} style={{ fontSize: 11, fontWeight: 600, color: '#0ea5e9', textDecoration: 'none', flex: 1 }}>View →</Link>
        <button
          onClick={() => setShowMove(v => !v)}
          disabled={updating}
          style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1.5px solid #e2e8f0', background: showMove ? '#0f172a' : '#fff', color: showMove ? '#fff' : '#64748b', cursor: 'pointer', fontWeight: 600 }}>
          {updating ? '…' : 'Move'}
        </button>
      </div>
      {showMove && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {nextStatuses.map(st => {
            const [bg, fg] = STATUS_COLOR[st];
            return (
              <button key={st} onClick={() => { onStatusChange(c._id, st); setShowMove(false); }}
                style={{ fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 6, border: `1.5px solid ${fg}40`, background: bg, color: fg, cursor: 'pointer', textAlign: 'left' }}>
                → {STATUS_LABEL[st]}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const s = {
  h1: { fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 },
  sub: { color: '#64748b', fontSize: 14, marginTop: 4, marginBottom: 0 },
  viewBtn: { fontSize: 13, fontWeight: 600, padding: '8px 16px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer' },
  viewBtnActive: { background: '#0f172a', color: '#fff', border: '1.5px solid #0f172a' },
  statCard: (st, active) => ({
    background: active ? (st === 'all' ? '#0f172a' : STATUS_COLOR[st]?.[0] ?? '#f1f5f9') : '#fff',
    border: `1.5px solid ${active ? (st === 'all' ? '#0f172a' : STATUS_COLOR[st]?.[1] ?? '#e2e8f0') : '#e2e8f0'}`,
    borderRadius: 12, padding: '12px 18px', cursor: 'pointer', minWidth: 100, textAlign: 'center', transition: 'all 0.15s',
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
