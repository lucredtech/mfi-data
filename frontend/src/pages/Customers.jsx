import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { exportCustomersCSV } from '../services/exportCSV';
import { parseApiError, isUnauthorized } from '../utils/apiError';
import CsvImportModal from '../components/CsvImportModal';
import AddCustomerModal from '../components/AddCustomerModal';
import { useAuth } from '../context/AuthContext';
import api, { API_BASE as API } from '../services/api';


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
  const { isViewer } = useAuth();
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'duplicates'
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
          {!isViewer && <button style={s.btnOutline} onClick={() => setShowImport(true)}>↑ Import CSV</button>}
          {!isViewer && <button style={s.btn} onClick={() => setShowForm(true)}>+ Add Customer</button>}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '2px solid #e2e8f0' }}>
        {[['list', 'All Customers'], ['duplicates', 'Duplicates']].map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '8px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            background: 'none', border: 'none',
            borderBottom: activeTab === tab ? '3px solid #0ea5e9' : '3px solid transparent',
            color: activeTab === tab ? '#0ea5e9' : '#64748b',
            marginBottom: -2,
          }}>{label}</button>
        ))}
      </div>

      {activeTab === 'list' && (
        <>
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
              <div>
                <div style={sf.label}>Created from</div>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={sf.inp} />
              </div>
              <div>
                <div style={sf.label}>To</div>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={sf.inp} />
              </div>
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

          {/* Bulk action bar — hidden for viewers */}
          {!isViewer && selected.size > 0 && (
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
        </>
      )}

      {activeTab === 'duplicates' && (
        <DuplicatesTab onCustomerDeleted={loadCustomers} navigate={navigate} isViewer={isViewer} />
      )}

      {showImport && <CsvImportModal onClose={() => setShowImport(false)} onImported={loadCustomers} />}
      {showForm && <AddCustomerModal onClose={() => setShowForm(false)} onCreated={(c) => { setShowForm(false); navigate(`/dashboard/customers/${c._id}`); }} />}
    </div>
  );
}

function DuplicatesTab({ onCustomerDeleted, navigate, isViewer }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [dismissed, setDismissed] = useState(new Set()); // dismissed group keys
  const [merging, setMerging] = useState(null); // groupKey being merged

  async function scan() {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/api/customers/duplicates`, { headers: authHeaders() });
      setGroups(data.groups || []);
      setScanned(true);
      setDismissed(new Set());
    } catch {
      toast.error('Failed to scan for duplicates');
    } finally {
      setLoading(false);
    }
  }

  async function merge(group, keepId) {
    const deleteIds = group.customers.map(c => String(c._id)).filter(id => id !== String(keepId));
    const key = `${group.field}:${group.value}`;
    setMerging(key);
    try {
      const { data } = await axios.post(`${API}/api/customers/duplicates/merge`, { keepId, deleteIds }, { headers: authHeaders() });
      toast.success(`Merged — kept 1 record, removed ${data.merged}`);
      setGroups(prev => prev.filter(g => `${g.field}:${g.value}` !== key));
      onCustomerDeleted();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Merge failed');
    } finally {
      setMerging(null);
    }
  }

  function dismiss(group) {
    setDismissed(prev => new Set([...prev, `${group.field}:${group.value}`]));
  }

  const FIELD_LABEL = { bvn: 'BVN', nin: 'NIN', phone: 'Phone', email: 'Email' };
  const FIELD_COLOR = { bvn: ['#dbeafe', '#1d4ed8'], nin: ['#ede9fe', '#6d28d9'], phone: ['#dcfce7', '#16a34a'], email: ['#fef3c7', '#d97706'] };

  const visible = groups.filter(g => !dismissed.has(`${g.field}:${g.value}`));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Duplicate Customer Detection</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
            Finds customers sharing the same BVN, NIN, phone number, or email address.
          </div>
        </div>
        <button onClick={scan} disabled={loading}
          style={{ padding: '10px 22px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Scanning…' : scanned ? '↻ Re-scan' : 'Scan for Duplicates'}
        </button>
      </div>

      {!scanned && !loading && (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#fff', borderRadius: 14, border: '1.5px dashed #e2e8f0' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>Run a duplicate scan</div>
          <div style={{ fontSize: 13, color: '#64748b' }}>Click "Scan for Duplicates" to find customers with matching BVN, NIN, phone, or email.</div>
        </div>
      )}

      {scanned && !loading && visible.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#f0fdf4', borderRadius: 14, border: '1.5px solid #86efac' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#15803d', marginBottom: 6 }}>No duplicates found</div>
          <div style={{ fontSize: 13, color: '#16a34a' }}>All customers have unique BVN, NIN, phone, and email values.</div>
        </div>
      )}

      {visible.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>
            Found <strong style={{ color: '#dc2626' }}>{visible.length}</strong> duplicate group{visible.length !== 1 ? 's' : ''}.
            {dismissed.size > 0 && ` (${dismissed.size} dismissed)`}
          </div>
          {visible.map(group => {
            const key = `${group.field}:${group.value}`;
            const [fbg, ffg] = FIELD_COLOR[group.field] ?? ['#f1f5f9', '#64748b'];
            const isMerging = merging === key;
            return (
              <div key={key} style={{ background: '#fff', borderRadius: 12, border: '1.5px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                {/* Group header */}
                <div style={{ padding: '12px 18px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20, background: fbg, color: ffg, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {FIELD_LABEL[group.field]}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
                    {group.field === 'bvn' || group.field === 'nin'
                      ? `••••${String(group.value).slice(-4)}`
                      : group.value}
                  </span>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>— {group.customers.length} customers share this value</span>
                  <button onClick={() => dismiss(group)}
                    style={{ marginLeft: 'auto', fontSize: 12, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                    Dismiss
                  </button>
                </div>

                {/* Customer rows */}
                <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {group.customers.map((c, ci) => {
                    const [bg, fg] = SC[c.status] ?? ['#f1f5f9', '#64748b'];
                    return (
                      <div key={c._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: ci === 0 ? '#f0fdf4' : '#fafafa', borderRadius: 8, border: `1.5px solid ${ci === 0 ? '#86efac' : '#e2e8f0'}`, flexWrap: 'wrap' }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#0ea5e9,#6d28d9)', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 120 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{c.name}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>
                            {[c.email, c.phone].filter(Boolean).join(' · ') || 'No contact info'}
                          </div>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: bg, color: fg }}>{(c.status || 'applied').replace('_', ' ')}</span>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>{new Date(c.createdAt).toLocaleDateString()}</span>
                        {ci === 0 && <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '2px 8px', borderRadius: 20 }}>Keep</span>}
                        <button onClick={() => navigate(`/dashboard/customers/${c._id}`)}
                          style={{ fontSize: 12, fontWeight: 600, color: '#0ea5e9', background: 'none', border: 'none', cursor: 'pointer' }}>View →</button>
                      </div>
                    );
                  })}
                </div>

                {/* Actions */}
                <div style={{ padding: '12px 18px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 12, color: '#64748b', flex: 1 }}>
                    Merge keeps the oldest record (marked <strong>Keep</strong>), copies any missing fields from duplicates, then deletes the rest.
                  </div>
                  {!isViewer && (
                  <button
                    onClick={() => merge(group, group.customers[0]._id)}
                    disabled={isMerging}
                    style={{ padding: '8px 18px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: isMerging ? 'default' : 'pointer', opacity: isMerging ? 0.7 : 1 }}>
                    {isMerging ? 'Merging…' : `Merge → Keep ${group.customers[0].name}`}
                  </button>
                  )}
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
