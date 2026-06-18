import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'https://mfi-data-production.up.railway.app';

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('token')}` };
}

export default function CustomerSelect({ value, onChange, label = 'Link to Customer (optional)' }) {
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const ref = useRef();

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const { data } = await axios.get(`${API}/api/customers`, {
          params: query ? { q: query } : {},
          headers: authHeaders(),
        });
        setCustomers(data.customers || []);
      } catch { /* silent */ }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const pick = (c) => {
    setSelected(c);
    onChange(c._id, c);
    setQuery(c.name);
    setOpen(false);
  };

  const clear = () => {
    setSelected(null);
    onChange(null, null);
    setQuery('');
  };

  return (
    <div ref={ref} style={{ position: 'relative', marginBottom: 16 }}>
      <label style={s.label}>{label}</label>
      <div style={s.inputWrap}>
        <input
          style={{ ...s.input, paddingRight: selected ? 32 : 12 }}
          placeholder="Search by name, email or BVN…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); if (!e.target.value) clear(); }}
          onFocus={() => setOpen(true)}
        />
        {selected && (
          <button type="button" onClick={clear} style={s.clearBtn} title="Remove">✕</button>
        )}
      </div>
      {selected && (
        <div style={s.pill}>
          <div style={s.avatar}>{selected.name.charAt(0).toUpperCase()}</div>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{selected.name}</span>
          {selected.email && <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 4 }}>{selected.email}</span>}
        </div>
      )}
      {open && customers.length > 0 && (
        <div style={s.dropdown}>
          {customers.map((c) => (
            <div key={c._id} style={s.option} onMouseDown={() => pick(c)}>
              <div style={s.avatar}>{c.name.charAt(0).toUpperCase()}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{c.name}</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>
                  {[c.email, c.bvn ? `BVN ••••${c.bvn.slice(-4)}` : null, c.phone].filter(Boolean).join(' · ')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const s = {
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  inputWrap: { position: 'relative' },
  input: { width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', fontSize: 14, color: '#0f172a', boxSizing: 'border-box', outline: 'none' },
  clearBtn: { position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 14, padding: 2 },
  pill: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '6px 10px' },
  avatar: { width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg,#0ea5e9,#6d28d9)', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  dropdown: { position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 50, maxHeight: 260, overflowY: 'auto', marginTop: 4 },
  option: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', transition: 'background 0.1s' },
};
