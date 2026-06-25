import { Link } from 'react-router-dom';

export default function CancellationPolicy() {
  return (
    <div style={{ maxWidth: 680 }}>
      <h1 style={s.h1}>Cancellation &amp; Credits Policy</h1>
      <p style={s.sub}>Last updated: June 2026</p>

      <div style={s.card}>
        <h2 style={s.h2}>Subscription cancellation</h2>
        <p style={s.p}>
          You may cancel your subscription at any time by contacting{' '}
          <a href="mailto:support@lucred.co" style={s.a}>support@lucred.co</a>.
          Cancellations take effect at the end of your current billing period.
        </p>
        <p style={s.p}>
          <strong>No cash refunds are issued.</strong> Any unused subscription credits remaining
          at the time of cancellation are converted to your wallet balance at face value
          and remain available for PAYG usage indefinitely.
        </p>
      </div>

      <div style={s.card}>
        <h2 style={s.h2}>Multi-month prepayments</h2>
        <p style={s.p}>
          If you paid for multiple months in advance and cancel before the end of the prepaid
          period, the remaining unused months are converted to wallet credits at the base
          monthly credit value (without loyalty bonus). No cash refund is issued.
        </p>
        <p style={s.p}>
          Example: You paid for 6 months on the Growth plan (₦50,000 × 6 = ₦300,000) and
          cancel after 2 months. The remaining 4 months of base Growth credits
          (4 × ₦70,000 = ₦280,000) are added to your wallet balance.
        </p>
      </div>

      <div style={s.card}>
        <h2 style={s.h2}>Wallet top-ups</h2>
        <p style={s.p}>
          Wallet top-up payments (PAYG) are non-refundable. Credits added to your wallet
          do not expire and carry over indefinitely.
        </p>
      </div>

      <div style={s.card}>
        <h2 style={s.h2}>Failed or disputed charges</h2>
        <p style={s.p}>
          If an analysis fails due to an upstream provider error, the charge is automatically
          refunded to your wallet balance. You can verify this in your{' '}
          <Link to="/dashboard/billing" style={s.a}>transaction log</Link>.
        </p>
        <p style={s.p}>
          For payment disputes or billing errors, contact{' '}
          <a href="mailto:support@lucred.co" style={s.a}>support@lucred.co</a>{' '}
          within 30 days of the charge.
        </p>
      </div>

      <div style={s.card}>
        <h2 style={s.h2}>Plan downgrades</h2>
        <p style={s.p}>
          Downgrading your plan takes effect at the next billing cycle. Remaining credits from
          the current plan period are not affected and continue to be drawn down until exhausted.
          Overage after credits are exhausted is billed at standard PAYG rates.
        </p>
      </div>

      <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 8 }}>
        Questions? Reach us at <a href="mailto:support@lucred.co" style={s.a}>support@lucred.co</a>
        {' '}or read our <Link to="/terms" style={s.a}>Terms of Service</Link>.
      </p>
    </div>
  );
}

const s = {
  h1:   { fontSize: 24, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' },
  h2:   { fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 12px' },
  sub:  { color: '#94a3b8', fontSize: 13, marginTop: 0, marginBottom: 28 },
  card: { background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: 16 },
  p:    { fontSize: 14, color: '#334155', lineHeight: 1.75, margin: '0 0 12px' },
  a:    { color: '#0ea5e9', textDecoration: 'none', fontWeight: 600 },
};
