import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL || 'https://mfi-data-production.up.railway.app';
function authHeaders() { return { Authorization: `Bearer ${localStorage.getItem('token')}` }; }

const ALL_EVENTS = [
  { value: 'bvn.verified', label: 'BVN Verified' },
  { value: 'nin.verified', label: 'NIN Verified' },
  { value: 'bureau.pulled', label: 'Bureau Pulled' },
  { value: 'statement.analysed', label: 'Statement Analysed' },
  { value: 'loan_review.created', label: 'Loan Review Created' },
  { value: 'customer.created', label: 'Customer Created' },
];

const STATUS_COLOR = (s) => s >= 200 && s < 300 ? '#16a34a' : s === 0 ? '#64748b' : '#dc2626';

export default function Webhooks() {
  const [hooks, setHooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState([]);
  const [saving, setSaving] = useState(false);
  const [revealed, setRevealed] = useState({});
  const [testing, setTesting] = useState({});

  async function load() {
    try {
      const { data } = await axios.get(`${API}/api/webhooks`, { headers: authHeaders() });
      setHooks(data.webhooks || []);
    } catch { /* silent */ } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function create(e) {
    e.preventDefault();
    if (!url || events.length === 0) return;
    setSaving(true);
    try {
      const { data } = await axios.post(`${API}/api/webhooks`, { url, events }, { headers: authHeaders() });
      setHooks(prev => [data.webhook, ...prev]);
      setUrl(''); setEvents([]); setShowForm(false);
      toast.success('Webhook created');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create webhook');
    } finally { setSaving(false); }
  }

  async function toggleActive(id, current) {
    try {
      const { data } = await axios.patch(`${API}/api/webhooks/${id}`, { isActive: !current }, { headers: authHeaders() });
      setHooks(prev => prev.map(h => h._id === id ? data.webhook : h));
    } catch { toast.error('Failed to update'); }
  }

  async function remove(id) {
    if (!confirm('Delete this webhook?')) return;
    try {
      await axios.delete(`${API}/api/webhooks/${id}`, { headers: authHeaders() });
      setHooks(prev => prev.filter(h => h._id !== id));
      toast.success('Deleted');
    } catch { toast.error('Failed to delete'); }
  }

  async function test(id) {
    setTesting(t => ({ ...t, [id]: true }));
    try {
      const { data } = await axios.post(`${API}/api/webhooks/${id}/test`, {}, { headers: authHeaders() });
      toast[data.ok ? 'success' : 'error'](data.ok ? `Test sent — ${data.status}` : `Test failed — ${data.error}`);
    } catch { toast.error('Test failed'); }
    finally { setTesting(t => ({ ...t, [id]: false })); }
  }

  function toggleEvent(ev) {
    setEvents(prev => prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev]);
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={s.h1}>Webhooks</h1>
          <p style={s.sub}>Get notified in real time when events happen in your Lucred account.</p>
        </div>
        <button style={s.btn} onClick={() => setShowForm(f => !f)}>{showForm ? 'Cancel' : '+ Add Endpoint'}</button>
      </div>

      {showForm && (
        <div style={s.card}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>New webhook endpoint</div>
          <form onSubmit={create} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={s.label}>Endpoint URL</label>
              <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://your-server.com/webhook"
                style={s.input} required />
            </div>
            <div>
              <label style={s.label}>Events to listen for</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                {ALL_EVENTS.map(ev => (
                  <label key={ev.value} style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                    border: `1.5px solid ${events.includes(ev.value) ? '#6d28d9' : '#e2e8f0'}`,
                    borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500,
                    background: events.includes(ev.value) ? '#ede9fe' : '#fff',
                    color: events.includes(ev.value) ? '#6d28d9' : '#334155',
                  }}>
                    <input type="checkbox" checked={events.includes(ev.value)} onChange={() => toggleEvent(ev.value)}
                      style={{ accentColor: '#6d28d9' }} />
                    {ev.label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <button type="submit" disabled={saving || !url || events.length === 0}
                style={{ ...s.btn, opacity: (saving || !url || events.length === 0) ? 0.6 : 1 }}>
                {saving ? 'Creating…' : 'Create Webhook'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div style={s.empty}>Loading…</div>
      ) : hooks.length === 0 ? (
        <div style={s.empty}>
          <div style={{ fontWeight: 600, color: '#334155', marginBottom: 4 }}>No webhooks yet</div>
          <div style={{ fontSize: 13, color: '#94a3b8' }}>Add an endpoint above to start receiving events.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {hooks.map(h => (
            <div key={h._id} style={s.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: h.isActive ? '#16a34a' : '#94a3b8', flexShrink: 0 }} />
                    <code style={{ fontSize: 13, color: '#0f172a', fontWeight: 600, wordBreak: 'break-all' }}>{h.url}</code>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    {h.events.map(ev => (
                      <span key={ev} style={{ fontSize: 11, fontWeight: 600, background: '#ede9fe', color: '#6d28d9', padding: '2px 8px', borderRadius: 12 }}>{ev}</span>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>
                    {h.lastFiredAt
                      ? <>Last fired {new Date(h.lastFiredAt).toLocaleString()} · <span style={{ color: STATUS_COLOR(h.lastStatus) }}>HTTP {h.lastStatus || '—'}</span></>
                      : 'Never fired'}
                  </div>
                  {/* Signing secret */}
                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Signing secret:</span>
                    <code style={{ fontSize: 11, color: '#334155' }}>
                      {revealed[h._id] ? h.secret : `${h.secret.substring(0, 14)}${'•'.repeat(16)}`}
                    </code>
                    <button onClick={() => setRevealed(r => ({ ...r, [h._id]: !r[h._id] }))} style={s.ghost}>
                      {revealed[h._id] ? 'Hide' : 'Reveal'}
                    </button>
                    <button onClick={() => { navigator.clipboard.writeText(h.secret); toast.success('Copied!'); }} style={s.ghost}>Copy</button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                  <button onClick={() => test(h._id)} disabled={testing[h._id]} style={{ ...s.ghostBtn, color: '#6d28d9', borderColor: '#6d28d9' }}>
                    {testing[h._id] ? 'Sending…' : 'Send Test'}
                  </button>
                  <button onClick={() => toggleActive(h._id, h.isActive)} style={{ ...s.ghostBtn, color: h.isActive ? '#f59e0b' : '#16a34a', borderColor: h.isActive ? '#f59e0b' : '#16a34a' }}>
                    {h.isActive ? 'Disable' : 'Enable'}
                  </button>
                  <button onClick={() => remove(h._id)} style={{ ...s.ghostBtn, color: '#dc2626', borderColor: '#dc2626' }}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 32, background: '#f8fafc', borderRadius: 12, padding: '1.25rem 1.5rem', border: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 8 }}>Verifying webhook signatures</div>
        <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 8px', lineHeight: 1.7 }}>Every request includes a <code>X-Lucred-Signature</code> header. Verify it with:</p>
        <pre style={{ fontSize: 12, background: '#0f172a', color: '#e2e8f0', padding: '12px 16px', borderRadius: 8, overflow: 'auto', margin: 0 }}>{`const sig = req.headers['x-lucred-signature']; // "sha256=abc123..."
const expected = 'sha256=' + crypto
  .createHmac('sha256', YOUR_WEBHOOK_SECRET)
  .update(JSON.stringify(req.body))
  .digest('hex');
const valid = crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));`}</pre>
      </div>
    </div>
  );
}

const s = {
  h1: { fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 },
  sub: { color: '#64748b', fontSize: 14, marginTop: 4 },
  btn: { padding: '9px 18px', background: '#6d28d9', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', flexShrink: 0 },
  ghostBtn: { padding: '6px 14px', background: 'none', border: '1.5px solid', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  ghost: { background: 'none', border: 'none', color: '#0ea5e9', cursor: 'pointer', fontSize: 11, padding: '0 2px' },
  card: { background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: 0 },
  label: { display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none' },
  empty: { color: '#94a3b8', fontSize: 14, textAlign: 'center', padding: '3rem', background: '#fff', borderRadius: 12 },
};
