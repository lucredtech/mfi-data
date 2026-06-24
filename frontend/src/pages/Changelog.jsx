import Footer from '../components/Footer';

const ENTRIES = [
  {
    date: '2026-06-24',
    version: 'v1.5',
    changes: [
      { type: 'new', text: 'Borrower email + SMS notification when a loan review is completed' },
      { type: 'new', text: 'Plan limit warning email + SMS at 90% monthly quota usage' },
      { type: 'new', text: 'Webhook retry with exponential backoff (3 attempts on 5xx / network errors)' },
      { type: 'new', text: 'Customer activity timeline — all checks and reviews in one chronological view' },
      { type: 'new', text: 'Billing page with payment history under Account → Billing' },
      { type: 'new', text: 'API key last-used badge (green "Active · 2h ago" / grey "Never used")' },
      { type: 'fix', text: 'Webhook event names corrected: statement.analysed, bureau.pulled, loan_review.created' },
      { type: 'fix', text: 'Onboarding checklist API key step now correctly detects existing keys' },
    ],
  },
  {
    date: '2026-06-23',
    version: 'v1.4',
    changes: [
      { type: 'new', text: 'Rate limit headers on every API response: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset' },
      { type: 'new', text: 'In-app upgrade modal fires automatically when monthly quota is exceeded (429)' },
      { type: 'new', text: 'Toast notification on 429 alongside upgrade modal' },
      { type: 'new', text: 'Referral system — unique referral code per account, /dashboard/referral page, admin referral chains' },
      { type: 'new', text: 'Bulk customer status update with checkbox selection and action bar' },
      { type: 'new', text: 'Customer status filter pills (applied / under_review / approved / rejected / disbursed)' },
      { type: 'new', text: 'Admin: Audit Log page with client picker and action-type filters' },
      { type: 'new', text: 'Admin: Export clients to CSV from MFI Clients page' },
      { type: 'new', text: 'Usage page: monthly reset countdown next to quota bar' },
      { type: 'fix', text: 'Notes add-form layout fixed for mobile (stacked instead of side-by-side)' },
      { type: 'fix', text: '429 error description corrected from "slow down" to "monthly quota exceeded"' },
    ],
  },
  {
    date: '2026-06-20',
    version: 'v1.3',
    changes: [
      { type: 'new', text: 'Nova Bank added to statement analysis' },
      { type: 'new', text: 'Searchable bank dropdown — type to filter instead of scrolling' },
      { type: 'new', text: 'Loan officer profile page — edit org details and change password' },
      { type: 'new', text: 'Admin: upgrade client plan directly from client detail page' },
      { type: 'new', text: 'Webhook signing — every delivery includes X-Lucred-Signature (HMAC-SHA256)' },
      { type: 'new', text: 'Webhook reveal/copy secret button in dashboard' },
      { type: 'new', text: 'Supported bank names documented in API reference' },
    ],
  },
  {
    date: '2026-06-15',
    version: 'v1.2',
    changes: [
      { type: 'new', text: 'Pricing page aligned with actual plan limits (Free / Growth / Scale)' },
      { type: 'new', text: 'Loan Pipeline page with status filters and stage counts' },
      { type: 'new', text: 'Bulk BVN / NIN verification page' },
      { type: 'new', text: 'Webhooks — register endpoints, choose events, test delivery, manage secrets' },
      { type: 'new', text: 'Watchlist auto-block banner on customer profile for flagged borrowers' },
      { type: 'fix', text: 'Usage upgrade nudge badge now links to /pricing' },
    ],
  },
  {
    date: '2026-06-01',
    version: 'v1.1',
    changes: [
      { type: 'new', text: 'Customer credit scorecard with 4-category breakdown' },
      { type: 'new', text: 'Loan eligibility review with DTI, verdict, and repayment schedule' },
      { type: 'new', text: 'Credit bureau integration (FirstCentral)' },
      { type: 'new', text: 'BVN and NIN verification with identity photo' },
      { type: 'new', text: 'Bank statement analysis — income, cash flow, risk grade A–E' },
      { type: 'new', text: 'Customer profiles with notes, status pipeline, and duplicate detection' },
    ],
  },
];

const TYPE_STYLE = {
  new: { label: 'New', bg: '#dcfce7', color: '#16a34a' },
  fix: { label: 'Fix', bg: '#fef3c7', color: '#d97706' },
  breaking: { label: 'Breaking', bg: '#fee2e2', color: '#dc2626' },
};

export default function Changelog() {
  return (
    <div style={{ fontFamily: 'Inter, sans-serif', minHeight: '100vh', background: '#f8fafc' }}>
      <div style={{ background: '#0f172a', padding: '2rem 0' }}>
        <div style={{ maxWidth: 740, margin: '0 auto', padding: '0 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#38bdf8', marginBottom: 4 }}>Lucred</div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: '#fff', margin: 0 }}>API Changelog</h1>
            <p style={{ color: '#94a3b8', marginTop: 6, marginBottom: 0, fontSize: 14 }}>What's new, fixed, and changed in the Lucred Credit API.</p>
          </div>
          <a href="/login" style={{ fontSize: 13, fontWeight: 600, color: '#38bdf8', textDecoration: 'none', border: '1px solid #38bdf8', padding: '8px 16px', borderRadius: 8 }}>
            Dashboard →
          </a>
        </div>
      </div>

      <div style={{ maxWidth: 740, margin: '0 auto', padding: '2.5rem 2rem' }}>
        {ENTRIES.map((entry, i) => (
          <div key={i} style={{ display: 'flex', gap: 28, marginBottom: 40 }}>
            {/* Date column */}
            <div style={{ width: 110, flexShrink: 0, paddingTop: 3 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{entry.version}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                {new Date(entry.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            </div>
            {/* Changes */}
            <div style={{ flex: 1, background: '#fff', borderRadius: 12, padding: '1.25rem 1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
              {entry.changes.map((c, j) => {
                const { label, bg, color } = TYPE_STYLE[c.type] || TYPE_STYLE.new;
                return (
                  <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: j < entry.changes.length - 1 ? 10 : 0 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, background: bg, color, padding: '2px 7px', borderRadius: 10, whiteSpace: 'nowrap', marginTop: 1, flexShrink: 0 }}>{label}</span>
                    <span style={{ fontSize: 13, color: '#334155', lineHeight: 1.55 }}>{c.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <Footer />
    </div>
  );
}
