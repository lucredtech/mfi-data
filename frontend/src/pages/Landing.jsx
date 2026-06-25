import { Link } from 'react-router-dom';
import Footer from '../components/Footer';

const FEATURES = [
  {
    title: 'Bank Statement Analysis',
    desc: 'Upload bank statements and get instant income, spending, and repayment capacity analysis powered by Lucred\'s AI engine.',
  },
  {
    title: 'Credit Bureau Access',
    desc: 'Pull comprehensive credit history and outstanding obligations for any borrower in seconds.',
  },
  {
    title: 'BVN & NIN Verification',
    desc: 'Verify borrower identity instantly with Nigeria\'s national identity infrastructure.',
  },
  {
    title: 'Credit Scoring',
    desc: 'Get Lucred\'s proprietary credit score and lending decision with suggested loan amount and tenor.',
  },
];

const STEPS = [
  { step: '01', title: 'Register your MFI', desc: 'Apply online — our team reviews and activates vetted organisations within 1–2 business days.' },
  { step: '02', title: 'Integrate the API', desc: 'Use our simple REST API with your existing loan management system.' },
  { step: '03', title: 'Make better lending decisions', desc: 'Access real-time credit data on every borrower.' },
];

export default function Landing() {
  return (
    <div style={s.page}>
      {/* Nav */}
      <nav style={s.nav}>
        <div style={s.navInner}>
          <div style={s.logo}>Lucred <span style={s.logoBadge}>for MFIs</span></div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Link to="/pricing" style={s.navLink}>Pricing</Link>
            <Link to="/login" style={s.navLink}>Sign in</Link>
            <Link to="/register" style={s.navBtn}>Get API Access</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={s.hero}>
        <div style={s.heroInner}>
          <div style={s.heroBadge}>B2B Credit Infrastructure</div>
          <h1 style={s.heroTitle}>
            The credit engine powering<br />
            <span style={s.heroAccent}>smarter MFI lending</span>
          </h1>
          <p style={s.heroSub}>
            Give your microfinance institution access to Lucred's credit data infrastructure —
            bank statement analysis, credit bureau, identity verification and AI-powered credit scoring.
            All via a single dashboard.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" style={s.heroBtnPrimary}>Start for free →</Link>
            <Link to="/pricing" style={s.heroBtnSecondary}>See pricing</Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={s.section}>
        <div style={s.sectionInner}>
          <div style={s.sectionLabel}>What you get</div>
          <h2 style={s.sectionTitle}>Everything your MFI needs to lend confidently</h2>
          <div style={s.featGrid}>
            {FEATURES.map((f) => (
              <div key={f.title} style={s.featCard}>
                <h3 style={s.featTitle}>{f.title}</h3>
                <p style={s.featDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ ...s.section, background: '#f8fafc' }}>
        <div style={s.sectionInner}>
          <div style={s.sectionLabel}>How it works</div>
          <h2 style={s.sectionTitle}>Up and running in minutes</h2>
          <div style={s.stepsGrid}>
            {STEPS.map((step) => (
              <div key={step.step} style={s.stepCard}>
                <div style={s.stepNum}>{step.step}</div>
                <h3 style={s.stepTitle}>{step.title}</h3>
                <p style={s.stepDesc}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Code snippet */}
      <section style={s.section}>
        <div style={s.sectionInner}>
          <div style={s.sectionLabel}>Simple integration</div>
          <h2 style={s.sectionTitle}>One API call to analyse a bank statement</h2>
          <div style={s.codeBox}>
            <pre style={s.code}>{`curl -X POST https://mfi-data-production.up.railway.app/v1/statement/upload-analyze \\
  -H "X-Api-Key: lcrd_your_api_key" \\
  -F "statement=@/path/to/statement.pdf" \\
  -F "bankName=access" \\
  -F "email=borrower@example.com"

// Response
{
  "success": true,
  "data": {
    "income": 450000,
    "expenses": 210000,
    "creditScore": 720,
    "recommendation": "approve",
    "maxLoanAmount": 200000
  }
}`}</pre>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={s.cta}>
        <div style={s.ctaInner}>
          <h2 style={s.ctaTitle}>Ready to upgrade your credit process?</h2>
          <p style={s.ctaSub}>Join MFIs already using Lucred's credit engine to make faster, smarter lending decisions.</p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" style={s.heroBtnPrimary}>Start for free →</Link>
            <Link to="/pricing" style={{ ...s.heroBtnSecondary, background: 'rgba(255,255,255,0.1)' }}>See pricing</Link>
          </div>
          <p style={{ marginTop: 20, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>No credit card required · Vetted organisations only</p>
        </div>
      </section>

      <Footer />
    </div>
  );
}

const s = {
  page: { fontFamily: 'Inter, sans-serif', color: '#0f172a' },
  nav: { position: 'sticky', top: 0, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #e2e8f0', zIndex: 100 },
  navInner: { maxWidth: 1100, margin: '0 auto', padding: '0 2rem', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  logo: { fontSize: 20, fontWeight: 800, color: '#0f172a' },
  logoBadge: { fontSize: 11, fontWeight: 600, background: '#e0f2fe', color: '#0284c7', padding: '2px 8px', borderRadius: 20, marginLeft: 8 },
  navLink: { fontSize: 14, color: '#64748b', textDecoration: 'none', fontWeight: 500 },
  navBtn: { fontSize: 14, background: '#0ea5e9', color: '#fff', padding: '8px 18px', borderRadius: 8, textDecoration: 'none', fontWeight: 600 },
  hero: { background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', padding: '6rem 2rem' },
  heroInner: { maxWidth: 800, margin: '0 auto', textAlign: 'center' },
  heroBadge: { display: 'inline-block', fontSize: 12, fontWeight: 700, background: 'rgba(14,165,233,0.2)', color: '#38bdf8', padding: '4px 14px', borderRadius: 20, marginBottom: 24, letterSpacing: 1, textTransform: 'uppercase' },
  heroTitle: { fontSize: 52, fontWeight: 800, color: '#fff', lineHeight: 1.15, margin: '0 0 20px' },
  heroAccent: { color: '#38bdf8' },
  heroSub: { fontSize: 18, color: '#94a3b8', lineHeight: 1.7, marginBottom: 36 },
  heroBtnPrimary: { display: 'inline-block', background: '#0ea5e9', color: '#fff', padding: '14px 28px', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 15 },
  heroBtnSecondary: { display: 'inline-block', background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '14px 28px', borderRadius: 10, textDecoration: 'none', fontWeight: 600, fontSize: 15 },
  section: { padding: '5rem 2rem' },
  sectionInner: { maxWidth: 1100, margin: '0 auto' },
  sectionLabel: { fontSize: 12, fontWeight: 700, color: '#0ea5e9', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 },
  sectionTitle: { fontSize: 36, fontWeight: 800, color: '#0f172a', marginBottom: 48, maxWidth: 600 },
  featGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 },
  featCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '1.75rem' },
  featIcon: { fontSize: 32, marginBottom: 16 },
  featTitle: { fontSize: 17, fontWeight: 700, color: '#0f172a', marginBottom: 8 },
  featDesc: { fontSize: 14, color: '#64748b', lineHeight: 1.7, margin: 0 },
  stepsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 },
  stepCard: { padding: '1.5rem' },
  stepNum: { fontSize: 40, fontWeight: 800, color: '#cbd5e1', marginBottom: 12 },
  stepTitle: { fontSize: 17, fontWeight: 700, color: '#0f172a', marginBottom: 8 },
  stepDesc: { fontSize: 14, color: '#64748b', lineHeight: 1.7, margin: 0 },
  codeBox: { background: '#0f172a', borderRadius: 14, padding: '2rem', overflowX: 'auto' },
  code: { color: '#e2e8f0', fontSize: 13, fontFamily: 'monospace', margin: 0, lineHeight: 1.7 },
  cta: { background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', padding: '5rem 2rem', textAlign: 'center' },
  ctaInner: { maxWidth: 600, margin: '0 auto' },
  ctaTitle: { fontSize: 36, fontWeight: 800, color: '#fff', marginBottom: 16 },
  ctaSub: { fontSize: 16, color: 'rgba(255,255,255,0.85)', marginBottom: 32, lineHeight: 1.7 },
  footer: { background: '#0f172a', padding: '2rem' },
  footerInner: { maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
};
