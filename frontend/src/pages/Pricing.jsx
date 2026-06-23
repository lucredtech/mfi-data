import { Link } from 'react-router-dom';
import Footer from '../components/Footer';

const PLANS = [
  {
    name: 'Free',
    planKey: 'free',
    price: '₦0',
    period: '/month',
    description: 'Start verifying borrowers immediately. No card required.',
    color: '#0ea5e9',
    features: [
      '200 API calls/month',
      'BVN & NIN verification',
      'Credit bureau checks',
      'Statement analysis',
      'Customer dashboard',
      'PDF report exports',
      'Webhook notifications',
      'API key access',
    ],
    notIncluded: ['Priority support', 'Dedicated account manager', 'Custom integrations', 'SLA guarantee'],
    cta: 'Get Started Free',
    href: '/register',
    highlight: false,
  },
  {
    name: 'Growth',
    planKey: 'growth',
    price: '₦50,000',
    period: '/month',
    description: 'For active lenders processing higher loan volumes month-to-month.',
    color: '#6d28d9',
    features: [
      '5,000 API calls/month',
      'BVN & NIN verification',
      'Credit bureau checks',
      'Statement analysis',
      'Customer dashboard',
      'PDF report exports',
      'Webhook notifications',
      'Multiple API keys',
      'Priority email support',
    ],
    notIncluded: ['Dedicated account manager', 'Custom integrations', 'SLA guarantee'],
    cta: 'Start Growth Plan',
    href: '/register',
    highlight: true,
  },
  {
    name: 'Scale',
    planKey: 'scale',
    price: '₦200,000',
    period: '/month',
    description: 'For large MFIs and institutions with high-volume lending operations.',
    color: '#0f172a',
    features: [
      'Unlimited API calls',
      'BVN & NIN verification',
      'Credit bureau checks',
      'Statement analysis',
      'Customer dashboard',
      'PDF report exports',
      'Webhook notifications',
      'Unlimited API keys',
      'Dedicated account manager',
      'Custom integrations',
      'SLA guarantee',
    ],
    notIncluded: [],
    cta: 'Contact Sales',
    href: 'mailto:partnerships@lucred.com',
    highlight: false,
  },
];

const FAQS = [
  { q: 'How are requests counted?', a: 'Each API call to any endpoint (BVN, NIN, credit bureau, statement analysis) counts as one request against your monthly quota. Failed requests due to upstream data provider errors are not counted.' },
  { q: 'What happens if I exceed my limit?', a: 'Requests beyond your monthly limit return a 429 error. Your Usage dashboard shows how close you are to the limit. You can upgrade at any time — the new limit applies immediately.' },
  { q: 'Is the Free plan really free?', a: 'Yes — 200 API calls per month, no card required, and full access to all features including PDF exports and webhooks. It\'s designed for you to run real borrower checks before committing to a paid plan.' },
  { q: 'Can I change plans at any time?', a: 'Yes. You can upgrade or downgrade your plan at any time. Changes take effect immediately on upgrade, and at the next billing cycle on downgrade.' },
  { q: 'How is billing handled?', a: 'We bill monthly via bank transfer or card. Enterprise clients can negotiate quarterly or annual billing with a discount.' },
];

