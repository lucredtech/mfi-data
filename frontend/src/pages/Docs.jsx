import { API_BASE as BASE } from '../services/api';
import { useState } from 'react';


const SECTIONS = [
  { id: 'auth',             label: 'Authentication' },
  { id: 'bvn',             label: 'BVN Verification' },
  { id: 'nin',             label: 'NIN Verification' },
  { id: 'bureau',          label: 'Credit Bureau' },
  { id: 'statement',       label: 'Statement Analysis' },
  { id: 'customers',       label: 'Customers' },
  { id: 'scorecard',       label: 'Scorecard & Loan Review' },
  { id: 'rerun',           label: 'Re-run Checks' },
  { id: 'business-kyc',    label: 'Business KYC' },
  { id: 'onboarding',      label: 'Customer Onboarding' },
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
          <p style={{ fontSize: 13, color: '#475569', marginBottom: 16 }}>Manage borrower profiles programmatically. All checks (BVN, NIN, bureau, statement) are linked to a customer record.</p>
          <Endpoint method="POST" path="/v1/customers" desc="Create a customer"
            body={[
              { name: 'name',         type: 'string', required: true,  desc: "Full name" },
              { name: 'email',        type: 'string', required: false, desc: "Email address" },
              { name: 'phone',        type: 'string', required: false, desc: "Phone number" },
              { name: 'bvn',          type: 'string', required: false, desc: "BVN (11 digits)" },
              { name: 'nin',          type: 'string', required: false, desc: "NIN (11 digits)" },
              { name: 'customerType', type: 'string', required: false, desc: "individual (default) or business" },
            ]}
            response={`{ "customer": { "_id": "...", "name": "Amaka Okafor", ... } }`} />
          <Endpoint method="GET" path="/v1/customers" desc="List customers"
            body={[
              { name: 'q',      type: 'query', required: false, desc: "Search by name, email, or BVN" },
              { name: 'status', type: 'query', required: false, desc: "Filter by status: active, watchlist, blacklisted" },
              { name: 'limit',  type: 'query', required: false, desc: "Max results (default 50)" },
              { name: 'skip',   type: 'query', required: false, desc: "Offset for pagination" },
            ]}
            response={`{ "customers": [...], "total": 142 }`} />
          <Endpoint method="GET" path="/v1/customers/:id" desc="Get customer with all checks"
            response={`{
  "customer": { "_id": "...", "name": "Amaka Okafor", ... },
  "bvnResults": [...],
  "ninResults": [...],
  "bureauResults": [...],
  "statements": [...],
  "latestScorecard": { ... }
}`} />
          <Endpoint method="PATCH" path="/v1/customers/:id" desc="Update customer fields"
            body={[
              { name: 'name',   type: 'string', required: false, desc: "Full name" },
              { name: 'email',  type: 'string', required: false, desc: "Email" },
              { name: 'phone',  type: 'string', required: false, desc: "Phone" },
              { name: 'status', type: 'string', required: false, desc: "active | watchlist | blacklisted" },
            ]} />
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
            method="POST" path="/v1/onboarding/sessions/:id/step/business"
            desc="Submit business info & verify CAC"
            note="Send as multipart/form-data. Requires an SME onboarding session (see Customer Onboarding section)."
            body={[
              { name: 'businessName', type: 'string', required: true,  desc: 'Registered business name' },
              { name: 'cacNumber',    type: 'string', required: true,  desc: 'CAC RC number e.g. RC1234567' },
              { name: 'email',        type: 'string', required: false, desc: 'Business email address' },
              { name: 'phone',        type: 'string', required: false, desc: 'Business phone number' },
              { name: 'cacDocument',  type: 'file',   required: false, desc: 'CAC certificate or registration document (PDF or image)' },
            ]}
            response={`{
  "success": true,
  "customerId": "6643ab...",
  "currentStep": 1,
  "cacResult": {
    "company_name": "Okeke Ventures Limited",
    "rc_number": "RC1234567",
    "registration_date": "2019-03-15",
    "company_type": "Private Limited Company",
    "status": "Active"
  }
}`} />

          <Endpoint
            method="POST" path="/v1/onboarding/sessions/:id/step/business-bureau"
            desc="Pull business credit bureau report (FirstCentral)"
            note="Run after the business step. Uses the CAC/RC number to query FirstCentral. Costs ₦700."
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

          <CodeBlock code={`# 1. Verify CAC and submit business info
curl -X POST ${BASE}/v1/onboarding/sessions/SESSION_ID/step/business \\
  -H "X-Api-Key: lcrd_your_api_key" \\
  -F "businessName=Okeke Ventures Ltd" \\
  -F "cacNumber=RC1234567" \\
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

        {/* Customer Onboarding */}
        <Section title="Customer Onboarding" id="onboarding">
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

# Step 2 — business info + CAC
curl -X POST ${BASE}/v1/onboarding/sessions/SESSION_ID/step/business \\
  -H "X-Api-Key: lcrd_your_api_key" \\
  -F "businessName=Okeke Ventures Ltd" \\
  -F "cacNumber=RC1234567"

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
