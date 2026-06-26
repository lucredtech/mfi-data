import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';

const NAV = [
  { path: '/admin', label: 'Overview' },
  { path: '/admin/clients', label: 'MFI Clients' },
  { path: '/admin/pending', label: 'Pending Approvals' },
  { path: '/admin/feature-requests', label: 'Feature Requests' },
  { path: '/admin/audit', label: 'Audit Log' },
];

export default function AdminLayout({ children }) {
  const { admin, logout } = useAdmin();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Close drawer on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleLogout = () => { logout(); navigate('/admin/login'); };

  const SidebarContent = () => (
    <>
      <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#a5b4fc' }}>Lucred</div>
          <div style={{ fontSize: 11, color: '#6366f1', marginTop: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Admin Panel</div>
        </div>
        {/* Close button — mobile only */}
        <button onClick={() => setOpen(false)} style={{ display: 'none', background: 'none', border: 'none', color: '#94a3b8', fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: 0 }} className="admin-close-btn">✕</button>
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
    </>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        @media (max-width: 768px) {
          .admin-sidebar-desktop { display: none !important; }
          .admin-topbar { display: flex !important; }
          .admin-main { padding: 1rem !important; }
          .admin-close-btn { display: block !important; }
        }
        @media (min-width: 769px) {
          .admin-drawer-overlay { display: none !important; }
          .admin-drawer { display: none !important; }
        }
      `}</style>

      {/* Desktop sidebar */}
      <aside className="admin-sidebar-desktop" style={{ width: 240, background: '#1e1b4b', color: '#f1f5f9', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <SidebarContent />
      </aside>

      {/* Mobile drawer overlay */}
      {open && (
        <div className="admin-drawer-overlay" onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 }} />
      )}

      {/* Mobile drawer */}
      <aside className="admin-drawer" style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: 260,
        background: '#1e1b4b', color: '#f1f5f9', padding: '1.5rem',
        display: 'flex', flexDirection: 'column', zIndex: 50,
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.22s ease',
      }}>
        <SidebarContent />
      </aside>

      {/* Main content area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Mobile topbar */}
        <header className="admin-topbar" style={{ display: 'none', alignItems: 'center', gap: 12, background: '#1e1b4b', padding: '0.875rem 1rem', flexShrink: 0 }}>
          <button onClick={() => setOpen(true)} style={{ background: 'none', border: 'none', color: '#a5b4fc', fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: 0 }}>☰</button>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#a5b4fc' }}>Lucred</div>
          <div style={{ fontSize: 10, color: '#6366f1', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Admin</div>
        </header>

        <main className="admin-main" style={{ flex: 1, background: '#f8fafc', padding: '2rem 2.5rem', overflow: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
