import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import { useTheme } from '../context/ThemeContext';

const FEATURES = [
  { icon: '⬡', color: '#38bdf8', title: 'Bank Statement Analysis', desc: 'Upload PDF or CSV. Get income, spending patterns, cash flow, and repayment capacity in seconds.' },
  { icon: '⬡', color: '#a78bfa', title: 'Credit Bureau Access', desc: 'Full FirstCentral XScore, credit history, outstanding obligations, and delinquency records.' },
  { icon: '⬡', color: '#34d399', title: 'BVN & NIN Verification', desc: 'Verify against NIBSS and NIMC records instantly. Watchlist detection before disbursement.' },
  { icon: '⬡', color: '#fb923c', title: 'AI Credit Scoring', desc: 'Proprietary score with lending decision, suggested loan amount and repayment tenor.' },
  { icon: '⬡', color: '#f472b6', title: 'Webhook Notifications', desc: 'Real-time event pushes when analysis completes. No polling. Instant alerts.' },
  { icon: '⬡', color: '#fbbf24', title: 'Loan Eligibility Review', desc: 'All checks aggregated into a single AI verdict: ELIGIBLE / CONDITIONAL / NOT ELIGIBLE.' },
];

const STEPS = [
  { n: '01', title: 'Register', desc: 'Apply online. Vetted MFIs and lenders activated within 1–2 business days.' },
  { n: '02', title: 'Integrate', desc: 'Get your API key. Connect to your existing loan management system via REST.' },
  { n: '03', title: 'Lend smarter', desc: 'Verify identity, pull bureau data, analyse statements — before disbursing a naira.' },
];

