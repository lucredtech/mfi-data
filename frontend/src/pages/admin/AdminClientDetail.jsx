import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import adminApi from '../../services/adminApi';
import toast from 'react-hot-toast';

export default function AdminClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);

  const load = () => adminApi.get(`/api/admin/clients/${id}`).then(({ data }) => setClient(data)).catch(() => {});
  useEffect(() => { load(); }, [id]);

  const toggleStatus = async () => {
    const next = client.status === 'active' ? 'suspended' : 'active';
    if (!confirm(`${next === 'suspended' ? 'Suspend' : 'Reactivate'} this client?`)) return;
    try {
      await adminApi.patch(`/api/admin/clients/${id}/status`, { status: next });
      toast.success(`Client ${next}`);
      load();
    } catch { toast.error('Failed'); }
  };

  if (!client) return <p style={{ color: '#94a3b8' }}>Loading…</p>;

  return (
    <div>
      <button onClick={() => navigate('/admin/clients')} style={s.back}>← Back to clients</button>

      <div style={s.header}>
        <div>
          <h1 style={s.h1}>{client.organizationName}</h1>
          <p style={s.sub}>{client.email} · {client.contactPerson} {client.phone ? `· ${client.phone}` : ''}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ ...s.badge, background: client.status === 'active' ? '#dcfce7' : '#fee2e2', color: client.status === 'active' ? '#16a34a' : '#dc2626' }}>
            {client.status}
          </span>
          <button onClick={toggleStatus} style={{ ...s.btn, background: client.status === 'active' ? '#dc2626' : '#16a34a' }}>
            {client.status === 'active' ? 'Suspend Client' : 'Reactivate Client'}
          </button>
        </div>
      </div>

      <div style={s.statRow}>
        <StatCard label="Total Requests" value={client.totalRequests?.toLocaleString()} />
        <StatCard label="Active API Keys" value={client.keys?.filter(k => k.isActive).length} />
        <StatCard label="Member Since" value={new Date(client.createdAt).toLocaleDateString()} />
      </div>

      {/* API Keys */}
      <div style={s.box}>
        <h3 style={s.boxTitle}>API Keys</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>{['Label', 'Key', 'Status', 'Last Used', 'Created'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {client.keys?.map((k) => (
              <tr key={k._id}>
                <td style={s.td}>{k.label}</td>
                <td style={s.td}><code style={{ fontSize: 11 }}>{k.key}</code></td>
                <td style={s.td}>
                  <span style={{ color: k.isActive ? '#16a34a' : '#dc2626', fontWeight: 600 }}>{k.isActive ? 'Active' : 'Revoked'}</span>
                </td>
                <td style={s.td}>{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : 'Never'}</td>
                <td style={s.td}>{new Date(k.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recent logs */}
      <div style={s.box}>
        <h3 style={s.boxTitle}>Recent Requests</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>{['Endpoint', 'Status', 'Response Time', 'Time'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {client.recentLogs?.map((r) => (
              <tr key={r._id}>
                <td style={s.td}><code style={{ fontSize: 12 }}>{r.endpoint}</code></td>
                <td style={s.td}><span style={{ color: r.statusCode < 400 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>{r.statusCode}</span></td>
                <td style={s.td}>{r.responseTimeMs}ms</td>
                <td style={s.td}>{new Date(r.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '1.25rem 1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>{value}</div>
      <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{label}</div>
    </div>
  );
}

const s = {
  back: { background: 'none', border: 'none', color: '#6d28d9', cursor: 'pointer', fontSize: 14, fontWeight: 600, padding: 0, marginBottom: 20 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  h1: { fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 },
  sub: { color: '#64748b', fontSize: 14, marginTop: 4 },
  badge: { padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  btn: { color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  statRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 },
  box: { background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: 20 },
  boxTitle: { fontSize: 15, fontWeight: 600, color: '#0f172a', marginTop: 0, marginBottom: 16 },
  th: { textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600 },
  td: { padding: '10px 12px', borderBottom: '1px solid #f1f5f9', color: '#334155' },
};
