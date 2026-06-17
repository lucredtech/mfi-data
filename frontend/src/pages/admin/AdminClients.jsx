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

  const filtered = clients.filter((c) =>
    c.organizationName.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <h1 style={s.h1}>MFI Clients</h1>
      <p style={s.sub}>{clients.length} registered microfinance institutions</p>

      <div style={s.toolbar}>
        <input style={s.search} placeholder="Search by name or email…" value={search}
          onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div style={s.tableBox}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>{['Organization', 'Email', 'Contact', 'Status', 'Active Keys', 'Total Requests', 'Joined', ''].map(h => (
              <th key={h} style={s.th}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/clients/${c._id}`)}>
                <td style={s.td}><strong>{c.organizationName}</strong></td>
                <td style={s.td}>{c.email}</td>
                <td style={s.td}>{c.contactPerson}</td>
                <td style={s.td}>
                  <span style={{ ...s.badge, background: c.status === 'active' ? '#dcfce7' : '#fee2e2', color: c.status === 'active' ? '#16a34a' : '#dc2626' }}>
                    {c.status}
                  </span>
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
