import { useEffect, useState, useCallback } from 'react';
import adminApi from '../../services/adminApi';

const ACTION_LABEL = {
  BVN_CHECK: 'BVN Verification',
  NIN_CHECK: 'NIN Verification',
  BUREAU_CHECK: 'Bureau Check',
  STATEMENT_ANALYSIS: 'Statement Analysis',
  CUSTOMER_CREATED: 'Customer Created',
  CUSTOMER_DELETED: 'Customer Deleted',
  NOTE_ADDED: 'Note Added',
  BULK_STATUS_CHANGE: 'Bulk Status Change',
};

const ACTION_COLOR = {
  BVN_CHECK: ['#dcfce7', '#16a34a'],
  NIN_CHECK: ['#ede9fe', '#6d28d9'],
  BUREAU_CHECK: ['#fef3c7', '#d97706'],
  STATEMENT_ANALYSIS: ['#e0f2fe', '#0ea5e9'],
  CUSTOMER_CREATED: ['#f0fdf4', '#16a34a'],
  CUSTOMER_DELETED: ['#fee2e2', '#dc2626'],
  NOTE_ADDED: ['#f5f3ff', '#7c3aed'],
  BULK_STATUS_CHANGE: ['#fef3c7', '#d97706'],
};

const PAGE_SIZE = 50;

export default function AdminAuditLog() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(0);
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  useEffect(() => {
    adminApi.get('/api/admin/clients').then(({ data }) => setClients(data)).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: PAGE_SIZE, skip: page * PAGE_SIZE });
    if (clientId) params.set('clientId', clientId);
    if (actionFilter) params.set('action', actionFilter);
    adminApi.get(`/api/admin/audit?${params}`)
      .then(({ data }) => { setLogs(data.logs || []); setTotal(data.total || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clientId, actionFilter, page]);

  useEffect(() => { load(); }, [load]);

  const selectedClient = clients.find(c => c._id === clientId);

  const filteredClients = clients.filter(c =>
    c.organizationName.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.email.toLowerCase().includes(clientSearch.toLowerCase())
  );

  function changeAction(val) { setActionFilter(val); setPage(0); }
  function selectClient(c) { setClientId(c ? c._id : ''); setPage(0); setShowClientDropdown(false); setClientSearch(''); }

  return (
    <div>
      <h1 style={s.h1}>Audit Log</h1>
      <p style={s.sub}>{total > 0 ? <><strong>{total.toLocaleString()}</strong> entries platform-wide</> : 'Platform-wide activity log'}</p>

      {/* Filters row */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16, alignItems: 'flex-start' }}>
        {/* Client picker */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowClientDropdown(v => !v)}
            style={{ padding: '8px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, background: clientId ? '#0f172a' : '#fff', color: clientId ? '#fff' : '#334155', fontWeight: 600, fontSize: 13, cursor: 'pointer', minWidth: 180, textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedClient ? selectedClient.organizationName : 'All clients'}
            </span>
            <span style={{ flexShrink: 0 }}>▾</span>
          </button>
          {showClientDropdown && (
            <div style={{ position: 'absolute', top: '110%', left: 0, zIndex: 100, background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', width: 280 }}>
              <div style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9' }}>
                <input
                  autoFocus
                  value={clientSearch}
                  onChange={e => setClientSearch(e.target.value)}
                  placeholder="Search clients…"
                  style={{ width: '100%', padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                <div onClick={() => selectClient(null)} style={{ padding: '9px 14px', fontSize: 13, cursor: 'pointer', color: clientId === '' ? '#0ea5e9' : '#334155', fontWeight: clientId === '' ? 700 : 400 }}>
                  All clients
                </div>
                {filteredClients.map(c => (
                  <div key={c._id} onClick={() => selectClient(c)}
                    style={{ padding: '9px 14px', fontSize: 13, cursor: 'pointer', color: clientId === c._id ? '#0ea5e9' : '#334155', fontWeight: clientId === c._id ? 700 : 400, borderTop: '1px solid #f8fafc' }}
                  >
                    <div style={{ fontWeight: 600 }}>{c.organizationName}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{c.email}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action filter pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button style={{ ...s.pill, ...(actionFilter === '' ? s.pillActive : {}) }} onClick={() => changeAction('')}>All Actions</button>
          {Object.entries(ACTION_LABEL).map(([k, label]) => (
            <button key={k} style={{ ...s.pill, ...(actionFilter === k ? s.pillActive : {}) }} onClick={() => changeAction(k)}>{label}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={s.tableBox}>
        {loading ? (
          <div style={s.empty}>Loading…</div>
        ) : logs.length === 0 ? (
          <div style={s.empty}>No entries match the selected filters.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['Client', 'Action', 'Description', 'Time'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {logs.map((log, i) => {
                const [bg, fg] = ACTION_COLOR[log.action] || ['#f1f5f9', '#64748b'];
                return (
                  <tr key={log._id} style={{ background: i % 2 ? '#fafafa' : '#fff' }}>
                    <td style={{ ...s.td, width: 180 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{log.client?.organizationName || '—'}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{log.client?.email}</div>
                    </td>
                    <td style={{ ...s.td, width: 160 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: bg, color: fg, whiteSpace: 'nowrap' }}>
                        {ACTION_LABEL[log.action] || log.action}
                      </span>
                    </td>
                    <td style={{ ...s.td, color: '#334155' }}>
                      <div style={{ fontSize: 13 }}>{log.label || '—'}</div>
                      {log.meta && Object.keys(log.meta).length > 0 && (
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                          {Object.entries(log.meta).filter(([, v]) => v && v !== 'undefined').map(([k, v]) => `${k}: ${v}`).join(' · ')}
                        </div>
                      )}
                    </td>
                    <td style={{ ...s.td, color: '#64748b', fontSize: 12, whiteSpace: 'nowrap', width: 160 }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {total > PAGE_SIZE && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderTop: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total.toLocaleString()}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={s.pageBtn} disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <button style={s.pageBtn} disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  h1: { fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 },
  sub: { color: '#64748b', fontSize: 14, marginTop: 4, marginBottom: 20 },
  pill: { fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 20, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer' },
  pillActive: { background: '#0f172a', color: '#fff', border: '1.5px solid #0f172a' },
  tableBox: { background: '#fff', borderRadius: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.06)', overflow: 'hidden' },
  th: { textAlign: 'left', padding: '10px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  td: { padding: '12px 16px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' },
  empty: { padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: 14 },
  pageBtn: { fontSize: 13, fontWeight: 600, padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#334155', cursor: 'pointer' },
};
