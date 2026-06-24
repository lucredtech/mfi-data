import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { parseApiError } from '../utils/apiError';

export default function ApiKeys() {
  const [keys, setKeys] = useState([]);
  const [label, setLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [revealed, setRevealed] = useState({});

  const load = () => api.get('/api/keys').then(({ data }) => setKeys(data)).catch(() => {});

  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/api/keys', { label });
      setLabel('');
      toast.success('API key created');
      load();
    } catch (err) { toast.error(parseApiError(err, { default: 'Failed to create API key. Please try again.' })); }
    finally { setCreating(false); }
  };

  const revoke = async (id) => {
    if (!confirm('Revoke this key? It will stop working immediately.')) return;
    try {
      await api.delete(`/api/keys/${id}`);
      toast.success('Key revoked');
      load();
    } catch (err) { toast.error(parseApiError(err, { default: 'Failed to revoke key. Please try again.' })); }
  };

  const copy = (text) => { navigator.clipboard.writeText(text); toast.success('Copied!'); };

  function lastUsedBadge(lastUsedAt) {
    if (!lastUsedAt) return <span style={{ fontSize: 12, fontWeight: 600, background: '#f1f5f9', color: '#94a3b8', padding: '3px 10px', borderRadius: 20 }}>Never used</span>;
    const ms = Date.now() - new Date(lastUsedAt).getTime();
    const mins = Math.floor(ms / 60000);
    const hrs = Math.floor(ms / 3600000);
    const days = Math.floor(ms / 86400000);
    const ago = mins < 1 ? 'just now' : mins < 60 ? `${mins}m ago` : hrs < 24 ? `${hrs}h ago` : `${days}d ago`;
    const isRecent = hrs < 24;
    return <span style={{ fontSize: 12, fontWeight: 600, background: isRecent ? '#dcfce7' : '#f1f5f9', color: isRecent ? '#16a34a' : '#64748b', padding: '3px 10px', borderRadius: 20 }}>Active · {ago}</span>;
  }

  return (
    <div>
      <h1 style={styles.h1}>API Keys</h1>
      <p style={styles.sub}>Use these keys in the <code>X-Api-Key</code> header when calling Lucred credit endpoints.</p>

      <div style={styles.createBox}>
        <form onSubmit={create} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <input style={{ ...styles.input, flex: 1 }} placeholder="Key label (e.g. Production)" value={label}
            onChange={(e) => setLabel(e.target.value)} required />
          <button style={styles.btn} disabled={creating}>{creating ? 'Creating…' : '+ New Key'}</button>
        </form>
      </div>

      <div style={styles.tableBox}>
        {keys.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: 14 }}>No API keys yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>{['Label', 'Key', 'Status', 'Last Used', 'Created', ''].map(h => (
                <th key={h} style={styles.th}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k._id}>
                  <td style={styles.td}>{k.label}</td>
                  <td style={styles.td}>
                    <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
                      {revealed[k._id] ? k.key : `${k.key.substring(0, 12)}${'•'.repeat(20)}`}
                    </span>
                    <button onClick={() => setRevealed(r => ({ ...r, [k._id]: !r[k._id] }))} style={styles.ghost}>
                      {revealed[k._id] ? 'Hide' : 'Show'}
                    </button>
                    <button onClick={() => copy(k.key)} style={styles.ghost}>Copy</button>
                  </td>
                  <td style={styles.td}>
                    <span style={{ color: k.isActive ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                      {k.isActive ? 'Active' : 'Revoked'}
                    </span>
                  </td>
                  <td style={styles.td}>{lastUsedBadge(k.lastUsedAt)}</td>
                  <td style={styles.td}>{new Date(k.createdAt).toLocaleDateString()}</td>
                  <td style={styles.td}>
                    {k.isActive && (
                      <button onClick={() => revoke(k._id)} style={{ ...styles.ghost, color: '#dc2626' }}>Revoke</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const styles = {
  h1: { fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 },
  sub: { color: '#64748b', fontSize: 14, marginTop: 4, marginBottom: 24 },
  createBox: { background: '#fff', borderRadius: 12, padding: '1.25rem 1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: 24 },
  input: { padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14 },
  btn: { padding: '9px 18px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  tableBox: { background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' },
  th: { textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600 },
  td: { padding: '10px 12px', borderBottom: '1px solid #f1f5f9', color: '#334155' },
  ghost: { background: 'none', border: 'none', color: '#0ea5e9', cursor: 'pointer', fontSize: 12, marginLeft: 8 },
};
