import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../services/api';

export default function Usage() {
  const [usage, setUsage] = useState(null);

  useEffect(() => {
    api.get('/api/usage/summary').then(({ data }) => setUsage(data)).catch(() => {});
  }, []);

  const endpointData = usage?.byEndpoint?.map((e) => ({
    name: e._id.replace('/v1/', ''),
    count: e.count,
    avgMs: Math.round(e.avgResponseMs || 0),
  })) || [];

  return (
    <div>
      <h1 style={styles.h1}>Usage</h1>
      <p style={styles.sub}>Track your API consumption and response times.</p>

      <div style={styles.grid}>
        {endpointData.map((ep) => (
          <div key={ep.name} style={styles.card}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{ep.name}</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#0f172a', margin: '8px 0 4px' }}>{ep.count}</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>avg {ep.avgMs}ms</div>
          </div>
        ))}
      </div>

      {usage?.recent?.length > 0 && (
        <div style={styles.tableBox}>
          <h3 style={styles.tableTitle}>Request Log</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>{['Time', 'Endpoint', 'Method', 'Status', 'Response Time'].map(h => (
                <th key={h} style={styles.th}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {usage.recent.map((r) => (
                <tr key={r._id}>
                  <td style={styles.td}>{new Date(r.createdAt).toLocaleString()}</td>
                  <td style={styles.td}><code style={{ fontSize: 12 }}>{r.endpoint}</code></td>
                  <td style={styles.td}>{r.method}</td>
                  <td style={styles.td}>
                    <span style={{ color: r.statusCode < 400 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>{r.statusCode}</span>
                  </td>
                  <td style={styles.td}>{r.responseTimeMs}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!usage && <p style={{ color: '#94a3b8' }}>Loading usage data…</p>}
      {usage && usage.total === 0 && <p style={{ color: '#94a3b8' }}>No requests yet. Start calling the API to see usage here.</p>}
    </div>
  );
}

const styles = {
  h1: { fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 },
  sub: { color: '#64748b', fontSize: 14, marginTop: 4, marginBottom: 24 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 24 },
  card: { background: '#fff', borderRadius: 12, padding: '1.25rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' },
  tableBox: { background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' },
  tableTitle: { fontSize: 15, fontWeight: 600, color: '#0f172a', marginTop: 0, marginBottom: 16 },
  th: { textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600 },
  td: { padding: '10px 12px', borderBottom: '1px solid #f1f5f9', color: '#334155' },
};
