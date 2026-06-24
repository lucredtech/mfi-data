import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import UpgradeModal from './UpgradeModal';

const API = import.meta.env.VITE_API_URL || 'https://mfi-data-production.up.railway.app';

// Groups: each item is either a direct link or a collapsible group with children
const NAV_GROUPS = [
  {
    label: 'Overview',
    path: '/dashboard',
    abbr: 'OV',
    icon: '⊞',
    exact: true,
  },
  {
    label: 'Customers',
    abbr: 'CU',
    icon: '👤',
    children: [
      { path: '/dashboard/customers', label: 'All Customers' },
      { path: '/dashboard/pipeline', label: 'Loan Pipeline' },
      { path: '/dashboard/bulk-verify', label: 'Bulk Verify' },
    ],
  },
  {
    label: 'Credit Tools',
    abbr: 'CT',
    icon: '🔍',
    children: [
      { path: '/dashboard/bvn', label: 'BVN Verification' },
      { path: '/dashboard/nin', label: 'NIN Verification' },
      { path: '/dashboard/credit-bureau', label: 'Credit Bureau' },
      { path: '/dashboard/statement', label: 'Statement Analysis' },
    ],
  },
  {
    label: 'Developer',
    abbr: 'DV',
    icon: '⚙',
    children: [
      { path: '/dashboard/api-keys', label: 'API Keys' },
      { path: '/dashboard/webhooks', label: 'Webhooks' },
      { path: '/dashboard/usage', label: 'Usage' },
      { path: '/dashboard/docs', label: 'API Docs' },
    ],
  },
  {
    label: 'Account',
    abbr: 'AC',
    icon: '◉',
    children: [
      { path: '/dashboard/profile', label: 'Profile' },
      { path: '/dashboard/billing', label: 'Billing' },
      { path: '/dashboard/referral', label: 'Refer an MFI' },
      { path: '/dashboard/audit', label: 'Audit Log' },
      { path: '/dashboard/privacy', label: 'Privacy & Data' },
      { path: '/dashboard/feature-request', label: 'Request a Feature' },
    ],
  },
];

function isGroupActive(group, pathname) {
  if (group.path) return group.exact ? pathname === group.path : pathname.startsWith(group.path);
  return group.children?.some(c => pathname.startsWith(c.path));
}

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return mobile;
}

