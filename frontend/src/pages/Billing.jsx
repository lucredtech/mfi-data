import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const PLAN_COLOR   = { free: ['#f1f5f9','#64748b'], starter: ['#e0f2fe','#0284c7'], growth: ['#ede9fe','#6d28d9'], scale: ['#dcfce7','#16a34a'], enterprise: ['#fef3c7','#d97706'] };
const PLAN_PRICE   = { free: 0, starter: 25000, growth: 50000, scale: 100000 };
const PLAN_CREDITS = { starter: 32500, growth: 70000, scale: 150000 };
const METHOD_LABEL = { bank_transfer: 'Bank Transfer', card: 'Card', paystack: 'Paystack', manual: 'Manual' };
const TX_COLOR     = { topup: '#16a34a', charge: '#dc2626', refund: '#0ea5e9', subscription_credit: '#6d28d9' };
const TX_LABEL     = { topup: 'Top-up', charge: 'Charge', refund: 'Refund', subscription_credit: 'Subscription credits' };
const TX_PAGE      = 10;

export default function Billing() {
  const [billing, setBilling] = useState(null);
  const [wallet, setWallet]   = useState(null);
  const [txs, setTxs]         = useState([]);
  const [txTotal, setTxTotal] = useState(0);
  const [txPage, setTxPage]   = useState(0);

  useEffect(() => {
    api.get('/api/auth/billing').then(({ data }) => setBilling(data)).catch(() => {});
    api.get('/api/wallet').then(({ data }) => setWallet(data.wallet)).catch(() => {});
  }, []);

  useEffect(() => {
    api.get(`/api/wallet/transactions?limit=${TX_PAGE}&skip=${txPage * TX_PAGE}`)
      .then(({ data }) => { setTxs(data.transactions || []); setTxTotal(data.total || 0); })
      .catch(() => {});
  }, [txPage]);

  const plan = billing?.plan || 'free';
  const [planBg, planFg] = PLAN_COLOR[plan] || PLAN_COLOR.free;

  const now = new Date();
  const resetAt = wallet?.freeQuota?.resetAt ? new Date(wallet.freeQuota.resetAt) : null;
  const daysLeft = resetAt ? Math.ceil((resetAt - now) / (1000 * 60 * 60 * 24)) : null;

  return (
    <div>
      <h1 style={s.h1}>Billing & Wallet</h1>
      <p style={s.sub}>Your plan, wallet balance, and transaction history.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Plan card */}
        <div style={s.card}>
          <div style={s.cardLabel}>Current Plan</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: planFg, background: planBg, padding: '4px 14px', borderRadius: 20 }}>
              {plan.charAt(0).toUpperCase() + plan.slice(1)}
            </span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#64748b' }}>
              {PLAN_PRICE[plan] ? `₦${PLAN_PRICE[plan].toLocaleString()} / month` : 'Free'}
            </span>
          </div>
          {PLAN_CREDITS[plan] && (
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
              ₦{PLAN_CREDITS[plan].toLocaleString()} credits loaded monthly
            </div>
          )}
          {!['scale','enterprise'].includes(plan) && (
            <Link to="/pricing" style={s.upgBtn}>Upgrade Plan →</Link>
          )}
        </div>

        {/* Wallet balance */}
        <div style={{ ...s.card, borderColor: wallet?.balance <= 1000 ? '#fecaca' : '#e2e8f0', background: wallet?.balance <= 1000 ? '#fff5f5' : '#fff' }}>
          <div style={s.cardLabel}>Wallet Balance</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: wallet?.balance <= 1000 ? '#dc2626' : '#0f172a', marginBottom: 4 }}>
            ₦{(wallet?.balance || 0).toLocaleString()}
          </div>
          {wallet?.balance !== undefined && wallet.balance <= 1000 && (
            <div style={{ fontSize: 12, color: '#dc2626', fontWeight: 600, marginBottom: 8 }}>Low balance — top up to avoid interruptions</div>
          )}
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            Contact <a href="mailto:support@lucred.co" style={{ color: '#0ea5e9' }}>support@lucred.co</a> to top up via bank transfer.
          </div>
        </div>
      </div>

      {/* Free quota */}
      {plan === 'free' && wallet?.freeQuota && (
        <div style={{ ...s.card, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={s.cardLabel}>Monthly Free Quota</div>
            {daysLeft !== null && <span style={{ fontSize: 12, color: '#94a3b8' }}>Resets in {daysLeft} day{daysLeft !== 1 ? 's' : ''}</span>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { label: 'BVN checks',          used: 3 - (wallet.freeQuota.bvn       ?? 3), max: 3 },
              { label: 'NIN checks',          used: 3 - (wallet.freeQuota.nin       ?? 3), max: 3 },
              { label: 'Statement analyses',  used: 3 - (wallet.freeQuota.statement ?? 3), max: 3 },
            ].map(({ label, used, max }) => (
              <div key={label} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{used}<span style={{ fontSize: 13, fontWeight: 500, color: '#94a3b8' }}>/{max}</span></div>
                <div style={{ height: 4, background: '#e2e8f0', borderRadius: 4, marginTop: 6 }}>
                  <div style={{ height: 4, background: used >= max ? '#dc2626' : '#0ea5e9', borderRadius: 4, width: `${(used / max) * 100}%`, transition: 'width 0.3s' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rates */}
      <div style={{ ...s.card, marginBottom: 24 }}>
        <div style={s.cardLabel}>Analysis Rates (per check)</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 8 }}>
          {[['BVN check','₦75'],['NIN check','₦100'],['Bureau check','₦700'],['Statement analysis','₦400']].map(([label, price]) => (
            <div key={label} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{price}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction log */}
      <div style={{ ...s.tableBox, marginBottom: 24 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Wallet Transactions</div>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>{txTotal.toLocaleString()} total</span>
        </div>
        {txs.length === 0 ? (
          <div style={s.empty}>No transactions yet. Analyses you run will appear here.</div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['Time','Description','Type','Amount','Balance After'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {txs.map((tx, i) => (
                  <tr key={tx._id} style={{ background: i % 2 ? '#fafafa' : '#fff' }}>
                    <td style={{ ...s.td, fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>{new Date(tx.createdAt).toLocaleString()}</td>
                    <td style={{ ...s.td, color: '#334155' }}>
                      <div style={{ fontSize: 13 }}>{tx.description || '—'}</div>
                      {tx.freeQuota && <span style={{ fontSize: 10, fontWeight: 700, color: '#0ea5e9', background: '#e0f2fe', padding: '1px 6px', borderRadius: 8 }}>FREE QUOTA</span>}
                    </td>
                    <td style={s.td}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: TX_COLOR[tx.type] || '#64748b', background: `${TX_COLOR[tx.type]}18`, padding: '2px 8px', borderRadius: 10 }}>
                        {TX_LABEL[tx.type] || tx.type}
                      </span>
                    </td>
                    <td style={{ ...s.td, fontWeight: 700, color: tx.type === 'charge' ? '#dc2626' : '#16a34a' }}>
                      {tx.type === 'charge' ? '-' : '+'}₦{tx.amount.toLocaleString()}
                    </td>
                    <td style={{ ...s.td, color: '#64748b', fontSize: 13 }}>₦{tx.balanceAfter.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {txTotal > TX_PAGE && (
              <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#64748b' }}>Showing {txPage * TX_PAGE + 1}–{Math.min((txPage + 1) * TX_PAGE, txTotal)} of {txTotal.toLocaleString()}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={s.pageBtn} disabled={txPage === 0} onClick={() => setTxPage(p => p - 1)}>← Prev</button>
                  <button style={s.pageBtn} disabled={(txPage + 1) * TX_PAGE >= txTotal} onClick={() => setTxPage(p => p + 1)}>Next →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Subscription payments */}
      <div style={s.tableBox}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Subscription Payments</div>
        </div>
        {!billing ? (
          <div style={s.empty}>Loading…</div>
        ) : !billing.payments?.length ? (
          <div style={s.empty}>No subscription payments yet. Contact support@lucred.co to subscribe.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>{['Date','Plan','Months','Amount','Credits Loaded','Method','Reference'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {billing.payments.map(p => {
                const [bg, fg] = PLAN_COLOR[p.plan] || PLAN_COLOR.free;
                return (
                  <tr key={p._id}>
                    <td style={s.td}>{new Date(p.createdAt).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}</td>
                    <td style={s.td}><span style={{ fontWeight: 700, background: bg, color: fg, padding: '2px 10px', borderRadius: 12, fontSize: 12 }}>{p.plan}</span></td>
                    <td style={{ ...s.td, textAlign: 'center' }}>{p.months || 1}</td>
                    <td style={s.td}><strong>₦{Number(p.amount).toLocaleString()}</strong></td>
                    <td style={{ ...s.td, color: '#16a34a', fontWeight: 600 }}>
                      {PLAN_CREDITS[p.plan] ? `₦${(PLAN_CREDITS[p.plan] * (p.months || 1)).toLocaleString()}` : '—'}
                    </td>
                    <td style={s.td}>{METHOD_LABEL[p.method] || p.method || '—'}</td>
                    <td style={s.td}><code style={{ fontSize: 11, color: '#64748b' }}>{p.reference || '—'}</code></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 16 }}>
        To subscribe or top up, contact <a href="mailto:support@lucred.co" style={{ color: '#0ea5e9' }}>support@lucred.co</a> or visit the <Link to="/pricing" style={{ color: '#0ea5e9' }}>pricing page</Link>.
      </p>
    </div>
  );
}

const s = {
  h1:        { fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 },
  sub:       { color: '#64748b', fontSize: 14, marginTop: 4, marginBottom: 24 },
  card:      { background: '#fff', borderRadius: 12, padding: '1.25rem 1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' },
  cardLabel: { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  upgBtn:    { display: 'inline-block', padding: '8px 18px', background: '#6d28d9', color: '#fff', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: 13 },
  tableBox:  { background: '#fff', borderRadius: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.06)', overflow: 'hidden' },
  th:        { textAlign: 'left', padding: '10px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  td:        { padding: '12px 16px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' },
  empty:     { padding: '2.5rem', textAlign: 'center', color: '#94a3b8', fontSize: 14 },
  pageBtn:   { fontSize: 13, fontWeight: 600, padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#334155', cursor: 'pointer' },
};
