import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'https://mfi-data-production.up.railway.app';

const NAV = [
  { path: '/dashboard', label: 'Overview', icon: '⊞' },
  { path: '/dashboard/customers', label: 'Customers', icon: '👤' },
  { path: '/dashboard/statement', label: 'Statement Analysis', icon: '📄' },
  { path: '/dashboard/bvn', label: 'BVN Verification', icon: '✅' },
  { path: '/dashboard/credit-bureau', label: 'Credit Bureau', icon: '🏦' },
  { path: '/dashboard/api-keys', label: 'API Keys', icon: '🔑' },
  { path: '/dashboard/usage', label: 'Usage', icon: '📊' },
  { path: '/dashboard/docs', label: 'Docs', icon: '📖' },
];

const TYPE_LABEL = { statement: 'Statement', bvn: 'BVN', bureau: 'Bureau' };
const TYPE_COLOR = { statement: '#38bdf8', bvn: '#4ade80', bureau: '#a78bfa' };

export default function Layout({ children }) {
  const { client, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [activity, setActivity] = useState([]);

  const handleLogout = () => { logout(); navigate('/login'); };

  // Load recent activity for sidebar
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    axios.get(`${API}/api/customers`, { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => {
        // Build activity from customer data — we just show customer list as recent
        // Full activity (with analysis counts) comes from the customers endpoint
        setActivity(data.customers.slice(0, 8));
      })
      .catch(() => {});
  }, [pathname]);

  const sidebarW = collapsed ? 64 : 260;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      {/* Sidebar */}
      <aside style={{
        width: sidebarW, minWidth: sidebarW, background: '#0f172a', color: '#f1f5f9',
        padding: collapsed ? '1.5rem 0' : '1.75rem 1.25rem',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.2s ease, min-width 0.2s ease, padding 0.2s ease',
        overflow: 'hidden', position: 'relative',
      }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between' }}>
          {!collapsed && (
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#38bdf8' }}>Lucred</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>B2B Credit Engine</div>
            </div>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{
              background: '#1e293b', border: 'none', borderRadius: 6,
              color: '#94a3b8', cursor: 'pointer',
              width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, flexShrink: 0,
            }}
          >
            {collapsed ? '›' : '‹'}
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto' }}>
          {NAV.map(({ path, label, icon }) => {
            const active = path === '/dashboard' ? pathname === path : pathname.startsWith(path);
            return (
              <Link
                key={path}
                to={path}
                title={collapsed ? label : undefined}
                style={{
                  display: 'flex', alignItems: 'center',
                  gap: collapsed ? 0 : 10,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  padding: collapsed ? '10px 0' : '9px 10px',
                  borderRadius: 8, marginBottom: 2,
                  color: active ? '#38bdf8' : '#94a3b8',
                  background: active ? '#1e293b' : 'transparent',
                  textDecoration: 'none', fontSize: 14, fontWeight: 500,
                  transition: 'background 0.15s',
                }}
              >
                <span style={{ fontSize: 15, flexShrink: 0 }}>{icon}</span>
                {!collapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>}
              </Link>
            );
          })}

          {/* Recent customers panel — only when expanded */}
          {!collapsed && activity.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 1, padding: '0 10px', marginBottom: 8 }}>
                Recent Customers
              </div>
              {activity.map((c) => (
                <Link
                  key={c._id}
                  to={`/dashboard/customers/${c._id}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                    borderRadius: 8, marginBottom: 2, textDecoration: 'none',
                    color: pathname.includes(c._id) ? '#38bdf8' : '#64748b',
                    background: pathname.includes(c._id) ? '#1e293b' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                >
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: 'linear-gradient(135deg,#0ea5e9,#6d28d9)',
                    color: '#fff', fontSize: 10, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                    {c.email && <div style={{ fontSize: 10, color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.email}</div>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </nav>

        {/* Footer */}
        <div style={{ borderTop: '1px solid #1e293b', paddingTop: '1rem', marginTop: '1rem' }}>
          {!collapsed && (
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {client?.organizationName}
            </div>
          )}
          <button
            onClick={handleLogout}
            title={collapsed ? 'Sign out' : undefined}
            style={{
              fontSize: 13, color: '#64748b', background: 'none', border: 'none',
              cursor: 'pointer', padding: 0,
              display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start',
              gap: 6, width: '100%',
            }}
          >
            <span style={{ fontSize: 16 }}>↩</span>
            {!collapsed && 'Sign out'}
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
