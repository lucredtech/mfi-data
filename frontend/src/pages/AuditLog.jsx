import { useEffect, useState } from 'react';
import api from '../services/api';

const ACTION_LABEL = {
  BVN_CHECK: 'BVN Verification',
  NIN_CHECK: 'NIN Verification',
  BUREAU_CHECK: 'Bureau Check',
  STATEMENT_ANALYSIS: 'Statement Analysis',
  STATEMENT_REANALYSIS: 'Statement Re-analysis',
  CUSTOMER_CREATED: 'Customer Created',
  CUSTOMER_UPDATED: 'Customer Updated',
  CUSTOMER_DELETED: 'Customer Deleted',
  NOTE_ADDED: 'Note Added',
  NOTE_DELETED: 'Note Deleted',
  LOAN_REVIEW_CREATED: 'Loan Review',
  STATUS_CHANGED: 'Status Changed',
  BULK_STATUS_CHANGE: 'Bulk Status Change',
  MERGE_DUPLICATES: 'Duplicates Merged',
  SCORECARD_SAVED: 'Scorecard Saved',
};

const ACTION_COLOR = {
  BVN_CHECK: ['#dcfce7', '#16a34a'],
  NIN_CHECK: ['#ede9fe', '#6d28d9'],
  BUREAU_CHECK: ['#fef3c7', '#d97706'],
  STATEMENT_ANALYSIS: ['#e0f2fe', '#0ea5e9'],
  STATEMENT_REANALYSIS: ['#f0f9ff', '#0284c7'],
  CUSTOMER_CREATED: ['#f0fdf4', '#16a34a'],
  CUSTOMER_UPDATED: ['#f0fdf4', '#16a34a'],
  CUSTOMER_DELETED: ['#fee2e2', '#dc2626'],
  NOTE_ADDED: ['#f5f3ff', '#7c3aed'],
  NOTE_DELETED: ['#fee2e2', '#dc2626'],
  LOAN_REVIEW_CREATED: ['#fef3c7', '#d97706'],
  STATUS_CHANGED: ['#dbeafe', '#1d4ed8'],
  BULK_STATUS_CHANGE: ['#dbeafe', '#1d4ed8'],
  MERGE_DUPLICATES: ['#fee2e2', '#dc2626'],
  SCORECARD_SAVED: ['#f0fdf4', '#16a34a'],
};

const ALL_ACTIONS = Object.keys(ACTION_LABEL);

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: PAGE_SIZE, skip: page * PAGE_SIZE });
    if (actionFilter) params.set('action', actionFilter);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    api.get(`/api/audit?${params}`)
      .then(({ data }) => { setLogs(data.logs || []); setTotal(data.total || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [actionFilter, dateFrom, dateTo, page]);

  function changeFilter(val) { setActionFilter(val); setPage(0); }
  function clearDates() { setDateFrom(''); setDateTo(''); setPage(0); }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div>
          <h1 style={s.h1}>Audit Log</h1>
          <p style={s.sub}>A record of all actions performed on your account. {total > 0 && <strong>{total.toLocaleString()} entries</strong>}</p>
        </div>
      </div>

      {/* Date range filter */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(0); }}
          style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, outline: 'none', color: '#334155' }} />
        <span style={{ fontSize: 12, color: '#94a3b8' }}>to</span>
        <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(0); }}
          style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, outline: 'none', color: '#334155' }} />
        {(dateFrom || dateTo) && (
          <button onClick={clearDates} style={{ fontSize: 12, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}>✕ Clear</button>
        )}
      </div>

      {/* Action filter bar */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        <button style={{ ...s.pill, ...(actionFilter === '' ? s.pillActive : {}) }} onClick={() => changeFilter('')}>All Actions</button>
        {ALL_ACTIONS.map(a => (
          <button key={a} style={{ ...s.pill, ...(actionFilter === a ? s.pillActive : {}) }} onClick={() => changeFilter(a)}>
            {ACTION_LABEL[a]}
          </button>
        ))}
      </div>

      {/* Log table */}
      <div style={s.tableBox}>
        {loading ? (
          <div style={s.empty}>Loading…</div>
        ) : logs.length === 0 ? (
          <div style={s.empty}>No audit log entries yet. Actions like BVN checks, customer creation, and statement analysis will appear here.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Action', 'Description', 'Time'].map(h => <th key={h} style={s.th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => {
                const [bg, fg] = ACTION_COLOR[log.action] || ['#f1f5f9', '#64748b'];
                return (
                  <tr key={log._id} style={{ background: i % 2 ? '#fafafa' : '#fff' }}>
                    <td style={{ ...s.td, width: 180 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: bg, color: fg, whiteSpace: 'nowrap' }}>
                        {ACTION_LABEL[log.action] || log.action}
                      </span>
                    </td>
                    <td style={{ ...s.td, color: '#334155' }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{log.label || '—'}</div>
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

        {/* Pagination */}
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
