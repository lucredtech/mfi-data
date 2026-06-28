import { useState } from 'react';

const BASE = import.meta.env.VITE_API_URL || 'https://mfi-data-production.up.railway.app';

const SECTIONS = [
  {
    id: 'overview', title: 'Overview',
    content: `The Lucred Credit API lets you embed identity verification, credit bureau checks, bank statement analysis, and AI-powered loan eligibility scoring directly into your lending platform.

All endpoints are REST-based and return JSON. Authentication uses your API key passed as an HTTP header.`,
  },
  {
    id: 'auth', title: 'Authentication',
    content: `Every API request must include your API key in the request header:\n\nX-Api-Key: lcrd_your_api_key_here\n\nYou can generate and manage API keys from your dashboard under API Keys. Keep your key secret — it grants full access to your account.`,
    code: `curl -X POST ${BASE}/v1/customers \\
  -H "X-Api-Key: lcrd_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Amaka Obi", "email": "amaka@example.com"}'`,
  },
];

const ENDPOINTS = [
  // Customers
  {
    group: 'Customers',
    method: 'POST', path: '/v1/customers',
    title: 'Create Customer',
    description: 'Create a new customer profile. All subsequent checks (BVN, NIN, bureau, statement) should reference this customer ID.',
    request: { name: 'Amaka Obi', email: 'amaka@example.com', phone: '08012345678', bvn: '22222222222', customerType: 'individual' },
    response: { customer: { _id: '64a1b2c3d4e5f6a7b8c9d0e1', name: 'Amaka Obi', email: 'amaka@example.com', status: 'applied', createdAt: '2025-01-15T10:00:00Z' }, duplicate: null },
    notes: 'If a customer with the same BVN, NIN, or phone already exists in your account, the `duplicate` field will contain their ID and name.',
  },
  {
    group: 'Customers',
    method: 'GET', path: '/v1/customers',
    title: 'List Customers',
    description: 'Retrieve a paginated list of your customers.',
    queryParams: [{ key: 'status', desc: 'Filter by pipeline status: applied | under_review | approved | rejected | disbursed' }, { key: 'q', desc: 'Search by name, email, or BVN' }, { key: 'limit', desc: 'Results per page (default: 50, max: 50)' }, { key: 'skip', desc: 'Number of records to skip for pagination' }],
    response: { customers: [{ _id: '64a1b2c3...', name: 'Amaka Obi', status: 'approved' }], total: 128 },
  },
  {
    group: 'Customers',
    method: 'GET', path: '/v1/customers/:id',
    title: 'Get Customer',
    description: 'Retrieve a customer profile along with their latest BVN, NIN, bureau, statement, loan reviews, and scorecard.',
    response: { customer: { _id: '64a1b2c3...', name: 'Amaka Obi', status: 'approved' }, bvnResults: [], ninResults: [], bureauResults: [], statements: [], loanReviews: [], latestScorecard: null },
  },
  {
    group: 'Customers',
    method: 'PATCH', path: '/v1/customers/:id',
    title: 'Update Customer',
    description: 'Update customer fields or pipeline status.',
    request: { status: 'approved' },
    response: { customer: { _id: '64a1b2c3...', name: 'Amaka Obi', status: 'approved' } },
    notes: 'Updatable fields: name, email, phone, address, status. Status values: applied | under_review | approved | rejected | disbursed',
  },

  // Identity
  {
    group: 'Identity Verification',
    method: 'POST', path: '/v1/customers/:id/verify-bvn',
    title: 'Verify BVN',
    description: 'Verify a customer\'s Bank Verification Number against government databases. Result is saved to the customer profile and visible in your dashboard.',
    request: { bvn: '22222222222' },
    response: { success: true, data: { isValid: true, bvn: '22222222222', firstName: 'AMAKA', lastName: 'OBI', dateOfBirth: '1990-05-12', gender: 'Female', phoneNumber: '080XXXXXXXX', watchListed: false, levelOfAccount: 'Level 3' }, resultId: '64a...', duplicate: null },
    notes: 'The `watchListed` field indicates if the customer is flagged on government watchlists. Treat this as an automatic disqualifier.',
  },
  {
    group: 'Identity Verification',
    method: 'POST', path: '/v1/customers/:id/verify-nin',
    title: 'Verify NIN',
    description: 'Verify a customer\'s National Identification Number. Result is saved to the customer profile.',
    request: { nin: '33333333333' },
    response: { success: true, data: { isValid: true, nin: '33333333333', firstName: 'AMAKA', lastName: 'OBI', dateOfBirth: '1990-05-12', gender: 'Female', stateOfOrigin: 'Anambra', watchListed: false }, resultId: '64b...', duplicate: null },
  },

  // Credit Bureau
  {
    group: 'Credit Bureau',
    method: 'POST', path: '/v1/customers/:id/credit-bureau',
    title: 'Credit Bureau Check',
    description: 'Pull the customer\'s full credit history from FirstCentral. Returns credit score, active loans, arrears, payment history, and delinquency records.',
    request: { bvn: '22222222222', firstName: 'Amaka', lastName: 'Obi', dateOfBirth: '1990-05-12' },
    response: { success: true, data: { creditScore: 720, activeLoans: 1, totalOutstanding: 50000, arrears: 0, delinquencies: 0, rating: 'Good' }, resultId: '64c...' },
    notes: 'If you have already verified the customer\'s BVN, the `bvn` field is optional — it will be pulled from their profile automatically.',
  },

  // Statement
  {
    group: 'Bank Statement Analysis',
    method: 'POST', path: '/v1/customers/:id/statement',
    title: 'Analyse Bank Statement',
    description: 'Upload a bank statement (PDF, CSV, XLSX, or DOCX) for AI-powered analysis. PDF is highly recommended for best accuracy. Returns income, cash flow, spending behaviour, debt servicing ratio, and a risk grade (A–E).',
    contentType: 'multipart/form-data',
    formFields: [
      { key: 'statement', desc: 'Bank statement file — PDF, CSV, XLSX, or DOCX, max 10MB. PDF is highly recommended (required)' },
      { key: 'bankName', desc: 'Bank identifier string (optional but recommended — improves parsing accuracy). Supported values: access, fcmb, fidelity, firstbank, gtb, kuda, moniepoint, nova, opay, optimus, parallex, sterling, uba, vbank' },
      { key: 'password', desc: 'PDF password if the file is encrypted (optional)' },
    ],
    curlExample: `curl -X POST ${BASE}/v1/customers/64a1b2c3/statement \\
  -H "X-Api-Key: lcrd_your_api_key" \\
  -F "statement=@/path/to/statement.pdf" \\
  -F "bankName=Access Bank"`,
    response: { success: true, data: { overallRiskScore: { overallRiskScore: 'B', recommendation: 'Proceed with standard loan terms', scoreBreakdown: { incomeStability: 18, debtServicing: 20, spendingBehavior: 16, liquidity: 14 } }, cashFlowAnalysis: { totalCashInflow: 540000, totalCashOutflow: 380000 }, incomeSourceAnalysis: { monthlyAverageIncome: 180000, isSalaryEarner: true } }, resultId: '64d...' },
  },

  // Scorecard
  {
    group: 'Scoring & Eligibility',
    method: 'POST', path: '/v1/customers/:id/scorecard',
    title: 'Generate Scorecard',
    description: 'Compute a comprehensive credit scorecard for the customer using all available data (BVN, NIN, bureau, statement). No request body needed — pulls the latest verified data from the customer profile.',
    request: null,
    response: { success: true, scorecard: { riskGrade: 'B', riskRecommendation: 'Proceed with standard loan terms', scoreBreakdown: { incomeStability: { score: 18, grade: 'B', label: 'GOOD' }, debtServicing: { score: 20, grade: 'A', label: 'EXCELLENT' }, spendingBehavior: { score: 16, grade: 'B', label: 'GOOD' }, liquidity: { score: 14, grade: 'C', label: 'FAIR' } }, cashFlow: { monthlyAverageIncome: 180000, isSalaryEarner: true, savingsRate: 29.6 }, bureau: { score: 720, activeArrears: 0, hasJudgement: false }, identity: { bvnVerified: true, ninVerified: true, watchListed: false }, dataAvailability: { bvn: true, nin: true, bureau: true, statement: true } }, recordId: '64e...' },
  },
  {
    group: 'Scoring & Eligibility',
    method: 'POST', path: '/v1/customers/:id/loan-review',
    title: 'Loan Eligibility Review',
    description: 'Run a full 6-category eligibility assessment for a proposed loan. Returns a verdict (ELIGIBLE / CONDITIONAL / NOT_ELIGIBLE), DTI, suggested loan range, and repayment schedule.',
    request: { loanAmount: 500000, loanTenor: 12, annualRate: 24 },
    response: { success: true, review: { verdict: 'ELIGIBLE', confidence: 'HIGH', avgScore: 78, summary: 'All criteria satisfied. Score 78/100. Post-loan DTI 34%.', effectiveDTI: 34, suggestedMinAmount: 200000, suggestedMaxAmount: 600000, affordableMonthly: 95000, proposedMonthlyPayment: 50000, proposedTotalRepayment: 600000, proposedTotalInterest: 100000, categories: { identityIntegrity: { score: 90, status: 'PASS', notes: 'Both BVN and NIN verified' }, creditHistory: { score: 85, status: 'PASS', notes: 'Good bureau score' }, incomeAndCashFlow: { score: 75, status: 'PASS', notes: 'Monthly income ₦180,000' }, debtServicing: { score: 72, status: 'PASS', notes: 'DTI 34% — acceptable' }, riskProfile: { score: 78, status: 'PASS', notes: 'Risk grade B' }, behavioralAnalysis: { score: 68, status: 'PASS', notes: 'No high-risk patterns' } }, flags: [], conditions: [], dataAvailability: { bvn: true, nin: true, bureau: true, statement: true } }, recordId: '64f...' },
    notes: '`loanAmount` is in Naira (NGN). `annualRate` is the annual interest rate as a percentage. All three fields are optional — if omitted, the review runs without DTI calculation but still returns a verdict based on identity, bureau, and statement data.',
  },
];

