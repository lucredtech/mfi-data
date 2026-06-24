import { useState, useEffect, useRef } from 'react';
import api from '../services/api';

const TYPE_ICON = {
  webhook_failure: '🔴',
  quota_warning: '⚠️',
  team_invite: '👤',
  loan_review: '📋',
  plan_upgraded: '🚀',
  general: '🔔',
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);

  async function load() {
    try {
      const { data } = await api.get('/api/notifications');
      setNotifications(data.notifications || []);
      setUnread(data.unread || 0);
    } catch {}
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, []);

  // Close when clicking outside
  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function markAllRead() {
    await api.patch('/api/notifications/read-all').catch(() => {});
    setNotifications(n => n.map(x => ({ ...x, read: true })));
    setUnread(0);
  }

  async function markRead(id) {
    await api.patch(`/api/notifications/${id}/read`).catch(() => {});
    setNotifications(n => n.map(x => x._id === id ? { ...x, read: true } : x));
    setUnread(u => Math.max(0, u - 1));
  }

  function toggle() {
    setOpen(o => !o);
    if (!open && unread > 0) markAllRead();
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={toggle}
        title="Notifications"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 18, position: 'relative', padding: '4px 6px',
          color: '#94a3b8', lineHeight: 1,
        }}
      >
        🔔
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 0, right: 0,
            background: '#ef4444', color: '#fff',
            fontSize: 9, fontWeight: 800, borderRadius: 20,
            minWidth: 14, height: 14, display: 'flex', alignItems: 'center',
            justifyContent: 'center', padding: '0 3px', lineHeight: 1,
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 8px)',
          width: 320, background: '#fff', borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.14)', border: '1px solid #e2e8f0',
          zIndex: 200, overflow: 'hidden',
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Notifications</span>
            {notifications.some(n => !n.read) && (
              <button onClick={markAllRead} style={{ fontSize: 11, color: '#0ea5e9', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                Mark all read
              </button>
            )}
          </div>

          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                No notifications yet
              </div>
            ) : notifications.map(n => (
              <div
                key={n._id}
                onClick={() => !n.read && markRead(n._id)}
                style={{
                  padding: '12px 16px', borderBottom: '1px solid #f8fafc',
                  background: n.read ? '#fff' : '#f0f9ff',
                  cursor: n.read ? 'default' : 'pointer',
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                }}
              >
                <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{TYPE_ICON[n.type] || '🔔'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: n.read ? 500 : 700, color: '#0f172a', marginBottom: 2 }}>{n.title}</div>
                  {n.body && <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>{n.body}</div>}
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                    {new Date(n.createdAt).toLocaleString()}
                  </div>
                </div>
                {!n.read && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#0ea5e9', flexShrink: 0, marginTop: 5 }} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
