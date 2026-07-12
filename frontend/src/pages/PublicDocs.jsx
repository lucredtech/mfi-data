import { API_BASE as BASE } from '../services/api';
import Docs from './Docs';

export default function PublicDocs() {
  return (
    <div style={{ fontFamily: 'Inter, sans-serif', minHeight: '100vh', background: '#f8fafc' }}>
      {/* Header */}
      <div style={{ background: '#0f172a', color: '#fff', padding: '1.5rem 2rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#38bdf8', marginBottom: 2 }}>Lucred Credit Engine</div>
            <div style={{ color: '#94a3b8', fontSize: 13 }}>
              Base URL: <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>{BASE}</code>
              &nbsp;·&nbsp; Auth: <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>X-Api-Key</code>
            </div>
          </div>
          <a href="/login" style={{ fontSize: 13, fontWeight: 600, color: '#38bdf8', textDecoration: 'none', border: '1px solid #38bdf8', padding: '8px 16px', borderRadius: 8 }}>
            Dashboard →
          </a>
        </div>
      </div>

      {/* Full docs content (same as /dashboard/docs) */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem' }}>
        <Docs />
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: 13, borderTop: '1px solid #e2e8f0' }}>
        Questions? Email <a href="mailto:support@lucred.co" style={{ color: '#0ea5e9' }}>support@lucred.co</a>
        &nbsp;·&nbsp; <a href="/login" style={{ color: '#0ea5e9' }}>Log in to your dashboard →</a>
      </div>
    </div>
  );
}
