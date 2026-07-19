import { useState } from 'react';
import Footer from '../components/Footer';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const FAQS = [
  {
    category: 'Getting Started',
    items: [
      {
        q: 'How do I get API access?',
        a: 'Register an account at lucred.co/register with your business email. Once registered, go to Dashboard → API Keys to generate your first API key. Your key is displayed only once — copy it immediately and store it securely.',
      },
      {
        q: 'What information do I need to register?',
        a: 'You need a valid business email address, a password, and your organisation name. We may request additional KYC documentation for high-volume plans. A licensed lending operation is required to access production endpoints.',
      },
      {
        q: 'Is there a sandbox / test environment?',
        a: 'Contact us at support@lucred.co to request sandbox credentials. Sandbox calls return realistic mock data and do not consume your monthly quota or hit live government databases.',
      },
      {
        q: 'Where do I find my API key?',
        a: 'Go to Dashboard → API Keys. You can generate a new key at any time. For security reasons, the full key is only shown at the moment of creation — copy it then. If you lose it, generate a new one and update your integration.',
      },
    ],
  },
  {
    category: 'BVN & NIN Verification',
    items: [
      {
        q: 'What data is returned from a BVN verification?',
        a: 'BVN verification returns: full name (first, middle, last), date of birth, gender, phone number, email, enrollment bank and branch, registration date, NIN linkage, account level, and watchlist status. A biometric face image is also returned and stored for analyst review.',
      },
      {
        q: 'What data is returned from a NIN verification?',
        a: 'NIN verification returns: full name, date of birth, gender, phone number, email, residential address, state of origin, LGA, nationality, religion, marital status, and watchlist status. A biometric photo is also returned.',
      },
      {
        q: 'What does "Watch Listed: true" mean?',
        a: 'A watchlisted status means the individual appears on a government watch or restriction list via NIBSS or NIMC records. The Lucred Credit Engine Loan Review will automatically flag this as a disqualifier. You should not proceed with lending to watchlisted individuals without further due diligence.',
      },
      {
        q: 'How current is the BVN/NIN data?',
        a: 'Verification results reflect data currently held in the NIBSS and NIMC databases respectively, retrieved in real time at the moment of the API call. The results are then cached in your account for the retention period (90 days) to avoid repeat charges for the same individual.',
      },
    ],
  },
  {
    category: 'Credit Bureau',
    items: [
      {
        q: 'Which credit bureau does Lucred Credit Engine use?',
        a: 'Lucred Credit Engine integrates with FirstCentral Credit Bureau, which provides the XScore and full credit history including credit account details, delinquency records, and account summaries.',
      },
      {
        q: 'What is the FirstCentral XScore?',
        a: 'The XScore is a numerical credit score computed by FirstCentral based on repayment history, amount owed, credit types, and length of credit history. A score above 650 is generally considered good. The Loan Review tab uses this score as one of its eligibility criteria.',
      },
      {
        q: 'What if no bureau record is found?',
        a: 'A 404 response means the individual has no credit history on file with FirstCentral. This is common for first-time borrowers. The Loan Review treats this as a cautionary signal but not a disqualifier — income and identity data can still support a lending decision.',
      },
      {
        q: 'How long are bureau results stored?',
        a: 'Bureau results are retained for 180 days from the date of the check. They are then automatically deleted by our TTL system. You can manually delete a record earlier from the customer\'s profile.',
      },
    ],
  },
  {
    category: 'Bank Statement Analysis',
    items: [
      {
        q: 'Which banks and file formats are supported?',
        a: 'We support bank statements from Moniepoint, Kuda, VBank, UBA, Optimus, Parallex, GTB, OPay, Fidelity, Sterling, Access, FCMB, and First Bank. Accepted formats are PDF, XLSX, XLS, CSV, and DOCX. Maximum file size is 10MB.',
      },
      {
        q: 'What does the statement analysis return?',
        a: 'The analysis returns: overall risk grade (A–E), income metrics (monthly average, salary vs gig earner, income stability), spending patterns by category, debt-to-income ratio, account sweep analysis, weekly and monthly transaction summaries, behavioural insights, and transaction range breakdowns.',
      },
      {
        q: 'What is an account sweep?',
        a: 'An account sweep is detected when money credited to the account is debited out in full (or near-full) within a short time window. This often indicates the account is being used as a pass-through for a third party, or that the borrower has undisclosed obligations that divert income before it can be used for loan repayment.',
      },
      {
        q: 'Are raw transaction records stored?',
        a: 'No. Raw transaction data is processed in memory by the analysis engine and is never written to the database. Only the derived metrics (scores, aggregates, category breakdowns) are stored.',
      },
      {
        q: 'My statement upload failed. What should I do?',
        a: 'Ensure the file is under 10MB and in a supported format. If the statement is password-protected, enter the password in the "Statement Password" field before uploading. If the bank is not in our supported list, contact support@lucred.co — we add new banks regularly.',
      },
    ],
  },
  {
    category: 'Loan Review',
    items: [
      {
        q: 'How is the Loan Review verdict calculated?',
        a: 'The Loan Review scores six categories: Identity Integrity, Credit History, Income & Cash Flow, Debt Servicing, Risk Profile, and Behavioural Analysis. Each is scored 0–100 and given a PASS/WARN/FAIL status. The average score and number of failing categories determine the final verdict: Eligible, Conditional, or Not Eligible.',
      },
      {
        q: 'What does "Conditional" mean?',
        a: '"Conditional" means the borrower passes most criteria but one or more conditions must be satisfied before disbursement — for example, completing NIN verification or reducing the loan amount to improve DTI. The specific conditions are listed in the review output.',
      },
      {
        q: 'Can I override the Loan Review verdict?',
        a: 'Yes. The Loan Review is an algorithmic decision-support tool — not a final determination. It is designed to assist your credit officers, not replace them. Your lending policy and the judgement of your credit team should always be the final authority.',
      },
      {
        q: 'What DTI threshold does the system use?',
        a: 'The system uses a 40% DTI comfort zone and a 60% hard ceiling. A post-loan DTI below 40% is PASS; 40–60% is WARN with a condition to consider reducing the loan; above 60% is FAIL. These thresholds align with general CBN consumer lending guidelines.',
      },
    ],
  },
  {
    category: 'Data, Privacy & Security',
    items: [
      {
        q: 'How long is borrower data stored?',
        a: 'BVN and NIN results: 90 days. Bureau results: 180 days. Statement analysis results: 1 year. After these periods, records are automatically purged. You can also manually delete individual records or request full account deletion from Dashboard → Privacy & Data.',
      },
      {
        q: 'Can I delete a customer\'s data?',
        a: 'Yes. Go to Dashboard → Customers, open the customer profile, and use the Delete option. This immediately deletes the customer record and all associated BVN, NIN, bureau, and statement records. For account-wide deletion, go to Dashboard → Privacy & Data → Delete Account.',
      },
      {
        q: 'How do I export all my data?',
        a: 'Go to Dashboard → Privacy & Data → Export All Data. This downloads a JSON file containing all customers, verification results, bureau checks, and statement analyses associated with your account. This fulfils the NDPR data portability right.',
      },
      {
        q: 'Is Lucred Credit Engine NDPR compliant?',
        a: 'Yes. Lucred Credit Engine is designed to comply with the Nigeria Data Protection Regulation (NDPR) 2019 and the Nigeria Data Protection Act (NDPA) 2023. We implement data minimisation, TTL-based auto-deletion, right-to-erasure tooling, and maintain a Data Protection Officer. See our Privacy Policy for full details.',
      },
    ],
  },
];

