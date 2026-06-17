import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { exportCustomersCSV } from '../services/exportCSV';

const API = import.meta.env.VITE_API_URL || 'https://mfi-data-production.up.railway.app';

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('token')}` };
}

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  const fetch = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/api/customers`, {
        params: q ? { q } : {},
        headers: authHeaders(),
      });
      setCustomers(data.customers);
    } catch {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div style={s.page}>
      <div style={s.topBar}>
        <div>
          <h1 style={s.title}>Customers</h1>
          <p style={s.sub}>Manage borrower profiles and view their analyses.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {customers.length > 0 && (
            <button style={s.btnOutline} onClick={() => exportCustomersCSV(customers)}>↓ Export CSV</button>
          )}
          <button style={s.btn} onClick={() => setShowForm(true)}>+ Add Customer</button>
        </div>
      </div>

      <div style={s.searchBar}>
        <input
          style={s.search}
          placeholder="Search by name, email, phone or BVN…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {showForm && <AddCustomerForm onClose={() => setShowForm(false)} onCreated={(c) => { setShowForm(false); navigate(`/dashboard/customers/${c._id}`); }} />}

      <div style={s.card}>
        {loading ? (
          <div style={s.empty}>Loading…</div>
        ) : customers.length === 0 ? (
          <div style={s.empty}>No customers yet. Click "Add Customer" to create one.</div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                {['Name', 'Email', 'Phone', 'BVN', 'NIN', 'Created', ''].map((h) => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map((c, i) => (
                <tr
                  key={c._id}
                  style={{ background: i % 2 ? '#f8fafc' : '#fff', cursor: 'pointer' }}
                  onClick={() => navigate(`/dashboard/customers/${c._id}`)}
                >
                  <td style={s.td}><span style={s.name}>{c.name}</span></td>
                  <td style={s.td}>{c.email || '—'}</td>
                  <td style={s.td}>{c.phone || '—'}</td>
                  <td style={s.td}>{c.bvn ? `••••${c.bvn.slice(-4)}` : '—'}</td>
                  <td style={s.td}>{c.nin ? `••••${c.nin.slice(-4)}` : '—'}</td>
                  <td style={s.td}>{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td style={s.td}><span style={s.viewLink}>View →</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function AddCustomerForm({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', email: '', bvn: '', nin: '', phone: '', address: '' });
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name) return toast.error('Name is required');
    setSaving(true);
    try {
      const { data } = await axios.post(`${API}/api/customers`, form, { headers: authHeaders() });
      toast.success('Customer created');
      onCreated(data.customer);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create customer');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.modalHeader}>
          <div style={s.modalTitle}>New Customer</div>
          <button onClick={onClose} style={s.closeBtn}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={s.modalGrid}>
            {[
              { k: 'name', label: 'Full Name *', placeholder: 'e.g. Amaka Obi' },
              { k: 'email', label: 'Email', placeholder: 'amaka@example.com' },
              { k: 'phone', label: 'Phone', placeholder: '08012345678' },
              { k: 'bvn', label: 'BVN', placeholder: '22222222222', maxLength: 11 },
              { k: 'nin', label: 'NIN', placeholder: '12345678901', maxLength: 11 },
              { k: 'address', label: 'Address (optional)', placeholder: '12 Broad Street, Lagos', span: true },
            ].map(({ k, label, placeholder, maxLength, span }) => (
              <div key={k} style={{ ...s.field, ...(span ? { gridColumn: 'span 2' } : {}) }}>
                <label style={s.label}>{label}</label>
                <input
                  style={s.input}
                  placeholder={placeholder}
                  value={form[k]}
                  maxLength={maxLength}
                  onChange={set(k)}
                />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button type="button" onClick={onClose} style={s.cancelBtn}>Cancel</button>
            <button type="submit" style={{ ...s.btn, opacity: saving ? 0.7 : 1 }} disabled={saving}>
              {saving ? 'Saving…' : 'Create Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const s = {
  page: { padding: '2rem', maxWidth: 1100, margin: '0 auto' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' },
  title: { fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 4px' },
  sub: { fontSize: 14, color: '#64748b', margin: 0 },
  btn: { background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer' },
  btnOutline: { background: '#fff', color: '#0ea5e9', border: '1.5px solid #0ea5e9', borderRadius: 8, padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer' },
  searchBar: { marginBottom: 16 },
  search: { width: '100%', maxWidth: 400, border: '1px solid #d1d5db', borderRadius: 8, padding: '9px 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box' },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden' },
  empty: { padding: '3rem', textAlign: 'center', color: '#94a3b8', fontSize: 14 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { background: '#0f172a', color: '#94a3b8', padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 },
  td: { padding: '13px 16px', borderBottom: '1px solid #f1f5f9', fontSize: 14, color: '#334155' },
  name: { fontWeight: 700, color: '#0f172a' },
  viewLink: { color: '#0ea5e9', fontWeight: 600, fontSize: 13 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal: { background: '#fff', borderRadius: 16, padding: '2rem', width: 520, maxWidth: '95vw', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 18, fontWeight: 800, color: '#0f172a' },
  closeBtn: { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#94a3b8' },
  modalGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  field: {},
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 },
  input: { width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box', outline: 'none' },
  cancelBtn: { background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer' },
};
