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
  return <ul style={s.ul}>{items.map((it, i) => <li key={i} style={s.li}>{it}</li>)}</ul>;
}

export default function Terms() {
  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <div style={s.navInner}>
          <Link to="/" style={s.logo}>Lucred</Link>
          <div style={{ display: 'flex', gap: 24 }}>
            <Link to="/privacy-policy" style={s.navLink}>Privacy Policy</Link>
            <Link to="/security" style={s.navLink}>Security</Link>
            <Link to="/support" style={s.navLink}>Support</Link>
          </div>
        </div>
      </nav>

      <div style={s.layout}>
        <aside style={s.sidebar}>
          <div style={s.sidebarTitle}>Contents</div>
          {[
            ['#eligibility', 'Eligibility'],
            ['#account', 'Account Registration'],
            ['#api-usage', 'API Usage & Limits'],
            ['#acceptable-use', 'Acceptable Use'],
            ['#data-responsibility', 'Data Responsibility'],
            ['#fees', 'Fees & Billing'],
            ['#ip', 'Intellectual Property'],
            ['#liability', 'Limitation of Liability'],
            ['#termination', 'Termination'],
            ['#governing-law', 'Governing Law'],
            ['#changes', 'Changes to Terms'],
            ['#contact', 'Contact'],
          ].map(([href, label]) => (
            <a key={href} href={href} style={s.tocLink}>{label}</a>
          ))}
        </aside>

        <main style={s.content}>
          <div style={s.header}>
            <span style={s.tag}>Legal</span>
            <h1 style={s.h1}>Terms of Service</h1>
            <p style={s.meta}>Last updated: {LAST_UPDATED}</p>
            <p style={s.lead}>
              These Terms of Service ("Terms") govern your access to and use of the Lucred B2B Developer Portal
              and API ("Service") provided by Lucred Technology LLC ("Lucred", "we", "us"). By creating an account
              or using the Service, you agree to be bound by these Terms in full. If you are using the Service on
              behalf of an organisation, you represent that you are authorised to bind that organisation to these Terms.
            </p>
          </div>

          <Section title="1. Eligibility" id="eligibility">
            <P>
              The Service is available only to licensed microfinance institutions (MFIs), commercial lenders,
              fintechs, and other regulated financial entities operating in Nigeria. By registering, you represent
              and warrant that:
            </P>
            <UL items={[
              'Your organisation holds all applicable licences required by the Central Bank of Nigeria (CBN) or other relevant regulatory body to conduct lending activities',
              'You are at least 18 years of age and have legal authority to enter into contracts on behalf of your organisation',
              'Your organisation is not on any financial sanctions list or watchlist administered by OFAC, the UN, or any Nigerian government body',
              'You will use the Service solely for legitimate credit assessment and identity verification purposes',
            ]} />
          </Section>

          <Section title="2. Account Registration" id="account">
            <P>
              To access the Service, you must register an account with a valid business email address. You are
              responsible for maintaining the confidentiality of your password and API keys. You agree to:
            </P>
            <UL items={[
              'Provide accurate and complete registration information and keep it up to date',
              'Keep your password secure and not share it with any third party',
              'Immediately notify us at support@lucred.co if you suspect unauthorised access to your account',
              'Accept responsibility for all activity that occurs under your account credentials',
            ]} />
            <P>
              Lucred reserves the right to suspend or terminate accounts where registration information is found
              to be false, misleading, or in violation of these Terms.
            </P>
          </Section>

          <Section title="3. API Usage & Rate Limits" id="api-usage">
            <P>
              Access to the Lucred API is governed by your subscription plan. Each plan includes a defined monthly
              call allocation across the following services: BVN verification, NIN verification, credit bureau checks,
              and bank statement analysis.
            </P>
            <UL items={[
              'API keys must be kept confidential and must not be embedded in public repositories, client-side code, or shared environments',
              'You may not resell, sublicence, or redistribute API access to third parties without prior written consent from Lucred',
              'Automated abuse, scraping, or stress-testing of the API outside designated sandbox environments is prohibited',
              'Exceeding your plan quota will result in HTTP 429 responses; upgrade your plan to restore access',
              'Lucred reserves the right to throttle or suspend API access if usage patterns indicate abuse or unusual activity',
            ]} />
          </Section>

          <Section title="4. Acceptable Use Policy" id="acceptable-use">
            <P>You agree not to use the Service to:</P>
            <UL items={[
              'Process data of individuals who have not given informed consent for their data to be used in credit assessments',
              'Discriminate against borrowers on the basis of religion, ethnicity, gender, disability, or other protected characteristics',
              'Circumvent or attempt to circumvent any rate limit, security control, or access restriction',
              'Introduce malware, viruses, or malicious code into the platform or its connected systems',
              'Use the Service for any purpose that violates Nigerian law, including the NDPR 2019, NDPA 2023, and CBN consumer protection guidelines',
              'Engage in identity fraud, synthetic identity creation, or any form of financial crime',
              'Reverse-engineer, decompile, or disassemble any part of the Service or its underlying infrastructure',
            ]} />
            <P>
              Violations of this Acceptable Use Policy may result in immediate account suspension and may be reported
              to relevant regulatory authorities.
            </P>
          </Section>

          <Section title="5. Data Responsibility" id="data-responsibility">
            <P>
              As an MFI Client, you are the data controller for borrower personal data submitted through our API.
              Lucred acts as a data processor on your behalf. You represent and warrant that:
            </P>
            <UL items={[
              'You have obtained valid, informed consent from each borrower before submitting their BVN, NIN, bank statements, or other personal data to our API',
              'Your use of borrower data complies with the Nigeria Data Protection Regulation (NDPR) 2019, the NDPA 2023, and any applicable CBN data governance circular',
              'You will honour data subject rights requests (access, erasure, portability) from your borrowers and may use the dashboard tools provided by Lucred to fulfil such requests',
              'You will not retain API response data longer than your own internal data retention policy allows',
              'You will notify Lucred within 48 hours if you become aware of any data breach involving data obtained through our API',
            ]} />
          </Section>

          <Section title="6. Fees & Billing" id="fees">
            <P>
              Lucred charges subscription fees based on the plan you select. All fees are payable in Nigerian Naira
              (NGN) or as otherwise agreed in writing. Subscription plans are billed monthly in advance. You agree to:
            </P>
            <UL items={[
              'Pay all fees when due and maintain a valid payment method on file',
              'Accept that all fees are non-refundable except as expressly provided in our refund policy or required by law',
              'Understand that failure to pay within 14 days of the due date may result in suspension of API access',
              'Accept that Lucred may modify pricing with 30 days\' written notice; continued use after the effective date constitutes acceptance',
            ]} />
          </Section>

          <Section title="7. Intellectual Property" id="ip">
            <P>
              The Lucred platform, API, documentation, trademarks, and all associated intellectual property remain
              the sole property of Lucred Technology LLC. Nothing in these Terms transfers any ownership rights to you.
              You are granted a limited, non-exclusive, non-transferable licence to access and use the Service solely
              for your internal business purposes during the term of your subscription.
            </P>
            <P>
              Analysis results and reports generated by the Lucred API using your borrowers' data are provided to
              you under this licence. Lucred retains no ownership claim over those results.
            </P>
          </Section>

          <Section title="8. Limitation of Liability" id="liability">
            <P>
              The Service is provided "as is" and "as available". To the fullest extent permitted by Nigerian law,
              Lucred excludes all warranties, express or implied, including warranties of merchantability, fitness
              for a particular purpose, and non-infringement.
            </P>
            <P>
              Lucred's total liability arising out of or in connection with these Terms or the Service (whether in
              contract, tort, or otherwise) shall not exceed the total fees paid by you in the 3 months preceding
              the event giving rise to the claim.
            </P>
            <P>
              Lucred is not liable for: (a) any lending decision made on the basis of API results; (b) the accuracy
              or completeness of data returned by upstream providers (NIBSS, NIMC, FirstCentral); (c) loss of revenue
              or profits; or (d) indirect or consequential damages of any kind.
            </P>
          </Section>

          <Section title="9. Termination" id="termination">
            <P>
              Either party may terminate these Terms at any time with 14 days' written notice. Lucred may
              terminate or suspend your account immediately and without notice if you:
            </P>
            <UL items={[
              'Breach any material term of these Terms and fail to remedy the breach within 7 days of written notice',
              'Become insolvent, enter administration, or cease to carry on your regulated lending business',
              'Are found to have used the Service for fraudulent, illegal, or harmful purposes',
            ]} />
            <P>
              Upon termination, your right to access the Service ceases immediately. Sections 5, 7, 8, and 10
              survive termination.
            </P>
          </Section>

          <Section title="10. Governing Law" id="governing-law">
            <P>
              These Terms are governed by and construed in accordance with the laws of the Federal Republic of Nigeria.
              Any dispute arising out of or in connection with these Terms shall first be subject to good-faith
              negotiation between the parties. If unresolved within 30 days, disputes shall be referred to arbitration
              under the Arbitration and Conciliation Act (Cap A18 LFN 2004) before a single arbitrator in Lagos.
            </P>
          </Section>

          <Section title="11. Changes to These Terms" id="changes">
            <P>
              We may update these Terms from time to time. Material changes will be notified to active Clients via
              email and displayed in the dashboard at least 30 days before taking effect. Your continued use of the
              Service after the effective date constitutes acceptance of the updated Terms.
            </P>
          </Section>

          <Section title="12. Contact" id="contact">
            <div style={s.contactBox}>
              <div><strong>Lucred Technology LLC</strong></div>
              <div>Legal enquiries: <a href="mailto:legal@lucred.co" style={s.a}>legal@lucred.co</a></div>
              <div>General support: <a href="mailto:support@lucred.co" style={s.a}>support@lucred.co</a></div>
              <div style={{ marginTop: 8, fontSize: 13, color: '#64748b' }}>
                Also see our <Link to="/privacy-policy" style={s.a}>Privacy Policy</Link> and <Link to="/security" style={s.a}>Security page</Link>.
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
  tag: { fontSize: 11, fontWeight: 700, color: '#6d28d9', background: '#ede9fe', padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: 1 },
  h1: { fontSize: 32, fontWeight: 800, color: '#0f172a', margin: '12px 0 4px' },
  h2: { fontSize: 20, fontWeight: 700, color: '#0f172a', margin: '0 0 14px', paddingTop: 8 },
  meta: { fontSize: 13, color: '#94a3b8', margin: '0 0 16px' },
  lead: { fontSize: 15, color: '#475569', lineHeight: 1.8, margin: 0 },
  section: { marginBottom: 36, paddingBottom: 36, borderBottom: '1px solid #f1f5f9' },
  p: { fontSize: 14, color: '#475569', lineHeight: 1.8, margin: '0 0 14px' },
  ul: { margin: '0 0 14px', paddingLeft: 20 },
  li: { fontSize: 14, color: '#475569', lineHeight: 1.8, marginBottom: 6 },
  a: { color: '#0ea5e9', textDecoration: 'none' },
  contactBox: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '1.25rem 1.5rem', fontSize: 14, color: '#334155', lineHeight: 1.9 },
};