export default function Support() {
  const [openItem, setOpenItem] = useState(null);
  const [activeCategory, setActiveCategory] = useState('Getting Started');
  const { dark, toggle } = useTheme();
  const s = makeStyles(dark);

  const current = FAQS.find(f => f.category === activeCategory);

  return (
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        .q-card:hover { border-color: rgba(14,165,233,0.25) !important; }
        .nav-lk:hover { color: ${dark ? '#e2e8f0' : '#0f172a'} !important; }
        .theme-toggle-legal:hover { opacity: 0.7; }
        @media (max-width: 700px) {
          .quick-cards { grid-template-columns: 1fr 1fr !important; }
          .tabs-row { gap: 6px !important; }
          .tab-btn { font-size: 11px !important; padding: 5px 10px !important; }
        }
        @media (max-width: 480px) {
          .quick-cards { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 600px) {
          .lce-logo-txt { display: none !important; }
          .lce-nav-links { display: none !important; }
        }
      `}</style>

      <nav style={s.nav}>
        <div style={s.navInner}>
          <Link to="/" style={s.logo}>
            <div style={s.logoMark}>L</div>
            <span className="lce-logo-txt">Lucred Credit Engine</span>
          </Link>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div className="lce-nav-links" style={{ display: 'flex', gap: 24 }}>
              <Link to="/pricing" className="nav-lk" style={s.navLink}>Pricing</Link>
              <Link to="/privacy-policy" className="nav-lk" style={s.navLink}>Privacy</Link>
              <Link to="/login" className="nav-lk" style={s.navLink}>Sign In</Link>
            </div>
            <button onClick={toggle} className="theme-toggle-legal" style={s.themeToggle} title="Toggle theme">{dark ? '☀️ Light' : '🌙 Dark'}</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div style={s.hero}>
        <div style={s.glowBlue} />
        <div style={s.heroInner}>
          <div style={s.eyebrow}>Help & Support</div>
          <h1 style={s.h1}>Find answers. Get help fast.</h1>
          <p style={s.lead}>Browse our knowledge base or reach our team directly.</p>
        </div>
      </div>

      {/* Quick contact cards */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2.5rem 2rem' }}>
        <div className="quick-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {[
            { icon: '✉', title: 'Email Support', sub: 'support@lucred.co', note: 'Response within 24 hrs', href: 'mailto:support@lucred.co' },
            { icon: '🔒', title: 'Data Protection', sub: 'dpo@lucred.co', note: 'NDPR & privacy requests', href: 'mailto:dpo@lucred.co' },
            { icon: '🛡', title: 'Security', sub: 'security@lucred.co', note: 'Vulnerability reports', href: 'mailto:security@lucred.co' },
            { icon: '⚖', title: 'Legal', sub: 'legal@lucred.co', note: 'Contracts & compliance', href: 'mailto:legal@lucred.co' },
          ].map(({ icon, title, sub, note, href }) => (
            <a key={title} href={href} className="q-card" style={s.qCard}>
              <div style={s.qCardIcon}>{icon}</div>
              <div style={s.qCardTitle}>{title}</div>
              <div style={s.qCardSub}>{sub}</div>
              <div style={s.qCardNote}>{note}</div>
            </a>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div style={s.faqSection} id="faq">
        <div style={s.faqInner}>
          <div style={s.eyebrow}>FAQ</div>
          <h2 style={s.faqTitle}>Frequently Asked Questions</h2>

          {/* Category tabs */}
          <div className="tabs-row" style={s.tabs}>
            {FAQS.map(({ category }) => (
              <button
                key={category}
                className="tab-btn"
                style={{ ...s.tab, ...(activeCategory === category ? s.tabActive : {}) }}
                onClick={() => { setActiveCategory(category); setOpenItem(null); }}
              >
                {category}
              </button>
            ))}
          </div>

          {/* FAQ items */}
          <div style={s.faqList}>
            {current?.items.map((item, i) => {
              const key = `${activeCategory}-${i}`;
              const isOpen = openItem === key;
              return (
                <div key={key} style={{ ...s.faqItem, ...(isOpen ? { borderColor: 'rgba(14,165,233,0.2)' } : {}) }}>
                  <button style={s.faqQ} onClick={() => setOpenItem(isOpen ? null : key)}>
                    <span style={{ color: isOpen ? '#38bdf8' : (dark ? '#e2e8f0' : '#0f172a') }}>{item.q}</span>
                    <span style={{ fontSize: 18, color: isOpen ? '#0ea5e9' : '#475569', flexShrink: 0 }}>{isOpen ? '−' : '+'}</span>
                  </button>
                  {isOpen && <div style={s.faqA}>{item.a}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Status section */}
      <div style={s.statusSection} id="status">
        <div style={s.statusInner}>
          <div style={s.eyebrow}>Platform Status</div>
          <h2 style={s.statusTitle}>All Systems Operational</h2>
          <p style={s.statusSub}>Current operational status of Lucred Credit Engine services</p>
          <div style={s.statusGrid}>
            {[
              ['API Gateway', 'Operational'],
              ['BVN Verification (Dojah)', 'Operational'],
              ['NIN Verification (Dojah)', 'Operational'],
              ['Credit Bureau (FirstCentral)', 'Operational'],
              ['Statement Analysis Engine', 'Operational'],
              ['Dashboard', 'Operational'],
            ].map(([service, status]) => (
              <div key={service} style={s.statusRow}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d399', flexShrink: 0, boxShadow: '0 0 6px rgba(52,211,153,0.5)' }} />
                  <span style={s.statusService}>{service}</span>
                </div>
                <span style={s.statusBadge}>{status}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: '#475569', marginTop: 14, textAlign: 'center' }}>
            For real-time incident updates, email support@lucred.co
          </p>
        </div>
      </div>

      {/* Contact CTA */}
      <div style={s.contactSection} id="contact">
        <div style={s.contactGlow} />
        <div style={s.contactInner}>
          <h2 style={s.contactTitle}>Still need help?</h2>
          <p style={s.contactSub}>
            Our support team is available Monday – Friday, 9 AM – 6 PM WAT. We aim to respond to all
            enquiries within one business day.
          </p>
          <a href="mailto:support@lucred.co" style={s.contactBtn}>Email Us →</a>
          <div style={{ marginTop: 18, fontSize: 13, color: '#475569' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#38bdf8', textDecoration: 'none' }}>Sign in to your dashboard</Link>
            {' '}to access live chat support.
          </div>
        </div>
      </div>

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
    page:          { fontFamily: "'Sora', -apple-system, sans-serif", color: dark ? '#e2e8f0' : '#334155', background: bg, minHeight: '100vh' },
    nav:           { background: navBg, backdropFilter: 'blur(16px)', borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.07)'}`, position: 'sticky', top: 0, zIndex: 100 },
    navInner:      { maxWidth: 1100, margin: '0 auto', padding: '0 2rem', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    logo:          { fontSize: 17, fontWeight: 800, color: text, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 },
    logoMark:      { width: 28, height: 28, borderRadius: 7, background: 'linear-gradient(135deg, #0ea5e9, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff' },
    navLink:       { fontSize: 13, color: '#64748b', textDecoration: 'none', fontWeight: 500 },
    themeToggle: { fontSize: 13, fontWeight: 600, fontFamily: "'Sora', sans-serif", background: dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.07)', border: `1.5px solid ${dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'}`, borderRadius: 20, padding: '7px 16px', cursor: 'pointer', color: dark ? '#e2e8f0' : '#334155', lineHeight: 1 },
    hero:          { position: 'relative', overflow: 'hidden', background: bg, padding: '5rem 2rem 4rem', textAlign: 'center', borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'}` },
    glowBlue:      { position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)', width: 600, height: 300, background: 'radial-gradient(circle, rgba(14,165,233,0.1) 0%, transparent 70%)', pointerEvents: 'none' },
    heroInner:     { maxWidth: 600, margin: '0 auto', position: 'relative', zIndex: 1 },
    eyebrow:       { fontSize: 10, fontWeight: 700, color: '#0ea5e9', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 14 },
    h1:            { fontSize: 38, fontWeight: 800, color: text, margin: '0 0 14px', letterSpacing: -0.8 },
    lead:          { fontSize: 16, color: '#64748b', margin: 0 },
    qCard:         { background: card, border: `1px solid ${border}`, borderRadius: 14, padding: '1.5rem', textDecoration: 'none', color: 'inherit', textAlign: 'center', transition: 'border-color 0.15s', boxShadow: dark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)' },
    qCardIcon:     { fontSize: 26, marginBottom: 10 },
    qCardTitle:    { fontSize: 14, fontWeight: 700, color: dark ? '#e2e8f0' : '#0f172a', marginBottom: 4 },
    qCardSub:      { fontSize: 13, color: '#0ea5e9', fontWeight: 600, marginBottom: 4 },
    qCardNote:     { fontSize: 11, color: '#475569' },
    faqSection:    { background: bg, padding: '3rem 2rem', borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'}` },
    faqInner:      { maxWidth: 860, margin: '0 auto' },
    faqTitle:      { fontSize: 28, fontWeight: 800, color: text, marginBottom: 28, textAlign: 'center', letterSpacing: -0.5 },
    tabs:          { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28, justifyContent: 'center' },
    tab:           { fontSize: 12, fontWeight: 600, padding: '7px 16px', borderRadius: 20, border: `1px solid ${border}`, background: 'transparent', color: '#64748b', cursor: 'pointer', fontFamily: "'Sora', sans-serif" },
    tabActive:     { background: '#0ea5e9', color: '#fff', border: '1px solid #0ea5e9' },
    faqList:       { display: 'flex', flexDirection: 'column', gap: 8 },
    faqItem:       { border: `1px solid ${border}`, borderRadius: 10, overflow: 'hidden', background: card, transition: 'border-color 0.15s', boxShadow: dark ? 'none' : '0 1px 4px rgba(0,0,0,0.05)' },
    faqQ:          { width: '100%', background: 'none', border: 'none', padding: '16px 20px', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, fontSize: 14, fontWeight: 600, color: dark ? '#e2e8f0' : '#0f172a', fontFamily: "'Sora', sans-serif" },
    faqA:          { padding: '0 20px 16px', fontSize: 14, color: '#64748b', lineHeight: 1.8, borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}` },
    statusSection: { padding: '3rem 2rem', background: bg, borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'}` },
    statusInner:   { maxWidth: 600, margin: '0 auto' },
    statusTitle:   { fontSize: 22, fontWeight: 800, color: text, textAlign: 'center', marginBottom: 6 },
    statusSub:     { fontSize: 13, color: '#64748b', textAlign: 'center', marginBottom: 24 },
    statusGrid:    { background: card, border: `1px solid ${border}`, borderRadius: 12, overflow: 'hidden', boxShadow: dark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)' },
    statusRow:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 20px', borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}` },
    statusService: { fontSize: 13, color: dark ? '#94a3b8' : '#475569', fontWeight: 500 },
    statusBadge:   { fontSize: 11, fontWeight: 700, color: '#34d399', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', padding: '3px 10px', borderRadius: 20 },
    contactSection:{ position: 'relative', overflow: 'hidden', background: dark ? '#0b1120' : '#e8edf2', padding: '5rem 2rem', textAlign: 'center', borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'}` },
    contactGlow:   { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 500, height: 250, background: 'radial-gradient(circle, rgba(14,165,233,0.08) 0%, transparent 70%)', pointerEvents: 'none' },
    contactInner:  { maxWidth: 520, margin: '0 auto', position: 'relative', zIndex: 1 },
    contactTitle:  { fontSize: 28, fontWeight: 800, color: text, marginBottom: 12 },
    contactSub:    { fontSize: 14, color: '#64748b', lineHeight: 1.7, marginBottom: 28 },
    contactBtn:    { display: 'inline-block', background: '#0ea5e9', color: '#fff', padding: '13px 28px', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 15 },
  };
}
