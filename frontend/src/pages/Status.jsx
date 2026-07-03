import { API_BASE as API } from '../services/api';
import { useEffect, useState } from 'react';
import Footer from '../components/Footer';


function Bar({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
      <div style={{ width: '100%', height: 60, display: 'flex', alignItems: 'flex-end' }}>
        <div style={{ width: '100%', height: `${Math.max(2, pct)}%`, background: color, borderRadius: '3px 3px 0 0', minHeight: 2 }} />
      </div>
    </div>
  );
}

const STATUS_COLOR = { operational: '#16a34a', degraded: '#f59e0b', outage: '#dc2626' };
const STATUS_LABEL = { operational: 'Operational', degraded: 'Degraded', outage: 'Outage' };

export default function Status() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/status`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const allOperational = data?.components?.every(c => c.status === 'operational');
  const maxCalls = data ? Math.max(...data.days.map(d => d.total), 1) : 1;
  const maxP50 = data ? Math.max(...data.days.map(d => d.p50 ?? 0), 1) : 1;

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', minHeight: '100vh', background: '#f8fafc' }}>
      {/* Header */}
      <div style={{ background: '#0f172a', padding: '2rem 0' }}>
        <div style={{ maxWidth: 780, margin: '0 auto', padding: '0 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#38bdf8', marginBottom: 4 }}>Lucred Credit Engine</div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: '#fff', margin: 0 }}>API Status</h1>
            <p style={{ color: '#94a3b8', marginTop: 6, marginBottom: 0, fontSize: 14 }}>
              Real-time availability and performance of the Lucred Credit Engine.
            </p>
          </div>
          <a href="/login" style={{ fontSize: 13, fontWeight: 600, color: '#38bdf8', textDecoration: 'none', border: '1px solid #38bdf8', padding: '8px 16px', borderRadius: 8 }}>
            Dashboard →
          </a>
        </div>
      </div>

      <div style={{ maxWidth: 780, margin: '0 auto', padding: '2.5rem 2rem' }}>
        {loading ? (
          <p style={{ color: '#94a3b8', textAlign: 'center' }}>Loading status…</p>
        ) : !data ? (
          <p style={{ color: '#dc2626', textAlign: 'center' }}>Failed to load status data.</p>
        ) : (
          <>
            {/* Overall banner */}
            <div style={{
              background: allOperational ? '#dcfce7' : '#fef3c7',
              border: `1px solid ${allOperational ? '#86efac' : '#fcd34d'}`,
              borderRadius: 12, padding: '1.25rem 1.5rem', marginBottom: 28,
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: allOperational ? '#16a34a' : '#f59e0b', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: allOperational ? '#166534' : '#92400e' }}>
                  {allOperational ? 'All systems operational' : 'Some systems degraded'}
                </div>
                <div style={{ fontSize: 12, color: allOperational ? '#15803d' : '#b45309', marginTop: 2 }}>
                  Updated {new Date(data.generatedAt).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Key metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
              {[
                { label: 'Uptime (30d)', value: `${data.uptime}%`, color: data.uptime >= 99.9 ? '#16a34a' : data.uptime >= 99 ? '#f59e0b' : '#dc2626' },
                { label: 'p50 Latency', value: data.p50 != null ? `${data.p50}ms` : '—', color: '#0ea5e9' },
                { label: 'p95 Latency', value: data.p95 != null ? `${data.p95}ms` : '—', color: '#6d28d9' },
              ].map(m => (
                <div key={m.label} style={{ background: '#fff', borderRadius: 12, padding: '1.25rem 1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: m.color }}>{m.value}</div>
                  <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600, marginTop: 4 }}>{m.label}</div>
                </div>
              ))}
            </div>

            {/* Component status */}
            <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: 28 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 16px' }}>Components</h3>
              {data.components.map((c, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < data.components.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <span style={{ fontSize: 14, color: '#334155', fontWeight: 500 }}>{c.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: STATUS_COLOR[c.status], background: `${STATUS_COLOR[c.status]}18`, padding: '3px 10px', borderRadius: 20 }}>
                    {STATUS_LABEL[c.status]}
                  </span>
                </div>
              ))}
            </div>

            {/* API call volume chart */}
            <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>API Calls — Last 30 Days</h3>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>{data.totalCalls.toLocaleString()} total</span>
              </div>
              <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 80 }}>
                {data.days.map((d, i) => (
                  <div key={i} title={`${d.label}: ${d.total} calls`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', cursor: 'default' }}>
                    <div style={{
                      width: '100%',
                      height: `${maxCalls > 0 ? Math.max(2, (d.total / maxCalls) * 100) : 2}%`,
                      background: d.total === 0 ? '#e2e8f0' : '#6d28d9',
                      borderRadius: '2px 2px 0 0',
                      minHeight: d.total > 0 ? 4 : 2,
                    }} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{data.days[0]?.label}</span>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{data.days[data.days.length - 1]?.label}</span>
              </div>
            </div>

            {/* p50 latency chart */}
            <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: 28 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 16px' }}>Median Response Time (ms) — Last 30 Days</h3>
              <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 80 }}>
                {data.days.map((d, i) => (
                  <div key={i} title={d.p50 != null ? `${d.label}: ${d.p50}ms` : `${d.label}: no data`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', cursor: 'default' }}>
                    <div style={{
                      width: '100%',
                      height: d.p50 != null ? `${Math.max(2, (d.p50 / maxP50) * 100)}%` : '2%',
                      background: d.p50 == null ? '#e2e8f0' : d.p50 < 500 ? '#16a34a' : d.p50 < 1500 ? '#f59e0b' : '#dc2626',
                      borderRadius: '2px 2px 0 0',
                    }} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{data.days[0]?.label}</span>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{data.days[data.days.length - 1]?.label}</span>
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
                {[['#16a34a', '< 500ms'], ['#f59e0b', '500–1500ms'], ['#dc2626', '> 1500ms']].map(([c, l]) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
                    <span style={{ fontSize: 11, color: '#64748b' }}>{l}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