const GROUPS = [...new Set(ENDPOINTS.map(e => e.group))];
const METHOD_COLOR = { GET: '#0284c7', POST: '#7c3aed', PATCH: '#d97706', DELETE: '#dc2626' };

export default function PublicDocs() {
  const [activeGroup, setActiveGroup] = useState('');
  const [expandedEndpoint, setExpandedEndpoint] = useState(null);

  const filtered = activeGroup ? ENDPOINTS.filter(e => e.group === activeGroup) : ENDPOINTS;

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', minHeight: '100vh', background: '#f8fafc' }}>
      {/* Header */}
      <div style={{ background: '#0f172a', color: '#fff', padding: '2rem 0' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#38bdf8', marginBottom: 4 }}>Lucred</div>
              <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>API Reference</h1>
              <p style={{ color: '#94a3b8', marginTop: 8, marginBottom: 0 }}>
                Base URL: <code style={s.inlineCode}>{BASE}</code> &nbsp;·&nbsp; Auth: <code style={s.inlineCode}>X-Api-Key</code> header
              </p>
            </div>
            <a href="/login" style={{ fontSize: 13, fontWeight: 600, color: '#38bdf8', textDecoration: 'none', border: '1px solid #38bdf8', padding: '8px 16px', borderRadius: 8 }}>
              Dashboard →
            </a>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem' }}>
        {/* Overview */}
        <div style={s.card}>
          <h2 style={s.h2}>Overview</h2>
          <p style={s.p}>The Lucred Credit API lets you embed identity verification, credit bureau checks, bank statement analysis, and AI-powered loan eligibility scoring directly into your lending platform.</p>
          <p style={s.p}>All endpoints are REST-based and return JSON. A customer profile is the central object — create one first, then attach checks and analyses to it. Everything you do via API is visible in your dashboard.</p>

          <div style={{ background: '#0f172a', borderRadius: 10, padding: '1rem 1.25rem', marginTop: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Authentication</div>
            <pre style={s.codeBlock}>{'X-Api-Key: lcrd_your_api_key_here'}</pre>
          </div>
        </div>

        {/* Typical workflow */}
        <div style={s.card}>
          <h2 style={s.h2}>Typical Workflow</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              ['1', 'Create a customer', 'POST /v1/customers'],
              ['2', 'Verify identity', 'POST /v1/customers/:id/verify-bvn  +  /verify-nin'],
              ['3', 'Pull credit bureau', 'POST /v1/customers/:id/credit-bureau'],
              ['4', 'Analyse bank statement', 'POST /v1/customers/:id/statement'],
              ['5', 'Generate scorecard', 'POST /v1/customers/:id/scorecard'],
              ['6', 'Run loan eligibility review', 'POST /v1/customers/:id/loan-review'],
            ].map(([num, label, endpoint]) => (
              <div key={num} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#6d28d9', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{num}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{label}</div>
                  <code style={{ fontSize: 12, color: '#6d28d9' }}>{endpoint}</code>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Filter */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          <button style={{ ...s.pill, ...(activeGroup === '' ? s.pillActive : {}) }} onClick={() => setActiveGroup('')}>All Endpoints</button>
          {GROUPS.map(g => (
            <button key={g} style={{ ...s.pill, ...(activeGroup === g ? s.pillActive : {}) }} onClick={() => setActiveGroup(g)}>{g}</button>
          ))}
        </div>

        {/* Endpoints */}
        {filtered.map(ep => {
          const key = ep.path + ep.method;
          const open = expandedEndpoint === key;
          return (
            <div key={key} style={{ ...s.card, marginBottom: 12, cursor: 'pointer' }} onClick={() => setExpandedEndpoint(open ? null : key)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ ...s.badge, background: METHOD_COLOR[ep.method] }}>{ep.method}</span>
                <code style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', flex: 1 }}>{ep.path}</code>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>{ep.title}</span>
                <span style={{ color: '#94a3b8', fontSize: 12 }}>{open ? '▲' : '▼'}</span>
              </div>

              {open && (
                <div style={{ marginTop: 16 }} onClick={e => e.stopPropagation()}>
                  <p style={{ ...s.p, marginBottom: 16 }}>{ep.description}</p>

                  {ep.notes && (
                    <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#92400e', marginBottom: 16 }}>
                      {ep.notes}
                    </div>
                  )}

                  {ep.queryParams && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={s.label}>Query Parameters</div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <tbody>
                          {ep.queryParams.map(p => (
                            <tr key={p.key} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '8px 12px', width: 140 }}><code style={{ color: '#6d28d9', fontWeight: 600 }}>{p.key}</code></td>
                              <td style={{ padding: '8px 12px', color: '#64748b' }}>{p.desc}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {ep.formFields && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={s.label}>Form Fields (multipart/form-data)</div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <tbody>
                          {ep.formFields.map(f => (
                            <tr key={f.key} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '8px 12px', width: 140 }}><code style={{ color: '#6d28d9', fontWeight: 600 }}>{f.key}</code></td>
                              <td style={{ padding: '8px 12px', color: '#64748b' }}>{f.desc}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: ep.request !== null && ep.request !== undefined ? '1fr 1fr' : '1fr', gap: 16 }}>
                    {ep.curlExample ? (
                      <div>
                        <div style={s.label}>cURL Example</div>
                        <pre style={s.codeBlock}>{ep.curlExample}</pre>
                      </div>
                    ) : ep.request !== null && ep.request !== undefined ? (
                      <div>
                        <div style={s.label}>Request Body</div>
                        <pre style={s.codeBlock}>{JSON.stringify(ep.request, null, 2)}</pre>
                      </div>
                    ) : null}
                    <div>
                      <div style={s.label}>Response</div>
                      <pre style={s.codeBlock}>{JSON.stringify(ep.response, null, 2)}</pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Rate limit headers */}
        <div style={s.card}>
          <h2 style={s.h2}>Rate Limit Headers</h2>
          <p style={s.p}>Every successful API response includes headers showing your current plan usage for the billing month:</p>
          <div style={{ background: '#0f172a', borderRadius: 10, padding: '1rem 1.25rem', marginBottom: 16 }}>
            <pre style={s.codeBlock}>{`X-RateLimit-Limit: 5000
X-RateLimit-Remaining: 4823
X-RateLimit-Reset: 2026-02-01T00:00:00.000Z`}</pre>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <tbody>
              {[
                ['X-RateLimit-Limit', 'Total API calls allowed on your current plan per calendar month'],
                ['X-RateLimit-Remaining', 'Calls remaining before you hit your monthly limit'],
                ['X-RateLimit-Reset', 'ISO 8601 timestamp of when the counter resets (first of next month, UTC)'],
              ].map(([header, desc]) => (
                <tr key={header} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px 12px', width: 240 }}><code style={{ color: '#6d28d9', fontWeight: 600 }}>{header}</code></td>
                  <td style={{ padding: '8px 12px', color: '#64748b' }}>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ ...s.p, marginTop: 12 }}>When you exhaust your limit, subsequent calls return <code style={{ color: '#dc2626' }}>429 Monthly Quota Exceeded</code> until the counter resets. Upgrade your plan from the dashboard to increase your limit immediately.</p>
        </div>

        {/* Webhooks */}
        <div style={s.card}>
          <h2 style={s.h2}>Webhooks</h2>
          <p style={s.p}>Lucred can push real-time event notifications to your server whenever a customer analysis completes. This lets you avoid polling — register a URL and receive the result the moment it's ready.</p>

          <div style={{ marginBottom: 20 }}>
            <div style={s.label}>Supported Events</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <tbody>
                {[
                  ['statement.analysed', 'Bank statement analysis finished'],
                  ['bvn.verified', 'BVN verification completed'],
                  ['nin.verified', 'NIN verification completed'],
                  ['bureau.pulled', 'Credit bureau check completed'],
                  ['loan_review.created', 'Loan eligibility review finished'],
                  ['customer.created', 'New customer profile created'],
                ].map(([event, desc]) => (
                  <tr key={event} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 12px', width: 220 }}><code style={{ color: '#6d28d9', fontWeight: 600 }}>{event}</code></td>
                    <td style={{ padding: '8px 12px', color: '#64748b' }}>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={s.label}>Webhook Endpoints</div>
            {[
              { method: 'POST', path: '/v1/webhooks', desc: 'Register a new webhook URL with selected events' },
              { method: 'GET', path: '/v1/webhooks', desc: 'List all registered webhooks' },
              { method: 'DELETE', path: '/v1/webhooks/:id', desc: 'Remove a webhook' },
              { method: 'POST', path: '/v1/webhooks/:id/test', desc: 'Send a test payload to verify your endpoint is reachable' },
            ].map(ep => (
              <div key={ep.path} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ ...s.badge, background: METHOD_COLOR[ep.method], minWidth: 52, textAlign: 'center' }}>{ep.method}</span>
                <code style={{ fontSize: 13, color: '#0f172a', flex: 1 }}>{ep.path}</code>
                <span style={{ fontSize: 13, color: '#64748b' }}>{ep.desc}</span>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={s.label}>Register a Webhook — Request Body</div>
            <pre style={s.codeBlock}>{JSON.stringify({ url: 'https://your-server.com/lucred-events', events: ['statement.analysed', 'bvn.verified'], secret: 'optional_signing_secret' }, null, 2)}</pre>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={s.label}>Example Payload</div>
            <pre style={s.codeBlock}>{JSON.stringify({ event: 'statement.analysed', customerId: '64a1b2c3d4e5f6a7b8c9d0e1', resultId: '64d...', data: { overallRiskScore: 'B', recommendation: 'Proceed with standard loan terms' }, timestamp: '2026-01-15T10:35:00.000Z' }, null, 2)}</pre>
          </div>

          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#15803d' }}>
            <strong>Signature Verification:</strong> If you provide a <code>secret</code> when registering, Lucred signs every payload with HMAC-SHA256. The signature is sent in the <code>X-Lucred-Signature</code> header as <code>sha256=&lt;hex&gt;</code>. Verify it on your server before processing the event.
          </div>
        </div>

        {/* Error codes */}
        <div style={s.card}>
          <h2 style={s.h2}>Error Codes</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Status', 'Meaning', 'What to do'].map(h => <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 700, color: '#64748b', borderBottom: '1px solid #e2e8f0', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {[
                ['400', 'Bad Request', 'Check required fields in the request body'],
                ['401', 'Unauthorized', 'API key missing or invalid'],
                ['404', 'Not Found', 'Customer ID does not exist or belongs to a different account'],
                ['429', 'Monthly Quota Exceeded', 'You have used all API calls on your current plan this month — upgrade your plan to continue'],
                ['502', 'Upstream Error', 'A downstream provider (identity/bureau) returned an error — check the error message'],
                ['500', 'Server Error', 'Unexpected error on our end — contact support if it persists'],
              ].map(([code, meaning, fix]) => (
                <tr key={code} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 14px' }}><code style={{ fontWeight: 700, color: '#dc2626' }}>{code}</code></td>
                  <td style={{ padding: '10px 14px', color: '#334155' }}>{meaning}</td>
                  <td style={{ padding: '10px 14px', color: '#64748b' }}>{fix}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ textAlign: 'center', paddingTop: '2rem', paddingBottom: '3rem', color: '#94a3b8', fontSize: 13 }}>
          Questions? Email <a href="mailto:support@lucred.co" style={{ color: '#0ea5e9' }}>support@lucred.co</a> &nbsp;·&nbsp; <a href="/changelog" style={{ color: '#0ea5e9' }}>Changelog</a> &nbsp;·&nbsp; <a href="/login" style={{ color: '#0ea5e9' }}>Log in to your dashboard →</a>
        </div>
      </div>
    </div>
  );
}

const s = {
  card: { background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: 20 },
  h2: { fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 12px' },
  p: { fontSize: 14, color: '#475569', lineHeight: 1.65, margin: '0 0 8px' },
  label: { fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  badge: { color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 4, flexShrink: 0 },
  inlineCode: { background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: 4, fontSize: 13, fontFamily: 'monospace' },
  codeBlock: { background: '#0f172a', color: '#e2e8f0', padding: '14px 16px', borderRadius: 8, fontSize: 12, fontFamily: 'monospace', overflowX: 'auto', margin: '0 0 8px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' },
  pill: { fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 20, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer' },
  pillActive: { background: '#0f172a', color: '#fff', border: '1.5px solid #0f172a' },
};
