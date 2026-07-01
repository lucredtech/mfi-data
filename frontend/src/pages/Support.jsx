import { useState } from 'react';
import Footer from '../components/Footer';
import { Link } from 'react-router-dom';

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

  const current = FAQS.find(f => f.category === activeCategory);

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <div style={s.navInner}>
          <Link to="/" style={s.logo}>Lucred Credit Engine</Link>
          <div style={{ display: 'flex', gap: 24 }}>
            <Link to="/pricing" style={s.navLink}>Pricing</Link>
            <Link to="/privacy-policy" style={s.navLink}>Privacy</Link>
            <Link to="/login" style={s.navLink}>Sign In</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div style={s.hero}>
        <div style={s.heroInner}>
          <h1 style={s.h1}>Help & Support</h1>
          <p style={s.lead}>Find answers to common questions or reach our team directly.</p>
        </div>
      </div>

      {/* Quick contact cards */}
      <div style={s.quickCards}>
        <a href="mailto:support@lucred.co" style={s.qCard}>
          <div style={s.qCardIcon}>✉</div>
          <div style={s.qCardTitle}>Email Support</div>
          <div style={s.qCardSub}>support@lucred.co</div>
          <div style={s.qCardNote}>Response within 24 hrs</div>
        </a>
        <a href="mailto:dpo@lucred.co" style={s.qCard}>
          <div style={s.qCardIcon}>🔒</div>
          <div style={s.qCardTitle}>Data Protection</div>
          <div style={s.qCardSub}>dpo@lucred.co</div>
          <div style={s.qCardNote}>NDPR & privacy requests</div>
        </a>
        <a href="mailto:security@lucred.co" style={s.qCard}>
          <div style={s.qCardIcon}>🛡</div>
          <div style={s.qCardTitle}>Security</div>
          <div style={s.qCardSub}>security@lucred.co</div>
          <div style={s.qCardNote}>Vulnerability reports</div>
        </a>
        <a href="mailto:legal@lucred.co" style={s.qCard}>
          <div style={s.qCardIcon}>⚖</div>
          <div style={s.qCardTitle}>Legal</div>
          <div style={s.qCardSub}>legal@lucred.co</div>
          <div style={s.qCardNote}>Contracts & compliance</div>
        </a>
      </div>

      {/* FAQ */}
      <div style={s.faqSection} id="faq">
        <div style={s.faqInner}>
          <h2 style={s.faqTitle}>Frequently Asked Questions</h2>

          {/* Category tabs */}
          <div style={s.tabs}>
            {FAQS.map(({ category }) => (
              <button
                key={category}
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
                <div key={key} style={s.faqItem}>
                  <button style={s.faqQ} onClick={() => setOpenItem(isOpen ? null : key)}>
                    <span>{item.q}</span>
                    <span style={{ fontSize: 18, color: '#94a3b8', flexShrink: 0 }}>{isOpen ? '−' : '+'}</span>
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
          <h2 style={s.statusTitle}>Platform Status</h2>
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
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', flexShrink: 0 }} />
                  <span style={s.statusService}>{service}</span>
                </div>
                <span style={s.statusBadge}>{status}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 12, textAlign: 'center' }}>
            For real-time incident updates, email support@lucred.co
          </p>
        </div>
      </div>

      {/* Contact form CTA */}
      <div style={s.contactSection} id="contact">
        <div style={s.contactInner}>
          <h2 style={s.contactTitle}>Still need help?</h2>
          <p style={s.contactSub}>
            Our support team is available Monday – Friday, 9 AM – 6 PM WAT. We aim to respond to all
            enquiries within one business day.
          </p>
          <a href="mailto:support@lucred.co" style={s.contactBtn}>Email Us →</a>
          <div style={{ marginTop: 16, fontSize: 13, color: '#94a3b8' }}>
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

const s = {
  page: { fontFamily: 'Inter, sans-serif', color: '#0f172a', background: '#f8fafc', minHeight: '100vh' },
  nav: { background: '#fff', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 100 },
  navInner: { maxWidth: 1100, margin: '0 auto', padding: '0 2rem', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  logo: { fontSize: 20, fontWeight: 800, color: '#0f172a', textDecoration: 'none' },
  navLink: { fontSize: 13, color: '#64748b', textDecoration: 'none', fontWeight: 500 },
  hero: { background: 'linear-gradient(135deg, #0f172a, #1e3a5f)', padding: '4rem 2rem', textAlign: 'center' },
  heroInner: { maxWidth: 600, margin: '0 auto' },
  h1: { fontSize: 36, fontWeight: 800, color: '#fff', margin: '0 0 12px' },
  lead: { fontSize: 16, color: '#94a3b8', margin: 0 },
  quickCards: { maxWidth: 1100, margin: '0 auto', padding: '2.5rem 2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 },
  qCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '1.5rem', textDecoration: 'none', color: 'inherit', textAlign: 'center', transition: 'box-shadow 0.15s' },
  qCardIcon: { fontSize: 28, marginBottom: 10 },
  qCardTitle: { fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 4 },
  qCardSub: { fontSize: 13, color: '#0ea5e9', fontWeight: 600, marginBottom: 4 },
  qCardNote: { fontSize: 12, color: '#94a3b8' },
  faqSection: { background: '#fff', padding: '3rem 2rem', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' },
  faqInner: { maxWidth: 860, margin: '0 auto' },
  faqTitle: { fontSize: 26, fontWeight: 800, color: '#0f172a', marginBottom: 24, textAlign: 'center' },
  tabs: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28, justifyContent: 'center' },
  tab: { fontSize: 13, fontWeight: 600, padding: '7px 16px', borderRadius: 20, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#64748b', cursor: 'pointer' },
  tabActive: { background: '#0ea5e9', color: '#fff', border: '1.5px solid #0ea5e9' },
  faqList: { display: 'flex', flexDirection: 'column', gap: 8 },
  faqItem: { border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', background: '#fff' },
  faqQ: { width: '100%', background: 'none', border: 'none', padding: '16px 20px', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, fontSize: 14, fontWeight: 600, color: '#0f172a' },
  faqA: { padding: '0 20px 16px', fontSize: 14, color: '#475569', lineHeight: 1.8, borderTop: '1px solid #f1f5f9' },
  statusSection: { padding: '3rem 2rem', background: '#f8fafc' },
  statusInner: { maxWidth: 600, margin: '0 auto' },
  statusTitle: { fontSize: 22, fontWeight: 800, color: '#0f172a', textAlign: 'center', marginBottom: 6 },
  statusSub: { fontSize: 13, color: '#64748b', textAlign: 'center', marginBottom: 24 },
  statusGrid: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' },
  statusRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 20px', borderBottom: '1px solid #f1f5f9' },
  statusService: { fontSize: 14, color: '#334155', fontWeight: 500 },
  statusBadge: { fontSize: 12, fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '3px 10px', borderRadius: 20 },
  contactSection: { background: 'linear-gradient(135deg, #0f172a, #1e3a5f)', padding: '4rem 2rem', textAlign: 'center' },
  contactInner: { maxWidth: 520, margin: '0 auto' },
  contactTitle: { fontSize: 28, fontWeight: 800, color: '#fff', marginBottom: 12 },
  contactSub: { fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 24 },
  contactBtn: { display: 'inline-block', background: '#0ea5e9', color: '#fff', padding: '13px 28px', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 15 },
};
