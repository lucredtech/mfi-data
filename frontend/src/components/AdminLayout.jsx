import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';

const NAV = [
  { path: '/admin', label: 'Overview' },
  { path: '/admin/clients', label: 'MFI Clients' },
  { path: '/admin/feature-requests', label: 'Feature Requests' },
  { path: '/admin/audit', label: 'Audit Log' },
];

export default function AdminLayout({ children }) {
  const { admin, logout } = useAdmin();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleLogout = () => { logout(); navigate('/admin/login'); };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <aside style={{ width: 240, background: '#1e1b4b', color: '#f1f5f9', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#a5b4fc' }}>Lucred</div>
          <div style={{ fontSize: 11, color: '#6366f1', marginTop: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Admin Panel</div>
        </div>
        <nav style={{ flex: 1 }}>
          {NAV.map(({ path, label }) => (
            <Link key={path} to={path} style={{
              display: 'block', padding: '10px 12px', borderRadius: 8, marginBottom: 4,
              color: pathname === path ? '#a5b4fc' : '#94a3b8',
              background: pathname === path ? '#312e81' : 'transparent',
              textDecoration: 'none', fontSize: 14, fontWeight: 500,
            }}>{label}</Link>
          ))}
        </nav>
        <div style={{ borderTop: '1px solid #312e81', paddingTop: '1rem' }}>
          <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>{admin?.name}</div>
          <button onClick={handleLogout} style={{ fontSize: 13, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            Sign out
          </button>
        </div>
      </aside>
      <main style={{ flex: 1, background: '#f8fafc', padding: '2rem 2.5rem', overflow: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
