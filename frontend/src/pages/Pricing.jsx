import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import { useTheme } from '../context/ThemeContext';

const PLANS = [
  { name:'Free', planKey:'free', price:'₦0', period:'/month', description:'Get started instantly. No card required.', color:'#64748b', credits:null,
    features:['3 BVN checks/month','3 NIN checks/month','3 Statement analyses/month','Customer dashboard','PDF report exports','Webhook notifications','API key access'],
    notIncluded:['Credit bureau checks','Priority support','Dedicated account manager'], cta:'Get Started Free', href:'/register', highlight:false },
  { name:'Starter', planKey:'starter', price:'₦25,000', period:'/month', description:'For small MFIs getting started with regular verifications.', color:'#38bdf8', credits:'₦32,500', discount:'30%',
    features:['₦32,500 credits/month (+30%)','BVN & NIN verification','Credit bureau checks','Statement analysis','Customer dashboard','PDF report exports','Webhook notifications','API key access'],
    notIncluded:['Priority support','Dedicated account manager'], cta:'Contact Sales', href:'mailto:sales@lucred.co', highlight:false },
  { name:'Growth', planKey:'growth', price:'₦50,000', period:'/month', description:'For active lenders processing higher loan volumes.', color:'#a78bfa', credits:'₦70,000', discount:'40%',
    features:['₦70,000 credits/month (+40%)','BVN & NIN verification','Credit bureau checks','Statement analysis','Customer dashboard','PDF report exports','Webhook notifications','Multiple API keys','Priority email support'],
    notIncluded:['Dedicated account manager'], cta:'Contact Sales', href:'mailto:sales@lucred.co', highlight:true },
  { name:'Scale', planKey:'scale', price:'₦100,000', period:'/month', description:'For large MFIs and institutions with high-volume operations.', color:'#34d399', credits:'₦150,000', discount:'50%',
    features:['₦150,000 credits/month (+50%)','BVN & NIN verification','Credit bureau checks','Statement analysis','Customer dashboard','PDF report exports','Webhook notifications','Unlimited API keys','Priority email support','Dedicated account manager'],
    notIncluded:[], cta:'Contact Sales', href:'mailto:sales@lucred.co', highlight:false },
  { name:'Enterprise', planKey:'enterprise', price:'Custom', period:'', description:'Tailored pricing, SLAs, and dedicated support for large institutions.', color:'#fbbf24', credits:null,
    features:['Custom credit volume','Negotiated rates','Dedicated account manager','Custom SLA guarantee','Priority onboarding','Custom integrations','Quarterly billing available'],
    notIncluded:[], cta:'Contact Sales', href:'mailto:sales@lucred.co', highlight:false },
];

const RATES = [
  { service:'BVN Verification',    rate:'₦75',  note:'Per check' },
  { service:'NIN Verification',    rate:'₦100', note:'Per check' },
  { service:'Credit Bureau Check', rate:'₦700', note:'Per check' },
  { service:'Statement Analysis',  rate:'₦500', note:'Per upload' },
];

const MULTI_MONTH = [
  { months:'1 month',  bonus:'0%',  extra:'No loyalty bonus' },
  { months:'3 months', bonus:'+5%', extra:'Extra 5% on top of plan credits' },
  { months:'6 months', bonus:'+10%',extra:'Extra 10% on top of plan credits' },
  { months:'9 months', bonus:'+15%',extra:'Extra 15% on top of plan credits' },
  { months:'12 months',bonus:'+20%',extra:'Extra 20% on top of plan credits' },
];

