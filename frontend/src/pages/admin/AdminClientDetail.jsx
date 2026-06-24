import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import adminApi from '../../services/adminApi';
import toast from 'react-hot-toast';

export default function AdminClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [analyses, setAnalyses] = useState(null);

  const load = () => {
    adminApi.get(`/api/admin/clients/${id}`).then(({ data }) => setClient(data)).catch(() => {});
    adminApi.get(`/api/admin/clients/${id}/analyses`).then(({ data }) => setAnalyses(data)).catch(() => {});
  };

  useEffect(() => { load(); }, [id]);

  const updatePlan = async (plan) => {
    try {
      await adminApi.patch(`/api/admin/clients/${id}/plan`, { plan });
      toast.success(`Plan updated to ${plan}`);
      load();
    } catch { toast.error('Failed to update plan'); }
  };

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
          <p style={s.sub}>{client.email} · {client.contactPerson}{client.phone ? ` · ${client.phone}` : ''}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ ...s.badge, background: client.status === 'active' ? '#dcfce7' : '#fee2e2', color: client.status === 'active' ? '#16a34a' : '#dc2626' }}>
            {client.status}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>Plan:</span>
            <select
              value={client.plan || 'free'}
              onChange={e => updatePlan(e.target.value)}
              style={{ fontSize: 13, fontWeight: 700, padding: '6px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer', color: { free: '#0ea5e9', growth: '#6d28d9', scale: '#16a34a' }[client.plan || 'free'] }}
            >
              <option value="free">Free</option>
              <option value="growth">Growth</option>
              <option value="scale">Scale</option>
            </select>
          </div>
          <button onClick={toggleStatus} style={{ ...s.btn, background: client.status === 'active' ? '#dc2626' : '#16a34a' }}>
            {client.status === 'active' ? 'Suspend Client' : 'Reactivate Client'}
          </button>
        </div>
      </div>

      {/* Account stats */}
      <div style={s.sectionLabel}>Account</div>
      <div style={{ ...s.statRow, gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 24 }}>
        <StatCard label="Total API Requests" value={client.totalRequests?.toLocaleString() ?? '—'} color="#0ea5e9" />
        <StatCard label="Active API Keys" value={client.keys?.filter(k => k.isActive).length ?? '—'} color="#6d28d9" />
        <StatCard label="Member Since" value={new Date(client.createdAt).toLocaleDateString()} color="#94a3b8" />
      </div>

      {/* Analysis stats */}
      <div style={s.sectionLabel}>Analysis Usage</div>
      <div style={{ ...s.statRow, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginBottom: 28 }}>
        <StatCard
          label="Customers"
          value={analyses?.customers ?? '—'}
          sub="Borrower profiles"
          color="#0ea5e9"
        />
        <StatCard
          label="Statement Analyses"
          value={analyses?.statements?.total ?? '—'}
          sub={analyses?.statements ? `${analyses.statements.failed ?? 0} failed` : ''}
          color="#6d28d9"
        />
        <StatCard
          label="BVN Verifications"
          value={analyses?.bvn?.total ?? '—'}
          sub={analyses?.bvn ? `${analyses.bvn.failed ?? 0} failed` : ''}
          color="#16a34a"
        />
        <StatCard
          label="NIN Verifications"
          value={analyses?.nin?.total ?? '—'}
          sub={analyses?.nin ? `${analyses.nin.failed ?? 0} failed` : ''}
          color="#6d28d9"
        />
        <StatCard
          label="Bureau Checks"
          value={analyses?.bureau?.total ?? '—'}
          sub={analyses?.bureau ? `${analyses.bureau.failed ?? 0} failed` : ''}
          color="#f59e0b"
        />
      </div>

      {/* Referral info */}
      {(client.referredBy || client.referralCount > 0) && (
        <div style={s.box}>
          <h3 style={s.boxTitle}>Referrals</h3>
          {client.referredBy && (
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
              Referred by: <strong style={{ color: '#6d28d9' }}>{client.referredBy.organizationName}</strong>
              <span style={{ color: '#94a3b8', marginLeft: 6 }}>({client.referredBy.email})</span>
            </div>
          )}
          {client.referrals?.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>{['Organisation', 'Email', 'Plan', 'Joined'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {client.referrals.map(r => (
                  <tr key={r._id}>
                    <td style={s.td}><strong>{r.organizationName}</strong></td>
                    <td style={s.td}>{r.email}</td>
                    <td style={s.td}><span style={{ fontWeight: 700, color: { free: '#64748b', growth: '#0284c7', scale: '#6d28d9' }[r.plan || 'free'] }}>{r.plan || 'free'}</span></td>
                    <td style={s.td}>{new Date(r.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {(!client.referrals || client.referrals.length === 0) && client.referralCount === 0 && (
            <p style={{ color: '#94a3b8', fontSize: 13 }}>No referrals yet.</p>
          )}
        </div>
      )}

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

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '1.25rem 1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 26, fontWeight: 700, color: color || '#0f172a' }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
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
  sectionLabel: { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  statRow: { display: 'grid', gap: 16 },
  box: { background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: 20 },
  boxTitle: { fontSize: 15, fontWeight: 600, color: '#0f172a', marginTop: 0, marginBottom: 16 },
  th: { textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600 },
  td: { padding: '10px 12px', borderBottom: '1px solid #f1f5f9', color: '#334155' },
};
