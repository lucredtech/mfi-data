import { Link } from 'react-router-dom';
import Footer from '../components/Footer';

const PLANS = [
  {
    name: 'Free',
    planKey: 'free',
    price: '₦0',
    period: '/month',
    description: 'Get started instantly. No card required.',
    color: '#64748b',
    credits: null,
    features: [
      '3 BVN checks/month',
      '3 NIN checks/month',
      '3 Statement analyses/month',
      'Customer dashboard',
      'PDF report exports',
      'Webhook notifications',
      'API key access',
    ],
    notIncluded: ['Credit bureau checks', 'Priority support', 'Dedicated account manager'],
    cta: 'Get Started Free',
    href: '/register',
    highlight: false,
  },
  {
    name: 'Starter',
    planKey: 'starter',
    price: '₦25,000',
    period: '/month',
    description: 'For small MFIs getting started with regular verifications.',
    color: '#0284c7',
    credits: '₦32,500',
    discount: '30%',
    features: [
      '₦32,500 credits/month (+30%)',
      'BVN & NIN verification',
      'Credit bureau checks',
      'Statement analysis',
      'Customer dashboard',
      'PDF report exports',
      'Webhook notifications',
      'API key access',
    ],
    notIncluded: ['Priority support', 'Dedicated account manager'],
    cta: 'Contact Sales',
    href: 'mailto:sales@lucred.co',
    highlight: false,
  },
  {
    name: 'Growth',
    planKey: 'growth',
    price: '₦50,000',
    period: '/month',
    description: 'For active lenders processing higher loan volumes.',
    color: '#6d28d9',
    credits: '₦70,000',
    discount: '40%',
    features: [
      '₦70,000 credits/month (+40%)',
      'BVN & NIN verification',
      'Credit bureau checks',
      'Statement analysis',
      'Customer dashboard',
      'PDF report exports',
      'Webhook notifications',
      'Multiple API keys',
      'Priority email support',
    ],
    notIncluded: ['Dedicated account manager'],
    cta: 'Contact Sales',
    href: 'mailto:sales@lucred.co',
    highlight: true,
  },
  {
    name: 'Scale',
    planKey: 'scale',
    price: '₦100,000',
    period: '/month',
    description: 'For large MFIs and institutions with high-volume operations.',
    color: '#16a34a',
    credits: '₦150,000',
    discount: '50%',
    features: [
      '₦150,000 credits/month (+50%)',
      'BVN & NIN verification',
      'Credit bureau checks',
      'Statement analysis',
      'Customer dashboard',
      'PDF report exports',
      'Webhook notifications',
      'Unlimited API keys',
      'Priority email support',
      'Dedicated account manager',
    ],
    notIncluded: [],
    cta: 'Contact Sales',
    href: 'mailto:sales@lucred.co',
    highlight: false,
  },
  {
    name: 'Enterprise',
    planKey: 'enterprise',
    price: 'Custom',
    period: '',
    description: 'Tailored pricing, SLAs, and dedicated support for large institutions.',
    color: '#d97706',
    credits: null,
    features: [
      'Custom credit volume',
      'Negotiated rates',
      'Dedicated account manager',
      'Custom SLA guarantee',
      'Priority onboarding',
      'Custom integrations',
      'Quarterly billing available',
    ],
    notIncluded: [],
    cta: 'Contact Sales',
    href: 'mailto:sales@lucred.co',
    highlight: false,
  },
];

const RATES = [
  { service: 'BVN Verification', rate: '₦75', note: 'Per check' },
  { service: 'NIN Verification', rate: '₦100', note: 'Per check' },
  { service: 'Credit Bureau Check', rate: '₦700', note: 'Per check' },
  { service: 'Statement Analysis', rate: '₦500', note: 'Per upload' },
];

const MULTI_MONTH = [
  { months: '1 month', bonus: '0%', extra: 'No loyalty bonus' },
  { months: '3 months', bonus: '+5%', extra: 'Extra 5% on top of plan credits' },
  { months: '6 months', bonus: '+10%', extra: 'Extra 10% on top of plan credits' },
  { months: '9 months', bonus: '+15%', extra: 'Extra 15% on top of plan credits' },
  { months: '12 months', bonus: '+20%', extra: 'Extra 20% on top of plan credits' },
];

const FAQS = [
  { q: 'How does the wallet work?', a: 'Every analysis deducts from your wallet. Top up your wallet via bank transfer and credits are added by our team. Subscribers get credits auto-loaded monthly at a discounted rate.' },
  { q: 'What happens when my wallet runs out?', a: 'Analyses are blocked with a clear error until you top up. You\'ll receive an email and in-app alert when your balance drops below ₦1,000.' },
  { q: 'Do unused subscription credits roll over?', a: 'No — credits are refreshed each month. However, if you cancel a subscription, remaining credits convert to wallet balance and never expire.' },
  { q: 'Can I pay multiple months upfront?', a: 'Yes — pay 3, 6, 9, or 12 months upfront and earn a loyalty bonus (5% per 3-month interval, up to +20% for 12 months). Credits for all months load immediately.' },
  { q: 'Do API calls cost the same as dashboard checks?', a: 'Yes — BVN, NIN, bureau and statement analysis cost the same rate whether called from the dashboard or via the API. One price list.' },
  { q: 'Is there a free trial?', a: 'The Free plan gives you 3 BVN checks, 3 NIN checks, and 3 statement analyses every month — no card required. It\'s a real monthly free tier, not a trial.' },
];

