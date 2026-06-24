import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const PLAN_PRICE = { free: 0, growth: 50000, scale: 200000 };
const PLAN_COLOR = { free: ['#f1f5f9','#64748b'], growth: ['#e0f2fe','#0284c7'], scale: ['#ede9fe','#6d28d9'] };
const METHOD_LABEL = { bank_transfer: 'Bank Transfer', card: 'Card', paystack: 'Paystack', manual: 'Manual' };

export default function Billing() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/api/auth/billing').then(({ data }) => setData(data)).catch(() => {});
  }, []);

  const plan = data?.plan || 'free';
  const [planBg, planFg] = PLAN_COLOR[plan] || PLAN_COLOR.free;

  return (
    <div>
      <h1 style={s.h1}>Billing</h1>
      <p style={s.sub}>Your current plan and payment history.</p>

      {/* Current plan */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Current Plan</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: planFg, background: planBg, padding: '4px 14px', borderRadius: 20 }}>
              {plan.charAt(0).toUpperCase() + plan.slice(1)}
            </span>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#64748b' }}>
              {PLAN_PRICE[plan] === 0 ? 'Free' : `₦${PLAN_PRICE[plan].toLocaleString()} / month`}
            </span>
          </div>
        </div>
        {plan !== 'scale' && (
          <Link to="/pricing" style={{ padding: '9px 20px', background: '#6d28d9', color: '#fff', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: 13 }}>
            Upgrade Plan →
          </Link>
        )}
      </div>

      {/* Payment history */}
      <div style={s.tableBox}>
        <h3 style={s.boxTitle}>Payment History</h3>
        {!data ? (
          <p style={{ color: '#94a3b8', fontSize: 14 }}>Loading…</p>
        ) : data.payments?.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
            <div style={{ fontWeight: 600, color: '#334155', marginBottom: 4 }}>No payments yet</div>
            <div style={{ fontSize: 13 }}>Your payment history will appear here once you upgrade your plan.</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>{['Date', 'Plan', 'Amount', 'Method', 'Reference', 'Note', ''].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {data.payments.map(p => {
                const [bg, fg] = PLAN_COLOR[p.plan] || PLAN_COLOR.free;
                return (
                  <tr key={p._id}>
                    <td style={s.td}>{new Date(p.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td style={s.td}><span style={{ fontWeight: 700, background: bg, color: fg, padding: '2px 10px', borderRadius: 12, fontSize: 12 }}>{p.plan}</span></td>
                    <td style={s.td} ><strong style={{ color: '#0f172a' }}>₦{Number(p.amount).toLocaleString()}</strong></td>
                    <td style={s.td}>{METHOD_LABEL[p.method] || p.method}</td>
                    <td style={s.td}><code style={{ fontSize: 11, color: '#64748b' }}>{p.reference || '—'}</code></td>
                    <td style={{ ...s.td, color: '#64748b' }}>{p.note || '—'}</td>
                    <td style={s.td}>
                      <a href={`${import.meta.env.VITE_API_URL || 'https://mfi-data-production.up.railway.app'}/api/auth/billing/invoices/${p._id}`}
                        target="_blank" rel="noreferrer"
                        style={{ fontSize: 12, color: '#0ea5e9', textDecoration: 'none', fontWeight: 600 }}>
                        ↓ PDF
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 16 }}>
        To upgrade your plan, contact <a href="mailto:support@lucred.co" style={{ color: '#0ea5e9' }}>support@lucred.co</a> or visit the <Link to="/pricing" style={{ color: '#0ea5e9' }}>pricing page</Link>.
      </p>
    </div>
  );
}

const s = {
  h1: { fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 },
  sub: { color: '#64748b', fontSize: 14, marginTop: 4, marginBottom: 24 },
  tableBox: { background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' },
  boxTitle: { fontSize: 15, fontWeight: 600, color: '#0f172a', marginTop: 0, marginBottom: 16 },
  th: { textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600 },
  td: { padding: '12px 12px', borderBottom: '1px solid #f1f5f9', color: '#334155' },
};
