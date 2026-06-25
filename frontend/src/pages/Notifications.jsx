import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const TYPE_COLOR = {
  webhook_failure: ['#fee2e2', '#dc2626'],
  quota_warning:   ['#fef3c7', '#d97706'],
  team_invite:     ['#ede9fe', '#6d28d9'],
  loan_review:     ['#e0f2fe', '#0284c7'],
  plan_upgraded:   ['#dcfce7', '#16a34a'],
  general:         ['#f1f5f9', '#64748b'],
};
const TYPE_LABEL = {
  webhook_failure: 'Webhook',
  quota_warning:   'Quota',
  team_invite:     'Team',
  loan_review:     'Loan Review',
  plan_upgraded:   'Plan',
  general:         'General',
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/api/notifications')
      .then(({ data }) => { setNotifications(data.notifications || []); setUnread(data.unread || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    await api.patch(`/api/notifications/${id}/read`).catch(() => {});
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    setUnread(u => Math.max(0, u - 1));
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await api.patch('/api/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnread(0);
      toast.success('All marked as read');
    } catch { toast.error('Failed'); }
    finally { setMarkingAll(false); }
  };

  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={s.h1}>Notifications</h1>
          <p style={s.sub}>
            Activity alerts for your account.
            {unread > 0 && <strong style={{ color: '#dc2626', marginLeft: 6 }}>{unread} unread</strong>}
          </p>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} disabled={markingAll} style={s.markAllBtn}>
            {markingAll ? 'Marking…' : 'Mark all read'}
          </button>
        )}
      </div>

      {loading ? (
        <div style={s.empty}>Loading…</div>
      ) : notifications.length === 0 ? (
        <div style={{ ...s.empty, background: '#fff', borderRadius: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.06)', padding: '3rem' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔔</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>No notifications yet</div>
          <div style={{ fontSize: 13, color: '#94a3b8' }}>Webhook failures, quota warnings, and account updates will appear here.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notifications.map(n => {
            const [bg, fg] = TYPE_COLOR[n.type] || TYPE_COLOR.general;
            return (
              <div
                key={n._id}
                onClick={() => !n.read && markRead(n._id)}
                style={{
                  background: n.read ? '#fff' : '#f0f9ff',
                  border: `1.5px solid ${n.read ? '#e2e8f0' : '#bae6fd'}`,
                  borderRadius: 12,
                  padding: '14px 18px',
                  cursor: n.read ? 'default' : 'pointer',
                  display: 'flex',
                  gap: 14,
                  alignItems: 'flex-start',
                  transition: 'background 0.15s',
                }}
              >
                {!n.read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#0ea5e9', flexShrink: 0, marginTop: 6 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{n.title}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: fg, background: bg, padding: '2px 8px', borderRadius: 10, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                      {TYPE_LABEL[n.type] || n.type}
                    </span>
                  </div>
                  {n.body && <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{n.body}</div>}
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
                    {new Date(n.createdAt).toLocaleString()}
                    {!n.read && <span style={{ marginLeft: 10, color: '#0ea5e9', fontWeight: 600 }}>Click to mark read</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const s = {
  h1: { fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 },
  sub: { color: '#64748b', fontSize: 14, marginTop: 4, marginBottom: 0 },
  empty: { textAlign: 'center', color: '#94a3b8', fontSize: 14, padding: '2rem' },
  markAllBtn: { fontSize: 13, fontWeight: 700, padding: '8px 16px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', color: '#334155', cursor: 'pointer' },
};
