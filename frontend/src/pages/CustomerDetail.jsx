import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { parseApiError, isUnauthorized } from '../utils/apiError';
import { exportLoanReviewPDF } from '../services/exportLoanReviewPDF';
import { exportCustomerReportPDF } from '../services/exportCustomerReportPDF';

const API = import.meta.env.VITE_API_URL || 'https://mfi-data-production.up.railway.app';

function authHeaders() { return { Authorization: `Bearer ${localStorage.getItem('token')}` }; }
function apiKeyHeaders() { return { 'X-Api-Key': localStorage.getItem('apiKey') }; }

const TABS = ['Overview', 'Timeline', 'Statement Analysis', 'BVN Verification', 'NIN Verification', 'Credit Bureau', 'Scorecard', 'Loan Review'];

// ── Discrepancy engine ───────────────────────────────────────────────────────
function detectDiscrepancies(customer, bvnData, ninData) {
  const issues = [];
  const norm = (s) => (s || '').toString().trim().toLowerCase();

  const bvnName = `${bvnData.firstName || ''} ${bvnData.lastName || ''}`.trim();
  const ninName = `${ninData.firstName || ''} ${ninData.lastName || ''}`.trim();
  const profileName = customer.name || '';

  if (bvnName && ninName && norm(bvnName) !== norm(ninName))
    issues.push({ field: 'Full Name', bvn: bvnName, nin: ninName, profile: profileName, severity: 'high' });
  else if (bvnName && profileName && norm(bvnName) !== norm(profileName))
    issues.push({ field: 'Full Name', bvn: bvnName, nin: ninName || '—', profile: profileName, severity: 'medium' });

  if (bvnData.dateOfBirth && ninData.dateOfBirth && norm(bvnData.dateOfBirth) !== norm(ninData.dateOfBirth))
    issues.push({ field: 'Date of Birth', bvn: bvnData.dateOfBirth, nin: ninData.dateOfBirth, profile: '—', severity: 'high' });

  if (bvnData.gender && ninData.gender && norm(bvnData.gender) !== norm(ninData.gender))
    issues.push({ field: 'Gender', bvn: bvnData.gender, nin: ninData.gender, profile: '—', severity: 'medium' });

  if (bvnData.phoneNumber && ninData.phoneNumber) {
    const bvnPhone = bvnData.phoneNumber.replace(/\D/g, '').slice(-10);
    const ninPhone = ninData.phoneNumber.replace(/\D/g, '').slice(-10);
    if (bvnPhone !== ninPhone)
      issues.push({ field: 'Phone Number', bvn: bvnData.phoneNumber, nin: ninData.phoneNumber, profile: customer.phone || '—', severity: 'low' });
  }

  if (bvnData.watchListed || ninData.watchListed)
    issues.push({ field: 'Watch Listed', bvn: String(!!bvnData.watchListed), nin: String(!!ninData.watchListed), profile: '—', severity: 'high' });

  return issues;
}

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState('Overview');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const { data: res } = await axios.get(`${API}/api/customers/${id}`, { headers: authHeaders() });
      setData(res);
    } catch (err) {
      if (isUnauthorized(err)) { navigate('/login'); return; }
      toast.error('Failed to load customer data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }

  const [customerStatus, setCustomerStatus] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [loanReviews, setLoanReviews] = useState([]);

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (!id) return;
    axios.get(`${API}/api/customers/${id}/loan-reviews`, { headers: authHeaders() })
      .then(({ data }) => setLoanReviews(data.reviews || []))
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (data?.customer) setCustomerStatus(data.customer.status ?? 'applied');
  }, [data?.customer?._id]);

  if (loading) return <div style={s.loading}>Loading…</div>;
  if (!data) return <div style={s.loading}>Customer not found.</div>;

  const { customer, statements, bvnResults, ninResults, bureauResults } = data;
  const latestBVN = bvnResults?.find((r) => r.status === 'success');
  const latestNIN = ninResults?.find((r) => r.status === 'success');
  const discrepancies = latestBVN?.result && latestNIN?.result
    ? detectDiscrepancies(customer, latestBVN.result, latestNIN.result)
    : [];

  const isWatchlisted = latestBVN?.result?.watchListed === true || latestNIN?.result?.watchListed === true;
  const currentStatus = customerStatus ?? customer.status ?? 'applied';

  async function deleteCustomer() {
    if (!confirm(`Permanently delete ${customer.name} and all their records? This cannot be undone.`)) return;
    try {
      await axios.delete(`${API}/api/customers/${id}`, { headers: authHeaders() });
      toast.success('Customer deleted');
      navigate('/dashboard/customers');
    } catch {
      toast.error('Failed to delete customer');
    }
  }

  async function updateStatus(newStatus) {
    setUpdatingStatus(true);
    try {
      await axios.patch(`${API}/api/customers/${id}/status`, { status: newStatus }, { headers: authHeaders() });
      setCustomerStatus(newStatus);
      toast.success('Status updated');
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  }

  const STATUS_COLORS = { applied: ['#dbeafe','#1d4ed8'], under_review: ['#fef3c7','#d97706'], approved: ['#dcfce7','#16a34a'], rejected: ['#fee2e2','#dc2626'], disbursed: ['#ede9fe','#6d28d9'] };

  return (
    <div style={s.page}>
      {/* Watchlist banner */}
      {isWatchlisted && (
        <div style={{ background: '#7f1d1d', color: '#fff', borderRadius: 10, padding: '14px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>🚫</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Watchlist Alert — This customer is flagged by {latestBVN?.result?.watchListed && latestNIN?.result?.watchListed ? 'BVN and NIN' : latestBVN?.result?.watchListed ? 'BVN' : 'NIN'}</div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>Review carefully before approving any loan. Do not disburse without senior credit officer sign-off.</div>
          </div>
        </div>
      )}

      {/* Breadcrumb */}
      <div style={s.breadcrumb}>
        <Link to="/dashboard/customers" style={s.breadLink}>Customers</Link>
        <span style={s.breadSep}> / </span>
        <span style={s.breadCurrent}>{customer.name}</span>
      </div>

      {/* Customer header */}
      <div style={s.header}>
        {/* Photo from BVN or NIN */}
        <div style={s.avatarWrap}>
          {(latestBVN?.result?.image || latestNIN?.result?.photo) ? (
            <img
              src={`data:image/jpeg;base64,${latestBVN?.result?.image || latestNIN?.result?.photo}`}
              alt={customer.name}
              style={s.avatarImg}
            />
          ) : (
            <div style={s.avatar}>{customer.name.charAt(0).toUpperCase()}</div>
          )}
          {discrepancies.some(d => d.severity === 'high') && (
            <div style={s.discrepancyDot} title="Data discrepancies detected">!</div>
          )}
        </div>

        <div style={s.headerInfo}>
          <h1 style={s.name}>{customer.name}</h1>
          <div style={s.chips}>
            {customer.email && <span style={s.chip}>{customer.email}</span>}
            {customer.phone && <span style={s.chip}>{customer.phone}</span>}
            {customer.address && <span style={s.chip}>{customer.address}</span>}
            {customer.bvn && <span style={{ ...s.chip, background: '#dcfce7', color: '#16a34a' }}>BVN ••••{customer.bvn.slice(-4)}</span>}
            {customer.nin && <span style={{ ...s.chip, background: '#ede9fe', color: '#6d28d9' }}>NIN ••••{customer.nin.slice(-4)}</span>}
          </div>
        </div>

        <div style={s.headerActions}>
          {/* Status dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Status</span>
            <select
              value={currentStatus}
              onChange={e => updateStatus(e.target.value)}
              disabled={updatingStatus}
              style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20, border: 'none', background: STATUS_COLORS[currentStatus]?.[0] ?? '#f1f5f9', color: STATUS_COLORS[currentStatus]?.[1] ?? '#64748b', cursor: 'pointer', outline: 'none' }}
            >
              {['applied', 'under_review', 'approved', 'rejected', 'disbursed'].map(s => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
          </div>

          {discrepancies.length > 0 && (
            <div
              style={{ ...s.discrepancyBadge, background: discrepancies.some(d => d.severity === 'high') ? '#fee2e2' : '#fef3c7', color: discrepancies.some(d => d.severity === 'high') ? '#dc2626' : '#d97706', cursor: 'pointer' }}
              onClick={() => setTab('Overview')}
            >
              {discrepancies.length} discrepanc{discrepancies.length === 1 ? 'y' : 'ies'}
            </div>
          )}
          <div style={s.statPill}>{(statements || []).length} Statements</div>
          <div style={s.statPill}>{(bvnResults || []).length} BVN</div>
          <div style={s.statPill}>{(ninResults || []).length} NIN</div>
          <div style={s.statPill}>{(bureauResults || []).length} Bureau</div>
          <button
            onClick={() => exportCustomerReportPDF({ customer, bvnResults, ninResults, bureauResults, statements, loanReviews })}
            style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            ↓ Full Report
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        {TABS.map((t) => (
          <button key={t} style={{ ...s.tabBtn, ...(tab === t ? s.tabActive : {}) }} onClick={() => setTab(t)}>
            {t}
            {t === 'Loan Review' && (
              <span style={{ fontSize: 9, fontWeight: 800, background: '#7c3aed', color: '#fff', padding: '1px 6px', borderRadius: 20, marginLeft: 6, verticalAlign: 'middle', letterSpacing: 0.5 }}>BETA</span>
            )}
          </button>
        ))}
      </div>

      <div>
        {tab === 'Overview' && <OverviewTab customer={customer} statements={statements || []} bvnResults={bvnResults || []} ninResults={ninResults || []} bureauResults={bureauResults || []} discrepancies={discrepancies} setTab={setTab} customerId={id} />}
        {tab === 'Timeline' && <TimelineTab customer={customer} statements={statements || []} bvnResults={bvnResults || []} ninResults={ninResults || []} bureauResults={bureauResults || []} loanReviews={loanReviews} setTab={setTab} />}
        {tab === 'Statement Analysis' && <StatementTab customer={customer} statements={statements || []} onRefresh={load} />}
        {tab === 'BVN Verification' && <BVNTab customer={customer} bvnResults={bvnResults || []} onRefresh={load} />}
        {tab === 'NIN Verification' && <NINTab customer={customer} ninResults={ninResults || []} onRefresh={load} />}
        {tab === 'Credit Bureau' && <BureauTab customer={customer} bureauResults={bureauResults || []} onRefresh={load} />}
        {tab === 'Scorecard' && <ScorecardTab customer={customer} statements={statements || []} bvnResults={bvnResults || []} ninResults={ninResults || []} bureauResults={bureauResults || []} discrepancies={discrepancies} setTab={setTab} />}
        {tab === 'Loan Review' && <LoanReviewTab customer={customer} statements={statements || []} bvnResults={bvnResults || []} ninResults={ninResults || []} bureauResults={bureauResults || []} discrepancies={discrepancies} />}
      </div>

      {/* Danger zone */}
      <div style={{ marginTop: 32, padding: '16px 20px', border: '1.5px solid #fecaca', borderRadius: 10, background: '#fff5f5', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626' }}>Delete customer</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Permanently removes this customer and all their verification records. Cannot be undone.</div>
        </div>
        <button onClick={deleteCustomer} style={{ padding: '8px 20px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          Delete Customer
        </button>
      </div>
    </div>
  );
}

// ── Score explanations ────────────────────────────────────────────────────────
const SCORE_DETAIL = {
  incomeStability: {
    what: 'Measures regularity and predictability of income credits. High scores indicate consistent salary or business inflows at predictable intervals with stable amounts.',
    ranges: [[20,25,'Excellent — consistent, predictable income with regular employer or business credits'],[15,19,'Good — mostly regular income with some variation in timing or amount'],[10,14,'Moderate — irregular income; repayment timing may be unpredictable'],[0,9,'Poor — very inconsistent inflows; high risk of missed repayments']],
  },
  debtServicing: {
    what: 'Evaluates how well existing loan repayments are managed relative to income. Looks at consistency and proportion of loan deductions from the account.',
    ranges: [[20,25,'Excellent — loan repayments well within income capacity, comfortable buffer'],[15,19,'Good — repayments manageable but taking a notable share of income'],[10,14,'Moderate — existing debt load is high; additional borrowing increases risk significantly'],[0,9,'Poor — income barely covers current repayments; very little room for new debt']],
  },
  spendingBehavior: {
    what: 'Analyses spending patterns for signs of impulsive or high-risk behaviour including gambling, excessive lifestyle spending, or erratic large outflows.',
    ranges: [[20,25,'Excellent — disciplined, needs-based spending with no high-risk categories detected'],[15,19,'Good — generally controlled spending with occasional discretionary outflows'],[10,14,'Moderate — some concerning patterns; spending not fully aligned with income level'],[0,9,'Poor — impulsive or high-risk spending behaviour detected']],
  },
  liquidity: {
    what: 'Measures average account balance maintained after expenses. Higher balances signal a financial buffer that reduces default risk when income is delayed.',
    ranges: [[20,25,'Excellent — consistently maintains a healthy cash buffer above salary level'],[15,19,'Good — adequate liquidity with moderate reserve between pay cycles'],[10,14,'Moderate — balance often runs low; limited buffer for unexpected expenses'],[0,9,'Poor — account frequently near zero; no meaningful financial cushion']],
  },
};

// ── Payment history helpers ───────────────────────────────────────────────────
function worstPaymentCode(acc) {
  let worst = null;
  let worstSeverity = -1;
  for (let i = 1; i <= 24; i++) {
    const code = acc[`M${String(i).padStart(2, '0')}`];
    if (!code || code === '#') continue;
    const severity = code === '101' ? 100 : (parseInt(code, 10) || 0);
    if (severity > worstSeverity) { worst = code; worstSeverity = severity; }
  }
  return worst;
}

// ── Overview ─────────────────────────────────────────────────────────────────

function TimelineTab({ statements, bvnResults, ninResults, bureauResults, loanReviews, setTab }) {
  const events = [
    ...statements.map(r => ({ date: r.createdAt, type: 'Statement', label: `Statement analysis — ${r.bankName || 'bank'} · Grade ${r.result?.overallRiskScore?.overallRiskScore || '—'}`, status: r.status, color: '#0ea5e9', bg: '#e0f2fe', onClick: () => setTab('Statement Analysis') })),
    ...bvnResults.map(r => ({ date: r.createdAt, type: 'BVN', label: `BVN verification — ${r.result?.isValid !== false ? 'Verified' : 'Failed'}${r.result?.watchListed ? ' · ⚠ Watchlisted' : ''}`, status: r.status, color: '#16a34a', bg: '#dcfce7', onClick: () => setTab('BVN Verification') })),
    ...ninResults.map(r => ({ date: r.createdAt, type: 'NIN', label: `NIN verification — ${r.result?.isValid !== false ? 'Verified' : 'Failed'}`, status: r.status, color: '#6d28d9', bg: '#ede9fe', onClick: () => setTab('NIN Verification') })),
    ...bureauResults.map(r => ({ date: r.createdAt, type: 'Bureau', label: `Credit bureau check — Score ${r.result?.creditScore ?? '—'}`, status: r.status, color: '#f59e0b', bg: '#fef3c7', onClick: () => setTab('Credit Bureau') })),
    ...(loanReviews || []).map(r => ({ date: r.createdAt, type: 'Loan Review', label: `Loan review — ${r.verdict}${r.loanAmount ? ` · ₦${Number(r.loanAmount).toLocaleString()}` : ''}`, status: r.verdict === 'ELIGIBLE' ? 'success' : r.verdict === 'NOT_ELIGIBLE' ? 'failed' : 'conditional', color: r.verdict === 'ELIGIBLE' ? '#16a34a' : r.verdict === 'NOT_ELIGIBLE' ? '#dc2626' : '#d97706', bg: r.verdict === 'ELIGIBLE' ? '#dcfce7' : r.verdict === 'NOT_ELIGIBLE' ? '#fee2e2' : '#fef3c7', onClick: () => setTab('Loan Review') })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  if (events.length === 0) return (
    <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontSize: 14 }}>
      No activity yet. Run a BVN check, upload a statement, or pull a bureau report to see the timeline.
    </div>
  );

  function timeAgo(date) {
    const s = Math.floor((Date.now() - new Date(date)) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s/60)}m ago`;
    if (s < 86400) return `${Math.floor(s/3600)}h ago`;
    if (s < 604800) return `${Math.floor(s/86400)}d ago`;
    return new Date(date).toLocaleDateString();
  }

  return (
    <div style={{ paddingTop: 8 }}>
      <div style={{ position: 'relative', paddingLeft: 32 }}>
        <div style={{ position: 'absolute', left: 11, top: 0, bottom: 0, width: 2, background: '#e2e8f0', borderRadius: 1 }} />
        {events.map((ev, i) => (
          <div key={i} onClick={ev.onClick} style={{ position: 'relative', marginBottom: 20, cursor: 'pointer' }}>
            <div style={{ position: 'absolute', left: -27, top: 10, width: 12, height: 12, borderRadius: '50%', background: ev.color, border: '2px solid #fff', boxShadow: `0 0 0 2px ${ev.color}` }} />
            <div style={{ background: '#fff', borderRadius: 10, padding: '12px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 11, fontWeight: 700, background: ev.bg, color: ev.color, padding: '2px 8px', borderRadius: 12, marginRight: 8 }}>{ev.type}</span>
                <span style={{ fontSize: 13, color: '#334155', fontWeight: 500 }}>{ev.label}</span>
              </div>
              <span style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap', flexShrink: 0, marginTop: 2 }}>{timeAgo(ev.date)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OverviewTab({ customer, statements, bvnResults, ninResults, bureauResults, discrepancies, setTab, customerId }) {
  const latestStatement = statements[0];
  const latestBVN = bvnResults.find(r => r.status === 'success');
  const latestNIN = ninResults.find(r => r.status === 'success');
  const latestBureau = bureauResults[0];
  const risk = latestStatement?.result?.overallRiskScore || {};
  const bureauSecOverview = latestBureau ? parseBureauSections(latestBureau.result) : null;
  const creditScore = bureauSecOverview?.Scoring?.[0]?.TotalConsumerScore ?? latestBureau?.result?.creditScore ?? latestBureau?.result?.summary?.creditScore;

  const [notes, setNotes] = useState([]);
  const [noteText, setNoteText] = useState('');
  const [noteAuthor, setNoteAuthor] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    axios.get(`${API}/api/customers/${customerId}/notes`, { headers: authHeaders() })
      .then(r => setNotes(r.data.notes || []))
      .catch(() => {});
  }, [customerId]);

  async function addNote() {
    if (!noteText.trim()) return;
    setSavingNote(true);
    try {
      const { data } = await axios.post(`${API}/api/customers/${customerId}/notes`, { text: noteText, author: noteAuthor || undefined }, { headers: authHeaders() });
      setNotes(prev => [data.note, ...prev]);
      setNoteText('');
      toast.success('Note saved');
    } catch { toast.error('Failed to save note'); }
    setSavingNote(false);
  }

  async function deleteNote(noteId) {
    try {
      await axios.delete(`${API}/api/customers/${customerId}/notes/${noteId}`, { headers: authHeaders() });
      setNotes(prev => prev.filter(n => n._id !== noteId));
    } catch { toast.error('Failed to delete note'); }
  }

  const hasHighDisc = discrepancies.some(d => d.severity === 'high');

  return (
    <div>
      <div style={s.summaryGrid}>
        <SummaryCard label="Risk Grade" value={risk.overallRiskScore || '—'} sub={risk.recommendation || 'No statement'} color="#0ea5e9" onClick={() => setTab('Statement Analysis')} />
        <SummaryCard label="BVN Status" value={latestBVN ? (latestBVN.result?.isValid !== false ? 'Verified' : 'Failed') : '—'} sub={latestBVN?.result?.firstName ? `${latestBVN.result.firstName} ${latestBVN.result.lastName}` : 'Not verified'} color={latestBVN ? '#16a34a' : '#94a3b8'} onClick={() => setTab('BVN Verification')} />
        <SummaryCard label="NIN Status" value={latestNIN ? (latestNIN.result?.isValid !== false ? 'Verified' : 'Failed') : '—'} sub={latestNIN?.result?.firstName ? `${latestNIN.result.firstName} ${latestNIN.result.lastName}` : 'Not verified'} color={latestNIN ? '#6d28d9' : '#94a3b8'} onClick={() => setTab('NIN Verification')} />
        <SummaryCard label="Bureau Score" value={creditScore ?? '—'} sub={latestBureau ? 'From bureau check' : 'No bureau check'} color="#f59e0b" onClick={() => setTab('Credit Bureau')} />
      </div>

      {/* Discrepancy alert banner */}
      {discrepancies.length > 0 && (
        <div style={{ background: hasHighDisc ? '#7f1d1d' : '#78350f', borderRadius: 12, padding: '1rem 1.5rem', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: hasHighDisc ? '#f87171' : '#fbbf24', flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>
              {hasHighDisc ? 'HIGH-SEVERITY IDENTITY DISCREPANCIES DETECTED' : 'Identity Data Discrepancies Detected'}
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '2px 10px', borderRadius: 20 }}>
              {discrepancies.filter(d => d.severity === 'high').length} HIGH · {discrepancies.filter(d => d.severity === 'medium').length} MED · {discrepancies.filter(d => d.severity === 'low').length} LOW
            </span>
          </div>
          <p style={{ fontSize: 12, color: hasHighDisc ? '#fca5a5' : '#fde68a', margin: '0 0 14px' }}>
            The following fields differ between BVN and NIN records. {hasHighDisc ? 'High-severity mismatches may indicate identity fraud — verify manually before disbursement.' : 'Review and clarify with the customer before proceeding.'}
          </p>
          <table style={{ ...s.table, background: 'transparent' }}>
            <thead>
              <tr>{['Field', 'BVN Record', 'NIN Record', 'Profile', 'Severity'].map(h => <th key={h} style={{ ...s.th, background: 'rgba(255,255,255,0.1)', color: '#e2e8f0' }}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {discrepancies.map((d, i) => (
                <tr key={i} style={{ background: i % 2 ? 'rgba(255,255,255,0.05)' : 'transparent' }}>
                  <td style={{ ...s.td, fontWeight: 700, color: '#f1f5f9' }}>{d.field}</td>
                  <td style={{ ...s.td, color: '#e2e8f0' }}>{d.bvn || '—'}</td>
                  <td style={{ ...s.td, color: '#e2e8f0' }}>{d.nin || '—'}</td>
                  <td style={{ ...s.td, color: '#94a3b8' }}>{d.profile || '—'}</td>
                  <td style={s.td}>
                    <span style={{
                      fontSize: 10, fontWeight: 800, padding: '2px 10px', borderRadius: 20, letterSpacing: 0.5,
                      background: d.severity === 'high' ? '#dc2626' : d.severity === 'medium' ? '#d97706' : '#16a34a',
                      color: '#fff',
                    }}>
                      {d.severity.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Identity side-by-side comparison */}
      {(latestBVN || latestNIN) && (
        <div style={s.card}>
          <div style={s.cardTitle}>Identity Comparison</div>
          <div style={{ display: 'grid', gridTemplateColumns: latestBVN && latestNIN ? '1fr 1fr' : '1fr', gap: 20 }}>
            {latestBVN && <IdentityPanel title="BVN Record" data={latestBVN.result} color="#16a34a" photoKey="image" />}
            {latestNIN && <IdentityPanel title="NIN Record" data={latestNIN.result} color="#6d28d9" photoKey="photo" />}
          </div>
        </div>
      )}

      {/* Activity timeline */}
      <div style={s.card}>
        <div style={s.cardTitle}>Recent Activity</div>
        {[
          ...(statements || []).map((r) => ({ type: 'statement', label: `Statement: ${r.accountName || r.filename}`, bank: r.bankName, status: r.status, date: r.createdAt })),
          ...(bvnResults || []).map((r) => ({ type: 'bvn', label: `BVN Verified: ••••${r.bvn?.slice(-4)}`, status: r.status, date: r.createdAt })),
          ...(ninResults || []).map((r) => ({ type: 'nin', label: `NIN Verified: ••••${r.nin?.slice(-4)}`, status: r.status, date: r.createdAt })),
          ...(bureauResults || []).map((r) => ({ type: 'bureau', label: 'Credit Bureau Check', status: r.status, date: r.createdAt })),
        ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 12).map((item, i) => (
          <div key={i} style={s.activityRow}>
            <div style={{ ...s.activityDot, background: TYPE_COLOR[item.type] }} />
            <div style={{ flex: 1 }}>
              <div style={s.activityLabel}>{item.label}{item.bank ? ` (${item.bank})` : ''}</div>
              <div style={s.activityDate}>{new Date(item.date).toLocaleString()}</div>
            </div>
            <span style={{ ...s.statusBadge, background: item.status === 'success' ? '#dcfce7' : '#fee2e2', color: item.status === 'success' ? '#16a34a' : '#dc2626' }}>
              {item.status}
            </span>
          </div>
        ))}
        {(statements.length + bvnResults.length + ninResults.length + bureauResults.length) === 0 && (
          <div style={s.empty}>No analyses yet. Use the tabs above to run checks.</div>
        )}
      </div>

      {/* Credit Officer Notes */}
      <div style={s.card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={s.cardTitle}>Credit Officer Notes</div>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>{notes.length} note{notes.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Add note form */}
        <div style={{ marginBottom: 16 }}>
          <textarea
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Add an internal note about this customer..."
            rows={3}
            style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', fontSize: 13, resize: 'vertical', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) addNote(); }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input
              value={noteAuthor}
              onChange={e => setNoteAuthor(e.target.value)}
              placeholder="Author (optional)"
              style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 6, padding: '7px 10px', fontSize: 12, outline: 'none', minWidth: 0 }}
            />
            <button
              onClick={addNote}
              disabled={savingNote || !noteText.trim()}
              style={{ ...s.btn, flexShrink: 0, background: noteText.trim() ? '#0f172a' : '#e2e8f0', color: noteText.trim() ? '#fff' : '#94a3b8', cursor: noteText.trim() ? 'pointer' : 'default' }}
            >
              {savingNote ? 'Saving…' : 'Add Note'}
            </button>
          </div>
        </div>

        {/* Note list */}
        {notes.length === 0 && <div style={s.empty}>No notes yet. Add a note above to record observations about this customer.</div>}
        {notes.map(note => (
          <div key={note._id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 8px', fontSize: 13, color: '#334155', lineHeight: 1.6 }}>{note.text}</p>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>
                  {note.author || 'Credit Officer'} · {new Date(note.createdAt).toLocaleString()}
                </div>
              </div>
              <button
                onClick={() => deleteNote(note._id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', fontSize: 16, padding: '0 4px', lineHeight: 1, flexShrink: 0 }}
                title="Delete note"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function IdentityPanel({ title, data, color, photoKey }) {
  const photo = data[photoKey];
  const fields = [
    ['Name', `${data.firstName || ''} ${data.lastName || ''}`.trim()],
    ['Date of Birth', data.dateOfBirth],
    ['Gender', data.gender],
    ['Phone', data.phoneNumber],
    ['Address', data.address],
    ['State of Origin', data.stateOfOrigin],
    ['Enrollment Bank', data.enrollmentBank],
  ].filter(([, v]) => v);

  return (
    <div style={{ border: `1px solid ${color}30`, borderRadius: 10, padding: '1rem' }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 12 }}>
        {photo && (
          <img src={`data:image/jpeg;base64,${photo}`} alt={title} style={{ width: 72, height: 86, borderRadius: 6, objectFit: 'cover', border: `2px solid ${color}` }} />
        )}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{title}</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{`${data.firstName || ''} ${data.lastName || ''}`.trim() || '—'}</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {fields.slice(1).map(([label, value]) => (
          <div key={label} style={{ background: '#f8fafc', borderRadius: 6, padding: '8px 10px' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const TYPE_COLOR = { statement: '#0ea5e9', bvn: '#16a34a', nin: '#6d28d9', bureau: '#f59e0b' };

function SummaryCard({ label, value, sub, color, onClick }) {
  return (
    <div style={{ ...s.summaryCard, cursor: 'pointer' }} onClick={onClick}>
      <div style={s.summaryLabel}>{label}</div>
      <div style={{ ...s.summaryValue, color }}>{value}</div>
      <div style={s.summarySub}>{sub}</div>
    </div>
  );
}

// ── Statement tab ─────────────────────────────────────────────────────────────

function StatementTab({ customer, statements, onRefresh }) {
  const [file, setFile] = useState(null);
  const [bank, setBank] = useState('');
  const [password, setPassword] = useState('');
  const [uploading, setUploading] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(null);
  const navigate = useNavigate();

  const BANKS = [
    { value: 'moniepoint', label: 'Moniepoint' }, { value: 'kuda', label: 'Kuda' },
    { value: 'vbank', label: 'VBank' }, { value: 'uba', label: 'UBA' },
    { value: 'optimus', label: 'Optimus' }, { value: 'parallex', label: 'Parallex' },
    { value: 'gtb', label: 'GTBank' }, { value: 'opay', label: 'Opay' },
    { value: 'fidelity', label: 'Fidelity' }, { value: 'sterling', label: 'Sterling' },
    { value: 'access', label: 'Access' }, { value: 'fcmb', label: 'FCMB' },
    { value: 'firstbank', label: 'First Bank' },
  ];

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) return toast.error('Select a file');
    if (!bank) return toast.error('Select a bank');
    const apiKey = localStorage.getItem('apiKey');
    if (!apiKey) return toast.error('No API key found');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('statement', file);
      fd.append('bankName', bank);
      fd.append('accountName', customer.name);
      fd.append('email', customer.email || '');
      fd.append('customerId', customer._id);
      if (password) fd.append('password', password);
      const { data } = await axios.post(`${API}/v1/statement/upload-analyze`, fd, { headers: { 'X-Api-Key': apiKey } });
      toast.success('Analysis complete — redirecting to results in 5 seconds…');
      setFile(null); setBank(''); setPassword('');
      const statementId = data?.statement?._id || data?._id;
      await onRefresh();
      if (statementId) {
        let secs = 5;
        setRedirectCountdown(secs);
        const interval = setInterval(() => {
          secs -= 1;
          setRedirectCountdown(secs);
          if (secs <= 0) {
            clearInterval(interval);
            navigate(`/dashboard/statements/${statementId}`);
          }
        }, 1000);
        // store interval id on component ref so cancel button can clear it
        window.__lucredCountdownInterval = interval;
      }
    } catch (err) {
      if (isUnauthorized(err)) { toast.error('Your session has expired. Please sign in again.'); navigate('/login'); return; }
      toast.error(parseApiError(err, {
        400: 'The statement could not be processed. Please check the file and try again.',
        default: 'Statement upload failed. Please try again.',
      }));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={s.card}>
        <div style={s.cardTitle}>Upload Bank Statement</div>
        <form onSubmit={handleUpload} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={s.field}><label style={s.label}>Bank *</label>
            <select style={s.input} value={bank} onChange={(e) => setBank(e.target.value)} required>
              <option value="">Select bank…</option>
              {BANKS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
          </div>
          <div style={s.field}><label style={s.label}>Statement File *</label>
            <input style={s.input} type="file" accept=".pdf,.xlsx,.xls,.csv,.docx,.doc" onChange={(e) => setFile(e.target.files[0])} required />
          </div>
          <div style={s.field}><label style={s.label}>PDF Password (optional)</label>
            <input style={s.input} type="password" placeholder="Leave blank if none" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button style={{ ...s.btn, opacity: uploading ? 0.7 : 1 }} disabled={uploading} type="submit">
              {uploading ? 'Analysing…' : 'Upload & Analyse →'}
            </button>
          </div>
        </form>
      </div>
      {redirectCountdown !== null && (
        <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 12, padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#16a34a', minWidth: 32, textAlign: 'center' }}>{redirectCountdown}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: '#15803d', fontSize: 14 }}>Analysis complete!</div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Redirecting to the full statement analysis view in {redirectCountdown} second{redirectCountdown !== 1 ? 's' : ''}…</div>
          </div>
          <button
            onClick={() => { clearInterval(window.__lucredCountdownInterval); setRedirectCountdown(null); }}
            style={{ fontSize: 12, fontWeight: 700, color: '#64748b', background: '#e2e8f0', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>
      )}
      <div style={s.card}>
        <div style={s.cardTitle}>Statement History</div>
        {statements.length === 0 ? <div style={s.empty}>No statements yet.</div> : (
          <table style={s.table}>
            <thead><tr>{['Account', 'Bank', 'File', 'Status', 'Date', ''].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>
              {statements.map((st, i) => (
                <tr key={st._id} style={{ background: i % 2 ? '#f8fafc' : '#fff', cursor: 'pointer' }} onClick={() => navigate(`/dashboard/statements/${st._id}`)}>
                  <td style={s.td}>{st.accountName || '—'}</td>
                  <td style={s.td}>{st.bankName || '—'}</td>
                  <td style={s.td}>{st.filename || '—'}</td>
                  <td style={s.td}><StatusBadge status={st.status} /></td>
                  <td style={s.td}>{new Date(st.createdAt).toLocaleDateString()}</td>
                  <td style={s.td}><span style={{ color: '#0ea5e9', fontWeight: 600, fontSize: 13 }}>View →</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── BVN tab ───────────────────────────────────────────────────────────────────

function BVNTab({ customer, bvnResults, onRefresh }) {
  const [bvn, setBvn] = useState(customer.bvn || '');
  const [loading, setLoading] = useState(false);

  async function runVerify(overrideBvn) {
    const number = overrideBvn || bvn;
    if (number.length !== 11) return toast.error('BVN must be 11 digits');
    const apiKey = localStorage.getItem('apiKey');
    if (!apiKey) return toast.error('No API key found');
    setLoading(true);
    try {
      await axios.post(`${API}/v1/identity/verify-bvn`, { bvn: number, customerId: customer._id }, { headers: { 'X-Api-Key': apiKey } });
      toast.success('BVN verified successfully');
      onRefresh();
    } catch (err) {
      toast.error(parseApiError(err, {
        404: 'No record found for this BVN. Please verify the number is correct.',
        default: 'BVN verification failed. Please try again.',
      }));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e) { e.preventDefault(); runVerify(); }

  const latest = bvnResults.find((r) => r.status === 'success');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={s.card}>
        <div style={s.cardTitle}>Run BVN Verification</div>
        <form onSubmit={handleVerify} style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div style={s.field}>
            <label style={s.label}>BVN (11 digits)</label>
            <input style={{ ...s.input, width: 220 }} maxLength={11} value={bvn} onChange={(e) => setBvn(e.target.value.replace(/\D/g, ''))} placeholder="22222222222" />
          </div>
          <button style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} disabled={loading} type="submit">
            {loading ? 'Verifying…' : 'Verify →'}
          </button>
        </form>
      </div>

      {latest && (
        <div style={{ position: 'relative' }}>
          <VerificationResultCard result={latest.result} accentColor="#16a34a" photoKey="image" fields={[
            ['Date of Birth', latest.result.dateOfBirth],
            ['Gender', latest.result.gender],
            ['Phone Number', latest.result.phoneNumber],
            ['Email', latest.result.email],
            ['Enrollment Bank', latest.result.enrollmentBank],
            ['Enrollment Branch', latest.result.enrollmentBranch],
            ['Registration Date', latest.result.registrationDate],
            ['NIN', latest.result.nin],
            ['Account Level', latest.result.levelOfAccount],
            ['Watch Listed', latest.result.watchListed != null ? String(latest.result.watchListed) : undefined],
          ]} verifiedAt={latest.createdAt} label="BVN" />
          <button
            onClick={() => runVerify(latest.bvn || bvn)}
            disabled={loading}
            style={{ position: 'absolute', top: 16, right: 16, background: '#f0fdf4', border: '1.5px solid #16a34a', color: '#16a34a', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            {loading ? '…' : '↻ Re-run'}
          </button>
        </div>
      )}

      <div style={s.card}>
        <div style={s.cardTitle}>BVN Verification History</div>
        {bvnResults.length === 0 ? <div style={s.empty}>No BVN verifications yet.</div> : bvnResults.map((r, i) => (
          <div key={r._id} style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '14px 0', borderBottom: '1px solid #f1f5f9', background: i % 2 ? '#f8fafc' : '#fff' }}>
            {r.result?.image && <img src={`data:image/jpeg;base64,${r.result.image}`} alt="BVN" style={{ width: 52, height: 62, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>{r.result?.firstName} {r.result?.lastName} — BVN ••••{r.bvn?.slice(-4)}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{r.result?.dateOfBirth} · {r.result?.gender} · {r.result?.phoneNumber}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{new Date(r.createdAt).toLocaleString()}</div>
            </div>
            <StatusBadge status={r.status} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── NIN tab ───────────────────────────────────────────────────────────────────

function NINTab({ customer, ninResults, onRefresh }) {
  const [nin, setNin] = useState(customer.nin || '');
  const [loading, setLoading] = useState(false);

  async function runVerify(overrideNin) {
    const number = overrideNin || nin;
    if (number.length !== 11) return toast.error('NIN must be 11 digits');
    const apiKey = localStorage.getItem('apiKey');
    if (!apiKey) return toast.error('No API key found');
    setLoading(true);
    try {
      await axios.post(`${API}/v1/identity/verify-nin`, { nin: number, customerId: customer._id }, { headers: { 'X-Api-Key': apiKey } });
      toast.success('NIN verified successfully');
      onRefresh();
    } catch (err) {
      toast.error(parseApiError(err, {
        404: 'No record found for this NIN. Please verify the number is correct.',
        default: 'NIN verification failed. Please try again.',
      }));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e) { e.preventDefault(); runVerify(); }

  const latest = ninResults.find((r) => r.status === 'success');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={s.card}>
        <div style={s.cardTitle}>Run NIN Verification</div>
        <form onSubmit={handleVerify} style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div style={s.field}>
            <label style={s.label}>NIN (11 digits)</label>
            <input style={{ ...s.input, width: 220 }} maxLength={11} value={nin} onChange={(e) => setNin(e.target.value.replace(/\D/g, ''))} placeholder="12345678901" />
          </div>
          <button style={{ ...s.btn, background: '#6d28d9', opacity: loading ? 0.7 : 1 }} disabled={loading} type="submit">
            {loading ? 'Verifying…' : 'Verify →'}
          </button>
        </form>
      </div>

      {latest && (
        <div style={{ position: 'relative' }}>
          <VerificationResultCard result={latest.result} accentColor="#6d28d9" photoKey="photo" fields={[
            ['Date of Birth', latest.result.dateOfBirth],
            ['Gender', latest.result.gender],
            ['Phone Number', latest.result.phoneNumber],
            ['Email', latest.result.email],
            ['Address', latest.result.address],
            ['State of Origin', latest.result.stateOfOrigin],
            ['LGA', latest.result.lga],
            ['Nationality', latest.result.nationality],
            ['Religion', latest.result.religion],
            ['Marital Status', latest.result.maritalStatus],
            ['Watch Listed', latest.result.watchListed != null ? String(latest.result.watchListed) : undefined],
          ]} verifiedAt={latest.createdAt} label="NIN" />
          <button
            onClick={() => runVerify(latest.nin || nin)}
            disabled={loading}
            style={{ position: 'absolute', top: 16, right: 16, background: '#f5f3ff', border: '1.5px solid #6d28d9', color: '#6d28d9', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            {loading ? '…' : '↻ Re-run'}
          </button>
        </div>
      )}

      <div style={s.card}>
        <div style={s.cardTitle}>NIN Verification History</div>
        {ninResults.length === 0 ? <div style={s.empty}>No NIN verifications yet.</div> : ninResults.map((r, i) => (
          <div key={r._id} style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '14px 0', borderBottom: '1px solid #f1f5f9', background: i % 2 ? '#f8fafc' : '#fff' }}>
            {r.result?.photo && <img src={`data:image/jpeg;base64,${r.result.photo}`} alt="NIN" style={{ width: 52, height: 62, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>{r.result?.firstName} {r.result?.lastName} — NIN ••••{r.nin?.slice(-4)}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{r.result?.dateOfBirth} · {r.result?.gender} · {r.result?.address}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{new Date(r.createdAt).toLocaleString()}</div>
            </div>
            <StatusBadge status={r.status} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Bureau tab ────────────────────────────────────────────────────────────────

// Parse the FirstCentral data array → keyed sections object
function parseBureauSections(result) {
  const arr = result?.data ?? (Array.isArray(result) ? result : []);
  const sec = {};
  arr.forEach(item => {
    const key = Object.keys(item || {})[0];
    if (key) sec[key] = item[key];
  });
  return sec;
}

// Payment history cell colour
function paymentColor(code) {
  if (code === '#' || code == null) return { bg: '#f1f5f9', color: '#94a3b8', label: '—' };
  if (code === '0') return { bg: '#dcfce7', color: '#16a34a', label: 'OK' };
  if (code === '101') return { bg: '#450a0a', color: '#fca5a5', label: 'WO' };
  const n = parseInt(code, 10);
  if (n >= 3) return { bg: '#dc2626', color: '#fff', label: code };
  if (n >= 1) return { bg: '#fef3c7', color: '#d97706', label: code };
  return { bg: '#f1f5f9', color: '#64748b', label: code };
}

function scoreColor(score) {
  const n = parseInt(score, 10);
  if (n >= 700) return '#16a34a';
  if (n >= 500) return '#f59e0b';
  return '#dc2626';
}

function BureauTab({ customer, bureauResults, onRefresh }) {
  const [form, setForm] = useState({ bvn: customer.bvn || '', firstName: '', lastName: '', dateOfBirth: '' });
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function runCheck(overrideForm) {
    const payload = overrideForm || form;
    if (payload.bvn.length !== 11) return toast.error('BVN must be 11 digits');
    const apiKey = localStorage.getItem('apiKey');
    if (!apiKey) return toast.error('No API key found');
    setLoading(true);
    try {
      await axios.post(`${API}/v1/credit-bureau/check`, { ...payload, customerId: customer._id }, { headers: { 'X-Api-Key': apiKey } });
      toast.success('Bureau check complete');
      onRefresh();
    } catch (err) {
      toast.error(parseApiError(err, {
        404: 'No credit record found for this individual in the bureau.',
        default: 'Bureau check failed. Please try again shortly.',
      }));
    } finally {
      setLoading(false);
    }
  }

  async function handleCheck(e) { e.preventDefault(); runCheck(); }

  const latest = bureauResults.find(r => r.status === 'success');
  const sec = latest ? parseBureauSections(latest.result) : null;

  const scoring = sec?.Scoring?.[0];
  const personal = sec?.PersonalDetailsSummary?.[0];
  const summary = sec?.CreditAccountSummary?.[0];
  const rating = sec?.CreditAccountRating?.[0];
  const agreements = sec?.CreditAgreementSummary || [];
  const payHistHeader = sec?.AccountMonthlyPaymentHeader?.[0];
  const payHistory    = sec?.AccountMonthlyPaymentHistory || [];
  const delinquency   = (sec?.DeliquencyInformation || []).filter(d => d.SubscriberName || d.AccountNo);
  const enquiries     = (sec?.EnquiryHistoryTop || []).filter(e => e.DateRequested);
  const guarantors    = (sec?.GuarantorDetails || []).filter(g => g.GuarantorFirstName);
  const employment    = (sec?.EmploymentHistory || []).filter(e => e.EmployerDetail || e.Occupation);
  const enquiryInput  = (sec?.EnquiryInput || []).find(e => e.SubscriberName);

  // Build 24 month column labels from header (MH24=oldest … MH01=most recent)
  const monthCols = payHistHeader
    ? Array.from({ length: 24 }, (_, i) => {
        const key = `MH${String(24 - i).padStart(2, '0')}`;
        return payHistHeader[key] || `M${String(i + 1).padStart(2, '0')}`;
      })
    : [];

  const ACCOUNT_TYPES = [
    ['Home Loan', 'NoOfHomeLoanAccountsGood', 'NoOfHomeLoanAccountsBad'],
    ['Auto Loan', 'NoOfAutoLoanccountsGood', 'NoOfAutoLoanAccountsBad'],
    ['Study Loan', 'NoOfStudyLoanAccountsGood', 'NoOfStudyLoanAccountsBad'],
    ['Personal Loan', 'NoOfPersonalLoanAccountsGood', 'NoOfPersonalLoanAccountsBad'],
    ['Credit Card', 'NoOfCreditCardAccountsGood', 'NoOfCreditCardAccountsBad'],
    ['Retail', 'NoOfRetailAccountsGood', 'NoOfRetailAccountsBad'],
    ['Joint Loan', 'NoOfJointLoanAccountsGood', 'NoOfJointLoanAccountsBad'],
    ['Telecom', 'NoOfTelecomAccountsGood', 'NoOfTelecomAccountsBad'],
    ['Other', 'NoOfOtherAccountsGood', 'NoOfOtherAccountsBad'],
  ].filter(([, g, b]) => parseInt(rating?.[g] || 0) + parseInt(rating?.[b] || 0) > 0);

  const scoreTotal = scoring?.TotalConsumerScore;
  const scoreDesc = scoring?.Description;
  const scoreColor_ = scoreColor(scoreTotal);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Run check form */}
      <div style={s.card}>
        <div style={s.cardTitle}>Run Credit Bureau Check</div>
        <form onSubmit={handleCheck} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={s.field}><label style={s.label}>BVN *</label><input style={s.input} maxLength={11} value={form.bvn} onChange={(e) => setForm(f => ({ ...f, bvn: e.target.value.replace(/\D/g, '') }))} /></div>
          <div style={s.field}><label style={s.label}>Date of Birth</label><input style={s.input} placeholder="YYYY-MM-DD" value={form.dateOfBirth} onChange={set('dateOfBirth')} /></div>
          <div style={s.field}><label style={s.label}>First Name</label><input style={s.input} value={form.firstName} onChange={set('firstName')} /></div>
          <div style={s.field}><label style={s.label}>Last Name</label><input style={s.input} value={form.lastName} onChange={set('lastName')} /></div>
          <div style={{ gridColumn: 'span 2' }}>
            <button style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} disabled={loading} type="submit">{loading ? 'Running check…' : 'Run Bureau Check →'}</button>
          </div>
        </form>
      </div>

      {/* ── Full bureau report ─────────────────────────────────────────────── */}
      {latest && sec && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Score banner */}
          <div style={{ position: 'relative', background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', borderRadius: 14, padding: '1.75rem 2rem', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <button
              onClick={() => runCheck({ bvn: form.bvn, firstName: form.firstName || personal?.FirstName || '', lastName: form.lastName || personal?.Surname || '', dateOfBirth: form.dateOfBirth || personal?.DateOfBirth || '' })}
              disabled={loading}
              style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.25)', color: '#e2e8f0', borderRadius: 8, padding: '5px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              {loading ? '…' : '↻ Re-run'}
            </button>
            <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '1rem 1.5rem', minWidth: 130 }}>
              <div style={{ fontSize: 52, fontWeight: 900, color: scoreColor_, lineHeight: 1 }}>{scoreTotal ?? '—'}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: scoreColor_, textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>{scoreDesc || 'Credit Score'}</div>
              {scoring?.ScoreDate && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>As at {scoring.ScoreDate}</div>}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 12 }}>
                {personal ? `${personal.FirstName || ''} ${personal.Surname || ''}`.trim() : customer.name}
              </div>
              {scoring && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                  {[
                    ['Repayment History', scoring.RepaymentHistoryScore],
                    ['Amount Owed', scoring.TotalAmountOwedScore],
                    ['Types of Credit', scoring.TypesOfCreditScore],
                    ['Credit History Length', scoring.LengthOfCreditHistoryScore],
                    ['No. of Accounts', scoring.NoOfAcctScore],
                  ].map(([lbl, val]) => val && (
                    <div key={lbl} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 12px' }}>
                      <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 }}>{lbl}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{val}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, color: '#94a3b8', minWidth: 160 }}>
              <div>Checked: <strong style={{ color: '#e2e8f0' }}>{new Date(latest.createdAt).toLocaleDateString()}</strong></div>
              <div>BVN: <strong style={{ color: '#e2e8f0' }}>••••{latest.bvn?.slice(-4)}</strong></div>
              <StatusBadge status={latest.status} />
            </div>
          </div>

          {/* Personal details */}
          {personal && (
            <div style={s.card}>
              <div style={s.cardTitle}>Personal Details</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                {[
                  ['Full Name', `${personal.FirstName || ''} ${personal.OtherNames || ''} ${personal.Surname || ''}`.trim()],
                  ['Date of Birth', personal.BirthDate],
                  ['Gender', personal.Gender],
                  ['Marital Status', personal.MaritalStatus],
                  ['Nationality', personal.Nationality],
                  ['BVN', personal.BankVerificationNo],
                  ['National ID', personal.NationalIDNo],
                  ['Dependants', personal.Dependants],
                  ['Address', [personal.ResidentialAddress1, personal.ResidentialAddress2, personal.ResidentialAddress3].filter(Boolean).join(', ')],
                  ['Phone', personal.CellularNo || personal.HomeTelephoneNo || personal.WorkTelephoneNo],
                  ['Email', personal.EmailAddress],
                  ['Employer', personal.EmployerDetail],
                  ['Property Type', personal.PropertyOwnedType],
                ].filter(([, v]) => v && v !== ' ' && v !== '0').map(([lbl, val]) => (
                  <div key={lbl} style={s.infoCell}>
                    <div style={s.infoLabel}>{lbl}</div>
                    <div style={{ ...s.infoValue, fontSize: 13 }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Account summary */}
          {summary && (
            <div style={s.card}>
              <div style={s.cardTitle}>Credit Account Summary</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: 10 }}>
                {[
                  ['Total Accounts', summary.TotalAccounts, null],
                  ['Accounts in Good Standing', summary.TotalaccountinGoodcondition || summary.TotalaccountinGodcondition, '#16a34a'],
                  ['Accounts in Arrears', summary.TotalAccountarrear, summary.TotalAccountarrear > 0 ? '#ef4444' : null],
                  ['Amount in Arrears', summary.Amountarrear && summary.Amountarrear !== '0.00' ? `₦${summary.Amountarrear}` : null, '#ef4444'],
                  ['Total Outstanding Debt', summary.TotalOutstandingdebt && summary.TotalOutstandingdebt !== '0.00' ? `₦${summary.TotalOutstandingdebt}` : '₦0', null],
                  ['Monthly Instalment', summary.TotalMonthlyInstalment ? `₦${summary.TotalMonthlyInstalment}` : null, null],
                  ['Judgements', summary.TotalNumberofJudgement, summary.TotalNumberofJudgement > 0 ? '#ef4444' : '#16a34a'],
                  ['Judgement Amount', summary.TotalJudgementAmount > 0 ? `₦${summary.TotalJudgementAmount}` : null, '#ef4444'],
                  ['Dishonoured Cheques', summary.TotalNumberofDishonoured, summary.TotalNumberofDishonoured > 0 ? '#ef4444' : '#16a34a'],
                  ['Rating', summary.Rating, null],
                ].filter(([, v]) => v !== null && v !== undefined && v !== '').map(([lbl, val, color]) => (
                  <div key={lbl} style={s.infoCell}>
                    <div style={s.infoLabel}>{lbl}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: color || '#0f172a' }}>{String(val)}</div>
                  </div>
                ))}
              </div>
              {/* Account type breakdown */}
              {ACCOUNT_TYPES.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Account Type Breakdown</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {ACCOUNT_TYPES.map(([lbl, gKey, bKey]) => {
                      const good = parseInt(rating[gKey] || 0);
                      const bad = parseInt(rating[bKey] || 0);
                      return (
                        <div key={lbl} style={{ background: bad > 0 ? '#fef2f2' : '#f0fdf4', border: `1px solid ${bad > 0 ? '#fca5a5' : '#bbf7d0'}`, borderRadius: 10, padding: '8px 14px', fontSize: 13, textAlign: 'center' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{lbl}</div>
                          <div style={{ fontSize: 12, marginTop: 3 }}>
                            <span style={{ color: '#16a34a', fontWeight: 600 }}>{good} good</span>
                            {bad > 0 && <span style={{ color: '#ef4444', fontWeight: 600, marginLeft: 6 }}>{bad} bad</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Delinquency */}
          {delinquency.length > 0 && (
            <div style={{ ...s.card, borderLeft: '4px solid #ef4444' }}>
              <div style={{ ...s.cardTitle, color: '#dc2626' }}>Delinquency Information</div>
              <table style={s.table}>
                <thead><tr>{['Lender', 'Account No', 'Period', 'Months in Arrears'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {delinquency.map((d, i) => (
                    <tr key={i} style={{ background: '#fff5f5', borderBottom: '1px solid #fee2e2' }}>
                      <td style={s.td}>{d.SubscriberName || '—'}</td>
                      <td style={s.td}>{d.AccountNo || '—'}</td>
                      <td style={s.td}>{d.PeriodNum || '—'}</td>
                      <td style={{ ...s.td, fontWeight: 700, color: '#dc2626' }}>{d.MonthsinArrears || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Credit agreements */}
          {agreements.length > 0 && (
            <div style={s.card}>
              <div style={s.cardTitle}>Credit Agreements ({agreements.length})</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={s.table}>
                  <thead>
                    <tr>{['Lender', 'Account No', 'Opened', 'Closed', 'Opening Balance', 'Instalment', 'Overdue', 'Status', 'Performance'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {agreements.map((a, i) => {
                      const isPerforming = a.PerformanceStatus === 'Performing';
                      const isWatchlist = a.PerformanceStatus === 'Watchlist';
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 ? '#f8fafc' : '#fff' }}>
                          <td style={{ ...s.td, maxWidth: 180 }}><span style={{ fontSize: 12 }}>{a.SubscriberName}</span></td>
                          <td style={{ ...s.td, fontFamily: 'monospace', fontSize: 11 }}>{a.AccountNo}</td>
                          <td style={{ ...s.td, whiteSpace: 'nowrap', fontSize: 12 }}>{a.DateAccountOpened}</td>
                          <td style={{ ...s.td, whiteSpace: 'nowrap', fontSize: 12 }}>{a.ClosedDate || '—'}</td>
                          <td style={{ ...s.td, fontWeight: 600 }}>{a.OpeningBalanceAmt ? `₦${a.OpeningBalanceAmt}` : '—'}</td>
                          <td style={s.td}>{a.InstalmentAmount ? `₦${a.InstalmentAmount}` : '—'}</td>
                          <td style={{ ...s.td, color: parseFloat(a.AmountOverdue) > 0 ? '#ef4444' : '#94a3b8' }}>
                            {a.AmountOverdue ? `₦${a.AmountOverdue}` : '—'}
                          </td>
                          <td style={s.td}>
                            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: a.AccountStatus === 'Closed' ? '#f1f5f9' : '#dcfce7', color: a.AccountStatus === 'Closed' ? '#64748b' : '#16a34a' }}>
                              {a.AccountStatus}
                            </span>
                          </td>
                          <td style={s.td}>
                            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: isPerforming ? '#dcfce7' : isWatchlist ? '#fef3c7' : '#fee2e2', color: isPerforming ? '#16a34a' : isWatchlist ? '#d97706' : '#dc2626' }}>
                              {a.PerformanceStatus || '—'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 24-Month payment history */}
          {payHistory.length > 0 && (
            <div style={s.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={s.cardTitle}>24-Month Payment History</div>
                <div style={{ display: 'flex', gap: 10, fontSize: 11 }}>
                  {[['OK Current', '#dcfce7', '#16a34a'], ['1-2 Late', '#fef3c7', '#d97706'], ['3+ Late', '#fee2e2', '#dc2626'], ['WO Written-off', '#450a0a', '#fca5a5'], ['— N/A', '#f1f5f9', '#94a3b8']].map(([lbl, bg, color]) => (
                    <span key={lbl} style={{ background: bg, color, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>{lbl}</span>
                  ))}
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                {payHistory.map((acc, ai) => {
                  const worst = worstPaymentCode(acc);
                  const { bg: worstBg, color: worstColor, label: worstLabel } = worst ? paymentColor(worst) : { bg: '#dcfce7', color: '#16a34a', label: 'OK' };
                  const autoExpand = payHistory.length <= 3;
                  return (
                  <div key={ai} style={{ marginBottom: 16 }}>
                    <button
                      onClick={() => setExpanded(expanded === ai ? null : ai)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', padding: '6px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{acc.SubscriberName}</span>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>{acc.AccountNo}</span>
                        <span style={{ fontSize: 11, color: '#64748b' }}>{acc.DateAccountOpened} → {acc.ClosedDate || 'Open'}</span>
                        <span title="Worst payment in 24 months" style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: worstBg, color: worstColor }}>worst: {worstLabel === 'OK' ? 'Current' : worstLabel === '—' ? 'No data' : `${worstLabel === 'WO' ? 'Written-off' : `${worstLabel} mo late`}`}</span>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: acc.PerformanceStatus === 'Performing' ? '#dcfce7' : '#fef3c7', color: acc.PerformanceStatus === 'Performing' ? '#16a34a' : '#d97706' }}>{acc.PerformanceStatus}</span>
                    </button>
                    {(expanded === ai || autoExpand) && (
                      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 6 }}>
                        {Array.from({ length: 24 }, (_, i) => {
                          const mKey = `M${String(i + 1).padStart(2, '0')}`;
                          const code = acc[mKey];
                          const { bg, color, label } = paymentColor(code);
                          const colLabel = monthCols[i] || mKey;
                          return (
                            <div key={mKey} title={`${colLabel}: ${code ?? '—'}`} style={{ width: 32, textAlign: 'center' }}>
                              <div style={{ background: bg, color, borderRadius: 4, padding: '4px 2px', fontSize: 10, fontWeight: 700, minHeight: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{label}</div>
                              <div style={{ fontSize: 8, color: '#94a3b8', marginTop: 2, lineHeight: 1.2 }}>{colLabel}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Enquiry history */}
          {enquiries.length > 0 && (
            <div style={s.card}>
              <div style={s.cardTitle}>Recent Enquiries</div>
              <table style={s.table}>
                <thead><tr>{['Date', 'Lender', 'Enquiry Reason', 'Phone'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {enquiries.map((e, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 ? '#f8fafc' : '#fff' }}>
                      <td style={{ ...s.td, whiteSpace: 'nowrap', fontSize: 12 }}>{e.DateRequested}</td>
                      <td style={s.td}>{e.SubscriberName || '—'}</td>
                      <td style={s.td}>{e.EnquiryReason || '—'}</td>
                      <td style={s.td}>{e.CompanyTelephoneNo || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Guarantors */}
          {guarantors.length > 0 && (
            <div style={s.card}>
              <div style={s.cardTitle}>Guarantors ({guarantors.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {guarantors.map((g, i) => (
                  <div key={i} style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
                    {[['Name', `${g.GuarantorFirstName || ''} ${g.GuarantorOtherName || ''}`.trim()], ['Gender', g.GuarantorGender], ['DOB', g.GuarantorDateOfBirth], ['NIN', g.GuarantorNationalIDNo], ['Address', g.GuarantorAddress1]].filter(([, v]) => v).map(([lbl, val]) => (
                      <div key={lbl}><div style={s.infoLabel}>{lbl}</div><div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{val}</div></div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Employment history */}
          {employment.length > 0 && (
            <div style={s.card}>
              <div style={s.cardTitle}>Employment History</div>
              <table style={s.table}>
                <thead><tr>{['Employer', 'Occupation', 'Updated'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {employment.map((e, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 ? '#f8fafc' : '#fff' }}>
                      <td style={s.td}>{e.EmployerDetail || '—'}</td>
                      <td style={s.td}>{e.Occupation || '—'}</td>
                      <td style={{ ...s.td, fontSize: 12, color: '#64748b' }}>{e.UpDateOnDate || e.UpDateDate || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Enquiry input — shows which lender ran this check and the match rate */}
          {enquiryInput && (
            <div style={{ ...s.card, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={s.cardTitle}>Enquiry Details</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, marginBottom: enquiryInput.Disclaimer ? 12 : 0 }}>
                {[
                  ['Enquiry Date', enquiryInput.EnquiryDate],
                  ['Reason', enquiryInput.EnquiryReason],
                  ['Subscriber', enquiryInput.SubscriberName],
                  ['Username', enquiryInput.SubscriberUsername],
                  ['Match Rate', enquiryInput.MatchRate != null ? `${enquiryInput.MatchRate}%` : null],
                ].filter(([, v]) => v != null && v !== '').map(([lbl, val]) => (
                  <div key={lbl} style={s.infoCell}>
                    <div style={s.infoLabel}>{lbl}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{val}</div>
                  </div>
                ))}
              </div>
              {enquiryInput.Disclaimer && (
                <details style={{ marginTop: 4 }}>
                  <summary style={{ fontSize: 11, color: '#94a3b8', cursor: 'pointer', userSelect: 'none' }}>View disclaimer</summary>
                  <p style={{ fontSize: 11, color: '#64748b', marginTop: 8, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{enquiryInput.Disclaimer}</p>
                </details>
              )}
            </div>
          )}
        </div>
      )}

      {/* History list */}
      <div style={s.card}>
        <div style={s.cardTitle}>Bureau Check History</div>
        {bureauResults.length === 0 ? <div style={s.empty}>No bureau checks yet.</div> : bureauResults.map((r, i) => {
          const noRecord = r.result?.noRecord;
          const sec2 = noRecord ? null : parseBureauSections(r.result);
          const sc = sec2?.Scoring?.[0]?.TotalConsumerScore;
          const desc = sec2?.Scoring?.[0]?.Description;
          return (
            <div key={r._id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 0', borderBottom: '1px solid #f1f5f9', background: i % 2 ? '#f8fafc' : '#fff' }}>
              {sc
                ? <div style={{ fontSize: 22, fontWeight: 900, color: scoreColor(sc), minWidth: 44, textAlign: 'center' }}>{sc}</div>
                : <div style={{ fontSize: 22, minWidth: 44, textAlign: 'center', color: '#94a3b8' }}>—</div>
              }
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 14 }}>
                  {noRecord ? 'No Credit Record Found' : (desc || 'Bureau Check')} · BVN ••••{r.bvn?.slice(-4)}
                </div>
                {noRecord && <div style={{ fontSize: 12, color: '#64748b' }}>This individual has no record in FirstCentral's database.</div>}
                <div style={s.activityDate}>{new Date(r.createdAt).toLocaleString()}</div>
              </div>
              <StatusBadge status={r.status} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Scorecard tab ─────────────────────────────────────────────────────────────

function ScorecardTab({ customer, statements, bvnResults, ninResults, bureauResults, discrepancies, setTab }) {
  const latestStatement = statements.find(s => s.status === 'success');
  const latestBVN = bvnResults.find(r => r.status === 'success');
  const latestNIN = ninResults.find(r => r.status === 'success');
  const latestBureau = bureauResults.find(r => r.status === 'success');

  const d   = latestStatement?.result || {};
  const risk       = d.overallRiskScore || {};
  const cashFlow   = d.cashFlowAnalysis || {};
  const income     = d.incomeSourceAnalysis || {};
  const spending   = d.spendingPatterns || {};
  const debt       = d.debtServicing || {};
  const expense    = d.expenseAnalysis || {};
  const behavioral = d.behavioralAnalysis || {};
  const meta       = d.metaData || {};

  const bureauSec        = latestBureau ? parseBureauSections(latestBureau.result) : null;
  const bureauScoring    = bureauSec?.Scoring?.[0];
  const bureauSummaryRaw = bureauSec?.CreditAccountSummary?.[0];
  const bureauDelinq     = (bureauSec?.DeliquencyInformation || []).filter(di => di.SubscriberName || di.AccountNo);
  const bureauScore      = bureauScoring?.TotalConsumerScore ?? null;
  const bureauScoreNum   = bureauScore ? parseInt(bureauScore, 10) : null;
  const bureauScoreColor = bureauScoreNum >= 650 ? '#16a34a' : bureauScoreNum >= 500 ? '#d97706' : bureauScoreNum != null ? '#dc2626' : '#94a3b8';
  const bureauBand       = bureauScoreNum >= 650 ? 'Good' : bureauScoreNum >= 500 ? 'Fair' : bureauScoreNum != null ? 'Poor' : null;

  const fmt = (v) => (v !== undefined && v !== null ? Number(v).toLocaleString() : '—');
  const GRADE_COLOR = { A: '#16a34a', B: '#0ea5e9', C: '#f59e0b', D: '#ef4444', E: '#7f1d1d' };
  const gradeColor  = GRADE_COLOR[risk.overallRiskScore] || '#94a3b8';

  const bvnPhoto = latestBVN?.result?.image;
  const ninPhoto = latestNIN?.result?.photo;

  // Derived metrics for inferences
  const totalInflow    = cashFlow.totalCashInflow || 0;
  const totalOutflow   = cashFlow.totalCashOutflow || 0;
  const netCashFlow    = totalInflow - totalOutflow;
  const savingsRateNum = totalInflow > 0 ? (netCashFlow / totalInflow) * 100 : null;
  const expenseRatioNum = totalInflow > 0 ? (totalOutflow / totalInflow) * 100 : null;
  const dtiRaw         = parseFloat(debt.loanRepayments?.DebtToIncomeRatio) || null;
  const highRiskFlags  = (expense.highRiskExpenseFlags || []).filter(f => f.amount > 0);
  const activeArrears  = parseInt(bureauSummaryRaw?.TotalAccountarrear || 0);
  const hasJudgement   = parseInt(bureauSummaryRaw?.TotalNumberofJudgement || 0) > 0;

  // Sub-score → letter grade helper
  function subGrade(score, max = 25) {
    if (score == null) return null;
    const pct = (score / max) * 100;
    return pct >= 84 ? 'A' : pct >= 64 ? 'B' : pct >= 44 ? 'C' : pct >= 24 ? 'D' : 'E';
  }

  const sb = risk.scoreBreakdown || {};

  // Auto-save scorecard snapshot whenever the tab renders with data
  useEffect(() => {
    if (!latestStatement && !latestBVN && !latestNIN && !latestBureau) return;
    const payload = {
      riskGrade: risk.overallRiskScore || null,
      scoreBreakdown: sb,
      monthlyAverageIncome: income.monthlyAverageIncome ?? null,
      isSalaryEarner: income.isSalaryEarner ?? null,
      totalCashInflow: cashFlow.totalCashInflow ?? null,
      totalCashOutflow: cashFlow.totalCashOutflow ?? null,
      bureauScore: bureauScoreNum,
      dataAvailability: { bvn: !!latestBVN, nin: !!latestNIN, bureau: !!latestBureau, statement: !!latestStatement },
    };
    axios.post(`${API}/api/customers/${customer._id}/scorecards`, payload, { headers: authHeaders() }).catch(() => {});
  }, [customer._id]);

  async function handleExport() {
    const { exportScorecardPDF } = await import('../services/exportScorecardPDF');
    exportScorecardPDF({ customer, statement: latestStatement, bvnResult: latestBVN, ninResult: latestNIN, bureauResult: latestBureau, discrepancies });
  }

  if (!latestStatement && !latestBVN && !latestNIN && !latestBureau) {
    return <div style={s.card}><div style={s.empty}>No successful analyses yet. Run checks on this customer first.</div></div>;
  }

  // ── Score dimension card ──────────────────────────────────────────────────
  const DimCard = ({ label, score, max = 25, metric, inference, accentColor, wide }) => {
    const grade = subGrade(score, max);
    const gc    = GRADE_COLOR[grade] || accentColor || '#94a3b8';
    const pct   = score != null ? Math.round((score / max) * 100) : null;
    return (
      <div style={{ background: '#fff', border: `1px solid #e2e8f0`, borderTop: `3px solid ${gc}`, borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, ...(wide ? { gridColumn: 'span 2' } : {}) }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          {score != null
            ? <><span style={{ fontSize: 28, fontWeight: 900, color: gc, lineHeight: 1 }}>{score}</span><span style={{ fontSize: 13, color: '#94a3b8' }}>/{max}</span></>
            : <span style={{ fontSize: 22, fontWeight: 900, color: '#94a3b8' }}>—</span>
          }
          {grade && <span style={{ marginLeft: 'auto', fontSize: 18, fontWeight: 900, color: gc }}>{grade}</span>}
        </div>
        {/* Progress bar */}
        {pct != null && (
          <div style={{ height: 4, background: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: gc, borderRadius: 2 }} />
          </div>
        )}
        {metric   && <div style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginTop: 2 }}>{metric}</div>}
        {inference && <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>{inference}</div>}
      </div>
    );
  };

  // ── Identity status pill ──────────────────────────────────────────────────
  const IdPill = ({ label, verified, detail }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: verified ? '#f0fdf4' : '#fef2f2', border: `1px solid ${verified ? '#bbf7d0' : '#fca5a5'}`, borderRadius: 10 }}>
      <div style={{ width: 20, height: 20, borderRadius: '50%', background: verified ? '#16a34a' : '#dc2626', flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: verified ? '#16a34a' : '#dc2626' }}>{label}</div>
        {detail && <div style={{ fontSize: 11, color: '#64748b' }}>{detail}</div>}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button style={{ ...s.btn, background: '#475569' }} onClick={() => window.print()}>Print</button>
        <button style={s.btn} onClick={handleExport}>Export PDF</button>
      </div>

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div style={s.scorecardHeader}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flex: 1 }}>
          {(bvnPhoto || ninPhoto) && (
            <img src={`data:image/jpeg;base64,${bvnPhoto || ninPhoto}`} alt={customer.name}
              style={{ width: 72, height: 86, borderRadius: 10, objectFit: 'cover', border: '3px solid rgba(255,255,255,0.2)', flexShrink: 0 }} />
          )}
          <div>
            <div style={s.scLabel}>CUSTOMER SCORECARD · {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
            <div style={s.scName}>{customer.name}</div>
            <div style={s.scMeta}>
              {customer.email && <span>{customer.email}</span>}
              {customer.phone && <span> · {customer.phone}</span>}
              {customer.bvn && <span> · BVN ••••{customer.bvn.slice(-4)}</span>}
              {latestStatement?.bankName && <span> · {latestStatement.bankName}</span>}
              {latestStatement && <span> · Analysed {new Date(latestStatement.createdAt).toLocaleDateString()}</span>}
            </div>
            {risk.recommendation && (
              <div style={{ marginTop: 8, display: 'inline-block', background: 'rgba(14,165,233,0.2)', color: '#38bdf8', fontSize: 12, fontWeight: 700, padding: '3px 12px', borderRadius: 20 }}>
                {risk.recommendation}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {discrepancies.length > 0 && (
            <div style={{ background: '#fef3c7', borderRadius: 10, padding: '0.75rem 1rem', textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#d97706' }}>{discrepancies.length}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>Issue{discrepancies.length > 1 ? 's' : ''}</div>
            </div>
          )}
          {risk.overallRiskScore && (
            <div style={{ ...s.gradeBox, background: gradeColor }}>
              <div style={s.gradeVal}>{risk.overallRiskScore}</div>
              <div style={s.gradeLabel}>RISK GRADE</div>
            </div>
          )}
          {bureauScoreNum != null && (
            <div style={{ ...s.gradeBox, background: bureauScoreColor }}>
              <div style={s.gradeVal}>{bureauScore}</div>
              <div style={s.gradeLabel}>BUREAU SCORE</div>
            </div>
          )}
          {income.monthlyAverageIncome > 0 && (
            <div style={{ ...s.gradeBox, background: '#0284c7', minWidth: 100 }}>
              <div style={{ ...s.gradeVal, fontSize: 18 }}>₦{Number(income.monthlyAverageIncome).toLocaleString()}</div>
              <div style={s.gradeLabel}>AVG MONTHLY INCOME</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Identity status (verdict only, no data repeat) ────────────────────── */}
      {(latestBVN || latestNIN) && (
        <div style={s.card}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Identity Verification</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <IdPill label="BVN Verified" verified={!!latestBVN} detail={latestBVN ? `${latestBVN.result?.firstName || ''} ${latestBVN.result?.lastName || ''}`.trim() || null : 'Not run'} />
            <IdPill label="NIN Verified" verified={!!latestNIN} detail={latestNIN ? `${latestNIN.result?.firstName || ''} ${latestNIN.result?.lastName || ''}`.trim() || null : 'Not run'} />
            {latestBVN && latestNIN && (() => {
              const norm = s => (s || '').toString().trim().toLowerCase();
              const bvnName = norm(`${latestBVN.result?.firstName || ''} ${latestBVN.result?.lastName || ''}`);
              const ninName = norm(`${latestNIN.result?.firstName || ''} ${latestNIN.result?.lastName || ''}`);
              const nameMatch = bvnName && ninName && bvnName === ninName;
              const bvnDOB = norm(latestBVN.result?.dateOfBirth || '');
              const ninDOB = norm(latestNIN.result?.dateOfBirth || '');
              const dobMatch = bvnDOB && ninDOB && bvnDOB === ninDOB;
              return (<>
                <IdPill
                  label="Name Match"
                  verified={nameMatch}
                  detail={nameMatch ? 'BVN and NIN names consistent' : `BVN: ${latestBVN.result?.firstName} ${latestBVN.result?.lastName} · NIN: ${latestNIN.result?.firstName} ${latestNIN.result?.lastName}`}
                />
                {(bvnDOB || ninDOB) && (
                  <IdPill
                    label="DOB Match"
                    verified={dobMatch}
                    detail={dobMatch ? latestBVN.result?.dateOfBirth : `BVN: ${latestBVN.result?.dateOfBirth || '—'} · NIN: ${latestNIN.result?.dateOfBirth || '—'}`}
                  />
                )}
              </>);
            })()}
          </div>
        </div>
      )}

      {/* ── Discrepancy details (only if present) ────────────────────────────── */}
      {discrepancies.length > 0 && (
        <div style={{ ...s.card, borderLeft: '4px solid #ef4444', background: '#fef2f2' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Identity Discrepancies</div>
          {discrepancies.map((dc, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: i < discrepancies.length - 1 ? '1px solid #fca5a5' : 'none' }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: dc.severity === 'high' ? '#fee2e2' : '#fef3c7', color: dc.severity === 'high' ? '#dc2626' : '#d97706', flexShrink: 0 }}>{dc.severity.toUpperCase()}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#7f1d1d' }}>{dc.field}:</span>
              <span style={{ fontSize: 12, color: '#7f1d1d' }}>BVN says <strong>{dc.bvn || '—'}</strong> · NIN says <strong>{dc.nin || '—'}</strong></span>
            </div>
          ))}
        </div>
      )}

      {/* ── Score dimensions grid ─────────────────────────────────────────────── */}
      {latestStatement && (
        <div style={s.card}>
          <div style={{ fontSize: 11, fontWeight: 700, color: gradeColor, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>Risk Score Breakdown</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            <DimCard
              label="Income Stability"
              score={sb.incomeStability}
              metric={income.monthlyAverageIncome > 0 ? `₦${fmt(income.monthlyAverageIncome)}/mo avg` : undefined}
              inference={
                income.isSalaryEarner != null
                  ? `${income.isSalaryEarner ? 'Salary earner' : 'Non-salary income'}${income.numberOfIncomeSources > 1 ? ` · ${income.numberOfIncomeSources} income sources` : ''}`
                  : undefined
              }
            />
            <DimCard
              label="Debt Servicing"
              score={sb.debtServicing}
              metric={dtiRaw != null ? `DTI: ${dtiRaw}%` : undefined}
              inference={
                dtiRaw != null
                  ? dtiRaw <= 30 ? 'Healthy debt load' : dtiRaw <= 50 ? 'Moderate — monitor closely' : 'High debt burden'
                  : undefined
              }
            />
            <DimCard
              label="Spending Behaviour"
              score={sb.spendingBehavior}
              metric={expenseRatioNum != null ? `${expenseRatioNum.toFixed(0)}% expense ratio` : undefined}
              inference={
                highRiskFlags.length > 0
                  ? `${highRiskFlags.length} high-risk spend category${highRiskFlags.length > 1 ? 'ies' : 'y'} flagged`
                  : expenseRatioNum != null
                    ? expenseRatioNum <= 70 ? 'Spending well within income' : expenseRatioNum <= 85 ? 'Spending is elevated' : 'Spending exceeds safe threshold'
                    : undefined
              }
            />
            <DimCard
              label="Liquidity"
              score={sb.liquidity}
              metric={savingsRateNum != null ? `${savingsRateNum.toFixed(1)}% savings rate` : netCashFlow !== 0 ? `Net ₦${fmt(netCashFlow)}` : undefined}
              inference={
                savingsRateNum != null
                  ? savingsRateNum >= 20 ? 'Strong cash surplus' : savingsRateNum >= 10 ? 'Adequate buffer' : 'Thin liquidity — low headroom'
                  : undefined
              }
            />
          </div>
        </div>
      )}

      {/* ── Bureau score card ─────────────────────────────────────────────────── */}
      {latestBureau?.result?.noRecord && (
        <div style={{ ...s.card, borderLeft: '4px solid #94a3b8' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Credit Bureau — FirstCentral</div>
          <div style={{ fontSize: 13, color: '#64748b' }}>No credit record found for this individual. They may be new to credit or not yet registered with FirstCentral.</div>
        </div>
      )}
      {latestBureau && !latestBureau.result?.noRecord && bureauSec && (
        <div style={s.card}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>Credit Bureau — FirstCentral</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {/* XScore card */}
            <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e3a5f)', borderRadius: 10, padding: '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8 }}>XScore</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 36, fontWeight: 900, color: bureauScoreColor, lineHeight: 1 }}>{bureauScore ?? '—'}</span>
                <span style={{ fontSize: 11, color: '#64748b' }}>/850</span>
              </div>
              {bureauBand && <div style={{ fontSize: 12, fontWeight: 700, color: bureauScoreColor }}>{bureauBand}</div>}
              {bureauScoring?.Description && <div style={{ fontSize: 11, color: '#94a3b8' }}>{bureauScoring.Description}</div>}
            </div>
            {/* Account health card */}
            {bureauSummaryRaw && (
              <div style={{ background: '#fff', border: `1px solid #e2e8f0`, borderTop: `3px solid ${activeArrears > 0 || hasJudgement ? '#ef4444' : '#16a34a'}`, borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Account Health</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: activeArrears > 0 || hasJudgement ? '#ef4444' : '#16a34a', lineHeight: 1, marginBottom: 4 }}>
                  {activeArrears > 0 || hasJudgement ? 'At Risk' : 'Clean'}
                </div>
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  {bureauSummaryRaw.TotalAccounts} total account{bureauSummaryRaw.TotalAccounts != 1 ? 's' : ''}{activeArrears > 0 ? ` · ${activeArrears} in arrears` : ''}{hasJudgement ? ' · judgement on file' : ''}
                </div>
                {bureauDelinq.length > 0 && (
                  <div style={{ marginTop: 6, fontSize: 11, fontWeight: 700, color: '#dc2626' }}>{bureauDelinq.length} delinquency record{bureauDelinq.length > 1 ? 's' : ''}</div>
                )}
              </div>
            )}
            {/* Outstanding obligations card */}
            {bureauSummaryRaw && (
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderTop: '3px solid #7c3aed', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Obligations</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', lineHeight: 1, marginBottom: 4 }}>
                  {parseFloat(bureauSummaryRaw.TotalMonthlyInstalment) > 0
                    ? `₦${Number(bureauSummaryRaw.TotalMonthlyInstalment).toLocaleString()}/mo`
                    : '₦0/mo'}
                </div>
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  {parseFloat(bureauSummaryRaw.TotalOutstandingdebt) > 0
                    ? `₦${Number(bureauSummaryRaw.TotalOutstandingdebt).toLocaleString()} outstanding`
                    : 'No outstanding balance'}
                </div>
                {bureauScoring && [
                  ['Repayment', bureauScoring.RepaymentHistoryScore],
                  ['Amount Owed', bureauScoring.TotalAmountOwedScore],
                ].filter(([, v]) => v).map(([lbl, val]) => (
                  <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginTop: 4 }}>
                    <span>{lbl}</span><span style={{ fontWeight: 700, color: '#334155' }}>{val}</span>
                  </div>
                ))}
              </div>
            )}
            {/* Enquiry / history card */}
            {bureauScoring && (
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderTop: '3px solid #0ea5e9', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Credit History</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', lineHeight: 1, marginBottom: 4 }}>
                  {bureauSummaryRaw?.Rating || bureauScoring.Description || '—'}
                </div>
                {[
                  ['Credit Types', bureauScoring.TypesOfCreditScore],
                  ['History Length', bureauScoring.LengthOfCreditHistoryScore],
                ].filter(([, v]) => v).map(([lbl, val]) => (
                  <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginTop: 4 }}>
                    <span>{lbl}</span><span style={{ fontWeight: 700, color: '#334155' }}>{val}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Key alerts (only shown if there are flags) ───────────────────────── */}
      {(highRiskFlags.length > 0 || behavioral.spendingHabits?.length > 0 || bureauDelinq.length > 0) && (
        <div style={s.card}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Key Flags & Insights</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {bureauDelinq.map((di, i) => (
              <div key={`delinq-${i}`} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626', flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: 12, color: '#7f1d1d' }}><strong>Bureau delinquency:</strong> {di.SubscriberName} — {di.MonthsinArrears} month{di.MonthsinArrears != 1 ? 's' : ''} in arrears</span>
              </div>
            ))}
            {highRiskFlags.map((f, i) => (
              <div key={`flag-${i}`} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#d97706', flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: 12, color: '#78350f' }}><strong>{f.category}:</strong> ₦{fmt(f.amount)} spent ({f.percentageOfIncome != null ? `${Number(f.percentageOfIncome).toFixed(1)}%` : '—'} of income)</span>
              </div>
            ))}
            {behavioral.spendingHabits?.map((h, i) => (
              <div key={`habit-${i}`} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                <span style={{ fontSize: 13, flexShrink: 0 }}>→</span>
                <span style={{ fontSize: 12, color: '#334155' }}>{h}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Loan Review CTA ──────────────────────────────────────────────────── */}
      <div style={{ background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', border: '1px solid #c4b5fd', borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#4c1d95', marginBottom: 3 }}>Ready to assess loan eligibility?</div>
          <div style={{ fontSize: 12, color: '#6d28d9' }}>Run a full review with identity, bureau, income, and DTI analysis.</div>
        </div>
        <button style={{ ...s.btn, background: '#6d28d9', whiteSpace: 'nowrap' }} onClick={() => setTab('Loan Review')}>
          Open Loan Review <span style={{ fontSize: 9, fontWeight: 800, background: 'rgba(255,255,255,0.25)', padding: '1px 5px', borderRadius: 20, marginLeft: 4 }}>BETA</span>
        </button>
      </div>
    </div>
  );
}

// ── Score Breakdown Cards (expandable) ───────────────────────────────────────
function ScoreBreakdownCards({ breakdown }) {
  const [expanded, setExpanded] = useState(null);
  const keys = [
    ['incomeStability', 'Income Stability', breakdown.incomeStability],
    ['debtServicing', 'Debt Servicing', breakdown.debtServicing],
    ['spendingBehavior', 'Spending Behaviour', breakdown.spendingBehavior],
    ['liquidity', 'Liquidity', breakdown.liquidity],
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 16 }}>
      {keys.map(([key, label, score]) => {
        const pct = Math.min(((score || 0) / 25) * 100, 100);
        const color = (score || 0) >= 20 ? '#16a34a' : (score || 0) >= 12 ? '#f59e0b' : '#ef4444';
        const detail = SCORE_DETAIL[key];
        const isOpen = expanded === key;
        const rangeDesc = detail?.ranges.find(([lo, hi]) => (score || 0) >= lo && (score || 0) <= hi)?.[2];
        return (
          <div key={key} style={{ ...s.scoreCard, cursor: 'pointer', gridColumn: isOpen ? 'span 4' : 'span 1', transition: 'all 0.15s' }} onClick={() => setExpanded(isOpen ? null : key)}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div>
                <div style={{ ...s.scoreVal, color }}>{score ?? '—'}<span style={{ fontSize: 12, fontWeight: 500, color: '#94a3b8' }}>/25</span></div>
                <div style={s.scoreLbl}>{label}</div>
              </div>
              <span style={{ fontSize: 16, color: '#94a3b8' }}>{isOpen ? '▲' : '▼'}</span>
            </div>
            <div style={s.scoreBar}><div style={{ ...s.scoreFill, width: `${pct}%`, background: color }} /></div>
            {isOpen && detail && (
              <div style={{ marginTop: 12, borderTop: '1px solid #e2e8f0', paddingTop: 12, textAlign: 'left' }}>
                <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.6, marginBottom: 10 }}>{detail.what}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                  {detail.ranges.map(([lo, hi, desc]) => {
                    const active = (score || 0) >= lo && (score || 0) <= hi;
                    return (
                      <div key={lo} style={{ background: active ? `${color}18` : '#f8fafc', border: `1.5px solid ${active ? color : '#e2e8f0'}`, borderRadius: 8, padding: '8px 12px' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: active ? color : '#94a3b8', marginBottom: 3 }}>{lo}–{hi} / 25 {active ? '← current' : ''}</div>
                        <div style={{ fontSize: 12, color: active ? '#334155' : '#94a3b8' }}>{desc}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Loan Eligibility Logic ────────────────────────────────────────────────────

function computeLoanReview({ latestBVN, latestNIN, latestBureau, latestStatement, discrepancies, risk, cashFlow, income, debt, behavioral, sweep, proposedMonthlyPayment, proposedLoanAmount, loanTenor, annualRate }) {
  const flags = [];
  const conditions = [];
  const analysis = {}; // per-category detailed reasoning

  // Parse FirstCentral bureau sections from the stored result
  const bureauSec = latestBureau ? parseBureauSections(latestBureau.result) : null;
  const bureauScoring = bureauSec?.Scoring?.[0];
  const bureauSummary = bureauSec?.CreditAccountSummary?.[0];
  const bureauAgreements = bureauSec?.CreditAgreementSummary || [];
  const bureauDelinquency = (bureauSec?.DeliquencyInformation || []).filter(d => d.SubscriberName || d.AccountNo);

  // ── Identity Integrity ───────────────────────────────────────────────────
  let identityScore = 50;
  let identityStatus = 'WARN';
  let identityNotes = 'No identity verification data available.';
  const identityReasons = [];

  const bvnVerified = !!latestBVN;
  const ninVerified = !!latestNIN;
  const watchlisted = latestBVN?.result?.watchListed === true || latestNIN?.result?.watchListed === true;
  const highDisc = discrepancies.filter(d => d.severity === 'high');
  const mediumDisc = discrepancies.filter(d => d.severity === 'medium');

  if (watchlisted) {
    identityScore = 0; identityStatus = 'FAIL';
    identityNotes = 'Customer appears on government watchlist — loan application cannot proceed.';
    identityReasons.push('Watchlist flag detected on BVN or NIN record. This is an automatic disqualifier regardless of other data.');
    flags.push('Customer is flagged as watchlisted on government records.');
  } else {
    if (bvnVerified && ninVerified) {
      identityReasons.push('Both BVN and NIN have been successfully verified against government databases — strong identity confidence.');
      identityScore = 90;
    } else if (bvnVerified) {
      identityReasons.push('BVN verified but NIN is missing. Single-source identity carries higher fraud risk.');
      identityScore = 65; conditions.push('Complete NIN verification before disbursement.');
    } else if (ninVerified) {
      identityReasons.push('NIN verified but BVN is missing. BVN is especially important for credit history linkage.');
      identityScore = 60; conditions.push('Complete BVN verification before disbursement.');
    } else {
      identityReasons.push('No government identity verification on file. Cannot confirm the customer is who they claim to be.');
      identityScore = 10; flags.push('No BVN or NIN verification on record.');
    }
    if (highDisc.length > 0) {
      identityScore = Math.max(identityScore - 30, 10);
      identityReasons.push(`${highDisc.length} high-severity discrepanc${highDisc.length > 1 ? 'ies' : 'y'} found between BVN and NIN records (${highDisc.map(d => d.field).join(', ')}). This suggests possible identity manipulation or data inconsistency.`);
      flags.push(`High-severity identity discrepancies on: ${highDisc.map(d => d.field).join(', ')}.`);
    }
    if (mediumDisc.length > 0) {
      identityScore = Math.max(identityScore - 10, 10);
      identityReasons.push(`${mediumDisc.length} medium-severity discrepanc${mediumDisc.length > 1 ? 'ies' : 'y'} noted (${mediumDisc.map(d => d.field).join(', ')}). Could be data entry variation — verify directly with customer.`);
      conditions.push(`Clarify discrepanc${mediumDisc.length > 1 ? 'ies' : 'y'} in ${mediumDisc.map(d => d.field).join(', ')} with customer.`);
    }
    identityStatus = identityScore >= 70 ? 'PASS' : identityScore >= 45 ? 'WARN' : 'FAIL';
    identityNotes = identityReasons[0] || identityNotes;
  }
  analysis.identityIntegrity = identityReasons;

  // ── Credit History (Bureau — FirstCentral) ──────────────────────────────
  let creditScore = 50;
  let creditStatus = 'WARN';
  let creditNotes = 'No bureau data available — credit history is unknown.';
  const creditReasons = [];

  if (latestBureau && bureauSec) {
    const bScore = bureauScoring?.TotalConsumerScore ? parseInt(bureauScoring.TotalConsumerScore, 10) : null;
    const scoreDesc = bureauScoring?.Description || '';
    const hasDelinquency = bureauDelinquency.length > 0;
    const amountArrear = parseFloat(bureauSummary?.Amountarrear || 0);
    const accountsInArrear = parseInt(bureauSummary?.TotalAccountarrear || 0, 10);
    const totalAccounts = parseInt(bureauSummary?.TotalAccounts || 0, 10);
    const goodAccounts = parseInt(bureauSummary?.TotalaccountinGoodcondition || bureauSummary?.TotalaccountinGodcondition || 0, 10);
    const totalOutstanding = parseFloat(bureauSummary?.TotalOutstandingdebt || 0);
    const totalJudgements = parseInt(bureauSummary?.TotalNumberofJudgement || 0, 10);
    const rating = bureauSummary?.Rating || '';
    const nonPerforming = bureauAgreements.filter(a => a.PerformanceStatus && a.PerformanceStatus !== 'Performing' && a.PerformanceStatus !== '');

    if (hasDelinquency || accountsInArrear > 0 || amountArrear > 0) {
      creditScore = amountArrear > 500000 ? 5 : amountArrear > 100000 ? 20 : 35;
      creditStatus = 'FAIL';
      creditNotes = 'Active delinquency on record — customer has unpaid obligations.';
      if (hasDelinquency) creditReasons.push(`${bureauDelinquency.length} delinquency record${bureauDelinquency.length > 1 ? 's' : ''} on file with lenders: ${bureauDelinquency.map(d => d.SubscriberName).filter(Boolean).join(', ') || 'undisclosed'}.`);
      if (amountArrear > 0) creditReasons.push(`₦${Number(amountArrear).toLocaleString()} in arrears across ${accountsInArrear} account${accountsInArrear !== 1 ? 's' : ''}. Lending additional funds before resolution is high risk.`);
      flags.push(`Active delinquency: ₦${Number(amountArrear).toLocaleString()} overdue across ${accountsInArrear} account(s).`);
    } else {
      if (bScore !== null) {
        if (bScore >= 650) {
          creditScore = 90; creditStatus = 'PASS';
          creditReasons.push(`FirstCentral score of ${bScore} (${scoreDesc}) is strong — indicates responsible borrowing and timely repayment history.`);
        } else if (bScore >= 500) {
          creditScore = 62; creditStatus = 'WARN';
          creditReasons.push(`FirstCentral score of ${bScore} (${scoreDesc}) is moderate. Repayment history is acceptable but not exceptional — monitor closely.`);
          conditions.push('Monitor repayment closely given moderate credit bureau score.');
        } else {
          creditScore = 28; creditStatus = 'FAIL';
          creditReasons.push(`FirstCentral score of ${bScore} (${scoreDesc}) is low — indicates poor credit history and elevated default risk.`);
          flags.push(`Low FirstCentral credit score: ${bScore} (${scoreDesc}).`);
        }
      } else {
        creditScore = 62; creditStatus = 'PASS';
        creditReasons.push('Bureau check completed with no delinquency or arrears detected.');
      }
      if (totalAccounts > 0) creditReasons.push(`${totalAccounts} total credit facilit${totalAccounts > 1 ? 'ies' : 'y'} on record — ${goodAccounts} in good standing${totalOutstanding > 0 ? `, ₦${Number(totalOutstanding).toLocaleString()} total outstanding debt` : ''}.`);
      if (nonPerforming.length > 0) { creditScore = Math.max(creditScore - 20, 20); creditStatus = creditStatus === 'PASS' ? 'WARN' : creditStatus; creditReasons.push(`${nonPerforming.length} credit agreement${nonPerforming.length > 1 ? 's' : ''} listed as non-performing: ${nonPerforming.map(a => a.SubscriberName).filter(Boolean).slice(0, 3).join(', ')}.`); conditions.push('Resolve non-performing credit agreements before disbursement.'); }
      if (totalJudgements > 0) { creditScore = Math.max(creditScore - 25, 10); creditStatus = 'FAIL'; creditReasons.push(`${totalJudgements} legal judgement${totalJudgements > 1 ? 's' : ''} on record — indicates unresolved legal credit disputes.`); flags.push(`${totalJudgements} court judgement(s) on credit record.`); }
      if (rating) creditReasons.push(`Credit account rating: ${rating}.`);
    }
    creditNotes = creditReasons[0] || creditNotes;
  } else {
    creditReasons.push('No bureau check has been run. Without credit history data, it is impossible to assess past repayment behaviour. Recommend running a bureau check before approving.');
    conditions.push('Run a credit bureau check before disbursement — no credit history on file.');
  }
  analysis.creditHistory = creditReasons;

  // ── Income & Cash Flow (Statement) ──────────────────────────────────────
  let incomeScore = 50;
  let incomeStatus = 'WARN';
  let incomeNotes = 'No bank statement data available.';
  let monthlyIncome = 0;
  const incomeReasons = [];

  if (latestStatement) {
    monthlyIncome = income.monthlyAverageIncome ?? 0;
    const inflow = cashFlow.totalCashInflow ?? 0;
    const outflow = cashFlow.totalCashOutflow ?? 0;
    const isSalary = income.isSalaryEarner;
    const stabilityScore = risk.scoreBreakdown?.incomeStability ?? 0;
    const spendingScore = risk.scoreBreakdown?.spendingBehavior ?? 0;
    const liquidityScore = risk.scoreBreakdown?.liquidity ?? 0;
    const inflowRatio = inflow > 0 ? (inflow - outflow) / inflow : 0;

    if (monthlyIncome === 0 && inflow === 0) {
      incomeScore = 10; incomeStatus = 'FAIL';
      incomeReasons.push('No income or cash inflow detected in the bank statement. The account shows no earnings activity during the analysis period.');
      flags.push('No income detected in bank statement.');
    } else {
      if (monthlyIncome > 0) incomeReasons.push(`Monthly average income is ₦${Number(monthlyIncome).toLocaleString()}${isSalary ? ', confirmed as a salary earner with regular employer credits' : ' from non-salary sources (business or irregular income)'}.`);
      if (inflowRatio >= 0.3) incomeReasons.push(`Net inflow ratio is ${Math.round(inflowRatio * 100)}% — customer retains a good portion of earnings, indicating disciplined spending.`);
      else if (inflowRatio >= 0.1) incomeReasons.push(`Net inflow ratio is ${Math.round(inflowRatio * 100)}% — outflows are high relative to inflows. Customer spends most of what comes in.`);
      else incomeReasons.push(`Net inflow ratio is only ${Math.round(inflowRatio * 100)}% — nearly all income is spent. Very little liquidity buffer.`);
      if (stabilityScore < 10) incomeReasons.push(`Income stability score is low (${stabilityScore}/25) — income appears irregular or declining. This increases repayment risk.`);
      if (spendingScore < 10) incomeReasons.push(`Spending behaviour score is ${spendingScore}/25 — statement shows signs of impulsive or uncontrolled spending patterns.`);
      if (liquidityScore < 10) incomeReasons.push(`Liquidity score is ${liquidityScore}/25 — customer maintains very low average balances, leaving little buffer for unexpected expenses.`);

      const baseScore = Math.min((stabilityScore / 25) * 100, 100);
      const salaryBonus = isSalary ? 8 : 0;
      const ratioBonus = inflowRatio > 0.3 ? 10 : inflowRatio > 0.1 ? 5 : 0;
      incomeScore = Math.min(Math.round(baseScore + salaryBonus + ratioBonus), 100);
      incomeStatus = incomeScore >= 70 ? 'PASS' : incomeScore >= 45 ? 'WARN' : 'FAIL';
      if (incomeScore < 45) flags.push('Low income stability detected in statement analysis.');
      else if (incomeScore < 70) conditions.push('Request 3 months of recent payslips or business income evidence to corroborate statement data.');
    }
    incomeNotes = incomeReasons[0] || incomeNotes;
  } else {
    incomeReasons.push('No bank statement has been analysed. Income and cash flow cannot be assessed without this data.');
    conditions.push('Submit bank statement for analysis before making a lending decision.');
  }
  analysis.incomeAndCashFlow = incomeReasons;

  // ── Debt Servicing (with proposed monthly payment) ───────────────────────
  let debtScore = 50;
  let debtStatus = 'WARN';
  let debtNotes = 'Proposed monthly payment not entered — DTI cannot be calculated.';
  const debtReasons = [];
  let effectiveDTI = null;
  let existingDebtMonthly = 0;
  let totalDebtMonthly = 0;

  const existingDTI = debt.loanRepayments?.DebtToIncomeRatio ?? null;
  const debtServiceScore = risk.scoreBreakdown?.debtServicing ?? 0;

  // Prefer bureau's actual monthly instalment figure over DTI-derived estimate
  const bureauMonthlyInstalment = parseFloat(bureauSummary?.TotalMonthlyInstalment || 0);
  const bureauInstalment = bureauMonthlyInstalment > 0 ? bureauMonthlyInstalment : null;

  if (monthlyIncome > 0 && proposedMonthlyPayment > 0) {
    if (bureauInstalment !== null) {
      // Use bureau's actual instalment — most accurate source of existing obligations
      existingDebtMonthly = bureauInstalment;
      debtReasons.push(`Bureau reports ₦${Number(bureauInstalment).toLocaleString()}/month in existing credit instalments. Adding the proposed payment of ₦${Number(proposedMonthlyPayment).toLocaleString()}/month gives total monthly debt obligations.`);
    } else if (existingDTI !== null) {
      existingDebtMonthly = (monthlyIncome * existingDTI) / 100;
      debtReasons.push(`Existing monthly debt estimated at ₦${Number(existingDebtMonthly).toLocaleString()} from statement DTI of ${existingDTI}% (no bureau instalment data). Adding proposed payment of ₦${Number(proposedMonthlyPayment).toLocaleString()}/month.`);
    } else {
      debtReasons.push(`No existing debt data from bureau or statement. Evaluating proposed payment of ₦${Number(proposedMonthlyPayment).toLocaleString()}/month in isolation.`);
    }
    totalDebtMonthly = existingDebtMonthly + proposedMonthlyPayment;
    effectiveDTI = Math.round((totalDebtMonthly / monthlyIncome) * 100);

    debtReasons[0] += ` Total monthly debt service: ₦${Number(totalDebtMonthly).toLocaleString()} → DTI of ${effectiveDTI}%.`;

    if (effectiveDTI > 60) {
      debtScore = 15; debtStatus = 'FAIL';
      debtReasons.push(`Total DTI of ${effectiveDTI}% far exceeds the 60% ceiling. The customer cannot comfortably absorb this loan alongside existing debts — default risk is very high.`);
      flags.push(`Combined DTI would be ${effectiveDTI}% with this loan — above the 60% hard limit.`);
    } else if (effectiveDTI > 40) {
      debtScore = 48; debtStatus = 'WARN';
      debtReasons.push(`Total DTI of ${effectiveDTI}% is in the caution zone (40–60%). The loan is technically serviceable but leaves limited financial cushion.`);
      conditions.push(`DTI of ${effectiveDTI}% is elevated. Consider reducing the loan amount or extending the tenure to lower monthly payments.`);
    } else if (effectiveDTI > 25) {
      debtScore = 72; debtStatus = 'PASS';
      debtReasons.push(`Total DTI of ${effectiveDTI}% is acceptable. Customer can service this loan alongside existing obligations with a reasonable buffer.`);
    } else {
      debtScore = 92; debtStatus = 'PASS';
      debtReasons.push(`Total DTI of ${effectiveDTI}% is excellent — well below the 40% comfort threshold. Customer has strong repayment capacity for this loan.`);
    }
    if (debtServiceScore > 0) debtReasons.push(`Statement debt servicing score is ${debtServiceScore}/25, reflecting how well the customer has handled existing debt payments in the analysed period.`);
  } else if (latestStatement || bureauInstalment !== null) {
    if (proposedMonthlyPayment === 0) {
      debtReasons.push('No proposed monthly payment entered. Enter the estimated repayment amount above to calculate the true post-loan DTI.');
      debtNotes = 'Enter proposed monthly payment to calculate DTI.';
    }
    if (bureauInstalment !== null) {
      debtReasons.push(`Bureau shows ₦${Number(bureauInstalment).toLocaleString()}/month in existing credit instalments — customer already carries active debt obligations.`);
      const bureauDTI = monthlyIncome > 0 ? Math.round((bureauInstalment / monthlyIncome) * 100) : null;
      if (bureauDTI !== null) {
        debtScore = bureauDTI > 60 ? 20 : bureauDTI > 40 ? 50 : 75;
        debtStatus = bureauDTI > 60 ? 'FAIL' : bureauDTI > 40 ? 'WARN' : 'PASS';
        debtReasons.push(`Current bureau DTI (before this loan) is ~${bureauDTI}%.`);
        if (bureauDTI > 60) flags.push(`Existing bureau instalment DTI of ${bureauDTI}% is already above the safe threshold.`);
      }
    } else if (existingDTI !== null) {
      debtReasons.push(`Existing DTI from statement is ${existingDTI}% (before this loan). This is the baseline — the new loan will increase this.`);
      debtScore = existingDTI > 60 ? 20 : existingDTI > 40 ? 50 : 75;
      debtStatus = existingDTI > 60 ? 'FAIL' : existingDTI > 40 ? 'WARN' : 'PASS';
      if (existingDTI > 60) flags.push(`Existing DTI of ${existingDTI}% is already above the safe threshold — adding more debt is very risky.`);
    }
  } else {
    debtReasons.push('No statement data and no proposed payment entered. Debt servicing capacity cannot be assessed.');
  }
  debtNotes = debtReasons[0] || debtNotes;
  analysis.debtServicing = debtReasons;

  // ── Risk Profile ─────────────────────────────────────────────────────────
  const GRADE_SCORE = { A: 95, B: 78, C: 55, D: 30, E: 10 };
  let riskScore = 50;
  let riskStatus = 'WARN';
  let riskNotes = 'No statement risk profile available.';
  const riskReasons = [];

  if (latestStatement) {
    const grade = risk.overallRiskScore;
    const sb = risk.scoreBreakdown || {};
    riskScore = GRADE_SCORE[grade] ?? 50;
    riskStatus = riskScore >= 70 ? 'PASS' : riskScore >= 45 ? 'WARN' : 'FAIL';

    if (grade) {
      const gradeDesc = { A: 'excellent — lowest risk tier', B: 'good — low-to-moderate risk', C: 'moderate — proceed with caution', D: 'poor — high risk', E: 'very poor — highest risk tier' };
      riskReasons.push(`Overall risk grade is ${grade} (${gradeDesc[grade] || ''}). ${risk.recommendation || ''}`);
    } else {
      riskReasons.push('Risk grade could not be computed from the statement data.');
    }
    if (sb.incomeStability !== undefined) riskReasons.push(`Income Stability: ${sb.incomeStability}/25 | Debt Servicing: ${sb.debtServicing}/25 | Spending Behaviour: ${sb.spendingBehavior}/25 | Liquidity: ${sb.liquidity}/25.`);
    if (riskScore < 45) flags.push(`Overall risk grade ${grade} — elevated probability of default.`);
    riskNotes = riskReasons[0] || riskNotes;
  } else {
    riskReasons.push('No statement analysis on file. Risk profile cannot be computed without cash flow and spending data.');
  }
  analysis.riskProfile = riskReasons;

  // ── Behavioural Analysis ─────────────────────────────────────────────────
  let behaviorScore = 50;
  let behaviorStatus = 'WARN';
  let behaviorNotes = 'No behavioural data available.';
  const behaviorReasons = [];

  if (latestStatement) {
    const spendBehaviorScore = risk.scoreBreakdown?.spendingBehavior ?? null;
    const habits = behavioral?.spendingHabits || [];
    const savings = behavioral?.savingsHabits || {};
    const sweepDetected = sweep?.accountSweepDetected ?? false;
    const sweepSeverity = sweep?.sweepSeverity || '';

    if (spendBehaviorScore !== null) {
      behaviorScore = Math.round((spendBehaviorScore / 25) * 100);
      behaviorReasons.push(`Spending behaviour score from statement engine: ${spendBehaviorScore}/25.`);
    }

    // Savings = strong positive signal
    if (savings.totalSaved > 0) {
      behaviorScore = Math.min(behaviorScore + 12, 100);
      behaviorReasons.push(`Customer saved ₦${Number(savings.totalSaved).toLocaleString()} during the period${savings.savingsFrequency ? ` (${savings.savingsFrequency} savings habit)` : ''} — demonstrates financial discipline.`);
    }

    // Parse spending habits
    const savingsHabit = habits.find(h => /savings/i.test(h));
    const gamblingHabit = habits.find(h => /gambling|betting|casino|lottery/i.test(h));
    const highDiscretionary = habits.filter(h => /high spend on (airtime|online shopping|entertainment|recreation)/i.test(h));
    const p2pHabit = habits.find(h => /peer.to.peer|p2p/i.test(h));
    const remainingHabits = habits.filter(h => h !== savingsHabit && h !== gamblingHabit && !highDiscretionary.includes(h) && h !== p2pHabit);

    if (savingsHabit) {
      behaviorScore = Math.min(behaviorScore + 8, 100);
      behaviorReasons.push(`"${savingsHabit}" — active savings pattern is a positive indicator of financial management and repayment discipline.`);
    }
    if (gamblingHabit) {
      behaviorScore = Math.max(behaviorScore - 35, 5);
      behaviorReasons.push(`Gambling/betting activity detected: "${gamblingHabit}" — high-risk behaviour that significantly increases default probability.`);
      flags.push('Gambling or betting spend detected in transaction history.');
    }
    if (highDiscretionary.length > 0) {
      behaviorScore = Math.max(behaviorScore - 8 * highDiscretionary.length, 10);
      behaviorReasons.push(`High discretionary spend in ${highDiscretionary.length} categor${highDiscretionary.length > 1 ? 'ies' : 'y'}: ${highDiscretionary.join('; ')}. Suggests difficulty controlling non-essential expenses.`);
    }
    if (p2pHabit) {
      behaviorScore = Math.max(behaviorScore - 5, 10);
      behaviorReasons.push(`"${p2pHabit}" — high P2P transfer volumes may indicate informal debt obligations or family support commitments not captured in bureau data.`);
      conditions.push('Clarify the purpose of high P2P transfer volumes — may represent undisclosed debt obligations.');
    }
    if (remainingHabits.length > 0) {
      behaviorReasons.push(`Other observed patterns: ${remainingHabits.join('; ')}.`);
    }

    // Account sweep is a major behavioural red flag
    if (sweepDetected) {
      const penalty = sweepSeverity === 'HIGH' ? 30 : sweepSeverity === 'MEDIUM' ? 20 : 10;
      behaviorScore = Math.max(behaviorScore - penalty, 5);
      behaviorReasons.push(`Account sweep detected (${sweepSeverity} severity, ${sweep.numberOfSweepEvents} event(s), ₦${Number(sweep.totalSweptAmount || 0).toLocaleString()} swept) — funds are being systematically withdrawn shortly after credits arrive. Suggests the account may be under third-party control or the borrower has undisclosed obligations diverting income.`);
      flags.push(`Account sweep detected (${sweepSeverity} severity) — ₦${Number(sweep.totalSweptAmount || 0).toLocaleString()} swept across ${sweep.numberOfSweepEvents} event(s).`);
    }

    if (habits.length === 0 && !sweepDetected && savings.totalSaved <= 0) {
      behaviorReasons.push('No strong behavioural signals detected from spending habits or savings data.');
    }

    behaviorStatus = behaviorScore >= 70 ? 'PASS' : behaviorScore >= 45 ? 'WARN' : 'FAIL';
    behaviorNotes = behaviorReasons[0] || 'Behavioural data available but no strong signals detected.';
    if (behaviorScore < 45) flags.push('Concerning spending behaviour patterns flagged in statement analysis.');
  } else {
    behaviorReasons.push('No bank statement analysed — spending behaviour and savings patterns cannot be assessed.');
  }
  analysis.behavioralAnalysis = behaviorReasons;

  // ── Verdict & Suggested Loan Amount ─────────────────────────────────────
  const scores = [identityScore, creditScore, incomeScore, debtScore, riskScore, behaviorScore];
  const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const statuses = [identityStatus, creditStatus, incomeStatus, debtStatus, riskStatus];
  const failCount = statuses.filter(st => st === 'FAIL').length;
  const hasHardFail = watchlisted || (identityStatus === 'FAIL' && !bvnVerified && !ninVerified) || (creditStatus === 'FAIL');

  let verdict, confidence;
  if (hasHardFail || failCount >= 2) {
    verdict = 'NOT_ELIGIBLE';
    confidence = watchlisted || failCount >= 3 ? 'HIGH' : 'MEDIUM';
  } else if (avgScore >= 72 && failCount === 0 && conditions.length <= 1) {
    verdict = 'ELIGIBLE';
    confidence = avgScore >= 85 ? 'HIGH' : 'MEDIUM';
  } else {
    verdict = 'CONDITIONAL';
    confidence = avgScore >= 60 ? 'MEDIUM' : 'LOW';
  }

  let suggestedMinAmount = null;
  let suggestedMaxAmount = null;
  let affordableMonthly = null;
  let loanAmountReasoning = null;

  if (verdict !== 'NOT_ELIGIBLE' && monthlyIncome > 0) {
    // Combine both sources; take the higher to avoid double-counting while staying conservative.
    // Bureau = formal reported credit obligations; statement DTI = all observed debt outflows
    // (informal loans, undeclared obligations, etc. the bureau may not capture).
    const statementDerivedDebt = existingDTI !== null ? (monthlyIncome * existingDTI) / 100 : 0;
    const bothSources = [bureauInstalment, statementDerivedDebt > 0 ? statementDerivedDebt : null].filter(v => v !== null);
    const existingMonthlyForAffordability = bothSources.length > 0 ? Math.round(bothSources.reduce((a, b) => a + b, 0) / bothSources.length) : 0;
    const maxAffordableTotal = monthlyIncome * 0.40; // 40% DTI ceiling
    affordableMonthly = Math.max(Math.round(maxAffordableTotal - existingMonthlyForAffordability), 0);
    const headroomPct = Math.round((affordableMonthly / monthlyIncome) * 100);
    const multiplier = verdict === 'ELIGIBLE' ? 6 : 3;
    suggestedMaxAmount = Math.round((affordableMonthly * multiplier) / 5000) * 5000;
    suggestedMinAmount = Math.round(suggestedMaxAmount * 0.4 / 5000) * 5000;
    const sourceNote = bureauInstalment !== null && statementDerivedDebt > 0
      ? `avg of bureau ₦${Number(bureauInstalment).toLocaleString()}/mo and statement-derived ₦${Number(statementDerivedDebt).toLocaleString()}/mo`
      : bureauInstalment !== null
        ? `bureau reports ₦${Number(bureauInstalment).toLocaleString()}/mo in existing instalments`
        : existingDTI !== null
          ? `estimated ₦${Number(statementDerivedDebt).toLocaleString()}/mo from statement DTI of ${existingDTI}%`
          : 'no existing debt data';
    loanAmountReasoning = `₦${Number(affordableMonthly).toLocaleString()}/month spare capacity (${sourceNote}) → ${headroomPct}% of income available. At a ${multiplier}-month horizon, suggested principal up to ₦${Number(suggestedMaxAmount).toLocaleString()}.`;
  }

  // ── Repayment schedule — system suggested amount ─────────────────────────
  let suggestedMonthlyPayment = null;
  let totalRepayment = null;
  let totalInterest = null;

  if (suggestedMaxAmount && loanTenor > 0 && annualRate >= 0) {
    const interest = suggestedMaxAmount * (annualRate / 100) * (loanTenor / 12);
    totalInterest = Math.round(interest);
    totalRepayment = suggestedMaxAmount + totalInterest;
    suggestedMonthlyPayment = Math.round(totalRepayment / loanTenor);
  }

  // ── Repayment schedule — proposed loan amount ─────────────────────────────
  let proposedMonthlyPaymentCalc = proposedMonthlyPayment; // already computed by caller
  let proposedTotalRepayment = null;
  let proposedTotalInterest = null;

  if (proposedLoanAmount > 0 && loanTenor > 0) {
    const interest = proposedLoanAmount * (annualRate / 100) * (loanTenor / 12);
    proposedTotalInterest = Math.round(interest);
    proposedTotalRepayment = proposedLoanAmount + proposedTotalInterest;
    proposedMonthlyPaymentCalc = Math.round(proposedTotalRepayment / loanTenor);
  }

  const verdictReason = {
    ELIGIBLE: `All or most eligibility criteria are satisfied with a combined score of ${avgScore}/100. ${bvnVerified || ninVerified ? 'Identity is verified' : 'Identity data is limited'}. ${latestStatement ? `Risk grade ${risk.overallRiskScore || 'N/A'}` : 'No statement data'}. ${effectiveDTI !== null ? `Post-loan DTI would be ${effectiveDTI}%` : 'DTI not calculated'}.`,
    CONDITIONAL: `Customer scores ${avgScore}/100 overall with ${failCount} failing categor${failCount !== 1 ? 'ies' : 'y'} and ${conditions.length} condition${conditions.length !== 1 ? 's' : ''} to satisfy. Approval can proceed once conditions are met and flagged items are resolved.`,
    NOT_ELIGIBLE: `Customer fails ${failCount} of 6 eligibility categories with a combined score of ${avgScore}/100. ${watchlisted ? 'Watchlist status is an automatic disqualifier.' : `Core issues are in: ${statuses.map((st, i) => st === 'FAIL' ? ['Identity Integrity', 'Credit History', 'Income & Cash Flow', 'Debt Servicing', 'Risk Profile', 'Behavioural Analysis'][i] : null).filter(Boolean).join(', ')}.`}`,
  };

  return {
    verdict,
    confidence,
    suggestedMinAmount,
    suggestedMaxAmount,
    affordableMonthly,
    loanAmountReasoning,
    suggestedMonthlyPayment,
    totalRepayment,
    totalInterest,
    loanTenor,
    annualRate,
    summary: verdictReason[verdict],
    effectiveDTI,
    existingDTI,
    proposedLoanAmount,
    proposedMonthlyPayment: proposedMonthlyPaymentCalc,
    proposedTotalRepayment,
    proposedTotalInterest,
    monthlyIncome,
    categories: {
      identityIntegrity: { score: identityScore, status: identityStatus, notes: identityNotes },
      creditHistory: { score: creditScore, status: creditStatus, notes: creditNotes },
      incomeAndCashFlow: { score: incomeScore, status: incomeStatus, notes: incomeNotes },
      debtServicing: { score: debtScore, status: debtStatus, notes: debtNotes },
      riskProfile: { score: riskScore, status: riskStatus, notes: riskNotes },
      behavioralAnalysis: { score: behaviorScore, status: behaviorStatus, notes: behaviorNotes },
    },
    analysis,
    conditions,
    flags,
    dataAvailability: { bvn: !!latestBVN, nin: !!latestNIN, bureau: !!latestBureau, statement: !!latestStatement },
  };
}

// ── Loan Review Tab ───────────────────────────────────────────────────────────
function LoanReviewTab({ customer, statements, bvnResults, ninResults, bureauResults, discrepancies }) {
  const latestStatement = statements.find(s => s.status === 'success');
  const latestBVN = bvnResults.find(r => r.status === 'success');
  const latestNIN = ninResults.find(r => r.status === 'success');
  const latestBureau = bureauResults.find(r => r.status === 'success');
  const risk = latestStatement?.result?.overallRiskScore || {};
  const cashFlow = latestStatement?.result?.cashFlowAnalysis || {};
  const income = latestStatement?.result?.incomeSourceAnalysis || {};
  const debt = latestStatement?.result?.debtServicing || {};
  const behavioral = latestStatement?.result?.behavioralAnalysis || {};
  const sweep = latestStatement?.result?.account_sweep_analysis || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Beta notice */}
      <div style={{ background: 'linear-gradient(135deg, #4c1d95, #6d28d9)', borderRadius: 12, padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 6, height: 40, borderRadius: 3, background: '#a78bfa', flexShrink: 0 }} />
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>Loan Eligibility Review</span>
            <span style={{ fontSize: 10, fontWeight: 800, background: 'rgba(255,255,255,0.2)', color: '#e9d5ff', padding: '2px 8px', borderRadius: 20, letterSpacing: 0.5 }}>BETA</span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: '#c4b5fd', lineHeight: 1.5 }}>
            This feature is in beta. Eligibility scores and loan amount suggestions are computed algorithmically from available data and are intended to assist — not replace — human credit judgement. Always verify findings against your institution's lending policy.
          </p>
        </div>
      </div>

      {/* Data coverage warning if anything is missing */}
      {(!latestStatement || !latestBVN || !latestBureau) && (
        <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#92400e' }}>
          For the most accurate review, complete all checks first:
          {!latestBVN && <span style={{ marginLeft: 8, fontWeight: 600 }}>BVN verification missing.</span>}
          {!latestStatement && <span style={{ marginLeft: 8, fontWeight: 600 }}>Bank statement analysis missing.</span>}
          {!latestBureau && <span style={{ marginLeft: 8, fontWeight: 600 }}>Credit bureau check missing.</span>}
        </div>
      )}

      <LoanReviewSection
        customer={customer}
        latestBVN={latestBVN}
        latestNIN={latestNIN}
        latestBureau={latestBureau}
        latestStatement={latestStatement}
        discrepancies={discrepancies}
        risk={risk}
        cashFlow={cashFlow}
        income={income}
        debt={debt}
        behavioral={behavioral}
        sweep={sweep}
      />
    </div>
  );
}

function LoanReviewSection({ customer, latestBVN, latestNIN, latestBureau, latestStatement, discrepancies, risk, cashFlow, income, debt, behavioral, sweep }) {
  const [proposedPayment, setProposedPayment] = useState('');
  const [loanTenor, setLoanTenor] = useState('12');
  const [annualRate, setAnnualRate] = useState('');
  const [review, setReview] = useState(null);
  const [hasRun, setHasRun] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!customer?._id) return;
    axios.get(`${API}/api/customers/${customer._id}/loan-reviews`, { headers: authHeaders() })
      .then(({ data }) => setHistory(data.reviews || []))
      .catch(() => {});
  }, [customer?._id]);

  function compute(amount, tenor, rate) {
    const principal = parseFloat((amount || '').replace(/,/g, '')) || 0;
    const tenorNum  = parseInt(tenor, 10) || 0;
    const rateNum   = parseFloat(rate) || 0;
    let proposedMonthlyPayment = 0;
    if (principal > 0 && tenorNum > 0) {
      const interest = principal * (rateNum / 100) * (tenorNum / 12);
      proposedMonthlyPayment = Math.round((principal + interest) / tenorNum);
    }
    return computeLoanReview({ latestBVN, latestNIN, latestBureau, latestStatement, discrepancies, risk, cashFlow, income, debt, behavioral, sweep, proposedMonthlyPayment, proposedLoanAmount: principal, loanTenor: tenorNum, annualRate: rateNum });
  }

  async function generate() {
    setHasRun(true);
    const result = compute(proposedPayment, loanTenor, annualRate);
    setReview(result);
    // Auto-save
    try {
      const principal = parseFloat((proposedPayment || '').replace(/,/g, '')) || 0;
      const tenorNum = parseInt(loanTenor, 10) || 0;
      const rateNum = parseFloat(annualRate) || 0;
      const { data } = await axios.post(`${API}/api/customers/${customer._id}/loan-reviews`, {
        loanAmount: principal, loanTenor: tenorNum, annualRate: rateNum,
        verdict: result.verdict, confidence: result.confidence, avgScore: result.avgScore,
        summary: result.summary, effectiveDTI: result.effectiveDTI,
        categories: result.categories, flags: result.flags, conditions: result.conditions,
        dataAvailability: result.dataAvailability,
        suggestedMinAmount: result.suggestedMinAmount, suggestedMaxAmount: result.suggestedMaxAmount,
        affordableMonthly: result.affordableMonthly,
        proposedMonthlyPayment: result.proposedMonthlyPayment, proposedTotalRepayment: result.proposedTotalRepayment,
        proposedTotalInterest: result.proposedTotalInterest,
      }, { headers: authHeaders() });
      setHistory(prev => [data.review, ...prev].slice(0, 20));
    } catch { /* silent */ }
  }

  useEffect(() => {
    if (!hasRun) return;
    setReview(compute(proposedPayment, loanTenor, annualRate));
  }, [proposedPayment, loanTenor, annualRate]);

  const VERDICT_COLOR = { ELIGIBLE: '#16a34a', CONDITIONAL: '#d97706', NOT_ELIGIBLE: '#dc2626' };
  const VERDICT_BG = { ELIGIBLE: '#dcfce7', CONDITIONAL: '#fef3c7', NOT_ELIGIBLE: '#fee2e2' };
  const VERDICT_LABEL = { ELIGIBLE: 'Eligible', CONDITIONAL: 'Conditional', NOT_ELIGIBLE: 'Not Eligible' };
  const STATUS_COLOR = { PASS: '#16a34a', WARN: '#d97706', FAIL: '#dc2626' };
  const STATUS_BG = { PASS: '#dcfce7', WARN: '#fef3c7', FAIL: '#fee2e2' };
  const CAT_LABEL = { identityIntegrity: 'Identity Integrity', creditHistory: 'Credit History', incomeAndCashFlow: 'Income & Cash Flow', debtServicing: 'Debt Servicing', riskProfile: 'Risk Profile', behavioralAnalysis: 'Behavioural Analysis' };
  const fmt = (v) => (v !== undefined && v !== null ? Number(v).toLocaleString() : null);

  const inputBox = (label, prefix, value, onChange, placeholder, width = 130) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #6d28d9', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
        <span style={{ padding: '0 10px', fontSize: 13, fontWeight: 700, color: '#6d28d9', borderRight: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{prefix}</span>
        <input type="text" inputMode="numeric" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} onKeyDown={e => e.key === 'Enter' && generate()} style={{ border: 'none', outline: 'none', padding: '9px 10px', fontSize: 14, width }} />
      </div>
    </div>
  );

  return (
    <div style={{ ...s.card, borderTop: '3px solid #6d28d9' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={s.sectionTitle}>Loan Eligibility Review</div>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4, marginBottom: 16 }}>
          Analyses identity, bureau, and financial data. Enter loan parameters to compute eligibility, DTI, and full repayment schedule.
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {inputBox('Proposed Loan Amount (₦)', '₦', proposedPayment, setProposedPayment, 'e.g. 500,000')}
          {inputBox('Loan Tenure', 'months', loanTenor, setLoanTenor, '12', 60)}
          {inputBox('Annual Interest Rate', '%', annualRate, setAnnualRate, 'e.g. 24', 60)}
          <button style={{ ...s.btn, background: '#6d28d9', height: 38 }} onClick={generate}>
            {review ? '↻ Re-run Review' : '▶ Run Eligibility Review'}
          </button>
          {review && (
            <button
              style={{ ...s.btn, background: '#0f172a', height: 38 }}
              onClick={() => exportLoanReviewPDF({ customer, review, loanParams: { amount: parseFloat((proposedPayment || '').replace(/,/g, '')) || 0, tenor: parseInt(loanTenor, 10) || 0, rate: parseFloat(annualRate) || 0 } })}
            >
              Export PDF
            </button>
          )}
        </div>
      </div>

      {review && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Verdict banner */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'stretch', flexWrap: 'wrap' }}>
            <div style={{ background: VERDICT_BG[review.verdict] || '#f1f5f9', borderRadius: 14, padding: '1.25rem 1.75rem', flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: VERDICT_COLOR[review.verdict] || '#64748b', marginBottom: 6 }}>Verdict</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: VERDICT_COLOR[review.verdict] || '#0f172a' }}>{VERDICT_LABEL[review.verdict] || review.verdict}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Confidence: <strong>{review.confidence}</strong></div>
            </div>
            {review.effectiveDTI !== null && (
              <div style={{ background: review.effectiveDTI > 60 ? '#fee2e2' : review.effectiveDTI > 40 ? '#fef3c7' : '#f0fdf4', borderRadius: 14, padding: '1.25rem 1.75rem', minWidth: 160 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: review.effectiveDTI > 60 ? '#dc2626' : review.effectiveDTI > 40 ? '#d97706' : '#16a34a', marginBottom: 6 }}>Post-Loan DTI</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: review.effectiveDTI > 60 ? '#dc2626' : review.effectiveDTI > 40 ? '#d97706' : '#15803d' }}>{review.effectiveDTI}%</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Existing {review.existingDTI ?? 0}% + proposed</div>
              </div>
            )}
            {review.affordableMonthly != null && (
              <div style={{ background: '#f0f9ff', borderRadius: 14, padding: '1.25rem 1.75rem', minWidth: 160 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#0ea5e9', marginBottom: 6 }}>Max Monthly Repayment</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#0369a1' }}>₦{fmt(review.affordableMonthly)}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Based on DTI headroom</div>
              </div>
            )}
            {(review.suggestedMinAmount || review.suggestedMaxAmount) && (
              <div style={{ background: '#f0fdf4', borderRadius: 14, padding: '1.25rem 1.75rem', flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#16a34a', marginBottom: 6 }}>Suggested Loan Amount (Total Principal)</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#15803d' }}>
                  ₦{fmt(review.suggestedMinAmount)} – ₦{fmt(review.suggestedMaxAmount)}
                </div>
                {review.loanAmountReasoning && <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{review.loanAmountReasoning}</div>}
              </div>
            )}
          </div>

          {/* Proposed loan repayment schedule */}
          {review.proposedLoanAmount > 0 && review.loanTenor > 0 && (
            <div style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', borderRadius: 14, padding: '1.25rem 1.75rem' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#a5b4fc', marginBottom: 14 }}>
                Proposed Loan Schedule · {review.loanTenor} months @ {review.annualRate}% p.a. (flat rate)
              </div>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                {[
                  ['Monthly Repayment', `₦${fmt(review.proposedMonthlyPayment)}`, '#fff'],
                  ['Total Repayment', `₦${fmt(review.proposedTotalRepayment)}`, '#c7d2fe'],
                  ['Total Interest', `₦${fmt(review.proposedTotalInterest)}`, '#fca5a5'],
                  ['Loan Amount', `₦${fmt(review.proposedLoanAmount)}`, '#86efac'],
                ].map(([label, value, color]) => (
                  <div key={label}>
                    <div style={{ fontSize: 10, color: '#818cf8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* System suggested schedule */}
          {review.suggestedMonthlyPayment != null && (
            <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 14, padding: '1.25rem 1.75rem' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#6d28d9', marginBottom: 14 }}>
                System Suggested Schedule · Based on affordability
              </div>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                {[
                  ['Monthly Repayment', `₦${fmt(review.suggestedMonthlyPayment)}`, '#4c1d95'],
                  ['Total Repayment', `₦${fmt(review.totalRepayment)}`, '#5b21b6'],
                  ['Total Interest', `₦${fmt(review.totalInterest)}`, '#6d28d9'],
                  ['Suggested Principal', `₦${fmt(review.suggestedMaxAmount)}`, '#7c3aed'],
                ].map(([label, value, color]) => (
                  <div key={label}>
                    <div style={{ fontSize: 10, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          <div style={{ background: '#f8fafc', borderRadius: 10, padding: '1rem 1.25rem', fontSize: 14, color: '#334155', lineHeight: 1.7, borderLeft: `4px solid ${VERDICT_COLOR[review.verdict] || '#94a3b8'}` }}>
            <strong>Assessment: </strong>{review.summary}
          </div>

          {/* Category breakdown */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Category Breakdown</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Object.entries(review.categories).map(([key, cat]) => (
                <div key={key} style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px', borderLeft: `3px solid ${STATUS_COLOR[cat.status] || '#94a3b8'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
                    <div style={{ width: 140, fontSize: 12, fontWeight: 700, color: '#475569', flexShrink: 0 }}>{CAT_LABEL[key]}</div>
                    <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${cat.score}%`, background: cat.score >= 70 ? '#16a34a' : cat.score >= 45 ? '#f59e0b' : '#ef4444', borderRadius: 99 }} />
                    </div>
                    <div style={{ width: 36, textAlign: 'right', fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{cat.score}</div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: STATUS_BG[cat.status], color: STATUS_COLOR[cat.status], flexShrink: 0 }}>{cat.status}</span>
                  </div>
                  {review.analysis[key]?.map((reason, i) => (
                    <div key={i} style={{ fontSize: 12, color: '#475569', lineHeight: 1.6, paddingLeft: 4, borderTop: i === 0 ? '1px solid #e2e8f0' : 'none', paddingTop: i === 0 ? 8 : 4 }}>
                      {i === 0 ? '→ ' : '   '}{reason}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Conditions & flags */}
          {(review.conditions.length > 0 || review.flags.length > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {review.conditions.length > 0 && (
                <div style={{ background: '#fef3c7', borderRadius: 10, padding: '1rem 1.25rem' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Conditions for Approval</div>
                  {review.conditions.map((c, i) => <div key={i} style={{ fontSize: 13, color: '#78350f', marginBottom: 6, lineHeight: 1.5 }}>• {c}</div>)}
                </div>
              )}
              {review.flags.length > 0 && (
                <div style={{ background: '#fee2e2', borderRadius: 10, padding: '1rem 1.25rem' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Risk Flags</div>
                  {review.flags.map((f, i) => <div key={i} style={{ fontSize: 13, color: '#7f1d1d', marginBottom: 6, lineHeight: 1.5 }}>{f}</div>)}
                </div>
              )}
            </div>
          )}

          {/* Data availability */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {Object.entries(review.dataAvailability).map(([k, v]) => (
              <span key={k} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: v ? '#dcfce7' : '#f1f5f9', color: v ? '#16a34a' : '#94a3b8' }}>
                {k.toUpperCase()}: {v ? 'Yes' : 'No'}
              </span>
            ))}
            <span style={{ fontSize: 11, color: '#94a3b8' }}>— data sources used</span>
          </div>
        </div>
      )}

      {/* Review history */}
      {history.length > 0 && (
        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
          <button onClick={() => setShowHistory(h => !h)} style={{ fontSize: 13, fontWeight: 600, background: 'none', border: 'none', color: '#6d28d9', cursor: 'pointer', padding: 0, marginBottom: 10 }}>
            {showHistory ? '▾' : '▸'} Review History ({history.length})
          </button>
          {showHistory && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {history.map(h => {
                const VC = { ELIGIBLE: '#16a34a', CONDITIONAL: '#d97706', NOT_ELIGIBLE: '#dc2626' };
                const VB = { ELIGIBLE: '#dcfce7', CONDITIONAL: '#fef3c7', NOT_ELIGIBLE: '#fee2e2' };
                return (
                  <div key={h._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#f8fafc', borderRadius: 8, fontSize: 13 }}>
                    <span style={{ fontWeight: 700, background: VB[h.verdict] ?? '#f1f5f9', color: VC[h.verdict] ?? '#64748b', padding: '2px 10px', borderRadius: 20, fontSize: 11 }}>{h.verdict}</span>
                    <span style={{ color: '#334155' }}>₦{(h.loanAmount || 0).toLocaleString()} · {h.loanTenor}mo · {h.annualRate}% p.a.</span>
                    <span style={{ color: '#94a3b8', marginLeft: 'auto', fontSize: 11 }}>{new Date(h.createdAt).toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function VerificationResultCard({ result, accentColor, photoKey, fields, verifiedAt, label }) {
  const photo = result[photoKey];
  const visibleFields = fields.filter(([, v]) => v !== undefined && v !== null && v !== '');

  return (
    <div style={{ background: '#fff', border: `1.5px solid ${accentColor}40`, borderRadius: 14, padding: '1.5rem', borderLeft: `4px solid ${accentColor}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 12, fontWeight: 700, background: `${accentColor}15`, color: accentColor, padding: '3px 12px', borderRadius: 20 }}>
          {label} Verified
        </span>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>
          {new Date(verifiedAt).toLocaleString()}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {photo && (
          <img
            src={`data:image/jpeg;base64,${photo}`}
            alt={label}
            style={{ width: 80, height: 96, borderRadius: 8, objectFit: 'cover', border: `2px solid ${accentColor}`, flexShrink: 0 }}
          />
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>
            {`${result.firstName || ''} ${result.lastName || ''}`.trim() || '—'}
            {result.middleName && <span style={{ fontSize: 14, fontWeight: 500, color: '#64748b', marginLeft: 8 }}>{result.middleName}</span>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
            {visibleFields.map(([lbl, val]) => (
              <div key={lbl} style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 12px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>{lbl}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: status === 'success' ? '#dcfce7' : '#fee2e2', color: status === 'success' ? '#16a34a' : '#dc2626', flexShrink: 0 }}>
      {status}
    </span>
  );
}

const s = {
  page: { padding: '2rem', maxWidth: 1100, margin: '0 auto' },
  loading: { padding: '4rem', textAlign: 'center', color: '#94a3b8' },
  breadcrumb: { fontSize: 13, marginBottom: 20, color: '#94a3b8' },
  breadLink: { color: '#0ea5e9', textDecoration: 'none', fontWeight: 600 },
  breadSep: { margin: '0 6px' },
  breadCurrent: { color: '#0f172a', fontWeight: 600 },
  header: { display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '1.5rem' },
  avatarWrap: { position: 'relative', flexShrink: 0 },
  avatar: { width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #0ea5e9, #6d28d9)', color: '#fff', fontSize: 24, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 64, height: 76, borderRadius: 10, objectFit: 'cover', border: '2px solid #e2e8f0' },
  discrepancyDot: { position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%', background: '#ef4444', color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  headerInfo: { flex: 1 },
  name: { fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' },
  chips: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  chip: { fontSize: 12, fontWeight: 600, background: '#f1f5f9', color: '#64748b', padding: '3px 10px', borderRadius: 20 },
  headerActions: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  discrepancyBadge: { fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20 },
  statPill: { fontSize: 12, fontWeight: 600, color: '#0ea5e9', background: '#e0f2fe', padding: '4px 10px', borderRadius: 20 },
  tabs: { display: 'flex', gap: 4, borderBottom: '2px solid #e2e8f0', marginBottom: 24 },
  tabBtn: { padding: '10px 16px', border: 'none', background: 'none', fontSize: 13, fontWeight: 600, color: '#94a3b8', cursor: 'pointer', borderBottom: '2px solid transparent', marginBottom: -2 },
  tabActive: { color: '#0ea5e9', borderBottomColor: '#0ea5e9' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 },
  summaryCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem' },
  summaryLabel: { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  summaryValue: { fontSize: 28, fontWeight: 800, lineHeight: 1, marginBottom: 4 },
  summarySub: { fontSize: 12, color: '#94a3b8' },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '1.5rem', marginBottom: 0 },
  cardTitle: { fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: '#0ea5e9', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 },
  empty: { padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: 14 },
  activityRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #f1f5f9' },
  activityDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  activityLabel: { fontSize: 14, fontWeight: 500, color: '#334155' },
  activityDate: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  statusBadge: { fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, flexShrink: 0 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { background: '#f8fafc', color: '#94a3b8', padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 },
  td: { padding: '12px 14px', borderBottom: '1px solid #f1f5f9', fontSize: 14, color: '#334155' },
  field: { marginBottom: 0 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 },
  input: { width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box', outline: 'none' },
  btn: { background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer' },
  scorecardHeader: { background: 'linear-gradient(135deg, #0f172a, #1e3a5f)', borderRadius: 14, padding: '2rem', display: 'flex', alignItems: 'center', gap: 24 },
  scLabel: { fontSize: 10, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 },
  scName: { fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 6 },
  scMeta: { fontSize: 13, color: '#94a3b8' },
  gradeBox: { borderRadius: 12, padding: '1rem 1.5rem', textAlign: 'center', minWidth: 80 },
  gradeVal: { fontSize: 32, fontWeight: 800, color: '#fff', lineHeight: 1 },
  gradeLabel: { fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 },
  infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 10 },
  infoCell: { background: '#f8fafc', borderRadius: 8, padding: '10px 14px' },
  infoLabel: { fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  infoValue: { fontSize: 14, fontWeight: 600, color: '#0f172a' },
  scoreCard: { background: '#f8fafc', borderRadius: 10, padding: '1rem', textAlign: 'center' },
  scoreVal: { fontSize: 28, fontWeight: 800, color: '#0f172a', lineHeight: 1 },
  scoreLbl: { fontSize: 11, color: '#94a3b8', marginTop: 4, marginBottom: 8 },
  scoreBar: { height: 4, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' },
  scoreFill: { height: '100%', borderRadius: 2 },
};
