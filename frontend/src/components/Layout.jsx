import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { path: '/dashboard', label: 'Overview' },
  { path: '/dashboard/statement', label: 'Statement Analysis' },
  { path: '/dashboard/api-keys', label: 'API Keys' },
  { path: '/dashboard/usage', label: 'Usage' },
  { path: '/dashboard/docs', label: 'Docs' },
];

export default function Layout({ children }) {
  const { client, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      {/* Sidebar */}
      <aside style={{ width: 240, background: '#0f172a', color: '#f1f5f9', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#38bdf8' }}>Lucred</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>B2B Credit Engine</div>
        </div>
        <nav style={{ flex: 1 }}>
          {NAV.map(({ path, label }) => (
            <Link
              key={path}
              to={path}
              style={{
                display: 'block', padding: '10px 12px', borderRadius: 8, marginBottom: 4,
                color: pathname === path ? '#38bdf8' : '#94a3b8',
                background: pathname === path ? '#1e293b' : 'transparent',
                textDecoration: 'none', fontSize: 14, fontWeight: 500,
              }}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div style={{ borderTop: '1px solid #1e293b', paddingTop: '1rem' }}>
          <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>{client?.organizationName}</div>
          <button onClick={handleLogout} style={{ fontSize: 13, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            Sign out
          </button>
        </div>
      </aside>
      {/* Main */}
      <main style={{ flex: 1, background: '#f8fafc', padding: '2rem 2.5rem', overflow: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
