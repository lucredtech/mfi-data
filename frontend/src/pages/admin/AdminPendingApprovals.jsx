import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import adminApi from '../../services/adminApi';
import toast from 'react-hot-toast';

export default function AdminPendingApprovals() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState({});
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    adminApi.get('/api/admin/clients')
      .then(({ data }) => setClients(data.filter(c => c.status === 'pending')))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const approve = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Approve this client and send activation email?')) return;
    setApproving(a => ({ ...a, [id]: true }));
    try {
      await adminApi.post(`/api/admin/clients/${id}/approve`);
      toast.success('Client approved and notified');
      load();
    } catch { toast.error('Failed to approve'); }
    finally { setApproving(a => ({ ...a, [id]: false })); }
  };

  const sendSla = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Send SLA agreement email to this client?')) return;
    try {
      await adminApi.post(`/api/admin/clients/${id}/send-sla`);
      toast.success('SLA email sent');
      load();
    } catch { toast.error('Failed to send SLA'); }
  };

  return (
    <div>
      <h1 style={s.h1}>Pending Approvals</h1>
      <p style={s.sub}>MFIs awaiting KYB review and activation.</p>

      {loading ? (
        <p style={{ color: '#94a3b8' }}>Loading…</p>
      ) : clients.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 12, padding: '3rem', textAlign: 'center', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>No pending applications</div>
          <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 6 }}>All MFIs have been reviewed.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {clients.map(c => (
            <div key={c._id} onClick={() => navigate(`/admin/clients/${c._id}`)}
              style={{ background: '#fff', borderRadius: 12, padding: '1.25rem 1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', cursor: 'pointer', border: '1px solid #fcd34d', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>{c.organizationName}</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>{c.email}{c.contactPerson ? ` · ${c.contactPerson}` : ''}{c.phone ? ` · ${c.phone}` : ''}</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                  Applied {new Date(c.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {c.slaSentAt && <span style={{ marginLeft: 12, color: '#0ea5e9', fontWeight: 600 }}>SLA sent {new Date(c.slaSentAt).toLocaleDateString()}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                <button onClick={e => sendSla(c._id, e)}
                  style={{ padding: '7px 14px', background: '#e0f2fe', color: '#0284c7', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                  {c.slaSentAt ? 'Resend SLA' : 'Send SLA'}
                </button>
                <button onClick={e => approve(c._id, e)} disabled={approving[c._id]}
                  style={{ padding: '7px 14px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer', opacity: approving[c._id] ? 0.6 : 1 }}>
                  {approving[c._id] ? 'Approving…' : '✓ Approve'}
                </button>
                <button onClick={() => navigate(`/admin/clients/${c._id}`)}
                  style={{ padding: '7px 14px', background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                  View KYB →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const s = {
  h1:  { fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 },
  sub: { color: '#64748b', fontSize: 14, marginTop: 4, marginBottom: 24 },
};
