import { Link } from 'react-router-dom';

const LINKS = {
  Product: [
    { label: 'Pricing', to: '/pricing' },
    { label: 'API Documentation', to: '/dashboard/docs' },
    { label: 'Get API Access', to: '/register' },
    { label: 'Sign In', to: '/login' },
  ],
  Legal: [
    { label: 'Privacy Policy', to: '/privacy-policy' },
    { label: 'Terms of Service', to: '/terms' },
    { label: 'Data Security', to: '/security' },
    { label: 'NDPR Compliance', to: '/privacy-policy#ndpr' },
  ],
  Support: [
    { label: 'Help & FAQ', to: '/support' },
    { label: 'Contact Us', to: '/support#contact' },
    { label: 'Status', to: '/support#status' },
    { label: 'Dashboard Privacy', to: '/dashboard/privacy' },
  ],
};

export default function Footer() {
  return (
    <footer style={s.footer}>
      <div style={s.inner}>
        {/* Brand column */}
        <div style={s.brand}>
          <div style={s.logo}>Lucred</div>
          <p style={s.tagline}>
            Identity verification, credit bureau, and bank statement analysis — all in one API.
            Built for Nigerian MFIs and lenders.
          </p>
          <div style={s.badges}>
            <span style={s.badge}>NDPR Compliant</span>
            <span style={s.badge}>256-bit Encryption</span>
          </div>
        </div>

        {/* Link columns */}
        {Object.entries(LINKS).map(([group, items]) => (
          <div key={group} style={s.col}>
            <div style={s.colTitle}>{group}</div>
            {items.map(({ label, to }) => (
              <Link key={label} to={to} style={s.link}>{label}</Link>
            ))}
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div style={s.bottom}>
        <div style={s.bottomInner}>
          <span style={s.copy}>© {new Date().getFullYear()} Lucred Technology LLC. All rights reserved.</span>
          <div style={s.bottomLinks}>
            <Link to="/privacy-policy" style={s.bottomLink}>Privacy Policy</Link>
            <span style={s.sep}>·</span>
            <Link to="/terms" style={s.bottomLink}>Terms of Service</Link>
            <span style={s.sep}>·</span>
            <Link to="/security" style={s.bottomLink}>Security</Link>
            <span style={s.sep}>·</span>
            <Link to="/support" style={s.bottomLink}>Support</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

const s = {
  footer: { background: '#0f172a', borderTop: '1px solid #1e293b', paddingTop: '4rem' },
  inner: {
    maxWidth: 1100, margin: '0 auto', padding: '0 2rem 3rem',
    display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 40,
  },
  brand: { paddingRight: 20 },
  logo: { fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 12 },
  tagline: { fontSize: 13, color: '#64748b', lineHeight: 1.7, margin: '0 0 16px' },
  badges: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  badge: { fontSize: 11, fontWeight: 600, color: '#38bdf8', background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)', padding: '3px 10px', borderRadius: 20 },
  col: { display: 'flex', flexDirection: 'column', gap: 10 },
  colTitle: { fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  link: { fontSize: 13, color: '#64748b', textDecoration: 'none', transition: 'color 0.15s', lineHeight: 1 },
  bottom: { borderTop: '1px solid #1e293b', padding: '1.25rem 2rem' },
  bottomInner: { maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  copy: { fontSize: 12, color: '#475569' },
  bottomLinks: { display: 'flex', alignItems: 'center', gap: 8 },
  bottomLink: { fontSize: 12, color: '#475569', textDecoration: 'none' },
  sep: { color: '#334155', fontSize: 12 },
};
