const BASE = 'https://api.yourdomain.com';

const ENDPOINTS = [
  {
    method: 'POST', path: '/v1/statement/analyze', title: 'Bank Statement Analysis',
    description: 'Analyze a borrower\'s bank statement via Mono to assess income, spending patterns, and repayment capacity.',
    headers: [{ key: 'X-Api-Key', value: 'lcrd_your_api_key' }, { key: 'Content-Type', value: 'application/json' }],
    body: { monoId: '668fca877955afe2ffea2fe3', email: 'borrower@example.com' },
    response: { success: true, data: { income: 450000, expenses: 210000, creditScore: 720, recommendation: 'approve' } },
  },
  {
    method: 'POST', path: '/v1/credit-bureau/check', title: 'Credit Bureau Check',
    description: 'Pull a borrower\'s full credit history and outstanding obligations from the credit bureau.',
    headers: [{ key: 'X-Api-Key', value: 'lcrd_your_api_key' }, { key: 'Content-Type', value: 'application/json' }],
    body: { bvn: '12345678901', firstName: 'John', lastName: 'Doe', dateOfBirth: '1990-01-15' },
    response: { success: true, data: { score: 680, activeLoans: 1, defaults: 0, totalOutstanding: 50000 } },
  },
  {
    method: 'POST', path: '/v1/credit/score', title: 'Credit Score & Decision',
    description: 'Get Lucred\'s credit score and lending decision for a borrower based on their BVN or Mono data.',
    headers: [{ key: 'X-Api-Key', value: 'lcrd_your_api_key' }, { key: 'Content-Type', value: 'application/json' }],
    body: { bvn: '12345678901', monoId: '668fca877955afe2ffea2fe3', email: 'borrower@example.com' },
    response: { success: true, data: { score: 710, decision: 'approve', maxLoanAmount: 200000, suggestedTenor: 12 } },
  },
  {
    method: 'POST', path: '/v1/identity/verify-bvn', title: 'BVN Verification',
    description: 'Verify a borrower\'s Bank Verification Number and retrieve their identity details.',
    headers: [{ key: 'X-Api-Key', value: 'lcrd_your_api_key' }, { key: 'Content-Type', value: 'application/json' }],
    body: { bvn: '12345678901' },
    response: { success: true, data: { firstName: 'John', lastName: 'Doe', phone: '08012345678', isValid: true } },
  },
];

export default function Docs() {
  return (
    <div>
      <h1 style={styles.h1}>API Reference</h1>
      <p style={styles.sub}>Base URL: <code style={styles.code}>{BASE}</code> &nbsp;|&nbsp; Auth: <code style={styles.code}>X-Api-Key</code> header</p>

      <div style={styles.authBox}>
        <strong style={{ fontSize: 13 }}>Authentication</strong>
        <p style={{ margin: '8px 0 4px', fontSize: 13, color: '#475569' }}>All B2B endpoints require your API key in the request header:</p>
        <pre style={styles.pre}>{`X-Api-Key: lcrd_your_api_key_here`}</pre>
      </div>

      {ENDPOINTS.map((ep) => (
        <div key={ep.path} style={styles.epBox}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ ...styles.badge, background: ep.method === 'GET' ? '#0284c7' : '#7c3aed' }}>{ep.method}</span>
            <code style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>{ep.path}</code>
          </div>
          <p style={{ fontSize: 14, color: '#475569', margin: '0 0 16px' }}>{ep.description}</p>

          <div style={styles.twoCol}>
            <div>
              <div style={styles.sectionTitle}>Request</div>
              <pre style={styles.pre}>{JSON.stringify(ep.body, null, 2)}</pre>
            </div>
            <div>
              <div style={styles.sectionTitle}>Response</div>
              <pre style={styles.pre}>{JSON.stringify(ep.response, null, 2)}</pre>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const styles = {
  h1: { fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 },
  sub: { color: '#64748b', fontSize: 14, marginTop: 4, marginBottom: 24 },
  code: { background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontSize: 13, fontFamily: 'monospace' },
  authBox: { background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '1rem 1.25rem', marginBottom: 24 },
  pre: { background: '#0f172a', color: '#e2e8f0', padding: '12px 16px', borderRadius: 8, fontSize: 12, fontFamily: 'monospace', overflowX: 'auto', margin: '8px 0 0' },
  epBox: { background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: 20 },
  badge: { color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4 },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 },
};