export default function Pricing() {
  return (
    <div style={s.page}>
      {/* Nav */}
      <nav style={s.nav}>
        <div style={s.navInner}>
          <Link to="/" style={s.logo}>Lucred <span style={s.logoBadge}>MFI</span></Link>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Link to="/login" style={s.navLink}>Sign in</Link>
            <Link to="/register" style={s.navBtn}>Get Started Free</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={s.hero}>
        <div style={s.heroInner}>
          <div style={s.heroBadge}>Pricing</div>
          <h1 style={s.heroTitle}>Pay for what you use</h1>
          <p style={s.heroSub}>Top up your wallet and deduct per analysis. Subscribe for discounted credits. Same rates on dashboard and API.</p>
        </div>
      </section>

      {/* Analysis rates */}
      <section style={{ padding: '3rem 2rem', background: '#f8fafc' }}>
        <div style={s.plansInner}>
          <h2 style={{ ...s.sectionTitle, textAlign: 'center', marginBottom: 8 }}>Per-analysis rates</h2>
          <p style={{ textAlign: 'center', color: '#64748b', fontSize: 14, marginBottom: 28 }}>Same price whether you use the dashboard or the API.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, maxWidth: 800, margin: '0 auto' }}>
            {RATES.map(({ service, rate, note }) => (
              <div key={service} style={{ background: '#fff', borderRadius: 12, padding: '1.25rem', textAlign: 'center', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>{service}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a' }}>{rate}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{note}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Plans */}
      <section style={s.plansSection}>
        <div style={s.plansInner}>
          <h2 style={{ ...s.sectionTitle, textAlign: 'center', marginBottom: 8 }}>Subscription plans</h2>
          <p style={{ textAlign: 'center', color: '#64748b', fontSize: 14, marginBottom: 32 }}>Subscribe to get a monthly credit bonus. Overage is charged at full PAYG rate.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
            {PLANS.map(plan => (
              <div key={plan.name} style={{ ...s.planCard, ...(plan.highlight ? s.planCardHighlight : {}) }}>
                {plan.highlight && <div style={s.popularBadge}>Most Popular</div>}
                <div style={{ ...s.planName, color: plan.color }}>{plan.name}</div>
                <div style={s.planPrice}>
                  {plan.price}<span style={s.planPeriod}>{plan.period}</span>
                </div>
                {plan.credits && (
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', background: '#f0fdf4', padding: '4px 10px', borderRadius: 8, marginBottom: 8, display: 'inline-block' }}>
                    {plan.credits} credits/mo
                  </div>
                )}
                <p style={s.planDesc}>{plan.description}</p>
                <div style={s.divider} />
                <div style={s.featureList}>
                  {plan.features.map(f => (
                    <div key={f} style={s.feature}><span style={s.check}>✓</span><span style={{ fontSize: 13 }}>{f}</span></div>
                  ))}
                  {plan.notIncluded.map(f => (
                    <div key={f} style={{ ...s.feature, opacity: 0.35 }}><span style={s.cross}>✕</span><span style={{ fontSize: 13 }}>{f}</span></div>
                  ))}
                </div>
                <a href={plan.href} style={{ ...s.planBtn, background: plan.highlight ? plan.color : '#f1f5f9', color: plan.highlight ? '#fff' : '#0f172a' }}>
                  {plan.cta} →
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Multi-month loyalty */}
      <section style={{ ...s.compareSection, background: '#f8fafc' }}>
        <div style={s.plansInner}>
          <h2 style={s.sectionTitle}>Pay upfront, earn more credits</h2>
          <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>Pay multiple months upfront on any subscription plan and get a loyalty bonus on top of your plan discount.</p>
          <div style={s.compareTable}>
            <div style={s.compareHeader}>
              <div style={{ flex: 1 }}>Commitment</div>
              <div style={{ flex: 1, textAlign: 'center' }}>Loyalty Bonus</div>
              <div style={{ flex: 2 }}>What it means</div>
            </div>
            {MULTI_MONTH.map(({ months, bonus, extra }) => (
              <div key={months} style={s.compareRow}>
                <div style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{months}</div>
                <div style={{ flex: 1, textAlign: 'center', fontWeight: 700, color: bonus === '0%' ? '#94a3b8' : '#16a34a', fontSize: 14 }}>{bonus}</div>
                <div style={{ flex: 2, color: '#64748b', fontSize: 13 }}>{extra}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 12 }}>Example: Growth plan (₦50,000/mo × 12 months = ₦600,000) loads ₦70,000 × 12 × 1.20 = <strong style={{ color: '#0f172a' }}>₦1,008,000 in credits</strong></p>
        </div>
      </section>

      {/* FAQ */}
      <section style={s.compareSection}>
        <div style={s.plansInner}>
          <h2 style={s.sectionTitle}>Frequently asked questions</h2>
          <div style={s.faqGrid}>
            {FAQS.map(({ q, a }) => (
              <div key={q} style={s.faqCard}>
                <div style={s.faqQ}>{q}</div>
                <div style={s.faqA}>{a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={s.cta}>
        <h2 style={s.ctaTitle}>Start with 3 free analyses every month</h2>
        <p style={s.ctaSub}>No card required. Top up your wallet when you need more.</p>
        <Link to="/register" style={s.ctaBtn}>Create free account →</Link>
      </section>

      <Footer />
    </div>
  );
}

const s = {
  page: { fontFamily: 'Inter, sans-serif', color: '#0f172a', background: '#fff' },
  nav: { position: 'sticky', top: 0, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #e2e8f0', zIndex: 100 },
  navInner: { maxWidth: 1200, margin: '0 auto', padding: '0 2rem', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  logo: { fontSize: 20, fontWeight: 800, color: '#0f172a', textDecoration: 'none' },
  logoBadge: { fontSize: 11, fontWeight: 600, background: '#e0f2fe', color: '#0284c7', padding: '2px 8px', borderRadius: 20, marginLeft: 6 },
  navLink: { fontSize: 14, color: '#64748b', textDecoration: 'none', fontWeight: 500 },
  navBtn: { fontSize: 14, background: '#0ea5e9', color: '#fff', padding: '8px 18px', borderRadius: 8, textDecoration: 'none', fontWeight: 600 },
  hero: { background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', padding: '5rem 2rem 4rem', textAlign: 'center' },
  heroInner: { maxWidth: 640, margin: '0 auto' },
  heroBadge: { display: 'inline-block', fontSize: 12, fontWeight: 700, background: 'rgba(14,165,233,0.2)', color: '#38bdf8', padding: '4px 14px', borderRadius: 20, marginBottom: 16, letterSpacing: 1, textTransform: 'uppercase' },
  heroTitle: { fontSize: 44, fontWeight: 800, color: '#fff', margin: '0 0 16px' },
  heroSub: { fontSize: 16, color: '#94a3b8', margin: 0, lineHeight: 1.7 },
  plansSection: { padding: '4rem 2rem' },
  plansInner: { maxWidth: 1200, margin: '0 auto' },
  planCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '1.5rem', position: 'relative', display: 'flex', flexDirection: 'column' },
  planCardHighlight: { border: '2px solid #6d28d9', boxShadow: '0 8px 32px rgba(109,40,217,0.15)' },
  popularBadge: { position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: '#6d28d9', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 14px', borderRadius: 20, whiteSpace: 'nowrap' },
  planName: { fontSize: 16, fontWeight: 800, marginBottom: 6 },
  planPrice: { fontSize: 28, fontWeight: 800, color: '#0f172a', marginBottom: 4 },
  planPeriod: { fontSize: 14, fontWeight: 500, color: '#64748b' },
  planDesc: { fontSize: 13, color: '#64748b', marginBottom: 12, lineHeight: 1.6 },
  divider: { height: 1, background: '#f1f5f9', margin: '12px 0' },
  featureList: { flex: 1, display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 },
  feature: { display: 'flex', alignItems: 'flex-start', gap: 8, color: '#334155' },
  check: { color: '#16a34a', fontWeight: 700, fontSize: 13, minWidth: 14, marginTop: 1 },
  cross: { color: '#cbd5e1', fontWeight: 700, fontSize: 13, minWidth: 14, marginTop: 1 },
  planBtn: { display: 'block', textAlign: 'center', padding: '10px', borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: 'none', marginTop: 'auto' },
  compareSection: { padding: '4rem 2rem' },
  sectionTitle: { fontSize: 26, fontWeight: 800, color: '#0f172a', marginBottom: 24 },
  compareTable: { border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' },
  compareHeader: { display: 'flex', padding: '12px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  compareRow: { display: 'flex', padding: '12px 20px', borderBottom: '1px solid #f1f5f9', alignItems: 'center' },
  faqGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  faqCard: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem 1.5rem' },
  faqQ: { fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 8 },
  faqA: { fontSize: 13, color: '#64748b', lineHeight: 1.7 },
  cta: { background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', padding: '4rem 2rem', textAlign: 'center' },
  ctaTitle: { fontSize: 30, fontWeight: 800, color: '#fff', marginBottom: 12 },
  ctaSub: { fontSize: 15, color: 'rgba(255,255,255,0.85)', marginBottom: 28 },
  ctaBtn: { display: 'inline-block', background: '#fff', color: '#0284c7', padding: '14px 28px', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 15 },
};
