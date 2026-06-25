import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import adminApi from '../../services/adminApi';
import toast from 'react-hot-toast';

export default function AdminClients() {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const load = () => adminApi.get('/api/admin/clients').then(({ data }) => setClients(data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const toggleStatus = async (id, current) => {
    const next = current === 'active' ? 'suspended' : 'active';
    if (!confirm(`${next === 'suspended' ? 'Suspend' : 'Reactivate'} this client?`)) return;
    try {
      await adminApi.patch(`/api/admin/clients/${id}/status`, { status: next });
      toast.success(`Client ${next}`);
      load();
    } catch { toast.error('Failed to update status'); }
  };

  const updatePlan = async (id, plan) => {
    try {
      await adminApi.patch(`/api/admin/clients/${id}/plan`, { plan });
      toast.success(`Plan updated to ${plan}`);
      setClients(prev => prev.map(c => c._id === id ? { ...c, plan } : c));
    } catch { toast.error('Failed to update plan'); }
  };

  const filtered = clients.filter((c) =>
    c.organizationName.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  const exportCSV = () => {
    const headers = ['Organization', 'Email', 'Plan', 'Status', 'Referrals', 'Active Keys', 'Requests', 'Joined'];
    const rows = filtered.map(c => [
      `"${c.organizationName.replace(/"/g, '""')}"`,
      c.email,
      c.plan || 'free',
      c.status,
      c.referralCount || 0,
      c.keyCount,
      c.requestCount,
      new Date(c.createdAt).toLocaleDateString(),
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `lucred-clients-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div>
      <h1 style={s.h1}>MFI Clients</h1>
      <div style={{ display: 'flex', gap: 12, marginBottom: 4, flexWrap: 'wrap' }}>
        <p style={{ ...s.sub, margin: 0 }}>{clients.length} registered</p>
        {clients.filter(c => c.status === 'pending').length > 0 && (
          <span style={{ fontSize: 13, fontWeight: 700, color: '#d97706', background: '#fef3c7', padding: '2px 10px', borderRadius: 20 }}>
            {clients.filter(c => c.status === 'pending').length} pending review
          </span>
        )}
      </div>

      <div style={{ ...s.toolbar, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <input style={s.search} placeholder="Search by name or email…" value={search}
          onChange={(e) => setSearch(e.target.value)} />
        <button onClick={exportCSV} style={{ padding: '9px 18px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          ↓ Export CSV
        </button>
      </div>

      <div style={s.tableBox}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>{['Organization', 'Email', 'Plan', 'Status', 'Referrals', 'Active Keys', 'Requests', 'Joined', ''].map(h => (
              <th key={h} style={s.th}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/clients/${c._id}`)}>
                <td style={s.td}><strong>{c.organizationName}</strong></td>
                <td style={s.td}>{c.email}</td>
                <td style={s.td} onClick={e => e.stopPropagation()}>
                  <select value={c.plan || 'free'} onChange={e => updatePlan(c._id, e.target.value)}
                    style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: '1.5px solid #e2e8f0',
                      background: c.plan === 'scale' ? '#ede9fe' : c.plan === 'growth' ? '#e0f2fe' : '#f1f5f9',
                      color: c.plan === 'scale' ? '#6d28d9' : c.plan === 'growth' ? '#0284c7' : '#64748b',
                      fontWeight: 700, cursor: 'pointer', outline: 'none' }}>
                    <option value="free">Free</option>
                    <option value="growth">Growth</option>
                    <option value="scale">Scale</option>
                  </select>
                </td>
                <td style={s.td}>
                  <span style={{ ...s.badge,
                    background: c.status === 'active' ? '#dcfce7' : c.status === 'pending' ? '#fef3c7' : '#fee2e2',
                    color:      c.status === 'active' ? '#16a34a' : c.status === 'pending' ? '#d97706' : '#dc2626',
                  }}>
                    {c.status}
                  </span>
                </td>
                <td style={s.td}>
                  {c.referralCount > 0
                    ? <span style={{ fontWeight: 700, color: '#6d28d9' }}>{c.referralCount} referred</span>
                    : <span style={{ color: '#cbd5e1' }}>—</span>}
                </td>
                <td style={s.td}>{c.keyCount}</td>
                <td style={s.td}>{c.requestCount.toLocaleString()}</td>
                <td style={s.td}>{new Date(c.createdAt).toLocaleDateString()}</td>
                <td style={s.td} onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => toggleStatus(c._id, c.status)}
                    style={{ ...s.actionBtn, color: c.status === 'active' ? '#dc2626' : '#16a34a' }}
                  >
                    {c.status === 'active' ? 'Suspend' : 'Reactivate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p style={{ color: '#94a3b8', fontSize: 14, padding: '1rem' }}>No clients found.</p>}
      </div>
    </div>
  );
}

const s = {
  h1: { fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 },
  sub: { color: '#64748b', fontSize: 14, marginTop: 4, marginBottom: 24 },
  toolbar: { marginBottom: 16 },
  search: { padding: '9px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, width: 300 },
  tableBox: { background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' },
  th: { textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' },
  td: { padding: '12px 12px', borderBottom: '1px solid #f1f5f9', color: '#334155' },
  badge: { padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  actionBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
};
