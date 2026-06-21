import Footer from '../components/Footer';
import { Link } from 'react-router-dom';

function Section({ title, id, accent, children }) {
  return (
    <section id={id} style={s.section}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ width: 4, height: 28, borderRadius: 2, background: accent || '#0ea5e9' }} />
        <h2 style={s.h2}>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Control({ title, description }) {
  return (
    <div style={s.control}>
      <div style={s.controlTitle}>{title}</div>
      <div style={s.controlDesc}>{description}</div>
    </div>
  );
}

export default function Security() {
  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <div style={s.navInner}>
          <Link to="/" style={s.logo}>Lucred</Link>
          <div style={{ display: 'flex', gap: 24 }}>
            <Link to="/privacy-policy" style={s.navLink}>Privacy Policy</Link>
            <Link to="/terms" style={s.navLink}>Terms</Link>
            <Link to="/support" style={s.navLink}>Support</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div style={s.hero}>
        <div style={s.heroInner}>
          <span style={s.tag}>Security</span>
          <h1 style={s.h1}>Security at Lucred</h1>
          <p style={s.lead}>
            We handle identity data, credit records, and financial statements on behalf of Nigerian lenders.
            Security is not an afterthought — it is built into every layer of our infrastructure.
          </p>
        </div>
      </div>

      <div style={s.container}>

        {/* Trust badges */}
        <div style={s.badges}>
          {[
            ['TLS 1.2+', 'All data in transit'],
            ['AES-256', 'Data at rest'],
            ['bcrypt', 'Password hashing'],
            ['JWT', 'Stateless auth'],
            ['NDPR', 'Compliant'],
            ['Rate Limited', 'Auth endpoints'],
          ].map(([title, sub]) => (
            <div key={title} style={s.badge}>
              <div style={s.badgeTitle}>{title}</div>
              <div style={s.badgeSub}>{sub}</div>
            </div>
          ))}
        </div>

        <Section title="Data Encryption" id="encryption" accent="#0ea5e9">
          <div style={s.grid}>
            <Control title="Encryption in Transit" description="All communication between clients, the Lucred dashboard, and our backend API is encrypted using TLS 1.2 or TLS 1.3. Unencrypted HTTP connections are rejected." />
            <Control title="Encryption at Rest" description="All data stored in MongoDB Atlas is encrypted at rest using AES-256. Encryption keys are managed by MongoDB Atlas using AWS KMS." />
            <Control title="API Key Storage" description="API keys are hashed using SHA-256 before storage. The plain-text key is displayed only once at creation — we cannot recover it. If lost, generate a new key." />
            <Control title="Password Hashing" description="User passwords are never stored in plain text. They are hashed using bcrypt with a work factor of 10 before being written to the database." />
          </div>
        </Section>

        <Section title="Authentication & Access Control" id="auth" accent="#6d28d9">
          <div style={s.grid}>
            <Control title="JSON Web Tokens (JWT)" description="Session authentication uses signed JWTs. Tokens expire after a fixed duration and are validated on every protected API request." />
            <Control title="API Key Authentication" description="All data endpoints (BVN, NIN, bureau, statement) require a valid API key in the X-Api-Key header. Keys are scoped to a single MFI account." />
            <Control title="Role-Based Access Control" description="Platform administration is separated from MFI client access. Admin JWTs carry a separate isAdmin claim and route to a completely different API surface." />
            <Control title="Brute-Force Protection" description="Authentication endpoints (/api/auth/login, /api/auth/register) are rate-limited to 20 requests per 15-minute window per IP. Excess requests receive a 429 response." />
          </div>
        </Section>

        <Section title="Application Security" id="application" accent="#f59e0b">
          <div style={s.grid}>
            <Control title="HTTP Security Headers" description="All API responses include security headers enforced by Helmet.js: Strict-Transport-Security, X-Frame-Options, X-Content-Type-Options, Content-Security-Policy, and Referrer-Policy." />
            <Control title="Input Sanitisation" description="All search parameters are sanitised against regex injection before being used in MongoDB queries. Malformed or oversized inputs are rejected at the API boundary." />
            <Control title="Log Sanitisation" description="Request body logging strips sensitive fields (bvn, nin, password) before writing to server logs. Sensitive identifiers never appear in plain text in any log file." />
            <Control title="Generic Error Responses" description="Internal server errors return a generic message to the client. Detailed error information (stack traces, database errors) is logged server-side only and never exposed in API responses." />
          </div>
        </Section>

        <Section title="Data Minimisation & Retention" id="retention" accent="#16a34a">
          <div style={s.grid}>
            <Control title="Biometric Data" description="BVN face images and NIN photos are returned to the calling MFI in real time for identity verification purposes. They are stored alongside the result record for the duration of the retention period to support analyst review." />
            <Control title="Automatic TTL Expiry" description="MongoDB TTL indexes automatically delete BVN/NIN results after 90 days, bureau results after 180 days, and statement results after 1 year. No manual intervention is required." />
            <Control title="Raw Transaction Data" description="Raw bank transaction records are never stored. The statement analysis engine processes the uploaded file and persists only the derived metrics (income, spend categories, DTI, etc.)." />
            <Control title="Cascade Deletion" description="Deleting a customer record from the dashboard triggers immediate cascade deletion of all associated BVN, NIN, bureau, and statement records. Account deletion wipes all data across all collections." />
          </div>
        </Section>

        <Section title="Infrastructure Security" id="infrastructure" accent="#ef4444">
          <div style={s.grid}>
            <Control title="Cloud Hosting" description="Backend services run on Railway (isolated containers). The database runs on MongoDB Atlas with network access restricted to application server IP ranges only." />
            <Control title="Frontend Hosting" description="The dashboard is served via Vercel with automatic HTTPS, edge caching, and DDoS protection at the CDN layer." />
            <Control title="Environment Secrets" description="All API credentials (Dojah, FirstCentral, JWT secret, MongoDB URI) are stored as encrypted environment variables in Railway. They are never committed to source code." />
            <Control title="Dependency Management" description="We monitor dependencies for known vulnerabilities. Production dependencies are kept minimal and reviewed on every release." />
          </div>
        </Section>

        <Section title="Incident Response" id="incidents" accent="#64748b">
          <p style={s.p}>
            In the event of a security incident affecting data processed through the Lucred platform:
          </p>
          <ul style={s.ul}>
            <li style={s.li}>Affected MFI Clients will be notified within <strong>24 hours</strong> of confirmed incident detection via the email address on their account</li>
            <li style={s.li}>A detailed incident report (nature of breach, data affected, remediation steps) will be provided within <strong>72 hours</strong></li>
            <li style={s.li}>Where required by NDPR Article 2.6, we will notify the Nigeria Data Protection Commission (NDPC) within the legally mandated timeframe</li>
            <li style={s.li}>Affected borrowers whose data was exposed will be notified through the relevant MFI Client</li>
          </ul>
          <p style={s.p}>
            To report a suspected security vulnerability, please contact us at{' '}
            <a href="mailto:security@lucred.co" style={s.a}>security@lucred.co</a>. We operate a responsible
            disclosure policy and will acknowledge all valid reports within 48 hours.
          </p>
        </Section>

        <div style={s.contact}>
          <div style={s.contactTitle}>Security Questions?</div>
          <p style={s.contactSub}>Contact our security team directly. We respond to all security enquiries within 48 hours on business days.</p>
          <a href="mailto:security@lucred.co" style={s.contactBtn}>security@lucred.co</a>
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
  hero: { background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', padding: '4rem 2rem' },
  heroInner: { maxWidth: 700, margin: '0 auto', textAlign: 'center' },
  tag: { fontSize: 11, fontWeight: 700, color: '#38bdf8', background: 'rgba(56,189,248,0.1)', padding: '3px 12px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: 1 },
  h1: { fontSize: 36, fontWeight: 800, color: '#fff', margin: '14px 0 16px' },
  lead: { fontSize: 16, color: '#94a3b8', lineHeight: 1.7, margin: 0 },
  container: { maxWidth: 1100, margin: '0 auto', padding: '3rem 2rem' },
  badges: { display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 48, justifyContent: 'center' },
  badge: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 20px', textAlign: 'center', minWidth: 110 },
  badgeTitle: { fontSize: 15, fontWeight: 800, color: '#0f172a', marginBottom: 2 },
  badgeSub: { fontSize: 11, color: '#64748b' },
  section: { marginBottom: 48 },
  h2: { fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 },
  control: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem 1.5rem' },
  controlTitle: { fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 8 },
  controlDesc: { fontSize: 13, color: '#64748b', lineHeight: 1.7 },
  p: { fontSize: 14, color: '#475569', lineHeight: 1.8, margin: '0 0 14px' },
  ul: { margin: '0 0 14px', paddingLeft: 20 },
  li: { fontSize: 14, color: '#475569', lineHeight: 1.8, marginBottom: 8 },
  a: { color: '#0ea5e9', textDecoration: 'none' },
  contact: { background: 'linear-gradient(135deg, #0f172a, #1e3a5f)', borderRadius: 16, padding: '2.5rem', textAlign: 'center', marginTop: 16 },
  contactTitle: { fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 10 },
  contactSub: { fontSize: 14, color: '#94a3b8', marginBottom: 20 },
  contactBtn: { display: 'inline-block', background: '#0ea5e9', color: '#fff', padding: '12px 28px', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: 14 },
};
