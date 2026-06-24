import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { exportCustomersCSV } from '../services/exportCSV';
import { parseApiError, isUnauthorized } from '../utils/apiError';
import CsvImportModal from '../components/CsvImportModal';

const API = import.meta.env.VITE_API_URL || 'https://mfi-data-production.up.railway.app';

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('token')}` };
}

const STATUSES = [
  { value: '', label: 'All' },
  { value: 'applied', label: 'Applied' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'disbursed', label: 'Disbursed' },
];

const SC = {
  applied: ['#dbeafe', '#1d4ed8'],
  under_review: ['#fef3c7', '#d97706'],
  approved: ['#dcfce7', '#16a34a'],
  rejected: ['#fee2e2', '#dc2626'],
  disbursed: ['#ede9fe', '#6d28d9'],
};

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [hasLoanReview, setHasLoanReview] = useState(false);
  const [hasBureau, setHasBureau] = useState(false);
  const [hasBvn, setHasBvn] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulking, setBulking] = useState(false);
  const navigate = useNavigate();

  const activeFilterCount = [statusFilter, typeFilter, dateFrom, dateTo, hasLoanReview, hasBureau, hasBvn].filter(Boolean).length;

  const loadCustomers = useCallback(async () => {
    try {
      const params = {};
      if (q) params.q = q;
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.customerType = typeFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      if (hasLoanReview) params.hasLoanReview = 'true';
      if (hasBureau) params.hasBureau = 'true';
      if (hasBvn) params.hasBvn = 'true';
      const { data } = await axios.get(`${API}/api/customers`, { params, headers: authHeaders() });
      setCustomers(data.customers);
      setTotal(data.total ?? data.customers.length);
      setSelected(new Set());
    } catch (err) {
      if (isUnauthorized(err)) { navigate('/login'); return; }
      toast.error('Failed to load customers. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, [q, statusFilter, typeFilter, dateFrom, dateTo, hasLoanReview, hasBureau, hasBvn]);

  useEffect(() => { loadCustomers(); }, [loadCustomers]);

  const toggleSelect = (id, e) => {
    e.stopPropagation();
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const toggleAll = () => {
    setSelected(selected.size === customers.length ? new Set() : new Set(customers.map(c => c._id)));
  };

  const applyBulkStatus = async () => {
    if (!bulkStatus || selected.size === 0) return;
    setBulking(true);
    try {
      const { data } = await axios.patch(`${API}/api/customers/bulk/status`, { ids: [...selected], status: bulkStatus }, { headers: authHeaders() });
      toast.success(`Updated ${data.updated} customer${data.updated !== 1 ? 's' : ''}`);
      setBulkStatus('');
      loadCustomers();
    } catch { toast.error('Bulk update failed'); }
    finally { setBulking(false); }
  };

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
          <button style={s.btnOutline} onClick={() => setShowImport(true)}>↑ Import CSV</button>
          <button style={s.btn} onClick={() => setShowForm(true)}>+ Add Customer</button>
        </div>
      </div>

      {/* Search + filter row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          style={{ ...s.search, flex: '1 1 260px', maxWidth: 360 }}
          placeholder="Search by name, email, phone or BVN…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button
          onClick={() => setShowFilters(f => !f)}
          style={{
            padding: '8px 14px', borderRadius: 8, border: `1.5px solid ${showFilters || activeFilterCount > 0 ? '#6d28d9' : '#e2e8f0'}`,
            background: showFilters || activeFilterCount > 0 ? '#ede9fe' : '#fff',
            color: activeFilterCount > 0 ? '#6d28d9' : '#64748b', fontWeight: 600, fontSize: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          ⚙ Filters {activeFilterCount > 0 && <span style={{ background: '#6d28d9', color: '#fff', borderRadius: 20, padding: '1px 7px', fontSize: 11 }}>{activeFilterCount}</span>}
        </button>
        {activeFilterCount > 0 && (
          <button
            onClick={() => { setStatusFilter(''); setTypeFilter(''); setDateFrom(''); setDateTo(''); setHasLoanReview(false); setHasBureau(false); setHasBvn(false); }}
            style={{ fontSize: 12, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
          >✕ Clear filters</button>
        )}
        {!loading && <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 'auto' }}>{total} customer{total !== 1 ? 's' : ''}</span>}
      </div>

      {/* Status quick-pills */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: showFilters ? 8 : 12 }}>
        {STATUSES.map(st => (
          <button key={st.value} onClick={() => setStatusFilter(st.value)} style={{
            padding: '6px 12px', borderRadius: 20, border: '1.5px solid',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            borderColor: statusFilter === st.value ? '#0ea5e9' : '#e2e8f0',
            background: statusFilter === st.value ? '#e0f2fe' : '#fff',
            color: statusFilter === st.value ? '#0284c7' : '#64748b',
          }}>{st.label}</button>
        ))}
      </div>

      {/* Advanced filter panel */}
      {showFilters && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem 1.5rem', marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-end' }}>
          {/* Customer type */}
          <div>
            <div style={sf.label}>Customer type</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[['', 'All'], ['individual', 'Individual'], ['business', 'SME']].map(([v, l]) => (
                <button key={v} onClick={() => setTypeFilter(v)} style={{
                  padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${typeFilter === v ? '#0ea5e9' : '#e2e8f0'}`,
                  background: typeFilter === v ? '#e0f2fe' : '#fff', color: typeFilter === v ? '#0284c7' : '#64748b',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>{l}</button>
              ))}
            </div>
          </div>

          {/* Date range */}
          <div>
            <div style={sf.label}>Created from</div>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={sf.inp} />
          </div>
          <div>
            <div style={sf.label}>To</div>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={sf.inp} />
          </div>

          {/* Has-record checkboxes */}
          <div>
            <div style={sf.label}>Has records</div>
            <div style={{ display: 'flex', gap: 12 }}>
              {[
                [hasBvn, setHasBvn, 'BVN verified'],
                [hasBureau, setHasBureau, 'Bureau check'],
                [hasLoanReview, setHasLoanReview, 'Loan review'],
              ].map(([val, set, label]) => (
                <label key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, color: '#334155', cursor: 'pointer' }}>
                  <input type="checkbox" checked={val} onChange={e => set(e.target.checked)} style={{ accentColor: '#6d28d9', cursor: 'pointer' }} />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#0f172a', borderRadius: 10, padding: '10px 16px', marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{selected.size} selected</span>
          <select
            value={bulkStatus}
            onChange={e => setBulkStatus(e.target.value)}
            style={{ fontSize: 13, padding: '6px 10px', borderRadius: 8, border: 'none', background: '#1e293b', color: '#e2e8f0', cursor: 'pointer' }}
          >
            <option value="">Set status…</option>
            {STATUSES.filter(s => s.value).map(st => (
              <option key={st.value} value={st.value}>{st.label}</option>
            ))}
          </select>
          <button
            onClick={applyBulkStatus}
            disabled={!bulkStatus || bulking}
            style={{ fontSize: 13, fontWeight: 700, padding: '6px 16px', borderRadius: 8, border: 'none', background: bulkStatus ? '#0ea5e9' : '#334155', color: '#fff', cursor: bulkStatus ? 'pointer' : 'default', opacity: bulking ? 0.7 : 1 }}
          >{bulking ? 'Updating…' : 'Apply'}</button>
          <button onClick={() => setSelected(new Set())} style={{ fontSize: 12, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto' }}>✕ Clear</button>
        </div>
      )}

      {showImport && <CsvImportModal onClose={() => setShowImport(false)} onImported={loadCustomers} />}
      {showForm && <AddCustomerForm onClose={() => setShowForm(false)} onCreated={(c) => { setShowForm(false); navigate(`/dashboard/customers/${c._id}`); }} />}

      <div style={s.card}>
        {loading ? (
          <div style={s.empty}>Loading…</div>
        ) : customers.length === 0 ? (
          <div style={s.empty}>{activeFilterCount > 0 ? 'No customers match the active filters.' : 'No customers yet. Click "Add Customer" to create one.'}</div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={{ ...s.th, width: 40 }}>
                  <input type="checkbox" checked={selected.size === customers.length && customers.length > 0} onChange={toggleAll} style={{ cursor: 'pointer' }} />
                </th>
                {['Name', 'Type', 'Status', 'Email', 'Phone', 'BVN', 'Created', ''].map((h) => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map((c, i) => {
                const [bg, fg] = SC[c.status] ?? ['#f1f5f9', '#64748b'];
                return (
                  <tr
                    key={c._id}
                    style={{ background: selected.has(c._id) ? '#f0f9ff' : i % 2 ? '#f8fafc' : '#fff', cursor: 'pointer' }}
                    onClick={() => navigate(`/dashboard/customers/${c._id}`)}
                  >
                    <td style={s.td} onClick={e => toggleSelect(c._id, e)}>
                      <input type="checkbox" checked={selected.has(c._id)} onChange={() => {}} style={{ cursor: 'pointer' }} />
                    </td>
                    <td style={s.td}><span style={s.name}>{c.name}</span></td>
                    <td style={s.td}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: c.customerType === 'business' ? '#fef3c7' : '#f0f9ff', color: c.customerType === 'business' ? '#d97706' : '#0ea5e9' }}>
                        {c.customerType === 'business' ? 'SME' : 'Individual'}
                      </span>
                    </td>
                    <td style={s.td}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: bg, color: fg }}>
                        {(c.status || 'applied').replace('_', ' ')}
                      </span>
                    </td>
                    <td style={s.td}>{c.email || '—'}</td>
                    <td style={s.td}>{c.phone || '—'}</td>
                    <td style={s.td}>{c.bvn ? `••••${c.bvn.slice(-4)}` : '—'}</td>
                    <td style={s.td}>{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td style={s.td}><span style={s.viewLink}>View →</span></td>
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

function AddCustomerForm({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', email: '', bvn: '', nin: '', phone: '', address: '', customerType: 'individual' });
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
      toast.error(parseApiError(err, { default: 'Failed to create customer. Please try again.' }));
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
          {/* Customer type selector */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            {[['individual', 'Individual'], ['business', 'Business (SME)']].map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setForm(f => ({ ...f, customerType: val }))}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  border: `2px solid ${form.customerType === val ? '#0ea5e9' : '#e2e8f0'}`,
                  background: form.customerType === val ? '#f0f9ff' : '#fff',
                  color: form.customerType === val ? '#0ea5e9' : '#64748b',
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div style={s.modalGrid}>
            {[
              { k: 'name', label: form.customerType === 'business' ? 'Business Name *' : 'Full Name *', placeholder: form.customerType === 'business' ? 'e.g. Okeke Ventures Ltd' : 'e.g. Amaka Obi' },
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

const sf = {
  label: { fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  inp: { padding: '7px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none' },
};

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
