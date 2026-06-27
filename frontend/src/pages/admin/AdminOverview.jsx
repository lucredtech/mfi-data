import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import adminApi from '../../services/adminApi';

const SERVICE_COLORS = ['#6d28d9', '#0ea5e9', '#16a34a', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const ACTION_LABELS = {
  BVN_CHECK: 'BVN Verification',
  NIN_CHECK: 'NIN Verification',
  BUREAU_CHECK: 'Bureau Check',
  STATEMENT_ANALYSIS: 'Statement Analysis',
  STATEMENT_REANALYSIS: 'Re-analysis',
  CUSTOMER_CREATED: 'Customer Created',
  CUSTOMER_DELETED: 'Customer Deleted',
  NOTE_ADDED: 'Note Added',
};

export default function AdminOverview() {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [mrr, setMrr] = useState([]);
  const [revenue, setRevenue] = useState(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]   = useState('');

  useEffect(() => {
    adminApi.get('/api/admin/stats').then(({ data }) => setStats(data)).catch(() => {});
    adminApi.get('/api/admin/analytics').then(({ data }) => setAnalytics(data)).catch(() => {});
    adminApi.get('/api/admin/mrr').then(({ data }) => setMrr(data.mrr || [])).catch(() => {});
    adminApi.get('/api/admin/revenue/totals').then(({ data }) => setRevenue(data)).catch(() => {});
  }, []);

  const fetchRevenue = () => {
    const params = new URLSearchParams();
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo)   params.set('to', dateTo);
    adminApi.get(`/api/admin/revenue/totals?${params}`).then(({ data }) => setRevenue(data)).catch(() => {});
  };

  const exportWalletTxs = async () => {
    const params = new URLSearchParams();
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo)   params.set('to', dateTo);
    const { data } = await adminApi.get(`/api/admin/wallet-transactions/export?${params}`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([data], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = `wallet-transactions-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const dailyData = analytics?.dailyVolume?.map(d => ({
    date: d._id.slice(5), // MM-DD
    total: d.total,
    success: d.success,
    failed: d.failed,
  })) || [];

  const serviceData = analytics?.serviceBreakdown?.map((e, i) => ({
    name: e._id.replace('/v1/', '').replace('/api/', ''),
    value: e.count,
    color: SERVICE_COLORS[i % SERVICE_COLORS.length],
  })) || [];

  const auditData = analytics?.auditActions?.map(a => ({
    name: ACTION_LABELS[a._id] || a._id,
    count: a.count,
  })) || [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div>
          <h1 style={s.h1}>Platform Overview</h1>
          <p style={s.sub}>Real-time stats across all MFI clients</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {analytics && (
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '8px 18px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{analytics.thisMonthCalls?.toLocaleString() ?? '—'}</div>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>CALLS THIS MONTH</div>
              </div>
              <div style={{ width: 1, height: 32, background: '#e2e8f0' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: analytics.successRate >= 95 ? '#16a34a' : analytics.successRate >= 80 ? '#f59e0b' : '#dc2626' }}>{analytics.successRate}%</div>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>SUCCESS RATE</div>
              </div>
              <div style={{ width: 1, height: 32, background: '#e2e8f0' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#16a34a' }}>₦{((analytics.mrr || 0) / 1000).toFixed(0)}k</div>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>MRR</div>
              </div>
              {analytics.webhookFailures > 0 && (
                <>
                  <div style={{ width: 1, height: 32, background: '#e2e8f0' }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#dc2626' }}>{analytics.webhookFailures}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>WEBHOOK FAILURES</div>
                  </div>
                </>
              )}
            </div>
          )}
          <button
            style={s.exportBtn}
            onClick={async () => {
              const { default: exportSummaryPDF } = await import('../../services/exportSummaryPDF');
              exportSummaryPDF({ stats, isAdmin: true });
            }}
          >
            Export PDF
          </button>
        </div>
      </div>

      {/* Revenue totals + date filter */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '1.25rem 1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div style={s.sectionLabel}>Revenue Totals</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={si} />
            <span style={{ fontSize: 12, color: '#94a3b8' }}>to</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={si} />
            <button onClick={fetchRevenue} style={{ padding: '6px 14px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 7, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Filter</button>
            <button onClick={exportWalletTxs} style={{ padding: '6px 14px', background: '#6d28d9', color: '#fff', border: 'none', borderRadius: 7, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>↓ Export CSV</button>
          </div>
        </div>
        {revenue && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
            {[
              { label: 'Grand Total', value: revenue.grandTotal, color: '#16a34a' },
              { label: 'Subscription Revenue', value: revenue.subscriptions.total, sub: `${revenue.subscriptions.count} payments`, color: '#6d28d9' },
              { label: 'Wallet Top-ups', value: revenue.walletTopups.total, sub: `${revenue.walletTopups.count} top-ups`, color: '#0ea5e9' },
              { label: 'API Charges', value: revenue.walletCharges.total, sub: `${revenue.walletCharges.count} calls`, color: '#f59e0b' },
            ].map(({ label, value, sub, color }) => (
              <div key={label} style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color }}>₦{Number(value).toLocaleString()}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', marginTop: 4 }}>{label}</div>
                {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Revenue & plan breakdown */}
      {analytics && (
        <>
          <div style={s.sectionLabel}>Revenue</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
            <StatCard label="MRR" value={`₦${((analytics.mrr || 0) / 1000).toFixed(0)}k`} sub="Monthly recurring revenue" color="#16a34a" />
            <StatCard label="This Month" value={(analytics.thisMonthCalls || 0).toLocaleString()} sub={`Last month: ${(analytics.lastMonthCalls || 0).toLocaleString()}`} color="#0ea5e9"
              trend={analytics.lastMonthCalls > 0 ? Math.round(((analytics.thisMonthCalls - analytics.lastMonthCalls) / analytics.lastMonthCalls) * 100) : null} />
            {['free', 'growth', 'scale'].map(plan => (
              <StatCard key={plan} label={`${plan.charAt(0).toUpperCase() + plan.slice(1)} plan`}
                value={analytics.planBreakdown?.[plan] ?? 0}
                sub={plan === 'free' ? '₦0/mo' : plan === 'growth' ? '₦50k/mo' : '₦200k/mo'}
                color={plan === 'free' ? '#94a3b8' : plan === 'growth' ? '#0ea5e9' : '#6d28d9'} />
            ))}
          </div>
        </>
      )}

      {/* MFI client stats */}
      <div style={s.sectionLabel}>MFI Clients</div>
      <div style={s.statRow}>
        <StatCard label="Total MFI Clients" value={stats?.totalClients ?? '—'} color="#6d28d9" />
        <StatCard label="Active Clients" value={stats?.activeClients ?? '—'} color="#059669" />
        <StatCard label="Suspended" value={stats?.totalClients != null ? (stats.totalClients - (stats.activeClients ?? 0)) : '—'} color="#dc2626" />
        <StatCard label="Total API Requests" value={stats?.totalRequests?.toLocaleString() ?? '—'} color="#0ea5e9" />
      </div>

      {/* Analysis stats */}
      <div style={s.sectionLabel}>Analysis Volume (Platform-wide)</div>
      <div style={s.statRow}>
        <StatCard label="Customers" value={stats?.totalCustomers ?? '—'} sub="Borrower profiles" color="#0ea5e9" />
        <StatCard label="Statement Analyses" value={stats?.statements?.total ?? '—'} sub={stats?.statements ? `${stats.statements.failed ?? 0} failed` : ''} color="#6d28d9" />
        <StatCard label="BVN Verifications" value={stats?.bvn?.total ?? '—'} sub={stats?.bvn ? `${stats.bvn.failed ?? 0} failed` : ''} color="#16a34a" />
        <StatCard label="NIN Verifications" value={stats?.nin?.total ?? '—'} sub={stats?.nin ? `${stats.nin.failed ?? 0} failed` : ''} color="#6d28d9" />
        <StatCard label="Bureau Checks" value={stats?.bureau?.total ?? '—'} sub={stats?.bureau ? `${stats.bureau.failed ?? 0} failed` : ''} color="#f59e0b" />
      </div>

      {/* Daily volume chart */}
      {dailyData.length > 0 && (
        <div style={s.chartBox}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={s.chartTitle}>Daily API Call Volume (Last 30 Days)</h3>
            <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
              <span style={{ color: '#6d28d9', fontWeight: 600 }}>Total</span>
              <span style={{ color: '#16a34a', fontWeight: 600 }}>Success</span>
              <span style={{ color: '#ef4444', fontWeight: 600 }}>Failed</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={dailyData} margin={{ left: 0, right: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="success" stackId="a" fill="#16a34a" radius={[0,0,0,0]} />
              <Bar dataKey="failed" stackId="a" fill="#ef4444" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Service breakdown + top clients */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {serviceData.length > 0 && (
          <div style={s.chartBox}>
            <h3 style={s.chartTitle}>Service Breakdown (30 Days)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={serviceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                  {serviceData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {analytics?.topClients?.length > 0 && (
          <div style={s.chartBox}>
            <h3 style={s.chartTitle}>Top Clients by Usage (30 Days)</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
              {analytics.topClients.map((c, i) => {
                const max = analytics.topClients[0]?.count || 1;
                const pct = Math.round((c.count / max) * 100);
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>{c.organizationName}</span>
                      <span style={{ color: '#6d28d9', fontWeight: 700 }}>{c.count.toLocaleString()}</span>
                    </div>
                    <div style={{ height: 6, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: SERVICE_COLORS[i % SERVICE_COLORS.length], borderRadius: 99 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* MRR chart */}
      {mrr.length > 0 && (
        <div style={s.chartBox}>
          <h3 style={s.chartTitle}>Monthly Revenue (₦) — Last 12 Months</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={mrr} margin={{ top: 4, right: 20, bottom: 0, left: 10 }}>
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`₦${Number(v).toLocaleString()}`, 'Revenue']} />
              <Bar dataKey="revenue" fill="#6d28d9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Audit actions chart */}
      {auditData.length > 0 && (
        <div style={s.chartBox}>
          <h3 style={s.chartTitle}>Platform Actions by Type (30 Days)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={auditData} layout="vertical" margin={{ left: 100, right: 20 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
              <Tooltip />
              <Bar dataKey="count" fill="#6d28d9" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent activity */}
      {stats?.recentLogs?.length > 0 && (
        <div style={s.tableBox}>
          <h3 style={s.chartTitle}>Recent Activity (All Clients)</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>{['MFI', 'Action', 'Detail', 'Time'].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {stats.recentLogs.map((r) => (
                <tr key={r._id}>
                  <td style={s.td}>{r.client?.organizationName || '—'}</td>
                  <td style={s.td}><span style={{ fontSize: 11, fontWeight: 700, background: '#ede9fe', color: '#6d28d9', padding: '2px 8px', borderRadius: 10 }}>{r.action?.replace(/_/g, ' ')}</span></td>
                  <td style={{ ...s.td, color: '#64748b', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label || '—'}</td>
                  <td style={{ ...s.td, whiteSpace: 'nowrap' }}>{new Date(r.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, color, trend }) {
  return (
    <div style={s.card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
        {trend != null && (
          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 12,
            background: trend >= 0 ? '#dcfce7' : '#fee2e2', color: trend >= 0 ? '#16a34a' : '#dc2626' }}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

const si = { padding: '6px 10px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 12, outline: 'none' };

const s = {
  h1: { fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 },
  sub: { color: '#64748b', fontSize: 14, marginTop: 4, marginBottom: 24 },
  sectionLabel: { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  statRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 28 },
  card: { background: '#fff', borderRadius: 12, padding: '1.25rem 1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' },
  chartBox: { background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: 24 },
  chartTitle: { fontSize: 15, fontWeight: 600, color: '#0f172a', marginTop: 0, marginBottom: 4 },
  tableBox: { background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' },
  th: { textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600 },
  td: { padding: '10px 12px', borderBottom: '1px solid #f1f5f9', color: '#334155' },
  exportBtn: { background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 600, fontSize: 13, cursor: 'pointer' },
};
