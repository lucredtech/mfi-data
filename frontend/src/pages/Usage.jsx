import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../services/api';
import { exportUsageLogCSV } from '../services/exportCSV';

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div>
          <h1 style={styles.h1}>Usage</h1>
          <p style={styles.sub}>Track your API consumption and response times.</p>
        </div>
        {usage?.recent?.length > 0 && (
          <button style={styles.csvBtn} onClick={() => exportUsageLogCSV(usage.recent)}>↓ Export CSV</button>
        )}
      </div>

      {/* Plan usage bar */}
      {usage && (
        <div style={{ background: '#fff', borderRadius: 12, padding: '1.25rem 1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{usage.thisMonth?.toLocaleString() ?? 0} API calls this month</span>
              {usage.limit != null && <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 8 }}>of {usage.limit.toLocaleString()} on {usage.plan} plan</span>}
              {usage.limit == null && <span style={{ fontSize: 12, color: '#16a34a', marginLeft: 8 }}>Unlimited — {usage.plan} plan</span>}
            </div>
            {usage.limit != null && usage.thisMonth / usage.limit > 0.8 && (
              <span style={{ fontSize: 11, fontWeight: 700, background: '#fee2e2', color: '#dc2626', padding: '3px 10px', borderRadius: 20 }}>
                {Math.round((usage.thisMonth / usage.limit) * 100)}% used — consider upgrading
              </span>
            )}
          </div>
          {usage.limit != null && (
            <div style={{ height: 6, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.min((usage.thisMonth / usage.limit) * 100, 100)}%`,
                background: usage.thisMonth / usage.limit > 0.8 ? '#ef4444' : '#0ea5e9',
                borderRadius: 99, transition: 'width 0.4s',
              }} />
            </div>
          )}
        </div>
      )}

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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ ...styles.tableTitle, marginBottom: 0 }}>Request Log</h3>
        </div>
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
  csvBtn: { background: '#f0fdf4', color: '#16a34a', border: '1.5px solid #16a34a', borderRadius: 8, padding: '8px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer', flexShrink: 0 },
};
