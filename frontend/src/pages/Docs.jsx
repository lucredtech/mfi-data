import { API_BASE as BASE } from '../services/api';
import { useState } from 'react';


const SECTIONS = [
  { id: 'auth',             label: 'Authentication' },
  { id: 'pricing',         label: 'Pricing' },
  { id: 'bvn',             label: 'BVN Verification' },
  { id: 'nin',             label: 'NIN Verification' },
  { id: 'bureau',          label: 'Credit Bureau' },
  { id: 'statement',       label: 'Statement Analysis' },
  { id: 'customers',       label: 'Customers' },
  { id: 'scorecard',       label: 'Scorecard & Loan Review' },
  { id: 'rerun',           label: 'Re-run Checks' },
  { id: 'business-kyc',    label: 'Business KYC' },
  { id: 'self-onboard',    label: 'Self-Onboard Link' },
  { id: 'onboarding',      label: 'Customer Onboarding (API)' },
  { id: 'webhooks',        label: 'Webhooks' },
  { id: 'errors',          label: 'Error Codes' },
];

const BADGE = {
  GET:    { bg: '#dcfce7', color: '#16a34a' },
  POST:   { bg: '#dbeafe', color: '#1d4ed8' },
  PATCH:  { bg: '#fef3c7', color: '#d97706' },
  DELETE: { bg: '#fee2e2', color: '#dc2626' },
};

function Method({ m }) {
  const b = BADGE[m] || BADGE.GET;
  return <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: b.bg, color: b.color, marginRight: 10, flexShrink: 0 }}>{m}</span>;
}

function Endpoint({ method, path, desc, params, body, response, note }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, marginBottom: 12, overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '12px 16px', background: open ? '#f8fafc' : '#fff', border: 'none', cursor: 'pointer', textAlign: 'left', gap: 0 }}>
        <Method m={method} />
        <code style={{ fontSize: 13, color: '#0f172a', fontWeight: 600, flex: 1 }}>{path}</code>
        <span style={{ fontSize: 12, color: '#64748b', marginLeft: 12 }}>{desc}</span>
        <span style={{ marginLeft: 12, color: '#94a3b8', fontSize: 12 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid #f1f5f9', background: '#fff' }}>
          {note && <div style={{ fontSize: 12, color: '#d97706', background: '#fef9c3', borderRadius: 7, padding: '8px 12px', marginTop: 14, marginBottom: 12 }}>⚠ {note}</div>}
          {params && (
            <>
              <div style={s.paramTitle}>Headers</div>
              {params.map(p => (
                <div key={p.name} style={s.paramRow}>
                  <code style={s.paramName}>{p.name}</code>
                  <span style={s.paramReq}>{p.required ? 'required' : 'optional'}</span>
                  <span style={s.paramDesc}>{p.desc}</span>
                </div>
              ))}
            </>
          )}
          {body && (
            <>
              <div style={s.paramTitle}>Request body / fields</div>
              {body.map(p => (
                <div key={p.name} style={s.paramRow}>
                  <code style={s.paramName}>{p.name}</code>
                  <code style={s.paramType}>{p.type}</code>
                  <span style={s.paramReq}>{p.required ? 'required' : 'optional'}</span>
                  <span style={s.paramDesc}>{p.desc}</span>
                </div>
              ))}
            </>
          )}
          {response && (
            <>
              <div style={s.paramTitle}>Example response</div>
              <pre style={s.code}>{response}</pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children, id }) {
  return (
    <div id={id} style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 16, paddingBottom: 8, borderBottom: '2px solid #f1f5f9' }}>{title}</h2>
      {children}
    </div>
  );
}

