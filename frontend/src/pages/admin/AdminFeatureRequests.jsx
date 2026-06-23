import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL || 'https://mfi-data-production.up.railway.app';
function adminHeaders() { return { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }; }

const STATUSES = ['pending', 'reviewed', 'planned', 'shipped'];
const STATUS_COLOR = {
  pending:  ['#f1f5f9', '#64748b'],
  reviewed: ['#dbeafe', '#1d4ed8'],
  planned:  ['#ede9fe', '#6d28d9'],
  shipped:  ['#dcfce7', '#16a34a'],
};

export default function AdminFeatureRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  async function load() {
    setLoading(true);
    try {
      const params = filter ? `?status=${filter}` : '';
      const { data } = await axios.get(`${API}/api/admin/feature-requests${params}`, { headers: adminHeaders() });
      setRequests(data.requests || []);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [filter]);

  async function updateStatus(id, status) {
    try {
      const { data } = await axios.patch(`${API}/api/admin/feature-requests/${id}`, { status }, { headers: adminHeaders() });
      setRequests(prev => prev.map(r => r._id === id ? { ...r, status: data.request.status } : r));
      toast.success('Status updated');
    } catch { toast.error('Failed to update'); }
  }

  const counts = STATUSES.reduce((acc, s) => ({ ...acc, [s]: requests.filter(r => r.status === s).length }), {});

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={s.h1}>Feature Requests</h1>
        <p style={s.sub}>{requests.length} total requests from MFI clients</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {STATUSES.map(st => {
          const [bg, fg] = STATUS_COLOR[st];
          return (
            <div key={st} onClick={() => setFilter(filter === st ? '' : st)} style={{ background: filter === st ? '#0f172a' : '#fff', border: `1.5px solid ${filter === st ? '#0f172a' : '#e2e8f0'}`, borderRadius: 12, padding: '12px 20px', cursor: 'pointer', minWidth: 100, textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: filter === st ? '#fff' : fg }}>{counts[st] ?? 0}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: filter === st ? '#94a3b8' : '#64748b', textTransform: 'capitalize', marginTop: 2 }}>{st}</div>
            </div>
          );
        })}
      </div>

      {loading ? <div style={s.empty}>Loading…</div> : requests.length === 0 ? (
        <div style={s.empty}>No feature requests {filter ? `with status "${filter}"` : 'yet'}.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {requests.map(r => {
            const [bg, fg] = STATUS_COLOR[r.status] ?? ['#f1f5f9', '#64748b'];
            return (
              <div key={r._id} style={s.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>{r.title}</div>
                    <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, marginBottom: 10 }}>{r.description}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>
                      From <strong style={{ color: '#334155' }}>{r.client?.organizationName || 'Unknown'}</strong> · {new Date(r.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: bg, color: fg, textTransform: 'capitalize' }}>{r.status}</span>
                    <select
                      value={r.status}
                      onChange={e => updateStatus(r._id, e.target.value)}
                      style={{ fontSize: 12, padding: '5px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer', outline: 'none' }}
                    >
                      {STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
                    </select>
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
  sub: { color: '#64748b', fontSize: 14, marginTop: 4 },
  card: { background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' },
  empty: { color: '#94a3b8', fontSize: 14, textAlign: 'center', padding: '3rem', background: '#fff', borderRadius: 12 },
};
