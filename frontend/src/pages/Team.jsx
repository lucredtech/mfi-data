import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const ROLE_STYLE = {
  admin: { bg: '#ede9fe', fg: '#6d28d9' },
  viewer: { bg: '#f0f9ff', fg: '#0284c7' },
};
const STATUS_STYLE = {
  active: { bg: '#dcfce7', fg: '#16a34a' },
  pending: { bg: '#fef3c7', fg: '#d97706' },
};

export default function Team() {
  const { client } = useAuth();
  const isOwnerOrAdmin = !client?.role || client?.role === 'admin'; // org owners have no role field
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [inviting, setInviting] = useState(false);

  const load = () => api.get('/api/team')
    .then(({ data }) => setMembers(data.members || []))
    .catch(() => toast.error('Failed to load team'))
    .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const invite = async (e) => {
    e.preventDefault();
    setInviting(true);
    try {
      await api.post('/api/team/invite', { email: inviteEmail, role: inviteRole });
      toast.success(`Invite sent to ${inviteEmail}`);
      setInviteEmail('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send invite');
    } finally { setInviting(false); }
  };

  const changeRole = async (id, role) => {
    try {
      await api.patch(`/api/team/${id}/role`, { role });
      toast.success('Role updated');
      load();
    } catch { toast.error('Failed to update role'); }
  };

  const remove = async (id, email) => {
    if (!confirm(`Remove ${email} from the team?`)) return;
    try {
      await api.delete(`/api/team/${id}`);
      toast.success('Member removed');
      load();
    } catch { toast.error('Failed to remove member'); }
  };

  const resend = async (id) => {
    try {
      await api.post(`/api/team/${id}/resend`);
      toast.success('Invite resent');
    } catch { toast.error('Failed to resend'); }
  };

  return (
    <div style={{ maxWidth: 760 }}>
      <h1 style={s.h1}>Team</h1>
      <p style={s.sub}>Invite colleagues to access your organisation's dashboard.</p>

      {/* Role explanation */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { role: 'Admin', desc: 'Full access — invite members, manage API keys, view all data' },
          { role: 'Viewer', desc: 'Read-only — view customers, analyses, and usage. Cannot manage keys or invite.' },
        ].map(r => (
          <div key={r.role} style={{ flex: '1 1 200px', background: '#fff', borderRadius: 10, padding: '12px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>{r.role}</div>
            <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{r.desc}</div>
          </div>
        ))}
      </div>

      {/* Invite form */}
      {isOwnerOrAdmin && (
        <div style={{ background: '#fff', borderRadius: 12, padding: '1.25rem 1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>Invite a team member</div>
          <form onSubmit={invite} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 220px' }}>
              <label style={s.label}>Email address</label>
              <input type="email" required value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                placeholder="colleague@yourorg.com" style={s.input} />
            </div>
            <div>
              <label style={s.label}>Role</label>
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} style={s.select}>
                <option value="viewer">Viewer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button disabled={inviting || !inviteEmail} style={{ ...s.btn, opacity: inviting || !inviteEmail ? 0.6 : 1 }}>
              {inviting ? 'Sending…' : 'Send Invite'}
            </button>
          </form>
        </div>
      )}

      {/* Members list */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Team members</div>
          <div style={{ fontSize: 13, color: '#94a3b8' }}>{members.length} member{members.length !== 1 ? 's' : ''}</div>
        </div>

        {loading ? (
          <p style={{ color: '#94a3b8', padding: '2rem', textAlign: 'center' }}>Loading…</p>
        ) : members.length === 0 ? (
          <p style={{ color: '#94a3b8', padding: '2.5rem', textAlign: 'center', fontSize: 14 }}>No team members yet. Invite someone above.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>{['Name / Email', 'Role', 'Status', 'Invited', ''].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {members.map(m => {
                const { bg: rBg, fg: rFg } = ROLE_STYLE[m.role] || ROLE_STYLE.viewer;
                const { bg: sBg, fg: sFg } = STATUS_STYLE[m.status] || STATUS_STYLE.pending;
                return (
                  <tr key={m._id}>
                    <td style={s.td}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{m.name || '—'}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{m.email}</div>
                    </td>
                    <td style={s.td}>
                      {isOwnerOrAdmin ? (
                        <select
                          value={m.role}
                          onChange={e => changeRole(m._id, e.target.value)}
                          style={{ fontSize: 12, fontWeight: 700, padding: '3px 8px', borderRadius: 8, border: `1.5px solid ${rBg}`, background: rBg, color: rFg, cursor: 'pointer' }}
                        >
                          <option value="viewer">Viewer</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        <span style={{ fontSize: 12, fontWeight: 700, background: rBg, color: rFg, padding: '3px 10px', borderRadius: 20 }}>{m.role}</span>
                      )}
                    </td>
                    <td style={s.td}>
                      <span style={{ fontSize: 12, fontWeight: 700, background: sBg, color: sFg, padding: '3px 10px', borderRadius: 20 }}>
                        {m.status}
                      </span>
                    </td>
                    <td style={s.td}>{new Date(m.createdAt).toLocaleDateString()}</td>
                    <td style={s.td}>
                      {isOwnerOrAdmin && (
                        <div style={{ display: 'flex', gap: 8 }}>
                          {m.status === 'pending' && (
                            <button onClick={() => resend(m._id)} style={s.ghost}>Resend</button>
                          )}
                          <button onClick={() => remove(m._id, m.email)} style={{ ...s.ghost, color: '#dc2626' }}>Remove</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const s = {
  h1: { fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 },
  sub: { color: '#64748b', fontSize: 14, marginTop: 4, marginBottom: 24 },
  label: { display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', outline: 'none' },
  select: { padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, background: '#fff', cursor: 'pointer' },
  btn: { padding: '9px 20px', background: '#6d28d9', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' },
  th: { textAlign: 'left', padding: '10px 16px', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600, fontSize: 12 },
  td: { padding: '12px 16px', borderBottom: '1px solid #f1f5f9', color: '#334155', verticalAlign: 'middle' },
  ghost: { background: 'none', border: 'none', fontSize: 12, fontWeight: 600, color: '#0ea5e9', cursor: 'pointer', padding: 0 },
};