function CodeBlock({ code }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div style={{ position: 'relative', marginBottom: 16 }}>
      <pre style={s.code}>{code}</pre>
      <button onClick={copy} style={{ position: 'absolute', top: 8, right: 8, background: '#334155', color: '#e2e8f0', border: 'none', borderRadius: 6, padding: '3px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
}

export default function Docs() {
  const [activeSection, setActiveSection] = useState('auth');

  return (
    <div style={{ display: 'flex', gap: 0, maxWidth: 1100, margin: '0 auto' }}>
      {/* Sidebar */}
      <div style={{ width: 200, flexShrink: 0, position: 'sticky', top: 20, alignSelf: 'flex-start', paddingRight: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>API Reference</div>
        {SECTIONS.map(sec => (
          <a key={sec.id} href={`#${sec.id}`} onClick={() => setActiveSection(sec.id)}
            style={{ display: 'block', fontSize: 13, fontWeight: activeSection === sec.id ? 700 : 500, color: activeSection === sec.id ? '#6d28d9' : '#475569', padding: '5px 0', textDecoration: 'none', borderLeft: `2px solid ${activeSection === sec.id ? '#6d28d9' : 'transparent'}`, paddingLeft: 10, marginLeft: -2 }}>
            {sec.label}
          </a>
        ))}
        <div style={{ marginTop: 20, padding: '12px', background: '#fef3c7', borderRadius: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#d97706', marginBottom: 4 }}>Base URL</div>
          <code style={{ fontSize: 10, color: '#92400e', wordBreak: 'break-all' }}>{BASE}</code>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>Lucred Credit Engine API</h1>
        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 32 }}>
          REST API for identity verification, credit bureau, and bank statement analysis.
          All endpoints require an API key in the <code>X-Api-Key</code> header.
        </p>

        {/* Authentication */}
        <Section title="Authentication" id="auth">
          <p style={{ fontSize: 13, color: '#475569', marginBottom: 16 }}>Every request must include your API key. Create keys in the <strong>API Keys</strong> section of the dashboard. Use a <strong>test key</strong> to get sandbox responses without being charged.</p>
          <CodeBlock code={`curl -X GET ${BASE}/v1/customers \\
  -H "X-Api-Key: lcrd_your_api_key_here"`} />
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#15803d' }}>
            <strong>Test mode:</strong> Create a key with mode <code>test</code> in the dashboard. All calls with a test key return mock data and are <strong>never charged</strong>.
          </div>
        </Section>

        {/* Pricing */}
        <Section title="Pricing" id="pricing">
          <p style={{ fontSize: 13, color: '#475569', marginBottom: 20 }}>
            Charges are deducted from your wallet per successful API call. The first 3 BVN, NIN, and statement checks per month are free. Bureau and business verification checks are always charged.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Check', 'Upstream Cost', 'Lucred Engine Price', 'Free Quota'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 700, color: '#0f172a', borderBottom: '2px solid #e2e8f0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { check: 'BVN Verification',              upstream: '₦50',  price: '₦75',  quota: '3 / month' },
                  { check: 'NIN Verification',              upstream: '₦70',  price: '₦100', quota: '3 / month' },
                  { check: 'Individual Credit Bureau',      upstream: '₦500', price: '₦700', quota: '—' },
                  { check: 'Bank Statement Analysis',       upstream: '₦350', price: '₦500', quota: '3 / month' },
                  { check: 'CAC Verification (Basic)',    upstream: '₦130', price: '₦175', quota: '—' },
                  { check: 'TIN Verification',              upstream: '₦70',  price: '₦100', quota: '—' },
                  { check: 'Business Credit Bureau',        upstream: '₦500', price: '₦700', quota: '—' },
                ].map(({ check, upstream, price, quota }) => (
                  <tr key={check} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px', color: '#0f172a', fontWeight: 500 }}>{check}</td>
                    <td style={{ padding: '10px 14px', color: '#64748b' }}>{upstream}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0ea5e9' }}>{price}</td>
                    <td style={{ padding: '10px 14px', color: quota === '—' ? '#94a3b8' : '#16a34a', fontWeight: quota === '—' ? 400 : 600 }}>{quota}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#0369a1', marginTop: 16 }}>
            Custom volume rates are available for high-usage clients. Contact your account manager or email <strong>support@lucred.co</strong>.
          </div>
        </Section>

        {/* BVN */}
        <Section title="BVN Verification" id="bvn">
          <p style={{ fontSize: 13, color: '#475569', marginBottom: 16 }}>Verify a borrower's Bank Verification Number against NIBSS via Dojah. Costs <strong>₦75</strong> per check (or your negotiated rate). First 3 per month are free.</p>
          <Endpoint
            method="POST" path="/v1/customers/:id/verify-bvn"
            desc="Verify BVN for a customer"
            body={[
              { name: 'bvn', type: 'string', required: true, desc: '11-digit BVN number' },
            ]}
            response={`{
  "success": true,
  "data": {
    "bvn": "22312345678",
    "firstName": "Amaka",
    "lastName": "Okafor",
    "dateOfBirth": "1990-05-12",
    "gender": "Female",
    "phoneNumber": "08031234567",
    "enrollmentBank": "Access Bank",
    "nin": "12345678901",
    "watchListed": false
  }
}`} />
        </Section>

        {/* NIN */}
        <Section title="NIN Verification" id="nin">
          <p style={{ fontSize: 13, color: '#475569', marginBottom: 16 }}>Verify a borrower's National Identification Number against NIMC via Dojah. Costs <strong>₦100</strong> per check. First 3 per month are free.</p>
          <Endpoint
            method="POST" path="/v1/customers/:id/verify-nin"
            desc="Verify NIN for a customer"
            body={[
              { name: 'nin', type: 'string', required: true, desc: '11-digit NIN number' },
            ]}
            response={`{
  "success": true,
  "data": {
    "nin": "12345678901",
    "firstname": "Amaka",
    "surname": "Okafor",
    "birthdate": "12-05-1990",
    "gender": "F",
    "phone": "08031234567"
  }
}`} />
        </Section>

        {/* Credit Bureau */}
        <Section title="Credit Bureau" id="bureau">
          <p style={{ fontSize: 13, color: '#475569', marginBottom: 16 }}>Pull a full credit report from FirstCentral Credit Bureau. Returns XScore, loan history, delinquencies, and repayment performance. Costs <strong>₦700</strong> per check.</p>
          <Endpoint
            method="POST" path="/v1/customers/:id/credit-bureau"
            desc="Pull credit bureau report"
            body={[
              { name: 'bvn', type: 'string', required: true, desc: 'Borrower BVN — used to query FirstCentral' },
            ]}
            response={`{
  "success": true,
  "data": {
    "creditScore": 680,
    "creditRating": "Good",
    "totalLoans": 3,
    "activeLoans": 1,
    "nonPerformingLoans": 0,
    "totalOutstanding": 250000,
    "repaymentHistory": "Good"
  }
}`} />
        </Section>

        {/* Statement Analysis */}
        <Section title="Statement Analysis" id="statement">
          <p style={{ fontSize: 13, color: '#475569', marginBottom: 16 }}>Upload a bank statement for AI-powered income, spend, and repayment capacity analysis. Accepted formats: PDF, CSV, XLSX, DOCX. PDF is highly recommended for best accuracy. Costs <strong>₦500</strong> per analysis. First 3 per month are free.</p>
          <Endpoint
            method="POST" path="/v1/statement/upload-analyze"
            desc="Upload & analyse a bank statement"
            note="Send as multipart/form-data"
            body={[
              { name: 'statement', type: 'file', required: true, desc: 'PDF, CSV, XLSX, or DOCX — max 10MB. PDF is highly recommended for best accuracy.' },
              { name: 'bankName',  type: 'string', required: true, desc: 'Bank slug e.g. access, gtb, kuda, moniepoint' },
              { name: 'email',     type: 'string', required: false, desc: "Borrower's email address" },
              { name: 'password',  type: 'string', required: false, desc: 'PDF password if statement is encrypted' },
              { name: 'customerId', type: 'string', required: false, desc: 'Link result to a customer profile' },
            ]}
            response={`{
  "success": true,
  "result": {
    "status": "success",
    "accountName": "Amaka Okafor",
    "bankName": "Access Bank",
    "totalCredits": 850000,
    "totalDebits": 620000,
    "averageMonthlyCredit": 212500,
    "netCashFlow": 230000,
    "recommendation": "approve",
    "creditScore": 720,
    "maxLoanAmount": 320000
  }
}`} />
          <CodeBlock code={`curl -X POST ${BASE}/v1/statement/upload-analyze \\
  -H "X-Api-Key: lcrd_your_api_key" \\
  -F "statement=@/path/to/statement.pdf" \\
  -F "bankName=access" \\
  -F "email=borrower@example.com"`} />
        </Section>

        {/* Customers */}
        <Section title="Customers" id="customers">
          <p style={{ fontSize: 13, color: '#475569', marginBottom: 16 }}>
            Manage borrower profiles programmatically. All checks (BVN, NIN, bureau, statement) are linked to a customer record.
            Set <code>customerType</code> to <code>"business"</code> when creating an SME or company — this unlocks business KYC flows (CAC verification, business bureau, director checks) described in the <a href="#business-kyc" style={{ color: '#6d28d9' }}>Business KYC</a> section.
          </p>

          <Endpoint method="POST" path="/v1/customers" desc="Create an individual or business customer"
            body={[
              { name: 'name',         type: 'string', required: true,  desc: 'Full name (individual) or registered business name' },
              { name: 'customerType', type: 'string', required: false, desc: '"individual" (default) or "business"' },
              { name: 'email',        type: 'string', required: false, desc: 'Email address' },
              { name: 'phone',        type: 'string', required: false, desc: 'Phone number' },
              { name: 'bvn',          type: 'string', required: false, desc: 'BVN — 11 digits (individual)' },
              { name: 'nin',          type: 'string', required: false, desc: 'NIN — 11 digits (individual)' },
              { name: 'address',      type: 'string', required: false, desc: 'Address' },
            ]}
            response={`{
  "customer": {
    "_id": "6643ab...",
    "name": "Okeke Ventures Ltd",
    "customerType": "business",
    "email": "info@okeke.com",
    "phone": "08012345678",
    "status": "active",
    "createdAt": "2026-07-11T10:00:00Z"
  },
  "duplicate": null
}`}
            note="If a customer with the same BVN, NIN, or phone already exists, the response includes a duplicate field with their id and name — the new record is still created." />

          <Endpoint method="GET" path="/v1/customers" desc="List customers"
            body={[
              { name: 'q',             type: 'query', required: false, desc: 'Search by name, email, or BVN' },
              { name: 'customerType',  type: 'query', required: false, desc: 'Filter by type: individual or business' },
              { name: 'status',        type: 'query', required: false, desc: 'Filter by status: active, watchlist, blacklisted' },
              { name: 'limit',         type: 'query', required: false, desc: 'Max results (default 50)' },
              { name: 'skip',          type: 'query', required: false, desc: 'Pagination offset' },
            ]}
            response={`{ "customers": [...], "total": 142 }`} />

          <Endpoint method="GET" path="/v1/customers/:id" desc="Get customer with all linked check results"
            response={`{
  "customer": { "_id": "...", "name": "Okeke Ventures Ltd", "customerType": "business", ... },
  "bvnResults": [...],
  "ninResults": [...],
  "bureauResults": [...],
  "statements": [...],
  "loanReviews": [...],
  "latestScorecard": { ... }
}`} />

          <Endpoint method="PATCH" path="/v1/customers/:id" desc="Update customer profile fields"
            body={[
              { name: 'name',   type: 'string', required: false, desc: 'Name' },
              { name: 'email',  type: 'string', required: false, desc: 'Email' },
              { name: 'phone',  type: 'string', required: false, desc: 'Phone' },
              { name: 'address',type: 'string', required: false, desc: 'Address' },
              { name: 'status', type: 'string', required: false, desc: 'active | watchlist | blacklisted' },
            ]} />

          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '20px 0 8px' }}>Full analysis flow — individual</h3>
          <CodeBlock code={`# 1. Create individual customer
curl -X POST ${BASE}/v1/customers \\
  -H "X-Api-Key: lcrd_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Amaka Okafor","phone":"08031234567","bvn":"22312345678","nin":"12345678901","customerType":"individual"}'
# → { "customer": { "_id": "CUSTOMER_ID", ... } }

# 2. Verify BVN
curl -X POST ${BASE}/v1/customers/CUSTOMER_ID/verify-bvn \\
  -H "X-Api-Key: lcrd_your_api_key" \\
  -d '{"bvn":"22312345678"}'

# 3. Verify NIN
curl -X POST ${BASE}/v1/customers/CUSTOMER_ID/verify-nin \\
  -H "X-Api-Key: lcrd_your_api_key" \\
  -d '{"nin":"12345678901"}'

# 4. Pull credit bureau
curl -X POST ${BASE}/v1/customers/CUSTOMER_ID/credit-bureau \\
  -H "X-Api-Key: lcrd_your_api_key" \\
  -d '{"bvn":"22312345678"}'

# 5. Upload bank statement
curl -X POST ${BASE}/v1/customers/CUSTOMER_ID/statement \\
  -H "X-Api-Key: lcrd_your_api_key" \\
  -F "statement=@statement.pdf" \\
  -F "bankName=access"

# 6. Run loan review
curl -X POST ${BASE}/v1/customers/CUSTOMER_ID/loan-review \\
  -H "X-Api-Key: lcrd_your_api_key" \\
  -d '{"loanAmount":200000,"loanTenor":12,"annualRate":24}'`} />

          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '20px 0 8px' }}>Full analysis flow — business (SME)</h3>
          <p style={{ fontSize: 13, color: '#475569', marginBottom: 12 }}>
            All business KYC steps are available as standalone endpoints directly on the customer record — no onboarding session required.
          </p>
          <CodeBlock code={`# 1. Create business customer
curl -X POST ${BASE}/v1/customers \\
  -H "X-Api-Key: lcrd_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Okeke Ventures Ltd","phone":"08031234567","customerType":"business"}'
# → { "customer": { "_id": "CUSTOMER_ID", ... } }

# 2. Verify CAC (Basic) + TIN — both run in one call
curl -X POST ${BASE}/v1/customers/CUSTOMER_ID/verify-cac \\
  -H "X-Api-Key: lcrd_your_api_key" \\
  -F "cacNumber=RC1234567" \\
  -F "companyType=COMPANY" \\
  -F "cacDocument=@cert.pdf"

# 3. Upload bank statement
curl -X POST ${BASE}/v1/customers/CUSTOMER_ID/statement \\
  -H "X-Api-Key: lcrd_your_api_key" \\
  -F "statement=@statement.pdf" \\
  -F "bankName=access"

# 4. Pull business credit bureau (FirstCentral commercial report)
curl -X POST ${BASE}/v1/customers/CUSTOMER_ID/business-bureau \\
  -H "X-Api-Key: lcrd_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"cacNumber":"RC1234567","businessName":"Okeke Ventures Ltd"}'

# 5. Submit directors — BVN check + individual bureau per director
curl -X POST ${BASE}/v1/customers/CUSTOMER_ID/directors \\
  -H "X-Api-Key: lcrd_your_api_key" \\
  -F 'directors=[{"name":"Chukwuemeka Okafor","bvn":"22312345678"}]' \\
  -F "idCards=@director-id.pdf"

# 6. Upload other financial documents (optional)
curl -X POST ${BASE}/v1/customers/CUSTOMER_ID/financials \\
  -H "X-Api-Key: lcrd_your_api_key" \\
  -F "documents=@management-accounts.pdf" \\
  -F "documents=@audited-report.pdf"

# 7. Add guarantor (optional)
curl -X POST ${BASE}/v1/customers/CUSTOMER_ID/guarantor \\
  -H "X-Api-Key: lcrd_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Tunde Balogun","phone":"08099887766","relationship":"Business partner"}'

# 8. Run loan review
curl -X POST ${BASE}/v1/customers/CUSTOMER_ID/loan-review \\
  -H "X-Api-Key: lcrd_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"loanAmount":5000000,"loanTenor":24,"annualRate":18}'`} />
        </Section>

        {/* Scorecard & Loan Review */}
        <Section title="Scorecard & Loan Review" id="scorecard">
          <p style={{ fontSize: 13, color: '#475569', marginBottom: 16 }}>
            Generate a consolidated credit scorecard or run a full loan eligibility assessment for a customer.
            Both endpoints pull the customer's latest BVN, NIN, bureau, and statement results automatically —
            no need to pass them in again.
          </p>

          <Endpoint
            method="POST" path="/v1/customers/:id/scorecard"
            desc="Generate credit scorecard from all available checks"
            response={`{
  "success": true,
  "recordId": "6643ab...",
  "scorecard": {
    "overallScore": 72,
    "grade": "B",
    "identityScore": 100,
    "creditScore": 68,
    "incomeScore": 74,
    "riskFlags": ["thin_file"],
    "recommendation": "conditional",
    "summary": "Identity verified. Credit history is thin. Income is stable."
  }
}`} />

          <Endpoint
            method="POST" path="/v1/customers/:id/loan-review"
            desc="Full loan eligibility assessment with repayment schedule"
            note="Sends a loan decision email and SMS to the borrower automatically."
            body={[
              { name: 'loanAmount',  type: 'number', required: true,  desc: 'Proposed loan amount in Naira' },
              { name: 'loanTenor',   type: 'number', required: true,  desc: 'Loan duration in months' },
              { name: 'annualRate',  type: 'number', required: true,  desc: 'Annual interest rate as a percentage e.g. 24 for 24%' },
            ]}
            response={`{
  "success": true,
  "recordId": "6643cd...",
  "review": {
    "verdict": "ELIGIBLE",
    "confidence": "HIGH",
    "avgScore": 74,
    "effectiveDTI": 0.28,
    "summary": "Borrower meets all eligibility criteria.",
    "suggestedMinAmount": 50000,
    "suggestedMaxAmount": 320000,
    "affordableMonthly": 28500,
    "proposedMonthlyPayment": 23400,
    "proposedTotalRepayment": 280800,
    "proposedTotalInterest": 30800,
    "flags": [],
    "conditions": [],
    "categories": { "identity": 100, "creditHistory": 68, "income": 74, "cashFlow": 71, "debtBurden": 80, "fraud": 100 }
  }
}`} />

          <CodeBlock code={`# Generate scorecard
curl -X POST ${BASE}/v1/customers/CUSTOMER_ID/scorecard \\
  -H "X-Api-Key: lcrd_your_api_key"

# Run loan review
curl -X POST ${BASE}/v1/customers/CUSTOMER_ID/loan-review \\
  -H "X-Api-Key: lcrd_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{ "loanAmount": 200000, "loanTenor": 12, "annualRate": 24 }'`} />
        </Section>

        {/* Re-run Checks */}
        <Section title="Re-run Checks" id="rerun">
          <p style={{ fontSize: 13, color: '#475569', marginBottom: 16 }}>
            Re-execute a previously run check using its stored result ID. The original BVN, NIN, or statement file
            is fetched from storage and re-submitted to the upstream provider — no need to resupply the input.
            Useful when a check failed due to a provider outage, or when refreshing stale data.
          </p>
          <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#92400e', marginBottom: 16 }}>
            ⚠ Re-runs are billed at the same rate as the original check. Statement re-runs require the original file to have been stored in S3 (happens automatically on successful analyses).
          </div>

          <Endpoint
            method="POST" path="/v1/customers/bvn/rerun/:resultId"
            desc="Re-run a BVN check using the stored BVN"
            response={`{ "success": true, "resultId": "...", "data": { "bvn": "223...", "firstName": "Amaka", ... } }`} />

          <Endpoint
            method="POST" path="/v1/customers/nin/rerun/:resultId"
            desc="Re-run a NIN check using the stored NIN"
            response={`{ "success": true, "resultId": "...", "data": { "nin": "123...", "firstname": "Amaka", ... } }`} />

          <Endpoint
            method="POST" path="/v1/customers/bureau/rerun/:resultId"
            desc="Re-run a credit bureau check using the stored BVN or RC number"
            response={`{ "success": true, "resultId": "...", "noRecord": false }`} />

          <Endpoint
            method="POST" path="/v1/customers/statement/rerun/:resultId"
            desc="Re-analyse a bank statement fetched from S3"
            note="Only works for statements that were successfully uploaded (have an S3 key stored)."
            response={`{ "success": true, "resultId": "...", "data": { "totalCredits": 850000, ... } }`} />

          <CodeBlock code={`# Re-run a failed BVN check
curl -X POST ${BASE}/v1/customers/bvn/rerun/RESULT_ID \\
  -H "X-Api-Key: lcrd_your_api_key"

# Re-analyse a bank statement
curl -X POST ${BASE}/v1/customers/statement/rerun/RESULT_ID \\
  -H "X-Api-Key: lcrd_your_api_key"`} />
        </Section>

        {/* Business KYC */}
        <Section title="Business KYC" id="business-kyc">
          <p style={{ fontSize: 13, color: '#475569', marginBottom: 16 }}>
            Verify a business entity via CAC registration lookup and pull a business credit report from FirstCentral.
            Use these endpoints when lending to SMEs or companies rather than individuals.
          </p>

          <Endpoint
            method="POST" path="/v1/customers/:id/verify-cac"
            desc="Verify CAC registration via Dojah CAC Basic — also runs TIN lookup automatically"
            note="Send as multipart/form-data. Customer must have customerType: business. Costs ₦175 (CAC) + ₦100 (TIN). Both results are stored on the customer record."
            body={[
              { name: 'cacNumber',    type: 'string', required: true,  desc: 'CAC / RC number e.g. RC1234567' },
              { name: 'companyType',  type: 'string', required: true,  desc: 'One of: BUSINESS_NAME | COMPANY | INCORPORATED_TRUSTEES | LIMITED_PARTNERSHIP | LIMITED_LIABILITY_PARTNERSHIP' },
              { name: 'businessName', type: 'string', required: false, desc: 'Update the customer name at the same time' },
              { name: 'cacDocument',  type: 'file',   required: false, desc: 'CAC certificate or registration document (PDF or image)' },
              { name: 'memartDocument', type: 'file', required: false, desc: 'Memorandum & Articles of Association (PDF or image)' },
              { name: 'statusReport',   type: 'file', required: false, desc: 'CAC Status Report (PDF or image)' },
            ]}
            response={`{
  "success": true,
  "cacVerified": true,
  "cacResult": {
    "company_name": "OKEKE VENTURES LIMITED",
    "rc_number": "RC1234567",
    "registration_date": "2019-03-15",
    "address": "123 Lagos Street, Ikeja",
    "affiliates": [{ "role": "DIRECTOR", "name": "Chukwuemeka Okafor" }]
  },
  "tinVerified": true,
  "tinResult": {
    "company_name": "OKEKE VENTURES LIMITED",
    "tax_id": "12345678-0001",
    "company_type": "COMPANY",
    "rc_number": "RC1234567"
  }
}`} />

          <Endpoint
            method="POST" path="/v1/customers/:id/verify-tin"
            desc="Re-run TIN verification independently without re-doing full CAC check"
            note="Uses the cacNumber already on the customer record. Costs ₦100. Specify companyType if not already set."
            body={[
              { name: 'cacNumber',   type: 'string', required: false, desc: 'RC number — defaults to the value already on the customer record' },
              { name: 'companyType', type: 'string', required: false, desc: 'Company type — defaults to COMPANY if not stored on the record' },
            ]}
            response={`{
  "success": true,
  "tinVerified": true,
  "tinResult": {
    "company_name": "OKEKE VENTURES LIMITED",
    "tax_id": "12345678-0001",
    "company_type": "COMPANY",
    "rc_number": "RC1234567"
  }
}`} />

          <Endpoint
            method="POST" path="/v1/customers/:id/directors"
            desc="Submit directors — runs BVN check + individual bureau per director"
            note="Send as multipart/form-data. Costs ₦75 BVN + ₦700 bureau per director. Directors are merged into the customer record."
            body={[
              { name: 'directors', type: 'JSON array', required: true,  desc: 'Array of objects: [{ name, bvn }]. At least one required.' },
              { name: 'idCards',   type: 'file[]',     required: false, desc: 'ID card files — one per director, in the same order as the directors array.' },
            ]}
            response={`{
  "success": true,
  "totalDirectors": 1,
  "results": [
    {
      "name": "Chukwuemeka Okafor",
      "bvn": "22312345678",
      "bvnStatus": "success",
      "bureauStatus": "success",
      "idCardKey": "customers/director-ids/director-0-id.pdf"
    }
  ]
}`} />

          <Endpoint
            method="POST" path="/v1/customers/:id/financials"
            desc="Upload additional financial documents — stored in S3 and linked to the customer"
            note="Send as multipart/form-data. Up to 10 files per request. Repeated calls append to existing documents."
            body={[
              { name: 'documents', type: 'file[]', required: true, desc: 'PDF, XLSX, DOCX — management accounts, audited reports, etc. Max 10MB each.' },
            ]}
            response={`{
  "success": true,
  "uploaded": 2,
  "documents": [
    { "filename": "management-accounts.pdf", "size": 204800, "uploadedAt": "2026-07-11T10:00:00Z" },
    { "filename": "audited-report.pdf",      "size": 512000, "uploadedAt": "2026-07-11T10:00:00Z" }
  ]
}`} />

          <Endpoint
            method="POST" path="/v1/customers/:id/guarantor"
            desc="Add or update guarantor details on a customer record"
            body={[
              { name: 'name',         type: 'string', required: true,  desc: 'Guarantor full name' },
              { name: 'phone',        type: 'string', required: true,  desc: 'Phone number' },
              { name: 'email',        type: 'string', required: false, desc: 'Email address' },
              { name: 'address',      type: 'string', required: false, desc: 'Address' },
              { name: 'relationship', type: 'string', required: false, desc: 'e.g. "Business partner", "Director", "Spouse"' },
            ]}
            response={`{ "success": true, "guarantor": { "name": "Tunde Balogun", "phone": "08099887766", "relationship": "Business partner" } }`} />

          <Endpoint
            method="POST" path="/v1/onboarding/sessions/:id/step/business"
            desc="Submit business info, verify CAC (Basic), and look up TIN — all in one call"
            note="Send as multipart/form-data. Requires an SME onboarding session. Costs ₦175 (CAC) + ₦100 (TIN). All results stored on the session and customer record."
            body={[
              { name: 'businessName',   type: 'string', required: true,  desc: 'Registered business name' },
              { name: 'cacNumber',      type: 'string', required: true,  desc: 'CAC RC number e.g. RC1234567' },
              { name: 'companyType',    type: 'string', required: true,  desc: 'One of: BUSINESS_NAME | COMPANY | INCORPORATED_TRUSTEES | LIMITED_PARTNERSHIP | LIMITED_LIABILITY_PARTNERSHIP' },
              { name: 'email',          type: 'string', required: false, desc: 'Business email address' },
              { name: 'phone',          type: 'string', required: false, desc: 'Business phone number' },
              { name: 'cacDocument',    type: 'file',   required: false, desc: 'CAC certificate or registration document (PDF or image)' },
              { name: 'memartDocument', type: 'file',   required: false, desc: 'Memorandum & Articles of Association (PDF or image)' },
              { name: 'statusReport',   type: 'file',   required: false, desc: 'CAC Status Report (PDF or image)' },
            ]}
            response={`{
  "success": true,
  "customerId": "6643ab...",
  "currentStep": 1,
  "cacResult": {
    "company_name": "OKEKE VENTURES LIMITED",
    "rc_number": "RC1234567",
    "address": "123 Lagos Street, Ikeja",
    "affiliates": [{ "role": "DIRECTOR", "name": "Chukwuemeka Okafor" }]
  },
  "tinResult": {
    "company_name": "OKEKE VENTURES LIMITED",
    "tax_id": "12345678-0001",
    "company_type": "COMPANY",
    "rc_number": "RC1234567"
  }
}`} />

          <Endpoint
            method="POST" path="/v1/customers/:id/business-bureau"
            desc="Pull business credit bureau report (FirstCentral) — costs ₦700"
            note="Customer must have customerType: business. Pass cacNumber in the body, or set it on the customer record first."
            body={[
              { name: 'cacNumber',    type: 'string', required: true,  desc: 'CAC / RC number used to query FirstCentral e.g. RC1234567' },
              { name: 'businessName', type: 'string', required: false, desc: 'Business name — improves matching accuracy. Defaults to the customer name.' },
            ]}
            response={`{
  "success": true,
  "resultId": "6643cd...",
  "noRecord": false,
  "data": {
    "PersonalDetails": { "ConsumerName": "OKEKE VENTURES LIMITED", ... },
    "Score": { "Value": 620 },
    "SummaryOfPerformance": { "TotalNoOfAccounts": 2, "TotalNoOfDelinquentFacilities": 0 }
  }
}`} />

          <Endpoint
            method="POST" path="/v1/onboarding/sessions/:id/step/business-bureau"
            desc="Same bureau check within an onboarding session — uses CAC from the business step"
            note="Alternative to the standalone endpoint above. Uses the RC number already stored in the session from the business step. Costs ₦700."
            response={`{
  "success": true,
  "resultId": "6643cd...",
  "noRecord": false,
  "currentStep": 3
}`} />

          <Endpoint
            method="POST" path="/v1/onboarding/sessions/:id/step/directors"
            desc="Submit directors — BVN verification + bureau per director"
            note="Send as multipart/form-data. directors field is a JSON array. Costs ₦75 BVN + ₦700 bureau per director."
            body={[
              { name: 'directors',  type: 'JSON array', required: true,  desc: 'Array of objects: [{ name, bvn }]. Minimum 1 director.' },
              { name: 'idCards',    type: 'file[]',     required: false, desc: 'Optional ID card files, one per director in same order as the directors array.' },
            ]}
            response={`{
  "success": true,
  "currentStep": 4,
  "results": [
    {
      "name": "Chukwuemeka Okafor",
      "bvnStatus": "success",
      "bureauStatus": "success",
      "idCardKey": "onboarding/director-ids/director-0-id.pdf"
    }
  ]
}`} />

          <CodeBlock code={`# 1. Verify CAC (Basic) + TIN and submit business info
curl -X POST ${BASE}/v1/onboarding/sessions/SESSION_ID/step/business \\
  -H "X-Api-Key: lcrd_your_api_key" \\
  -F "businessName=Okeke Ventures Ltd" \\
  -F "cacNumber=RC1234567" \\
  -F "companyType=COMPANY" \\
  -F "email=info@okeke.com" \\
  -F "cacDocument=@/path/to/cert.pdf"

# 2. Pull business bureau
curl -X POST ${BASE}/v1/onboarding/sessions/SESSION_ID/step/business-bureau \\
  -H "X-Api-Key: lcrd_your_api_key"

# 3. Submit directors (JSON array + optional ID card files)
curl -X POST ${BASE}/v1/onboarding/sessions/SESSION_ID/step/directors \\
  -H "X-Api-Key: lcrd_your_api_key" \\
  -F 'directors=[{"name":"Chukwuemeka Okafor","bvn":"22312345678"}]' \\
  -F "idCards=@/path/to/director-id.pdf"`} />
        </Section>

        {/* Self-Onboard Link */}
        <Section title="Self-Onboard Link" id="self-onboard">
          <p style={{ fontSize: 13, color: '#475569', marginBottom: 16 }}>
            Give customers a branded link they open in their browser and fill out themselves — no integration work required.
            Their data flows directly into your dashboard once they submit.
          </p>

          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 12px' }}>How it works</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {[
              ['1', 'Go to Settings → Customer Onboarding Link and save a custom slug (e.g. acme-mfb).'],
              ['2', 'Share the link — https://engine.lucred.co/onboard/your-slug — via SMS, email, or WhatsApp.'],
              ['3', 'The customer picks their type (Individual or SME/Business) and completes the form.'],
              ['4', 'On submission, the customer appears in your Customers list. You and the customer both receive a confirmation email.'],
            ].map(([n, text]) => (
              <div key={n} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: '#f8fafc', borderRadius: 10, padding: '12px 14px' }}>
                <span style={{ minWidth: 24, height: 24, borderRadius: '50%', background: '#6d28d9', color: '#fff', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{n}</span>
                <span style={{ fontSize: 13, color: '#334155', lineHeight: 1.6 }}>{text}</span>
              </div>
            ))}
          </div>

          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 12px' }}>What the customer fills in</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
            {[
              ['Individual', ['Full name', 'Phone number', 'Email address', 'Bank statement (PDF)', 'Guarantor details (optional)']],
              ['SME / Business', ['Business name + email', 'RC number + company type', 'CAC certificate (PDF)', 'Memart document (PDF)', 'Status report (PDF)', 'Bank statement (PDF)']],
            ].map(([type, fields]) => (
              <div key={type} style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#6d28d9', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>{type}</div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#475569', lineHeight: 1.9 }}>
                  {fields.map(f => <li key={f}>{f}</li>)}
                </ul>
              </div>
            ))}
          </div>

          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 12px' }}>Verifications run automatically</h3>
          <p style={{ fontSize: 13, color: '#475569', marginBottom: 12 }}>
            Lucred runs the following checks during submission and bills them to your wallet:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 24 }}>
            {[
              ['Individual', 'Credit bureau (₦700) + Statement analysis (₦500)'],
              ['SME / Business', 'CAC Basic (₦175) + TIN (₦100) + Statement analysis (₦500)'],
            ].map(([type, checks]) => (
              <div key={type} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
                <span style={{ fontWeight: 700, color: '#0f172a', marginRight: 8 }}>{type}:</span>
                <span style={{ color: '#475569' }}>{checks}</span>
              </div>
            ))}
          </div>

          <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 10, padding: '14px 16px', fontSize: 13, color: '#92400e' }}>
            <strong>Note:</strong> Changing your slug breaks any previously shared links. Old links will show a "not found" page until you update them.
          </div>
        </Section>

        {/* Customer Onboarding (API) */}
        <Section title="Customer Onboarding (API)" id="onboarding">
          <p style={{ fontSize: 13, color: '#475569', marginBottom: 16 }}>
            Run a full onboarding flow for a customer — individual or SME — programmatically via API.
            Each session is resumable and tracks verification state across steps.
            All verifications are billed at standard rates and logged in the audit trail.
          </p>

          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '14px 16px', fontSize: 13, color: '#0369a1', marginBottom: 20 }}>
            <strong>Tip — shareable link alternative:</strong> If you want customers to self-complete the form in a browser without any integration work, generate a shareable link from <strong>Settings → Customer Onboarding Link</strong>. This API is for server-to-server use where your system already holds the customer data.
          </div>

          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '24px 0 12px' }}>Session lifecycle</h3>
          <div style={{ fontSize: 13, color: '#475569', marginBottom: 20, lineHeight: 1.8 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                ['Individual', 'Create session → personal → bureau → statement → complete'],
                ['SME',        'Create session → business → statement → business-bureau → directors → financials* → guarantor* → complete'],
              ].map(([type, flow]) => (
                <div key={type} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', fontFamily: 'monospace', fontSize: 12 }}>
                  <span style={{ fontWeight: 700, color: '#6d28d9', marginRight: 10 }}>{type}</span>{flow}
                  {type === 'SME' && <span style={{ color: '#94a3b8', fontSize: 11 }}> (* optional)</span>}
                </div>
              ))}
            </div>
          </div>

          <Endpoint
            method="POST" path="/v1/onboarding/sessions"
            desc="Create a new onboarding session"
            body={[
              { name: 'type',       type: 'string', required: true,  desc: '"individual" or "sme"' },
              { name: 'customerId', type: 'string', required: false, desc: 'Link session to an existing customer record' },
            ]}
            response={`{
  "sessionId": "6643ab...",
  "type": "individual",
  "status": "in_progress",
  "currentStep": 0,
  "completedSteps": []
}`} />

          <Endpoint
            method="GET" path="/v1/onboarding/sessions"
            desc="List all onboarding sessions"
            body={[
              { name: 'type',   type: 'query', required: false, desc: '"individual" or "sme"' },
              { name: 'status', type: 'query', required: false, desc: '"in_progress" or "complete"' },
              { name: 'limit',  type: 'query', required: false, desc: 'Max results (default 50)' },
              { name: 'skip',   type: 'query', required: false, desc: 'Pagination offset' },
            ]}
            response={`{ "total": 28, "sessions": [ { "sessionId": "...", "type": "sme", "status": "complete", ... } ] }`} />

          <Endpoint
            method="GET" path="/v1/onboarding/sessions/:id"
            desc="Get full session data including all verification results"
            response={`{
  "sessionId": "6643ab...",
  "type": "individual",
  "status": "in_progress",
  "currentStep": 2,
  "completedSteps": [0, 1],
  "customer": "6643cd...",
  "data": { "personal": { "name": "Amaka Okafor", "bvn": "223...", ... } },
  "verifications": {
    "bvn":    { "status": "success", "resultId": "..." },
    "nin":    { "status": "success", "resultId": "..." },
    "bureau": { "status": "success", "resultId": "..." }
  }
}`} />

          <Endpoint
            method="GET" path="/v1/onboarding/sessions/:id/status"
            desc="Poll verification statuses (BVN/NIN run in background)"
            response={`{
  "status": "in_progress",
  "verifications": {
    "bvn": { "status": "success", "resultId": "..." },
    "nin": { "status": "running" }
  }
}`} />

          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '24px 0 8px' }}>Individual steps</h3>

          <Endpoint
            method="POST" path="/v1/onboarding/sessions/:id/step/personal"
            desc="Submit personal info — triggers background BVN + NIN checks"
            body={[
              { name: 'name',    type: 'string', required: true,  desc: 'Full name' },
              { name: 'phone',   type: 'string', required: true,  desc: 'Phone number' },
              { name: 'email',   type: 'string', required: false, desc: 'Email address' },
              { name: 'bvn',     type: 'string', required: false, desc: '11-digit BVN — triggers background BVN check (₦75)' },
              { name: 'nin',     type: 'string', required: false, desc: '11-digit NIN — triggers background NIN check (₦100)' },
              { name: 'address', type: 'string', required: false, desc: 'Home address' },
            ]}
            response={`{ "success": true, "customerId": "6643ab...", "sessionId": "...", "currentStep": 1 }`} />

          <Endpoint
            method="POST" path="/v1/onboarding/sessions/:id/step/bureau"
            desc="Pull individual credit bureau from FirstCentral — costs ₦700"
            note="Requires BVN to have been submitted in the personal step."
            response={`{
  "success": true,
  "resultId": "6643cd...",
  "currentStep": 2,
  "summary": {
    "name": "AMAKA OKAFOR",
    "score": 680,
    "totalAccounts": 3,
    "delinquentAccounts": 0
  }
}`} />

          <Endpoint
            method="POST" path="/v1/onboarding/sessions/:id/step/statement"
            desc="Upload & analyse bank statement — costs ₦500"
            note="Send as multipart/form-data. Works for both individual and SME sessions."
            body={[
              { name: 'statement', type: 'file',   required: true,  desc: 'PDF, XLSX, CSV, or DOCX — max 10MB' },
              { name: 'bankName',  type: 'string', required: false, desc: 'Bank name e.g. access, gtb, kuda' },
              { name: 'password',  type: 'string', required: false, desc: 'PDF password if statement is encrypted' },
            ]}
            response={`{ "success": true, "resultId": "6643ef...", "currentStep": 3 }`} />

          <Endpoint
            method="POST" path="/v1/onboarding/sessions/:id/step/financials"
            desc="Upload additional financial documents — SME only, optional"
            note="Send as multipart/form-data. Up to 10 files."
            body={[
              { name: 'documents', type: 'file[]', required: false, desc: 'Management accounts, audited reports, etc. PDF, XLSX, DOCX.' },
            ]}
            response={`{ "success": true, "uploaded": 2, "currentStep": 5 }`} />

          <Endpoint
            method="POST" path="/v1/onboarding/sessions/:id/step/guarantor"
            desc="Submit guarantor details — SME only, optional"
            body={[
              { name: 'name',         type: 'string', required: false, desc: 'Guarantor full name' },
              { name: 'phone',        type: 'string', required: false, desc: 'Phone number' },
              { name: 'email',        type: 'string', required: false, desc: 'Email address' },
              { name: 'address',      type: 'string', required: false, desc: 'Address' },
              { name: 'relationship', type: 'string', required: false, desc: 'e.g. "Business partner", "Director"' },
            ]}
            response={`{ "success": true, "currentStep": 6 }`} />

          <Endpoint
            method="POST" path="/v1/onboarding/sessions/:id/complete"
            desc="Mark session complete — returns all verification result IDs"
            response={`{
  "success": true,
  "sessionId": "6643ab...",
  "customerId": "6643cd...",
  "type": "individual",
  "verifications": {
    "bvn":    { "status": "success", "resultId": "..." },
    "nin":    { "status": "success", "resultId": "..." },
    "bureau": { "status": "success", "resultId": "..." },
    "statement": { "status": "success", "resultId": "..." }
  }
}`} />

          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '24px 0 8px' }}>Full SME example</h3>
          <CodeBlock code={`# Step 1 — create SME session
curl -X POST ${BASE}/v1/onboarding/sessions \\
  -H "X-Api-Key: lcrd_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"type":"sme"}'
# → { "sessionId": "SESSION_ID", ... }

# Step 2 — business info + CAC (Basic) + TIN
curl -X POST ${BASE}/v1/onboarding/sessions/SESSION_ID/step/business \\
  -H "X-Api-Key: lcrd_your_api_key" \\
  -F "businessName=Okeke Ventures Ltd" \\
  -F "cacNumber=RC1234567" \\
  -F "companyType=COMPANY"

# Step 3 — bank statement
curl -X POST ${BASE}/v1/onboarding/sessions/SESSION_ID/step/statement \\
  -H "X-Api-Key: lcrd_your_api_key" \\
  -F "statement=@statement.pdf" \\
  -F "bankName=access"

# Step 4 — business bureau
curl -X POST ${BASE}/v1/onboarding/sessions/SESSION_ID/step/business-bureau \\
  -H "X-Api-Key: lcrd_your_api_key"

# Step 5 — directors
curl -X POST ${BASE}/v1/onboarding/sessions/SESSION_ID/step/directors \\
  -H "X-Api-Key: lcrd_your_api_key" \\
  -F 'directors=[{"name":"Chukwuemeka Okafor","bvn":"22312345678"}]'

# Step 6 — complete
curl -X POST ${BASE}/v1/onboarding/sessions/SESSION_ID/complete \\
  -H "X-Api-Key: lcrd_your_api_key"`} />
        </Section>

        {/* Webhooks */}
        <Section title="Webhooks" id="webhooks">
          <p style={{ fontSize: 13, color: '#475569', marginBottom: 16 }}>
            Register a URL to receive real-time event notifications whenever a check completes, a customer is created,
            or an onboarding session finishes. Lucred sends a <code>POST</code> request to your endpoint with a JSON payload.
            Each delivery is logged and retryable from the dashboard.
          </p>

          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 12px' }}>Managing webhooks</h3>

          <Endpoint method="GET"    path="/api/webhooks"          desc="List all registered webhooks" />
          <Endpoint method="POST"   path="/api/webhooks"          desc="Register a new webhook endpoint"
            body={[
              { name: 'url',    type: 'string',   required: true,  desc: 'HTTPS URL to receive events' },
              { name: 'events', type: 'string[]', required: true,  desc: 'Event types to subscribe to (see list below)' },
              { name: 'secret', type: 'string',   required: false, desc: 'Optional signing secret — included in X-Lucred-Signature header for verification' },
            ]}
            response={`{ "_id": "6643ab...", "url": "https://yourapp.com/hooks/lucred", "events": ["bvn.success"], "active": true }`} />
          <Endpoint method="PATCH"  path="/api/webhooks/:id"      desc="Update URL, events, or active status"
            body={[
              { name: 'url',    type: 'string',   required: false, desc: 'New endpoint URL' },
              { name: 'events', type: 'string[]', required: false, desc: 'Replace event subscriptions' },
              { name: 'active', type: 'boolean',  required: false, desc: 'Pause (false) or resume (true) deliveries' },
            ]} />
          <Endpoint method="DELETE" path="/api/webhooks/:id"      desc="Delete a webhook" />
          <Endpoint method="POST"   path="/api/webhooks/:id/test" desc="Send a test payload to verify your endpoint is reachable" />
          <Endpoint method="GET"    path="/api/webhooks/deliveries"        desc="List recent deliveries across all webhooks" />
          <Endpoint method="GET"    path="/api/webhooks/:id/deliveries"    desc="List deliveries for a specific webhook" />
          <Endpoint method="POST"   path="/api/webhooks/:id/deliveries/:deliveryId/retry" desc="Retry a failed delivery" />

          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '20px 0 12px' }}>Event types</h3>
          {[
            ['bvn.success',           'BVN check completed successfully'],
            ['bvn.failed',            'BVN check failed or returned an error'],
            ['nin.success',           'NIN check completed successfully'],
            ['nin.failed',            'NIN check failed'],
            ['bureau.success',        'Credit bureau report retrieved'],
            ['bureau.failed',         'Bureau check failed'],
            ['statement.success',     'Bank statement analysed successfully'],
            ['statement.failed',      'Statement analysis failed'],
            ['customer.created',      'A new customer record was created'],
            ['onboarding.complete',   'A customer completed the onboarding flow'],
          ].map(([event, desc]) => (
            <div key={event} style={{ display: 'flex', gap: 16, padding: '8px 0', borderBottom: '1px solid #f1f5f9', alignItems: 'baseline' }}>
              <code style={{ fontSize: 12, fontWeight: 700, color: '#6d28d9', minWidth: 200 }}>{event}</code>
              <span style={{ fontSize: 13, color: '#64748b' }}>{desc}</span>
            </div>
          ))}

          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '20px 0 12px' }}>Payload shape</h3>
          <pre style={s.code}>{`{
  "event": "bvn.success",
  "timestamp": "2026-07-10T12:34:56Z",
  "data": {
    "resultId": "6643ab...",
    "customerId": "6643cd...",
    "bvn": "22312345678",
    "firstName": "Amaka",
    "lastName": "Okafor"
  }
}`}</pre>

          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '20px 0 8px' }}>Signature verification</h3>
          <p style={{ fontSize: 13, color: '#475569', marginBottom: 12 }}>
            If you set a <code>secret</code> when registering the webhook, every request includes an
            <code> X-Lucred-Signature</code> header containing an HMAC-SHA256 of the raw request body.
            Verify it to confirm the payload came from Lucred.
          </p>
          <CodeBlock code={`// Node.js example
const crypto = require('crypto');

function verifyWebhook(rawBody, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  );
}`} />
        </Section>

        {/* Errors */}
        <Section title="Error Codes" id="errors">
          <p style={{ fontSize: 13, color: '#475569', marginBottom: 16 }}>All errors return JSON with an <code>error</code> field describing the problem.</p>
          {[
            { code: '400', label: 'Bad Request', desc: 'Missing or invalid fields in the request body.' },
            { code: '401', label: 'Unauthorized', desc: 'Missing or invalid X-Api-Key header.' },
            { code: '402', label: 'Payment Required', desc: 'Insufficient wallet balance. Top up your wallet to continue.' },
            { code: '403', label: 'Forbidden', desc: 'Account pending approval, suspended, or email not verified.' },
            { code: '404', label: 'Not Found', desc: 'The requested customer or resource does not exist.' },
            { code: '429', label: 'Rate Limited', desc: "Monthly API limit reached for your plan. Upgrade or wait for reset." },
            { code: '502', label: 'Upstream Error', desc: 'The upstream provider (NIBSS, NIMC, FirstCentral) returned an error.' },
            { code: '500', label: 'Server Error', desc: 'Unexpected error. Contact support@lucred.co if it persists.' },
          ].map(e => (
            <div key={e.code} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
              <code style={{ fontSize: 13, fontWeight: 800, color: Number(e.code) >= 500 ? '#dc2626' : Number(e.code) >= 400 ? '#d97706' : '#16a34a', width: 36, flexShrink: 0 }}>{e.code}</code>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', width: 130, flexShrink: 0 }}>{e.label}</span>
              <span style={{ fontSize: 13, color: '#64748b' }}>{e.desc}</span>
            </div>
          ))}
        </Section>
      </div>
    </div>
  );
}

const s = {
  code:       { background: '#0f172a', color: '#e2e8f0', borderRadius: 8, padding: '14px 16px', fontSize: 12, fontFamily: 'monospace', overflowX: 'auto', margin: 0, lineHeight: 1.6 },
  paramTitle: { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, margin: '14px 0 8px' },
  paramRow:   { display: 'flex', gap: 10, alignItems: 'baseline', padding: '5px 0', borderBottom: '1px solid #f8fafc', flexWrap: 'wrap' },
  paramName:  { fontSize: 12, fontWeight: 700, color: '#6d28d9', minWidth: 140 },
  paramType:  { fontSize: 11, color: '#94a3b8', background: '#f1f5f9', padding: '1px 6px', borderRadius: 4 },
  paramReq:   { fontSize: 11, fontWeight: 600, color: '#0ea5e9' },
  paramDesc:  { fontSize: 12, color: '#64748b', flex: 1 },
};