export default function Layout({ children }) {
  const { client, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activity, setActivity] = useState([]);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const isMobile = useIsMobile();

  // Close mobile drawer on navigation
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Listen for plan-limit events fired by the api interceptor
  useEffect(() => {
    const handler = () => setShowUpgrade(true);
    window.addEventListener('lucred:plan-limit', handler);
    return () => window.removeEventListener('lucred:plan-limit', handler);
  }, []);

  // Track which groups are open; default open the active group
  const defaultOpen = NAV_GROUPS.reduce((acc, g) => {
    if (g.children && isGroupActive(g, pathname)) acc[g.label] = true;
    return acc;
  }, {});
  const [openGroups, setOpenGroups] = useState(defaultOpen);

  const toggleGroup = (label) =>
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));

  const handleLogout = () => { logout(); navigate('/login'); };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    axios.get(`${API}/api/customers`, { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => setActivity(data.customers.slice(0, 6)))
      .catch(() => {});
  }, [pathname]);

  const sidebarW = collapsed ? 64 : 240;
  const showSidebar = !isMobile || mobileOpen;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
      {/* Mobile overlay backdrop */}
      {isMobile && mobileOpen && (
        <div onClick={() => setMobileOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }} />
      )}

      <aside style={{
        width: isMobile ? 240 : sidebarW,
        minWidth: isMobile ? 240 : sidebarW,
        background: '#0f172a', color: '#f1f5f9',
        padding: (!isMobile && collapsed) ? '1.5rem 0' : '1.5rem 1rem',
        display: showSidebar ? 'flex' : 'none',
        flexDirection: 'column',
        transition: 'width 0.2s ease, min-width 0.2s ease',
        overflow: 'hidden',
        ...(isMobile ? { position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 100 } : {}),
      }}>

        {/* Header */}
        <div style={{ marginBottom: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between' }}>
          {!collapsed && (
            <div>
              <div style={{ fontSize: 19, fontWeight: 800, color: '#38bdf8', letterSpacing: -0.5 }}>Lucred</div>
              <div style={{ fontSize: 10, color: '#475569', marginTop: 1, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8 }}>Credit Engine</div>
            </div>
          )}
          {!isMobile && (
            <button
              onClick={() => setCollapsed(c => !c)}
              title={collapsed ? 'Expand' : 'Collapse'}
              style={{ background: '#1e293b', border: 'none', borderRadius: 6, color: '#64748b', cursor: 'pointer', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}
            >
              {collapsed ? '›' : '‹'}
            </button>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto' }}>
          {NAV_GROUPS.map((group) => {
            const groupActive = isGroupActive(group, pathname);

            // Direct link (no children)
            if (group.path) {
              return (
                <Link
                  key={group.path}
                  to={group.path}
                  title={collapsed ? group.label : undefined}
                  style={{
                    display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 8,
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    padding: collapsed ? '9px 0' : '8px 10px',
                    borderRadius: 7, marginBottom: 2,
                    color: groupActive ? '#38bdf8' : '#94a3b8',
                    background: groupActive ? '#1e293b' : 'transparent',
                    textDecoration: 'none', fontSize: 13.5, fontWeight: 500,
                    transition: 'background 0.12s',
                  }}
                >
                  {collapsed
                    ? <span style={{ fontSize: 10, fontWeight: 700 }}>{group.abbr}</span>
                    : <>
                        <span style={{ fontSize: 14, opacity: 0.7 }}>{group.icon}</span>
                        <span>{group.label}</span>
                      </>
                  }
                </Link>
              );
            }

            // Collapsible group
            const isOpen = collapsed ? false : !!openGroups[group.label];

            return (
              <div key={group.label} style={{ marginBottom: 2 }}>
                {/* Group header */}
                <button
                  onClick={() => !collapsed && toggleGroup(group.label)}
                  title={collapsed ? group.label : undefined}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center',
                    gap: collapsed ? 0 : 8,
                    justifyContent: collapsed ? 'center' : 'space-between',
                    padding: collapsed ? '9px 0' : '8px 10px',
                    borderRadius: 7, border: 'none', cursor: 'pointer',
                    background: groupActive && !isOpen ? '#1e293b' : 'transparent',
                    color: groupActive ? '#e2e8f0' : '#64748b',
                    fontSize: 13.5, fontWeight: 600,
                    transition: 'background 0.12s',
                  }}
                >
                  {collapsed
                    ? <span style={{ fontSize: 10, fontWeight: 700 }}>{group.abbr}</span>
                    : <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 14, opacity: 0.7 }}>{group.icon}</span>
                          <span>{group.label}</span>
                        </div>
                        <span style={{ fontSize: 10, color: '#475569', transition: 'transform 0.15s', transform: isOpen ? 'rotate(90deg)' : 'none' }}>›</span>
                      </>
                  }
                </button>

                {/* Children */}
                {isOpen && (
                  <div style={{ marginLeft: 14, borderLeft: '1.5px solid #1e293b', paddingLeft: 10, marginBottom: 4 }}>
                    {group.children.map(child => {
                      const active = pathname.startsWith(child.path);
                      return (
                        <Link
                          key={child.path}
                          to={child.path}
                          style={{
                            display: 'block', padding: '7px 10px', borderRadius: 6, marginBottom: 1,
                            color: active ? '#38bdf8' : '#64748b',
                            background: active ? '#1e293b' : 'transparent',
                            textDecoration: 'none', fontSize: 13, fontWeight: active ? 600 : 400,
                            transition: 'background 0.12s',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Recent customers — only when expanded */}
          {!collapsed && activity.length > 0 && (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #1e293b' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: 1, padding: '0 10px', marginBottom: 8 }}>
                Recent
              </div>
              {activity.map((c) => (
                <Link
                  key={c._id}
                  to={`/dashboard/customers/${c._id}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                    borderRadius: 7, marginBottom: 1, textDecoration: 'none',
                    color: pathname.includes(c._id) ? '#38bdf8' : '#64748b',
                    background: pathname.includes(c._id) ? '#1e293b' : 'transparent',
                    transition: 'background 0.12s',
                  }}
                >
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: 'linear-gradient(135deg,#0ea5e9,#6d28d9)',
                    color: '#fff', fontSize: 9, fontWeight: 700, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.name}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </nav>

        {/* Footer */}
        <div style={{ borderTop: '1px solid #1e293b', paddingTop: '0.875rem', marginTop: '0.875rem' }}>
          {!collapsed && (
            <div style={{ fontSize: 11, color: '#475569', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
              {client?.organizationName}
            </div>
          )}
          <button
            onClick={handleLogout}
            title={collapsed ? 'Sign out' : undefined}
            style={{
              fontSize: 12, color: '#475569', background: 'none', border: 'none',
              cursor: 'pointer', padding: 0,
              display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start',
              gap: 6, width: '100%', fontWeight: 500,
            }}
          >
            <span style={{ fontSize: 15 }}>↩</span>
            {!collapsed && 'Sign out'}
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, background: '#f8fafc', overflow: 'auto', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Mobile topbar */}
        {isMobile && (
          <div style={{ background: '#0f172a', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
            <button onClick={() => setMobileOpen(o => !o)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: 4 }}>☰</button>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#38bdf8' }}>Lucred</div>
            <div style={{ width: 28 }} />
          </div>
        )}
        <div style={{ padding: isMobile ? '1.25rem 1rem' : '2rem 2.5rem', flex: 1 }}>
          {children}
        </div>
      </main>
    </div>
  );
}