const FAQS = [
  { q:'How does the wallet work?', a:"Every analysis deducts from your wallet. Top up your wallet via bank transfer and credits are added by our team. Subscribers get credits auto-loaded monthly at a discounted rate." },
  { q:'What happens when my wallet runs out?', a:"Analyses are blocked with a clear error until you top up. You'll receive an email and in-app alert when your balance drops below ₦1,000." },
  { q:'Do unused subscription credits roll over?', a:'No — credits are refreshed each month. However, if you cancel a subscription, remaining credits convert to wallet balance and never expire.' },
  { q:'Can I pay multiple months upfront?', a:'Yes — pay 3, 6, 9, or 12 months upfront and earn a loyalty bonus (5% per 3-month interval, up to +20% for 12 months). Credits for all months load immediately.' },
  { q:'Do API calls cost the same as dashboard checks?', a:'Yes — BVN, NIN, bureau and statement analysis cost the same rate whether called from the dashboard or via the API. One price list.' },
  { q:"Is there a free trial?", a:"The Free plan gives you 3 BVN checks, 3 NIN checks, and 3 statement analyses every month — no card required. It's a real monthly free tier, not a trial." },
];

export default function Pricing() {
  const { dark, toggle } = useTheme();
  const s = makeStyles(dark);

  return (
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        .plan-card:hover { transform: translateY(-2px); transition: transform 0.2s; }
        .nav-link-p:hover { color: ${dark ? '#e2e8f0' : '#0f172a'} !important; }
        .theme-toggle-p:hover { opacity: 0.7; }
        @media (max-width:900px) { .plans-grid { grid-template-columns: repeat(2,1fr) !important; } .rates-grid { grid-template-columns: repeat(2,1fr) !important; } }
        @media (max-width:600px) { .plans-grid { grid-template-columns:1fr !important; } .rates-grid { grid-template-columns:1fr 1fr !important; } .faq-grid { grid-template-columns:1fr !important; } .hero-ctas { flex-direction:column !important; align-items:stretch !important; } .lce-logo-txt { display:none !important; } .lce-signin { display:none !important; } .pricing-compare-row { flex-direction:column !important; gap:4px !important; padding:12px 16px !important; } }
      `}</style>

      {/* Nav */}
      <nav style={s.nav}>
        <div style={s.navInner}>
          <Link to="/" style={s.logo}>
            <div style={s.logoMark}>L</div>
            <span className="lce-logo-txt" style={{ color: dark ? '#f1f5f9' : '#0f172a', fontWeight: 700 }}>Lucred Credit Engine</span>
          </Link>
          <div style={{ display:'flex', gap:12, alignItems:'center' }}>
            <Link to="/login" className="nav-link-p lce-signin" style={s.navLink}>Sign in</Link>
            <button onClick={toggle} className="theme-toggle-p" style={s.themeToggle} title="Toggle theme">{dark ? '☀️ Light' : '🌙 Dark'}</button>
            <Link to="/register" style={s.navBtn}>Get Started Free</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={s.hero}>
        <div style={s.glowBlue} /><div style={s.glowPurple} />
        <div style={s.heroInner}>
          <div style={s.heroBadge}>Pricing</div>
          <h1 style={s.heroTitle}>Start free. Pay as you grow.</h1>
          <p style={s.heroSub}>
            Every account gets <strong style={{ color:'#34d399' }}>3 free analyses every month</strong> — no card required.
            Top up your wallet when you need more, or subscribe for discounted credits.
          </p>
          <div className="hero-ctas" style={{ display:'flex', gap:12, justifyContent:'center', marginTop:32, flexWrap:'wrap' }}>
            <Link to="/register" style={s.ctaBtnPrimary}>Create free account →</Link>
            <a href="#plans" style={s.ctaBtnGhost}>See all plans</a>
          </div>
        </div>
      </section>

      {/* Per-analysis rates */}
      <section style={{ padding:'3rem 2rem', background: dark ? '#060d18' : '#e8edf2', borderTop:`1px solid ${dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'}` }}>
        <div style={s.inner}>
          <div style={s.eyebrow}>Per-Analysis Rates</div>
          <h2 style={{ ...s.sectionTitle, textAlign:'center', marginBottom:8 }}>One price list. Everywhere.</h2>
          <p style={{ textAlign:'center', color:'#64748b', fontSize:14, marginBottom:32 }}>Same rate whether you call from the dashboard or the API.</p>
          <div className="rates-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, maxWidth:820, margin:'0 auto' }}>
            {RATES.map(({ service, rate, note }) => (
              <div key={service} className="plan-card" style={s.rateCard}>
                <div style={{ fontSize:11, color:'#64748b', marginBottom:10, textTransform:'uppercase', letterSpacing:1 }}>{service}</div>
                <div style={{ fontSize:30, fontWeight:800, color: dark ? '#f1f5f9' : '#0f172a', fontFamily:"'DM Mono', monospace" }}>{rate}</div>
                <div style={{ fontSize:11, color:'#475569', marginTop:6 }}>{note}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Plans */}
      <section style={s.plansSection} id="plans">
        <div style={s.inner}>
          <div style={s.eyebrow}>Subscription Plans</div>
          <h2 style={{ ...s.sectionTitle, textAlign:'center', marginBottom:8 }}>Subscribe for bigger credit bonuses</h2>
          <p style={{ textAlign:'center', color:'#64748b', fontSize:14, marginBottom:40 }}>Overage is charged at the full PAYG rate above.</p>
          <div className="plans-grid" style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:14 }}>
            {PLANS.map(plan => (
              <div key={plan.name} className="plan-card" style={{ ...s.planCard, ...(plan.highlight ? s.planCardHighlight : {}) }}>
                {plan.highlight && <div style={s.popularBadge}>Most Popular</div>}
                <div style={{ ...s.planName, color:plan.color }}>{plan.name}</div>
                <div style={s.planPrice}>{plan.price}<span style={s.planPeriod}>{plan.period}</span></div>
                {plan.credits && (
                  <div style={{ fontSize:11, fontWeight:700, color:'#34d399', background:'rgba(52,211,153,0.08)', border:'1px solid rgba(52,211,153,0.2)', padding:'3px 10px', borderRadius:8, marginBottom:10, display:'inline-block' }}>
                    {plan.credits} credits/mo
                  </div>
                )}
                <p style={s.planDesc}>{plan.description}</p>
                <div style={s.divider} />
                <div style={s.featureList}>
                  {plan.features.map(f => (
                    <div key={f} style={s.feature}><span style={s.check}>✓</span><span style={{ fontSize:12 }}>{f}</span></div>
                  ))}
                  {plan.notIncluded.map(f => (
                    <div key={f} style={{ ...s.feature, opacity:0.3 }}><span style={s.cross}>✕</span><span style={{ fontSize:12 }}>{f}</span></div>
                  ))}
                </div>
                <a href={plan.href} style={{ ...s.planBtn, ...(plan.highlight ? { background:'#7c3aed', color:'#fff' } : { background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', color: dark ? '#94a3b8' : '#64748b', border:`1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}` }) }}>
                  {plan.cta} →
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Multi-month loyalty */}
      <section style={{ padding:'4rem 2rem', borderTop:`1px solid ${dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'}` }}>
        <div style={s.inner}>
          <div style={s.eyebrow}>Loyalty Bonus</div>
          <h2 style={s.sectionTitle}>Pay upfront, earn more credits</h2>
          <p style={{ color:'#64748b', fontSize:14, marginBottom:28 }}>Pay multiple months upfront on any subscription plan and get a loyalty bonus on top of your plan discount.</p>
          <div style={s.compareTable}>
            <div style={s.compareHeader}>
              <div style={{ flex:1 }}>Commitment</div>
              <div style={{ flex:1, textAlign:'center' }}>Loyalty Bonus</div>
              <div style={{ flex:2 }}>What it means</div>
            </div>
            {MULTI_MONTH.map(({ months, bonus, extra }) => (
              <div key={months} className="pricing-compare-row" style={s.compareRow}>
                <div style={{ flex:1, fontWeight:600, fontSize:14, color: dark ? '#e2e8f0' : '#0f172a' }}>{months}</div>
                <div style={{ flex:1, textAlign:'center', fontWeight:700, color: bonus === '0%' ? '#475569' : '#34d399', fontSize:14, fontFamily:"'DM Mono', monospace" }}>{bonus}</div>
                <div style={{ flex:2, color:'#64748b', fontSize:13 }}>{extra}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize:13, color:'#475569', marginTop:14 }}>
            Example: Growth plan (₦50,000/mo × 12 months = ₦600,000) loads ₦70,000 × 12 × 1.20 = <strong style={{ color:'#34d399' }}>₦1,008,000 in credits</strong>
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding:'4rem 2rem', borderTop:`1px solid ${dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'}` }}>
        <div style={s.inner}>
          <div style={s.eyebrow}>FAQ</div>
          <h2 style={s.sectionTitle}>Frequently asked questions</h2>
          <div className="faq-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
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
      <section style={s.ctaSection}>
        <div style={s.ctaGlow} />
        <h2 style={s.ctaTitle}>Start with 3 free analyses every month</h2>
        <p style={s.ctaSub}>No card required. Top up your wallet when you need more.</p>
        <Link to="/register" style={s.ctaBtnPrimary}>Create free account →</Link>
      </section>

      <Footer />
    </div>
  );
}

function makeStyles(dark) {
  const bg     = dark ? '#060d18' : '#f0f4f8';
  const card   = dark ? '#0b1120' : '#ffffff';
  const border = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
  const text   = dark ? '#f1f5f9' : '#0f172a';
  const navBg  = dark ? 'rgba(6,13,24,0.88)' : 'rgba(240,244,248,0.92)';

  return {
    page:      { fontFamily:"'Sora', -apple-system, sans-serif", color: dark ? '#e2e8f0' : '#334155', background:bg, minHeight:'100vh' },
    nav:       { position:'sticky', top:0, background:navBg, backdropFilter:'blur(16px)', borderBottom:`1px solid ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.07)'}`, zIndex:100 },
    navInner:  { maxWidth:1200, margin:'0 auto', padding:'0 2rem', height:64, display:'flex', alignItems:'center', justifyContent:'space-between' },
    logo:      { fontSize:17, fontWeight:800, color: dark ? '#f1f5f9' : '#0f172a', textDecoration:'none', display:'flex', alignItems:'center', gap:10 },
    logoMark:  { width:28, height:28, borderRadius:7, background:'linear-gradient(135deg, #0ea5e9, #7c3aed)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:800, color:'#fff' },
    navLink:   { fontSize:14, color: dark ? '#64748b' : '#475569', textDecoration:'none', fontWeight:500 },
    themeToggle: { fontSize:16, background:'transparent', border:`1px solid ${border}`, borderRadius:8, padding:'5px 10px', cursor:'pointer', lineHeight:1 },
    navBtn:    { fontSize:13, background:'#0ea5e9', color:'#fff', padding:'8px 18px', borderRadius:8, textDecoration:'none', fontWeight:700 },

    hero:      { position:'relative', overflow:'hidden', padding:'6rem 2rem 5rem', textAlign:'center', borderBottom:`1px solid ${dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'}` },
    glowBlue:  { position:'absolute', top:-80, left:'30%', width:500, height:400, background:'radial-gradient(circle, rgba(14,165,233,0.12) 0%, transparent 70%)', pointerEvents:'none' },
    glowPurple:{ position:'absolute', top:-60, right:'20%', width:400, height:350, background:'radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)', pointerEvents:'none' },
    heroInner: { maxWidth:640, margin:'0 auto', position:'relative', zIndex:1 },
    heroBadge: { display:'inline-block', fontSize:10, fontWeight:700, color:'#0ea5e9', letterSpacing:3, textTransform:'uppercase', marginBottom:18 },
    heroTitle: { fontSize:46, fontWeight:800, color:text, margin:'0 0 18px', letterSpacing:-1 },
    heroSub:   { fontSize:16, color: dark ? '#94a3b8' : '#475569', lineHeight:1.75, margin:0 },
    ctaBtnPrimary: { display:'inline-block', background:'#0ea5e9', color:'#fff', padding:'13px 28px', borderRadius:9, textDecoration:'none', fontWeight:700, fontSize:15 },
    ctaBtnGhost:   { display:'inline-block', background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', color: dark ? '#94a3b8' : '#475569', padding:'13px 28px', borderRadius:9, textDecoration:'none', fontWeight:600, fontSize:15, border:`1px solid ${border}` },

    inner:       { maxWidth:1200, margin:'0 auto' },
    eyebrow:     { fontSize:10, fontWeight:700, color:'#0ea5e9', letterSpacing:3, textTransform:'uppercase', marginBottom:12, textAlign:'center' },
    sectionTitle:{ fontSize:30, fontWeight:800, color:text, marginBottom:24, letterSpacing:-0.5 },
    rateCard:    { background:card, border:`1px solid ${border}`, borderRadius:14, padding:'1.5rem', textAlign:'center', boxShadow: dark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)' },
    plansSection:{ padding:'4rem 2rem', background:bg, borderTop:`1px solid ${dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'}` },
    planCard:    { background:card, border:`1px solid ${border}`, borderRadius:14, padding:'1.25rem', position:'relative', display:'flex', flexDirection:'column', transition:'transform 0.2s', boxShadow: dark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)' },
    planCardHighlight: { border:'2px solid rgba(124,58,237,0.6)', boxShadow:'0 0 30px rgba(124,58,237,0.12)' },
    popularBadge:{ position:'absolute', top:-13, left:'50%', transform:'translateX(-50%)', background:'#7c3aed', color:'#fff', fontSize:10, fontWeight:700, padding:'4px 14px', borderRadius:20, whiteSpace:'nowrap', letterSpacing:0.5 },
    planName:    { fontSize:14, fontWeight:800, marginBottom:6, textTransform:'uppercase', letterSpacing:1 },
    planPrice:   { fontSize:26, fontWeight:800, color:text, marginBottom:6, fontFamily:"'DM Mono', monospace" },
    planPeriod:  { fontSize:13, fontWeight:500, color:'#475569', fontFamily:"'Sora', sans-serif" },
    planDesc:    { fontSize:12, color:'#64748b', marginBottom:12, lineHeight:1.6 },
    divider:     { height:1, background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)', margin:'12px 0' },
    featureList: { flex:1, display:'flex', flexDirection:'column', gap:7, marginBottom:18 },
    feature:     { display:'flex', alignItems:'flex-start', gap:7, color: dark ? '#94a3b8' : '#475569' },
    check:       { color:'#34d399', fontWeight:700, fontSize:12, minWidth:12, marginTop:1 },
    cross:       { color: dark ? '#334155' : '#94a3b8', fontWeight:700, fontSize:12, minWidth:12, marginTop:1 },
    planBtn:     { display:'block', textAlign:'center', padding:'10px', borderRadius:8, fontWeight:700, fontSize:13, textDecoration:'none', marginTop:'auto' },

    compareTable:  { border:`1px solid ${border}`, borderRadius:12, overflow:'hidden' },
    compareHeader: { display:'flex', padding:'12px 20px', background: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderBottom:`1px solid ${border}`, fontSize:11, fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:0.5 },
    compareRow:    { display:'flex', padding:'12px 20px', borderBottom:`1px solid ${dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`, alignItems:'center' },
    faqCard:       { background:card, border:`1px solid ${border}`, borderRadius:12, padding:'1.25rem 1.5rem', boxShadow: dark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)' },
    faqQ:          { fontSize:14, fontWeight:700, color:text, marginBottom:8 },
    faqA:          { fontSize:13, color:'#64748b', lineHeight:1.75 },

    ctaSection: { position:'relative', overflow:'hidden', background: dark ? '#0b1120' : '#e8edf2', padding:'5rem 2rem', textAlign:'center', borderTop:`1px solid ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'}` },
    ctaGlow:    { position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:600, height:300, background:'radial-gradient(circle, rgba(14,165,233,0.1) 0%, transparent 70%)', pointerEvents:'none' },
    ctaTitle:   { fontSize:32, fontWeight:800, color:text, marginBottom:12, position:'relative', zIndex:1 },
    ctaSub:     { fontSize:15, color:'#64748b', marginBottom:32, position:'relative', zIndex:1 },
  };
}
