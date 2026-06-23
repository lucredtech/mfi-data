import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL || 'https://mfi-data-production.up.railway.app';
function authHeaders() { return { Authorization: `Bearer ${localStorage.getItem('token')}` }; }

const STATUS_COLOR = {
  pending:  ['#f1f5f9', '#64748b'],
  reviewed: ['#dbeafe', '#1d4ed8'],
  planned:  ['#ede9fe', '#6d28d9'],
  shipped:  ['#dcfce7', '#16a34a'],
};

export default function FeatureRequest() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const { data } = await axios.get(`${API}/api/feature-requests`, { headers: authHeaders() });
      setRequests(data.requests || []);
    } catch { /* silent */ } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setSubmitting(true);
    try {
      const { data } = await axios.post(`${API}/api/feature-requests`, { title, description }, { headers: authHeaders() });
      setRequests(prev => [data.request, ...prev]);
      setTitle('');
      setDescription('');
      toast.success('Feature request submitted — thank you!');
    } catch {
      toast.error('Failed to submit request');
    } finally { setSubmitting(false); }
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={s.h1}>Request a Feature</h1>
        <p style={s.sub}>Tell us what would make Lucred more useful for your team. We read every request.</p>
      </div>

      {/* Submit form */}
      <div style={s.card}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Submit a new request</div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={s.label}>Feature title</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Export customer data as Excel"
              maxLength={200}
              style={s.input}
              required
            />
          </div>
          <div>
            <label style={s.label}>Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the feature and why it would help your team..."
              maxLength={2000}
              rows={5}
              style={{ ...s.input, resize: 'vertical', fontFamily: 'inherit' }}
              required
            />
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, textAlign: 'right' }}>{description.length}/2000</div>
          </div>
          <div>
            <button type="submit" disabled={submitting || !title.trim() || !description.trim()} style={{ ...s.btn, opacity: (submitting || !title.trim() || !description.trim()) ? 0.6 : 1 }}>
              {submitting ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>

      {/* Past requests */}
      <div style={{ marginTop: 32 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>Your requests</div>
        {loading ? (
          <div style={s.empty}>Loading…</div>
        ) : requests.length === 0 ? (
          <div style={s.empty}>No requests yet. Submit your first one above.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {requests.map(r => {
              const [bg, fg] = STATUS_COLOR[r.status] ?? ['#f1f5f9', '#64748b'];
              return (
                <div key={r._id} style={s.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>{r.title}</div>
                      <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{r.description}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: bg, color: fg, textTransform: 'capitalize' }}>
                        {r.status}
                      </span>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>{new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  h1: { fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 },
  sub: { color: '#64748b', fontSize: 14, marginTop: 4 },
  card: { background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' },
  label: { display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none', background: '#fff' },
  btn: { padding: '10px 24px', borderRadius: 8, border: 'none', background: '#6d28d9', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  empty: { color: '#94a3b8', fontSize: 14, textAlign: 'center', padding: '2rem', background: '#fff', borderRadius: 12 },
};
