import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import adminApi from '../../services/adminApi';

export default function AdminOverview() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    adminApi.get('/api/admin/stats').then(({ data }) => setStats(data)).catch(() => {});
  }, []);

  const chartData = stats?.byEndpoint?.map((e) => ({
    name: e._id.replace('/v1/', ''),
    requests: e.count,
  })) || [];

  return (
    <div>
      <h1 style={s.h1}>Platform Overview</h1>
      <p style={s.sub}>Real-time stats across all MFI clients</p>

      <div style={s.statRow}>
        <StatCard label="Total MFI Clients" value={stats?.totalClients ?? '—'} color="#6d28d9" />
        <StatCard label="Active Clients" value={stats?.activeClients ?? '—'} color="#059669" />
        <StatCard label="Total API Requests" value={stats?.totalRequests?.toLocaleString() ?? '—'} color="#0ea5e9" />
        <StatCard label="Endpoints in Use" value={stats?.byEndpoint?.length ?? '—'} color="#d97706" />
      </div>

      {chartData.length > 0 && (
        <div style={s.chartBox}>
          <h3 style={s.chartTitle}>Requests by Endpoint</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="requests" fill="#6d28d9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {stats?.recentLogs?.length > 0 && (
        <div style={s.tableBox}>
          <h3 style={s.chartTitle}>Recent Activity (All Clients)</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>{['MFI', 'Endpoint', 'Status', 'Response Time', 'Time'].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {stats.recentLogs.map((r) => (
                <tr key={r._id}>
                  <td style={s.td}>{r.client?.organizationName || '—'}</td>
                  <td style={s.td}><code style={{ fontSize: 12 }}>{r.endpoint}</code></td>
                  <td style={s.td}>
                    <span style={{ color: r.statusCode < 400 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>{r.statusCode}</span>
                  </td>
                  <td style={s.td}>{r.responseTimeMs}ms</td>
                  <td style={s.td}>{new Date(r.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={s.card}>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{label}</div>
    </div>
  );
}

const s = {
  h1: { fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 },
  sub: { color: '#64748b', fontSize: 14, marginTop: 4, marginBottom: 24 },
  statRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 },
  card: { background: '#fff', borderRadius: 12, padding: '1.25rem 1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' },
  chartBox: { background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: 24 },
  chartTitle: { fontSize: 15, fontWeight: 600, color: '#0f172a', marginTop: 0, marginBottom: 16 },
  tableBox: { background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' },
  th: { textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600 },
  td: { padding: '10px 12px', borderBottom: '1px solid #f1f5f9', color: '#334155' },
};
