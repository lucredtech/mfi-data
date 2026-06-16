import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Overview() {
  const { client } = useAuth();
  const [usage, setUsage] = useState(null);

  useEffect(() => {
    api.get('/api/usage/summary').then(({ data }) => setUsage(data)).catch(() => {});
  }, []);

  const chartData = usage?.byEndpoint?.map((e) => ({
    name: e._id.replace('/v1/', ''),
    requests: e.count,
    avgMs: Math.round(e.avgResponseMs || 0),
  })) || [];

  return (
    <div>
      <h1 style={styles.h1}>Welcome, {client?.organizationName}</h1>
      <p style={styles.sub}>Here's a summary of your API usage</p>

      <div style={styles.statRow}>
        <StatCard label="Total Requests" value={usage?.total ?? '—'} />
        <StatCard label="Endpoints Used" value={usage?.byEndpoint?.length ?? '—'} />
        <StatCard label="Recent Calls" value={usage?.recent?.length ?? '—'} />
      </div>

      {chartData.length > 0 && (
        <div style={styles.chartBox}>
          <h3 style={styles.chartTitle}>Requests by Endpoint</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="requests" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {usage?.recent?.length > 0 && (
        <div style={styles.tableBox}>
          <h3 style={styles.chartTitle}>Recent Activity</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>{['Endpoint', 'Method', 'Status', 'Response Time', 'Time'].map(h => (
                <th key={h} style={styles.th}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {usage.recent.map((r) => (
                <tr key={r._id}>
                  <td style={styles.td}>{r.endpoint}</td>
                  <td style={styles.td}>{r.method}</td>
                  <td style={styles.td}>
                    <span style={{ color: r.statusCode < 400 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>{r.statusCode}</span>
                  </td>
                  <td style={styles.td}>{r.responseTimeMs}ms</td>
                  <td style={styles.td}>{new Date(r.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={styles.card}>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#0f172a' }}>{value}</div>
      <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{label}</div>
    </div>
  );
}

const styles = {
  h1: { fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 },
  sub: { color: '#64748b', fontSize: 14, marginTop: 4, marginBottom: 24 },
  statRow: { display: 'flex', gap: 16, marginBottom: 24 },
  card: { flex: 1, background: '#fff', borderRadius: 12, padding: '1.25rem 1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' },
  chartBox: { background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: 24 },
  chartTitle: { fontSize: 15, fontWeight: 600, color: '#0f172a', marginTop: 0, marginBottom: 16 },
  tableBox: { background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' },
  th: { textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600 },
  td: { padding: '10px 12px', borderBottom: '1px solid #f1f5f9', color: '#334155' },
};