export default function Pricing() {
  return (
    <div style={s.page}>
      {/* Nav */}
      <nav style={s.nav}>
        <div style={s.navInner}>
          <Link to="/" style={s.logo}>Lucred <span style={s.logoBadge}>for MFIs</span></Link>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Link to="/login" style={s.navLink}>Sign in</Link>
            <Link to="/register" style={s.navBtn}>Get API Access</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={s.hero}>
        <div style={s.heroInner}>
          <div style={s.heroBadge}>Pricing</div>
          <h1 style={s.heroTitle}>Simple, transparent pricing</h1>
          <p style={s.heroSub}>Pay for what you use. No hidden fees. Scale as your loan book grows.</p>
        </div>
      </section>

      {/* Plans */}
      <section style={s.plansSection}>
        <div style={s.plansInner}>
          <div style={s.plansGrid}>
            {PLANS.map((plan) => (
              <div key={plan.name} style={{ ...s.planCard, ...(plan.highlight ? s.planCardHighlight : {}) }}>
                {plan.highlight && <div style={s.popularBadge}>Most Popular</div>}
                <div style={{ ...s.planName, color: plan.color }}>{plan.name}</div>
                <div style={s.planPrice}>
                  {plan.price}<span style={s.planPeriod}>{plan.period}</span>
                </div>
                <p style={s.planDesc}>{plan.description}</p>
                <div style={s.divider} />
                <div style={s.featureList}>
                  {plan.features.map((f) => (
                    <div key={f} style={s.feature}>
                      <span style={s.checkIcon}>✓</span>
                      <span>{f}</span>
                    </div>
                  ))}
                  {plan.notIncluded.map((f) => (
                    <div key={f} style={{ ...s.feature, opacity: 0.35 }}>
                      <span style={s.crossIcon}>✕</span>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
                <Link
                  to={plan.href}
                  style={{ ...s.planBtn, background: plan.highlight ? plan.color : '#f1f5f9', color: plan.highlight ? '#fff' : '#0f172a' }}
                >
                  {plan.cta} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature comparison */}
      <section style={s.compareSection}>
        <div style={s.plansInner}>
          <h2 style={s.sectionTitle}>What's included</h2>
          <div style={s.compareTable}>
            <div style={s.compareHeader}>
              <div style={{ flex: 2 }}>Feature</div>
              {PLANS.map(p => <div key={p.name} style={{ flex: 1, textAlign: 'center', fontWeight: 700, color: p.color }}>{p.name}</div>)}
            </div>
            {[
              ['API calls/month', '200', '5,000', 'Unlimited'],
              ['BVN & NIN verification', '✓', '✓', '✓'],
              ['Credit bureau checks', '✓', '✓', '✓'],
              ['Statement analysis', '✓', '✓', '✓'],
              ['PDF report exports', '✓', '✓', '✓'],
              ['Webhook notifications', '✓', '✓', '✓'],
              ['API key access', '✓', '✓', '✓'],
              ['Priority support', '✕', '✓', '✓'],
              ['Dedicated account manager', '✕', '✕', '✓'],
              ['Custom integrations', '✕', '✕', '✓'],
              ['SLA guarantee', '✕', '✕', '✓'],
            ].map(([feature, ...vals]) => (
              <div key={feature} style={s.compareRow}>
                <div style={{ flex: 2, color: '#334155', fontSize: 14 }}>{feature}</div>
                {vals.map((v, i) => (
                  <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 14, color: v === '✓' ? '#16a34a' : v === '✕' ? '#cbd5e1' : '#0f172a', fontWeight: v === '✓' || v === '✕' ? 700 : 600 }}>{v}</div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section style={{ ...s.compareSection, background: '#f8fafc' }}>
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
        <h2 style={s.ctaTitle}>Ready to get started?</h2>
        <p style={s.ctaSub}>Register your MFI and get 10 free analyses instantly.</p>
        <Link to="/register" style={s.ctaBtn}>Create free account →</Link>
      </section>

      <Footer />
    </div>
  );
}

const s = {
  page: { fontFamily: 'Inter, sans-serif', color: '#0f172a', background: '#fff' },
  nav: { position: 'sticky', top: 0, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #e2e8f0', zIndex: 100 },
  navInner: { maxWidth: 1100, margin: '0 auto', padding: '0 2rem', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  logo: { fontSize: 20, fontWeight: 800, color: '#0f172a', textDecoration: 'none' },
  logoBadge: { fontSize: 11, fontWeight: 600, background: '#e0f2fe', color: '#0284c7', padding: '2px 8px', borderRadius: 20, marginLeft: 8 },
  navLink: { fontSize: 14, color: '#64748b', textDecoration: 'none', fontWeight: 500 },
  navBtn: { fontSize: 14, background: '#0ea5e9', color: '#fff', padding: '8px 18px', borderRadius: 8, textDecoration: 'none', fontWeight: 600 },
  hero: { background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', padding: '5rem 2rem 4rem', textAlign: 'center' },
  heroInner: { maxWidth: 600, margin: '0 auto' },
  heroBadge: { display: 'inline-block', fontSize: 12, fontWeight: 700, background: 'rgba(14,165,233,0.2)', color: '#38bdf8', padding: '4px 14px', borderRadius: 20, marginBottom: 16, letterSpacing: 1, textTransform: 'uppercase' },
  heroTitle: { fontSize: 44, fontWeight: 800, color: '#fff', margin: '0 0 16px' },
  heroSub: { fontSize: 16, color: '#94a3b8', margin: 0 },
  plansSection: { padding: '5rem 2rem' },
  plansInner: { maxWidth: 1100, margin: '0 auto' },
  plansGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 },
  planCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '2rem', position: 'relative', display: 'flex', flexDirection: 'column' },
  planCardHighlight: { border: '2px solid #6d28d9', boxShadow: '0 8px 32px rgba(109,40,217,0.15)' },
  popularBadge: { position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: '#6d28d9', color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 16px', borderRadius: 20, whiteSpace: 'nowrap' },
  planName: { fontSize: 18, fontWeight: 800, marginBottom: 8 },
  planPrice: { fontSize: 38, fontWeight: 800, color: '#0f172a', marginBottom: 8 },
  planPeriod: { fontSize: 16, fontWeight: 500, color: '#64748b' },
  planDesc: { fontSize: 14, color: '#64748b', marginBottom: 16, lineHeight: 1.6 },
  divider: { height: 1, background: '#f1f5f9', margin: '16px 0' },
  featureList: { flex: 1, display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 },
  feature: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#334155' },
  checkIcon: { color: '#16a34a', fontWeight: 700, fontSize: 14, minWidth: 16 },
  crossIcon: { color: '#cbd5e1', fontWeight: 700, fontSize: 14, minWidth: 16 },
  planBtn: { display: 'block', textAlign: 'center', padding: '12px', borderRadius: 10, fontWeight: 700, fontSize: 15, textDecoration: 'none', marginTop: 'auto' },
  compareSection: { padding: '4rem 2rem' },
  sectionTitle: { fontSize: 28, fontWeight: 800, color: '#0f172a', marginBottom: 32 },
  compareTable: { border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' },
  compareHeader: { display: 'flex', padding: '14px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: 14 },
  compareRow: { display: 'flex', padding: '12px 20px', borderBottom: '1px solid #f1f5f9', alignItems: 'center' },
  faqGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
  faqCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem 1.5rem' },
  faqQ: { fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 8 },
  faqA: { fontSize: 14, color: '#64748b', lineHeight: 1.7 },
  cta: { background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', padding: '4rem 2rem', textAlign: 'center' },
  ctaTitle: { fontSize: 32, fontWeight: 800, color: '#fff', marginBottom: 12 },
  ctaSub: { fontSize: 16, color: 'rgba(255,255,255,0.85)', marginBottom: 28 },
  ctaBtn: { display: 'inline-block', background: '#fff', color: '#0284c7', padding: '14px 28px', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 15 },
  footer: { background: '#0f172a', padding: '2rem' },
  footerInner: { maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
};
