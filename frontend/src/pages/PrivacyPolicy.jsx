import Footer from '../components/Footer';
import { Link } from 'react-router-dom';

const LAST_UPDATED = 'June 21, 2025';

function Section({ title, id, children }) {
  return (
    <section id={id} style={s.section}>
      <h2 style={s.h2}>{title}</h2>
      {children}
    </section>
  );
}

function P({ children }) { return <p style={s.p}>{children}</p>; }
function UL({ items }) {
  return (
    <ul style={s.ul}>
      {items.map((item, i) => <li key={i} style={s.li}>{item}</li>)}
    </ul>
  );
}

export default function PrivacyPolicy() {
  return (
    <div style={s.page}>
      {/* Nav */}
      <nav style={s.nav}>
        <div style={s.navInner}>
          <Link to="/" style={s.logo}>Lucred</Link>
          <div style={{ display: 'flex', gap: 24 }}>
            <Link to="/terms" style={s.navLink}>Terms of Service</Link>
            <Link to="/security" style={s.navLink}>Security</Link>
            <Link to="/support" style={s.navLink}>Support</Link>
          </div>
        </div>
      </nav>

      <div style={s.layout}>
        {/* Sidebar TOC */}
        <aside style={s.sidebar}>
          <div style={s.sidebarTitle}>Contents</div>
          {[
            ['#overview', 'Overview'],
            ['#data-we-collect', 'Data We Collect'],
            ['#how-we-use', 'How We Use Data'],
            ['#data-retention', 'Data Retention'],
            ['#data-sharing', 'Data Sharing'],
            ['#security', 'Security Measures'],
            ['#ndpr', 'Your NDPR Rights'],
            ['#cookies', 'Cookies'],
            ['#children', "Children's Privacy"],
            ['#changes', 'Policy Changes'],
            ['#contact', 'Contact Us'],
          ].map(([href, label]) => (
            <a key={href} href={href} style={s.tocLink}>{label}</a>
          ))}
        </aside>

        {/* Content */}
        <main style={s.content}>
          <div style={s.header}>
            <span style={s.tag}>Legal</span>
            <h1 style={s.h1}>Privacy Policy</h1>
            <p style={s.meta}>Last updated: {LAST_UPDATED}</p>
            <p style={s.lead}>
              Lucred Technology LLC ("Lucred", "we", "our", or "us") is committed to protecting the privacy of
              microfinance institutions (MFIs) and the borrowers whose data is processed through our platform.
              This Privacy Policy explains what data we collect, how we use it, how long we retain it, and
              your rights under the Nigeria Data Protection Regulation (NDPR) 2019.
            </p>
          </div>

          <Section title="Overview" id="overview">
            <P>
              Lucred provides a B2B API platform that enables licensed Nigerian MFIs and lenders ("Clients")
              to verify borrower identities (BVN/NIN), check credit bureau records, and analyse bank statements.
              We act as a data processor on behalf of our Clients, who are the data controllers responsible for
              their borrowers' personal data.
            </P>
            <P>
              By using the Lucred platform, you acknowledge that you have read and understood this Privacy
              Policy. If you are an MFI Client, you are responsible for obtaining valid consent from your
              borrowers before submitting their data to our API.
            </P>
          </Section>

          <Section title="Data We Collect" id="data-we-collect">
            <h3 style={s.h3}>Data about MFI Clients (Account Holders)</h3>
            <UL items={[
              'Business name, contact person name, and email address (for account creation)',
              'Hashed password (we never store your password in plain text)',
              'API key usage logs (endpoint called, timestamp, response status)',
              'Billing and subscription information (plan type, payment status)',
            ]} />

            <h3 style={s.h3}>Borrower Data Processed on Behalf of Clients</h3>
            <UL items={[
              'BVN verification results: name, date of birth, gender, phone, email, enrollment bank, NIN linkage, account level, watchlist status, and biometric image (from NIBSS via Dojah)',
              'NIN verification results: name, date of birth, gender, address, state of origin, LGA, nationality, religion, marital status, watchlist status, and biometric photo (from NIMC via Dojah)',
              'Credit bureau data: FirstCentral XScore, credit account summary, credit account details, delinquency records, and repayment history',
              'Bank statement analysis: the uploaded statement file and derived metrics (income, spending patterns, debt servicing ratios, account sweep analysis, weekly and monthly transaction summaries) are retained securely for the duration set out in the Retention section below.',
              'Customer profile data entered by Clients: name, email, phone, BVN, NIN, address, customer type',
            ]} />

            <h3 style={s.h3}>Technical and Usage Data</h3>
            <UL items={[
              'IP addresses and browser/device metadata (for security and fraud prevention)',
              'API call logs (endpoint, timestamp, HTTP status — sensitive fields like BVN/NIN are never logged)',
              'Session tokens (stored in your browser; expire on logout)',
            ]} />
          </Section>

          <Section title="How We Use Data" id="how-we-use">
            <P>We use collected data strictly for the following purposes:</P>
            <UL items={[
              'Delivering the identity verification, credit bureau, and statement analysis services you request',
              'Authenticating users and protecting accounts from unauthorised access',
              'Monitoring API usage for billing, quota enforcement, and fair-use compliance',
              'Detecting and preventing fraud, abuse, and security incidents',
              'Improving platform reliability and performance (using anonymised aggregate metrics only)',
              'Complying with applicable Nigerian law, including NDPR 2019 and CBN data governance regulations',
            ]} />
            <P>
              We do not sell, rent, or share borrower data with any third party for marketing, advertising, or
              commercial profiling purposes. Borrower data is never used to train machine learning models without
              explicit written consent from the relevant Client.
            </P>
          </Section>

          <Section title="Data Retention" id="data-retention">
            <P>We retain data for the minimum period necessary to fulfil the service purpose:</P>
            <div style={s.table}>
              <div style={s.tableHead}>
                <span>Data Type</span><span>Retention Period</span><span>Basis</span>
              </div>
              {[
                ['BVN verification results', '90 days', 'NDPR data minimisation'],
                ['NIN verification results', '90 days', 'NDPR data minimisation'],
                ['Credit bureau results', '180 days', 'Reasonable credit assessment window'],
                ['Bank statement analysis', '1 year', 'Loan lifecycle coverage'],
                ['API usage logs', '90 days', 'Security & billing audit trail'],
                ['MFI account data', 'Duration of account + 90 days post-closure', 'Contractual obligation'],
                ['Biometric images / photos', 'Same as parent record (BVN/NIN retention period)', 'Identity verification only'],
              ].map(([type, period, basis]) => (
                <div key={type} style={s.tableRow}>
                  <span style={{ fontWeight: 600 }}>{type}</span>
                  <span style={{ color: '#0ea5e9' }}>{period}</span>
                  <span style={{ color: '#64748b' }}>{basis}</span>
                </div>
              ))}
            </div>
            <P>
              After the retention period, records are automatically deleted via MongoDB TTL indexes. Clients
              may request earlier deletion at any time via the Privacy & Data section of their dashboard or by
              contacting us at <a href="mailto:privacy@lucred.co" style={s.a}>privacy@lucred.co</a>.
            </P>
          </Section>

          <Section title="Data Sharing" id="data-sharing">
            <P>We share data only with the following categories of third parties, and only to the extent necessary:</P>
            <UL items={[
              "Dojah (identity API provider) — BVN and NIN verification requests are forwarded to Dojah, which queries NIBSS and NIMC respectively. Dojah's own privacy policy governs their handling of this data.",
              "FirstCentral Credit Bureau — credit bureau check requests are forwarded to FirstCentral. Their data is subject to FirstCentral's terms and NDPC authorisation.",
              'MongoDB Atlas (cloud database) — all stored data is encrypted at rest on MongoDB Atlas (hosted within the applicable region).',
              'Cloud file storage — uploaded bank statement files are stored in an encrypted, access-controlled cloud storage service. Files are never shared with third parties and are accessible only to authorised Lucred systems.',
              'Railway (backend hosting) — application servers run on Railway infrastructure. No persistent data is stored on Railway beyond in-flight request processing.',
              'Vercel (frontend hosting) — the dashboard application is served via Vercel. No personal data is stored on Vercel.',
            ]} />
            <P>
              We do not transfer personal data outside Nigeria except where a Standard Contractual Clause or
              equivalent safeguard is in place as required by NDPR Article 2.11.
            </P>
          </Section>

          <Section title="Security Measures" id="security">
            <P>We apply industry-standard technical and organisational security measures including:</P>
            <UL items={[
              'All data in transit is encrypted using TLS 1.2 or higher',
              'All data at rest is encrypted using AES-256 on MongoDB Atlas',
              'Passwords are hashed using bcrypt with a work factor of 10',
              'API keys are hashed before storage — the plain key is shown only once at creation',
              'Sensitive fields (BVN, NIN, passwords) are never logged in server request logs',
              'HTTP security headers enforced via Helmet.js (HSTS, CSP, X-Frame-Options, etc.)',
              'Rate limiting on authentication endpoints to prevent brute-force attacks',
              'JWT tokens expire after a fixed duration and are validated on every request',
              'Role-based access control separates MFI client access from platform admin access',
            ]} />
            <P>
              For a full description of our security controls, see our <Link to="/security" style={s.a}>Security page</Link>.
            </P>
          </Section>

          <Section title="Your NDPR Rights" id="ndpr">
            <P>
              Under the Nigeria Data Protection Regulation (NDPR) 2019 and the Nigeria Data Protection Act (NDPA) 2023,
              data subjects (borrowers) and data controllers (MFI Clients) have the following rights:
            </P>
            <UL items={[
              'Right of Access — request a copy of all personal data held about you or your customers',
              'Right to Rectification — request correction of inaccurate or incomplete data',
              'Right to Erasure ("Right to be Forgotten") — request deletion of personal data where there is no overriding legitimate purpose for retention',
              'Right to Data Portability — export all your data in a machine-readable JSON format via the dashboard Export function',
              'Right to Object — object to processing of personal data for purposes beyond the original collection purpose',
              'Right to Restrict Processing — request that we pause processing while a dispute is being resolved',
            ]} />
            <P>
              MFI Clients can exercise data portability and account deletion rights directly from the
              <strong> Dashboard → Privacy & Data</strong> page. Borrower data deletion requests submitted by Clients
              are processed immediately.
            </P>
            <P>
              To exercise any of the above rights, contact our Data Protection Officer at{' '}
              <a href="mailto:dpo@lucred.co" style={s.a}>dpo@lucred.co</a>.
              We will respond within 72 hours of receipt and resolve within 30 days in accordance with NDPR requirements.
            </P>
          </Section>

          <Section title="Cookies" id="cookies">
            <P>
              The Lucred dashboard uses only functional cookies and session tokens necessary for authentication.
              We do not use advertising cookies, analytics cookies, or third-party tracking pixels.
            </P>
            <UL items={[
              'Authentication token (localStorage) — stores your JWT for the duration of your session',
              'API key (localStorage) — cached for dashboard convenience; cleared on logout',
            ]} />
            <P>
              The public marketing pages (lucred.co) do not set any cookies. Vercel Analytics collects
              anonymous, aggregated page view data with no personally identifiable information.
            </P>
          </Section>

          <Section title="Children's Privacy" id="children">
            <P>
              The Lucred platform is intended exclusively for licensed financial institutions and their adult borrowers.
              We do not knowingly collect or process data relating to individuals under the age of 18. If you believe
              a minor's data has been submitted to our platform, contact us immediately at{' '}
              <a href="mailto:privacy@lucred.co" style={s.a}>privacy@lucred.co</a> and we will delete it promptly.
            </P>
          </Section>

          <Section title="Changes to This Policy" id="changes">
            <P>
              We may update this Privacy Policy from time to time to reflect changes in our data practices or
              applicable law. When we make material changes, we will notify active MFI Clients via email and
              display a notice in the dashboard for at least 30 days before the changes take effect.
              Continued use of the platform after the effective date constitutes acceptance of the updated policy.
            </P>
          </Section>

          <Section title="Contact Us" id="contact">
            <P>For privacy-related enquiries, please contact:</P>
            <div style={s.contactBox}>
              <div><strong>Data Protection Officer</strong></div>
              <div>Lucred Technology LLC</div>
              <div>Email: <a href="mailto:dpo@lucred.co" style={s.a}>dpo@lucred.co</a></div>
              <div>Privacy: <a href="mailto:privacy@lucred.co" style={s.a}>privacy@lucred.co</a></div>
              <div style={{ marginTop: 8, color: '#64748b', fontSize: 13 }}>
                We aim to respond to all privacy enquiries within 72 hours on business days.
              </div>
            </div>
          </Section>
        </main>
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
  layout: { maxWidth: 1100, margin: '0 auto', padding: '3rem 2rem', display: 'grid', gridTemplateColumns: '220px 1fr', gap: 48, alignItems: 'start' },
  sidebar: { position: 'sticky', top: 80, display: 'flex', flexDirection: 'column', gap: 4 },
  sidebarTitle: { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  tocLink: { fontSize: 13, color: '#64748b', textDecoration: 'none', padding: '4px 0', borderLeft: '2px solid #e2e8f0', paddingLeft: 10 },
  content: { background: '#fff', borderRadius: 16, padding: '2.5rem', boxShadow: '0 1px 8px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' },
  header: { marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid #f1f5f9' },
  tag: { fontSize: 11, fontWeight: 700, color: '#0ea5e9', background: '#e0f2fe', padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: 1 },
  h1: { fontSize: 32, fontWeight: 800, color: '#0f172a', margin: '12px 0 4px' },
  h2: { fontSize: 20, fontWeight: 700, color: '#0f172a', margin: '0 0 14px', paddingTop: 8 },
  h3: { fontSize: 15, fontWeight: 700, color: '#334155', margin: '20px 0 10px' },
  meta: { fontSize: 13, color: '#94a3b8', margin: '0 0 16px' },
  lead: { fontSize: 15, color: '#475569', lineHeight: 1.8, margin: 0 },
  section: { marginBottom: 36, paddingBottom: 36, borderBottom: '1px solid #f1f5f9' },
  p: { fontSize: 14, color: '#475569', lineHeight: 1.8, margin: '0 0 14px' },
  ul: { margin: '0 0 14px', paddingLeft: 20 },
  li: { fontSize: 14, color: '#475569', lineHeight: 1.8, marginBottom: 6 },
  a: { color: '#0ea5e9', textDecoration: 'none' },
  table: { border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', marginBottom: 14 },
  tableHead: { display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr', background: '#0f172a', padding: '10px 16px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, gap: 16 },
  tableRow: { display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr', padding: '10px 16px', fontSize: 13, borderTop: '1px solid #f1f5f9', gap: 16, background: '#fff' },
  contactBox: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '1.25rem 1.5rem', fontSize: 14, color: '#334155', lineHeight: 1.9 },
};
