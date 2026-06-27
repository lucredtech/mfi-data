import { useState } from 'react';

const BASE = 'https://mfi-data-production.up.railway.app';

const SECTIONS = [
  { id: 'auth',       label: 'Authentication' },
  { id: 'bvn',        label: 'BVN Verification' },
  { id: 'nin',        label: 'NIN Verification' },
  { id: 'bureau',     label: 'Credit Bureau' },
  { id: 'statement',  label: 'Statement Analysis' },
  { id: 'customers',  label: 'Customers' },
  { id: 'errors',     label: 'Error Codes' },
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
          <p style={{ fontSize: 13, color: '#475569', marginBottom: 16 }}>Upload a PDF or image bank statement for AI-powered income, spend, and repayment capacity analysis. Costs <strong>₦500</strong> per analysis. First 3 per month are free.</p>
          <Endpoint
            method="POST" path="/v1/statement/upload-analyze"
            desc="Upload & analyse a bank statement"
            note="Send as multipart/form-data"
            body={[
              { name: 'statement', type: 'file', required: true, desc: 'PDF, JPEG, or PNG — max 10MB' },
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