export default function Landing() {
  const { dark, toggle } = useTheme();
  const s = makeStyles(dark);

  return (
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
        @keyframes pulse-dot { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.4; transform:scale(0.8); } }
        @keyframes tick { from { transform:translateX(0); } to { transform:translateX(-50%); } }
        @keyframes countUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .hero-badge  { animation: fadeUp 0.6s ease both; }
        .hero-title  { animation: fadeUp 0.7s 0.1s ease both; }
        .hero-sub    { animation: fadeUp 0.7s 0.2s ease both; }
        .hero-ctas   { animation: fadeUp 0.7s 0.3s ease both; }
        .hero-trust  { animation: fadeUp 0.7s 0.4s ease both; }
        .hero-card   { animation: fadeIn 0.9s 0.3s ease both; }
        .stat-item:nth-child(1) { animation: countUp 0.5s 0.1s ease both; }
        .stat-item:nth-child(2) { animation: countUp 0.5s 0.2s ease both; }
        .stat-item:nth-child(3) { animation: countUp 0.5s 0.3s ease both; }
        .stat-item:nth-child(4) { animation: countUp 0.5s 0.4s ease both; }
        .feat-card:hover { transform: translateY(-4px); box-shadow: 0 20px 40px ${dark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.12)'} !important; }
        .feat-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .nav-link:hover { color: ${dark ? '#fff' : '#0f172a'} !important; }
        .cta-primary:hover { background: #0284c7 !important; }
        .cta-ghost:hover { background: ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'} !important; border-color: ${dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'} !important; }
        .theme-toggle:hover { background: ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'} !important; }
        .ticker-track { display:flex; gap:64px; animation:tick 30s linear infinite; white-space:nowrap; }
        @media (max-width:768px) {
          .nav-links { display:none !important; }
          .nav-mobile-btn { display:flex !important; }
          .hero-grid { grid-template-columns:1fr !important; padding:3rem 1.25rem 2.5rem !important; }
          .hero-card-wrap { display:none !important; }
          .hero-title { font-size:36px !important; }
          .section-pad { padding:3rem 1.25rem !important; }
          .feat-grid { grid-template-columns:1fr !important; }
          .steps-grid { grid-template-columns:1fr !important; }
          .section-title { font-size:28px !important; }
          .cta-title { font-size:30px !important; }
          .stat-bar { flex-wrap:wrap !important; }
          .stat-item { flex:1 1 45% !important; border-right:none !important; border-bottom:1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} !important; }
          .free-pills { flex-direction:column !important; align-items:center !important; }
          .nav-inner { padding:0 1.25rem !important; }
        }
        @media (min-width:769px) { .nav-mobile-btn { display:none !important; } }
      `}</style>

      {/* Ticker */}
      <div style={s.ticker}>
        <div className="ticker-track">
          {[...Array(2)].map((_, i) => (
            <span key={i} style={{ display:'flex', gap:64, alignItems:'center' }}>
              {['BVN Verified ✓','Statement Analysed ✓','Credit Score: 81.2','NIN Matched ✓','Risk Grade: A','Loan Approved ✓','Bureau Pulled ✓','Not Watchlisted ✓'].map(t => (
                <span key={t} style={s.tickerItem}>{t}</span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* Nav */}
      <nav style={s.nav}>
        <div style={s.navInner} className="nav-inner">
          <div style={s.logo}>
            <div style={s.logoMark}>L</div>
            <span style={s.logoText}>Lucred <span style={s.logoDim}>Credit Engine</span></span>
          </div>
          <div style={s.navLinks} className="nav-links">
            <Link to="/docs"     style={s.navLink} className="nav-link">Docs</Link>
            <Link to="/pricing"  style={s.navLink} className="nav-link">Pricing</Link>
            <Link to="/support"  style={s.navLink} className="nav-link">Support</Link>
            <Link to="/login"    style={s.navLink} className="nav-link">Sign in</Link>
            <button onClick={toggle} style={s.themeToggle} className="theme-toggle" title="Toggle theme">
              {dark ? '☀️ Light' : '🌙 Dark'}
            </button>
            <Link to="/register" style={s.navBtn} className="cta-primary">Get API Access →</Link>
          </div>
          <div style={{ display:'none', alignItems:'center', gap:8 }} className="nav-mobile-btn">
            <button onClick={toggle} style={s.themeToggle} className="theme-toggle">{dark ? '☀️ Light' : '🌙 Dark'}</button>
            <Link to="/register" style={s.navBtn} className="cta-primary">Get Access →</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={s.heroSection}>
        <div style={s.heroBg} aria-hidden>
          <div style={s.gridOverlay} />
          <div style={s.glowBlue} />
          <div style={s.glowPurple} />
        </div>
        <div style={s.heroGrid} className="hero-grid">
          <div style={s.heroContent}>
            <div style={s.badge} className="hero-badge">
              <span style={s.badgeDot} />
              Built for Nigerian MFIs · CBN-aligned
            </div>
            <h1 style={s.heroTitle} className="hero-title">
              Credit intelligence<br />for <span style={s.heroAccent}>smarter</span><br />lending.
            </h1>
            <p style={s.heroSub} className="hero-sub">
              Verify identity, pull bureau data, analyse bank statements, and score creditworthiness — all before you disburse a naira.
            </p>
            <div style={s.heroCtas} className="hero-ctas">
              <Link to="/register" style={s.ctaPrimary} className="cta-primary">Get API Access →</Link>
              <Link to="/docs"     style={s.ctaGhost}   className="cta-ghost">Read the docs</Link>
            </div>
            <div style={s.trustRow} className="hero-trust">
              {['No card required','Vetted institutions only','3 free checks/month'].map(t => (
                <span key={t} style={s.trustChip}><span style={{ color:'#34d399', marginRight:5 }}>✓</span>{t}</span>
              ))}
            </div>
          </div>

          {/* Terminal card — always dark */}
          <div style={s.terminalWrap} className="hero-card-wrap">
            <div style={s.terminal} className="hero-card">
              <div style={s.termHead}>
                <div style={{ display:'flex', gap:6 }}>
                  {['#ef4444','#f59e0b','#22c55e'].map(c => <div key={c} style={{ width:11, height:11, borderRadius:'50%', background:c }} />)}
                </div>
                <span style={s.termTitle}>lucred — credit analysis</span>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={s.liveDot} />
                  <span style={{ fontSize:10, color:'#34d399', fontFamily:'DM Mono, monospace' }}>LIVE</span>
                </div>
              </div>
              <div style={s.termBody}>
                {[
                  { label:'BVN',       value:'223****890',   status:'VERIFIED', c:'#34d399' },
                  { label:'NIN',       value:'112****447',   status:'MATCHED',  c:'#34d399' },
                  { label:'WATCHLIST', value:'—',            status:'CLEAR',    c:'#34d399' },
                  { label:'BUREAU',    value:'FirstCentral', status:'PULLED',   c:'#38bdf8' },
                  { label:'XSCORE',    value:'81.2 / 100',  status:'GOOD',     c:'#a78bfa' },
                  { label:'STATEMENT', value:'Access · 6mo', status:'ANALYSED', c:'#38bdf8' },
                ].map((r, i) => (
                  <div key={r.label} style={{ ...s.termRow, animationDelay:`${0.4+i*0.1}s` }}>
                    <span style={s.termLabel}>{r.label}</span>
                    <span style={s.termVal}>{r.value}</span>
                    <span style={{ ...s.termStatus, color:r.c }}>{r.status}</span>
                  </div>
                ))}
                <div style={s.termDivider} />
                <div style={s.termResult}>
                  <div>
                    <div style={{ fontSize:10, color:'#64748b', marginBottom:4 }}>RECOMMENDATION</div>
                    <div style={{ fontSize:18, fontWeight:800, color:'#34d399', fontFamily:'DM Mono, monospace', letterSpacing:1 }}>APPROVE</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:10, color:'#64748b', marginBottom:4 }}>MAX LOAN</div>
                    <div style={{ fontSize:18, fontWeight:800, color:'#38bdf8', fontFamily:'DM Mono, monospace' }}>₦800,000</div>
                  </div>
                </div>
              </div>
            </div>
            <div style={s.ring1} /><div style={s.ring2} />
          </div>
        </div>
      </section>

      {/* Stat bar */}
      <div style={s.statBar} className="stat-bar">
        {[{ n:'< 3s', l:'Analysis time' },{ n:'4', l:'Checks in one call' },{ n:'99.9%', l:'API uptime SLA' },{ n:'CBN', l:'Compliance aligned' }].map(({ n, l }) => (
          <div key={l} style={s.statItem} className="stat-item">
            <div style={s.statNum}>{n}</div>
            <div style={s.statLabel}>{l}</div>
          </div>
        ))}
      </div>

      {/* Free tier */}
      <section style={s.freeSection} className="section-pad">
        <div style={s.inner}>
          <div style={s.freeCard}>
            <div style={{ position:'relative', zIndex:1 }}>
              <div style={s.greenBadge}>Free forever</div>
              <h2 style={s.freeTitle} className="section-title">3 free analyses every month</h2>
              <p style={s.freeSub}>No card required. No trial period. Real free tier — so you can evaluate before you commit.</p>
              <div style={{ display:'flex', gap:16, flexWrap:'wrap', justifyContent:'center', margin:'28px 0' }} className="free-pills">
                {[{ icon:'🪪', t:'3 BVN checks / mo' },{ icon:'📋', t:'3 NIN checks / mo' },{ icon:'📊', t:'3 statement analyses / mo' }].map(({ icon, t }) => (
                  <div key={t} style={s.freePill}>
                    <span style={{ fontSize:20 }}>{icon}</span>
                    <span style={{ fontSize:13, fontWeight:600, color: dark ? '#e2e8f0' : '#0f172a' }}>{t}</span>
                  </div>
                ))}
              </div>
              <p style={{ fontSize:13, color:'#64748b', marginBottom:28 }}>Need more? Top up your wallet or subscribe for volume discounts.</p>
              <Link to="/register" style={{ ...s.ctaPrimary, padding:'13px 36px', fontSize:15 }} className="cta-primary">Start free →</Link>
            </div>
            <div style={s.freeGlow} />
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={s.featSection} className="section-pad">
        <div style={s.inner}>
          <div style={s.eyebrow}>What you get</div>
          <h2 style={s.sectionTitle} className="section-title">Everything in one API key</h2>
          <p style={s.sectionSub}>Six credit checks. One dashboard. Zero extra tooling.</p>
          <div style={s.featGrid} className="feat-grid">
            {FEATURES.map((f, i) => (
              <div key={f.title} style={{ ...s.featCard, animationDelay:`${i*0.07}s` }} className="feat-card">
                <div style={{ ...s.featHex, color:f.color }}>{f.icon}</div>
                <h3 style={s.featTitle}>{f.title}</h3>
                <p style={s.featDesc}>{f.desc}</p>
                <div style={{ ...s.featAccent, background:f.color }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={s.stepsSection} className="section-pad">
        <div style={s.inner}>
          <div style={s.eyebrow}>How it works</div>
          <h2 style={s.sectionTitle} className="section-title">Up and running in minutes</h2>
          <div style={s.stepsGrid} className="steps-grid">
            {STEPS.map((step, i) => (
              <div key={step.n} style={s.stepCard}>
                <div style={s.stepNum}>{step.n}</div>
                <h3 style={s.stepTitle}>{step.title}</h3>
                <p style={s.stepDesc}>{step.desc}</p>
                {i < STEPS.length - 1 && <div style={s.stepLine} />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Code section */}
      <section style={s.codeSection} className="section-pad">
        <div style={s.inner}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:56, alignItems:'center' }} className="steps-grid">
            <div>
              <div style={s.eyebrow}>Simple integration</div>
              <h2 style={{ ...s.sectionTitle, marginBottom:16 }} className="section-title">One call.<br />Complete picture.</h2>
              <p style={{ fontSize:15, color: dark ? '#94a3b8' : '#475569', lineHeight:1.8, marginBottom:28 }}>
                Send a statement PDF or run a credit check. Get structured JSON with everything your credit team needs.
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:32 }}>
                {['REST API · structured JSON responses','Same rates on dashboard and API','Webhook delivery on completion','Full audit log per request'].map(item => (
                  <div key={item} style={{ display:'flex', alignItems:'center', gap:12, fontSize:14, color: dark ? '#cbd5e1' : '#334155' }}>
                    <span style={{ color:'#38bdf8', fontFamily:'DM Mono, monospace', fontSize:12 }}>→</span>{item}
                  </div>
                ))}
              </div>
              <Link to="/docs" style={{ ...s.ctaPrimary, display:'inline-block' }} className="cta-primary">View API docs →</Link>
            </div>
            {/* Code box — always dark */}
            <div style={s.codeBox}>
              <div style={s.codeHead}>
                <div style={{ display:'flex', gap:6 }}>
                  {['#ef4444','#f59e0b','#22c55e'].map(c => <div key={c} style={{ width:10, height:10, borderRadius:'50%', background:c }} />)}
                </div>
                <span style={{ fontSize:11, color:'#475569', fontFamily:'DM Mono, monospace' }}>statement · upload-analyze</span>
              </div>
              <pre style={s.code}>{`POST /v1/statement/upload-analyze\nX-Api-Key: lcrd_••••••••••••••\n\nbody:\n  statement  = statement.pdf\n  bankName   = "access"\n  email      = "borrower@example.com"\n\n─────────────────────────────────\n200 OK\n\n{\n  "recommendation":  "APPROVE",\n  "creditScore":      78.4,\n  "monthlyIncome":   450000,\n  "maxLoanAmount":   800000,\n  "riskGrade":       "B"\n}`}</pre>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={s.ctaSection} className="section-pad">
        <div style={s.ctaInner}>
          <div style={s.ctaGlowBlue} /><div style={s.ctaGlowPurple} />
          <div style={{ position:'relative', zIndex:1, textAlign:'center' }}>
            <div style={s.greenBadge}>Start today</div>
            <h2 style={s.ctaTitle} className="cta-title">Ready to lend with confidence?</h2>
            <p style={s.ctaSub}>Join MFIs already using Lucred Credit Engine to make faster, smarter lending decisions backed by data.</p>
            <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
              <Link to="/register" style={{ ...s.ctaPrimary, padding:'14px 36px', fontSize:15 }} className="cta-primary">Get API Access →</Link>
              <Link to="/pricing"  style={s.ctaGhost} className="cta-ghost">See pricing</Link>
            </div>
            <p style={{ marginTop:24, fontSize:12, color: dark ? '#334155' : '#64748b' }}>
              No card required · 3 free analyses/month · Vetted institutions only
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function makeStyles(dark) {
  const bg      = dark ? '#060d18' : '#f0f4f8';
  const card    = dark ? '#0b1120' : '#ffffff';
  const border  = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
  const text    = dark ? '#f8fafc'  : '#0f172a';
  const textSub = dark ? '#475569'  : '#475569';
  const navBg   = dark ? 'rgba(6,13,24,0.88)'   : 'rgba(240,244,248,0.92)';
  const navBorder = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.07)';

  return {
    page: { fontFamily:"'Sora', -apple-system, sans-serif", color: dark ? '#e2e8f0' : '#334155', background:bg, minHeight:'100vh' },

    ticker: { background: dark ? '#0b1120' : '#e2e8f0', borderBottom:`1px solid ${dark ? 'rgba(56,189,248,0.1)' : 'rgba(0,0,0,0.08)'}`, overflow:'hidden', height:32, display:'flex', alignItems:'center' },
    tickerItem: { fontSize:10, fontWeight:600, color: dark ? '#334155' : '#64748b', fontFamily:"'DM Mono', monospace", letterSpacing:1, textTransform:'uppercase' },

    nav: { position:'sticky', top:0, background:navBg, backdropFilter:'blur(16px)', borderBottom:`1px solid ${navBorder}`, zIndex:100 },
    navInner: { maxWidth:1160, margin:'0 auto', padding:'0 2rem', height:68, display:'flex', alignItems:'center', justifyContent:'space-between' },
    logo: { display:'flex', alignItems:'center', gap:10 },
    logoMark: { width:34, height:34, borderRadius:10, background:'linear-gradient(135deg, #0ea5e9, #7c3aed)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:800 },
    logoText: { fontSize:17, fontWeight:700, color: dark ? '#f1f5f9' : '#0f172a', letterSpacing:-0.3 },
    logoDim: { color: dark ? '#475569' : '#64748b', fontWeight:400 },
    navLinks: { display:'flex', gap:4, alignItems:'center' },
    navLink: { fontSize:13, color: dark ? '#64748b' : '#475569', textDecoration:'none', fontWeight:500, padding:'6px 14px', borderRadius:7, transition:'color 0.15s' },
    themeToggle: { fontSize:16, background:'transparent', border:`1px solid ${border}`, borderRadius:8, padding:'5px 10px', cursor:'pointer', transition:'background 0.15s', lineHeight:1 },
    navBtn: { fontSize:13, background:'#0ea5e9', color:'#fff', padding:'8px 20px', borderRadius:8, textDecoration:'none', fontWeight:700, transition:'background 0.15s' },

    heroSection: { position:'relative', overflow:'hidden', background:bg },
    heroBg: { position:'absolute', inset:0, pointerEvents:'none' },
    gridOverlay: { position:'absolute', inset:0, backgroundImage:`linear-gradient(${dark ? 'rgba(56,189,248,0.03)' : 'rgba(14,165,233,0.04)'} 1px, transparent 1px), linear-gradient(90deg, ${dark ? 'rgba(56,189,248,0.03)' : 'rgba(14,165,233,0.04)'} 1px, transparent 1px)`, backgroundSize:'48px 48px' },
    glowBlue: { position:'absolute', top:'-20%', right:'10%', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle, rgba(14,165,233,0.12) 0%, transparent 70%)', filter:'blur(40px)' },
    glowPurple: { position:'absolute', bottom:'-10%', left:'5%', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle, rgba(124,58,237,0.10) 0%, transparent 70%)', filter:'blur(40px)' },

    heroGrid: { position:'relative', zIndex:1, maxWidth:1160, margin:'0 auto', padding:'5.5rem 2rem 5rem', display:'grid', gridTemplateColumns:'1fr 460px', gap:64, alignItems:'center' },
    heroContent: {},
    badge: { display:'inline-flex', alignItems:'center', gap:8, fontSize:11, fontWeight:600, color:'#38bdf8', background:'rgba(56,189,248,0.08)', border:'1px solid rgba(56,189,248,0.15)', padding:'6px 14px', borderRadius:20, marginBottom:28, letterSpacing:0.5 },
    badgeDot: { width:6, height:6, borderRadius:'50%', background:'#34d399', display:'inline-block', animation:'pulse-dot 2s ease-in-out infinite' },
    heroTitle: { fontSize:58, fontWeight:800, color:text, lineHeight:1.08, margin:'0 0 22px', letterSpacing:-1.5 },
    heroAccent: { background:'linear-gradient(90deg, #38bdf8, #a78bfa)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' },
    heroSub: { fontSize:17, color:textSub, lineHeight:1.8, marginBottom:40, maxWidth:480 },
    heroCtas: { display:'flex', gap:12, flexWrap:'wrap', marginBottom:28 },
    ctaPrimary: { display:'inline-block', background:'#0ea5e9', color:'#fff', padding:'12px 26px', borderRadius:9, textDecoration:'none', fontWeight:700, fontSize:14, transition:'background 0.15s' },
    ctaGhost: { display:'inline-block', background:'transparent', color: dark ? '#94a3b8' : '#475569', padding:'12px 26px', borderRadius:9, textDecoration:'none', fontWeight:600, fontSize:14, border:`1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)'}`, transition:'background 0.15s, border-color 0.15s' },
    trustRow: { display:'flex', flexWrap:'wrap', gap:8 },
    trustChip: { fontSize:12, color: dark ? '#475569' : '#64748b', background: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)', border:`1px solid ${dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'}`, padding:'5px 12px', borderRadius:20 },

    // Terminal always dark
    terminalWrap: { position:'relative' },
    terminal: { background:'#0b1120', border:'1px solid rgba(56,189,248,0.15)', borderRadius:16, overflow:'hidden', boxShadow:'0 32px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)' },
    termHead: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.05)', background:'rgba(255,255,255,0.02)' },
    termTitle: { fontSize:11, color:'#334155', fontFamily:"'DM Mono', monospace" },
    liveDot: { width:7, height:7, borderRadius:'50%', background:'#34d399', display:'inline-block', animation:'pulse-dot 1.5s ease-in-out infinite' },
    termBody: { padding:'16px' },
    termRow: { display:'grid', gridTemplateColumns:'100px 1fr auto', gap:8, alignItems:'center', padding:'7px 0', borderBottom:'1px solid rgba(255,255,255,0.03)', animation:'fadeUp 0.4s ease both' },
    termLabel: { fontSize:10, color:'#334155', fontFamily:"'DM Mono', monospace", letterSpacing:1 },
    termVal: { fontSize:12, color:'#94a3b8', fontFamily:"'DM Mono', monospace" },
    termStatus: { fontSize:10, fontWeight:700, fontFamily:"'DM Mono', monospace", letterSpacing:1 },
    termDivider: { height:1, background:'rgba(56,189,248,0.1)', margin:'14px 0' },
    termResult: { display:'flex', justifyContent:'space-between', alignItems:'flex-end' },
    ring1: { position:'absolute', top:-20, right:-20, width:120, height:120, borderRadius:'50%', border:'1px solid rgba(56,189,248,0.08)', pointerEvents:'none' },
    ring2: { position:'absolute', top:-48, right:-48, width:176, height:176, borderRadius:'50%', border:'1px solid rgba(124,58,237,0.06)', pointerEvents:'none' },

    statBar: { background: dark ? '#0b1120' : '#ffffff', borderTop:`1px solid ${dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'}`, borderBottom:`1px solid ${dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'}`, display:'flex', justifyContent:'center' },
    statItem: { padding:'28px 52px', textAlign:'center', borderRight:`1px solid ${dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'}` },
    statNum: { fontSize:26, fontWeight:800, color:'#38bdf8', fontFamily:"'DM Mono', monospace", marginBottom:4 },
    statLabel: { fontSize:11, color: dark ? '#334155' : '#64748b', fontWeight:500, letterSpacing:0.5 },

    inner: { maxWidth:1160, margin:'0 auto' },
    eyebrow: { fontSize:10, fontWeight:700, color:'#0ea5e9', textTransform:'uppercase', letterSpacing:3, marginBottom:16 },
    sectionTitle: { fontSize:38, fontWeight:800, color:text, margin:'0 0 14px', lineHeight:1.15, letterSpacing:-0.8 },
    sectionSub: { fontSize:16, color:textSub, marginBottom:52, lineHeight:1.7 },

    freeSection: { padding:'5rem 2rem', background:bg },
    freeCard: { position:'relative', maxWidth:680, margin:'0 auto', textAlign:'center', background: dark ? 'linear-gradient(135deg, rgba(11,17,32,0.9), rgba(15,25,50,0.9))' : 'linear-gradient(135deg, #ffffff, #f0fdf8)', border:'1px solid rgba(52,211,153,0.2)', borderRadius:24, padding:'3.5rem 2.5rem', overflow:'hidden' },
    greenBadge: { display:'inline-block', fontSize:10, fontWeight:700, color:'#34d399', background:'rgba(52,211,153,0.1)', border:'1px solid rgba(52,211,153,0.2)', padding:'4px 14px', borderRadius:20, marginBottom:20, letterSpacing:2, textTransform:'uppercase' },
    freeTitle: { fontSize:34, fontWeight:800, color:text, margin:'0 0 14px', letterSpacing:-0.5 },
    freeSub: { fontSize:15, color:textSub, lineHeight:1.75, maxWidth:500, margin:'0 auto' },
    freePill: { display:'flex', alignItems:'center', gap:10, background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', border:`1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`, borderRadius:12, padding:'10px 18px' },
    freeGlow: { position:'absolute', bottom:-60, left:'50%', transform:'translateX(-50%)', width:300, height:200, borderRadius:'50%', background:'radial-gradient(circle, rgba(52,211,153,0.08) 0%, transparent 70%)', filter:'blur(20px)', pointerEvents:'none' },

    featSection: { padding:'5rem 2rem', background:bg },
    featGrid: { display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:16 },
    featCard: { position:'relative', background:card, border:`1px solid ${border}`, borderRadius:16, padding:'1.75rem', overflow:'hidden', boxShadow: dark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)' },
    featHex: { fontSize:28, marginBottom:16, display:'block' },
    featTitle: { fontSize:15, fontWeight:700, color:text, marginBottom:8, margin:'0 0 8px' },
    featDesc: { fontSize:13, color:textSub, lineHeight:1.7, margin:0 },
    featAccent: { position:'absolute', bottom:0, left:0, right:0, height:2, opacity:0.4 },

    stepsSection: { padding:'5rem 2rem', background: dark ? '#0b1120' : '#e8edf2' },
    stepsGrid: { display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:0 },
    stepCard: { position:'relative', padding:'2rem 2.5rem 2rem 0' },
    stepNum: { fontSize:52, fontWeight:900, color: dark ? 'rgba(56,189,248,0.12)' : 'rgba(14,165,233,0.15)', fontFamily:"'DM Mono', monospace", lineHeight:1, marginBottom:20, letterSpacing:-2 },
    stepTitle: { fontSize:18, fontWeight:700, color:text, marginBottom:10, margin:'0 0 10px' },
    stepDesc: { fontSize:14, color:textSub, lineHeight:1.75, margin:0 },
    stepLine: { position:'absolute', top:36, right:0, width:1, height:80, background:'linear-gradient(180deg, rgba(56,189,248,0.3), transparent)' },

    codeSection: { padding:'5rem 2rem', background:bg },
    // Code box always dark
    codeBox: { background:'#0b1120', borderRadius:16, overflow:'hidden', border:'1px solid rgba(255,255,255,0.06)' },
    codeHead: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 18px', borderBottom:'1px solid rgba(255,255,255,0.05)', background:'rgba(255,255,255,0.02)' },
    code: { color:'#94a3b8', fontSize:12, fontFamily:"'DM Mono', monospace", margin:0, lineHeight:1.9, padding:'1.5rem 1.25rem', overflowX:'auto', display:'block' },

    ctaSection: { position:'relative', padding:'7rem 2rem', background: dark ? '#060d18' : '#f0f4f8', overflow:'hidden' },
    ctaInner: { maxWidth:640, margin:'0 auto', position:'relative' },
    ctaGlowBlue: { position:'absolute', top:'50%', left:'30%', transform:'translate(-50%, -50%)', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle, rgba(14,165,233,0.1) 0%, transparent 65%)', filter:'blur(40px)', pointerEvents:'none' },
    ctaGlowPurple: { position:'absolute', top:'50%', right:'-10%', transform:'translateY(-50%)', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 65%)', filter:'blur(40px)', pointerEvents:'none' },
    ctaTitle: { fontSize:42, fontWeight:800, color:text, margin:'0 0 16px', letterSpacing:-0.8, lineHeight:1.15 },
    ctaSub: { fontSize:16, color:textSub, marginBottom:36, lineHeight:1.75 },
  };
}
