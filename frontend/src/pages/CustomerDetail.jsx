import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL || 'https://mfi-data-production.up.railway.app';

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('token')}` };
}
function apiKeyHeaders() {
  return { 'X-Api-Key': localStorage.getItem('apiKey') };
}

const TABS = ['Overview', 'Statement Analysis', 'BVN Verification', 'Credit Bureau', 'Scorecard'];

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
    } catch {
      toast.error('Failed to load customer');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  if (loading) return <div style={s.loading}>Loading…</div>;
  if (!data) return <div style={s.loading}>Customer not found.</div>;

  const { customer, statements, bvnResults, bureauResults } = data;

  return (
    <div style={s.page}>
      {/* Breadcrumb */}
      <div style={s.breadcrumb}>
        <Link to="/dashboard/customers" style={s.breadLink}>Customers</Link>
        <span style={s.breadSep}> / </span>
        <span style={s.breadCurrent}>{customer.name}</span>
      </div>

      {/* Customer header */}
      <div style={s.header}>
        <div style={s.avatar}>{customer.name.charAt(0).toUpperCase()}</div>
        <div style={s.headerInfo}>
          <h1 style={s.name}>{customer.name}</h1>
          <div style={s.chips}>
            {customer.email && <span style={s.chip}>{customer.email}</span>}
            {customer.phone && <span style={s.chip}>{customer.phone}</span>}
            {customer.bvn && <span style={{ ...s.chip, background: '#dcfce7', color: '#16a34a' }}>BVN: ••••{customer.bvn.slice(-4)}</span>}
            {customer.nin && <span style={{ ...s.chip, background: '#e0f2fe', color: '#0284c7' }}>NIN: ••••{customer.nin.slice(-4)}</span>}
          </div>
        </div>
        <div style={s.headerActions}>
          <div style={s.statPill}>{statements.length} Statements</div>
          <div style={s.statPill}>{bvnResults.length} BVN Checks</div>
          <div style={s.statPill}>{bureauResults.length} Bureau Checks</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        {TABS.map((t) => (
          <button key={t} style={{ ...s.tabBtn, ...(tab === t ? s.tabActive : {}) }} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {/* Tab content */}
      <div style={s.tabContent}>
        {tab === 'Overview' && <OverviewTab customer={customer} statements={statements} bvnResults={bvnResults} bureauResults={bureauResults} setTab={setTab} />}
        {tab === 'Statement Analysis' && <StatementTab customer={customer} statements={statements} onRefresh={load} />}
        {tab === 'BVN Verification' && <BVNTab customer={customer} bvnResults={bvnResults} onRefresh={load} />}
        {tab === 'Credit Bureau' && <BureauTab customer={customer} bureauResults={bureauResults} onRefresh={load} />}
        {tab === 'Scorecard' && <ScorecardTab customer={customer} statements={statements} bvnResults={bvnResults} bureauResults={bureauResults} />}
      </div>
    </div>
  );
}

// ── Overview ────────────────────────────────────────────────────────────────

function OverviewTab({ customer, statements, bvnResults, bureauResults, setTab }) {
  const latestStatement = statements[0];
  const latestBVN = bvnResults[0];
  const latestBureau = bureauResults[0];

  const risk = latestStatement?.result?.overallRiskScore || {};
  const bvnValid = latestBVN?.result?.isValid !== false;
  const creditScore = latestBureau?.result?.creditScore ?? latestBureau?.result?.summary?.creditScore;

  return (
    <div>
      <div style={s.summaryGrid}>
        <SummaryCard
          label="Latest Risk Grade"
          value={risk.overallRiskScore || '—'}
          sub={risk.recommendation || 'No statement yet'}
          color="#0ea5e9"
          onClick={() => setTab('Statement Analysis')}
        />
        <SummaryCard
          label="Identity (BVN)"
          value={latestBVN ? (bvnValid ? 'Verified' : 'Failed') : '—'}
          sub={latestBVN?.result?.firstName ? `${latestBVN.result.firstName} ${latestBVN.result.lastName}` : 'Not verified yet'}
          color={latestBVN ? (bvnValid ? '#16a34a' : '#dc2626') : '#94a3b8'}
          onClick={() => setTab('BVN Verification')}
        />
        <SummaryCard
          label="Credit Score"
          value={creditScore ?? '—'}
          sub={latestBureau ? 'From bureau check' : 'No bureau check yet'}
          color="#6d28d9"
          onClick={() => setTab('Credit Bureau')}
        />
        <SummaryCard
          label="Analyses Run"
          value={statements.length + bvnResults.length + bureauResults.length}
          sub="Total across all checks"
          color="#f59e0b"
          onClick={() => setTab('Scorecard')}
        />
      </div>

      {/* Activity timeline */}
      <div style={s.card}>
        <div style={s.cardTitle}>Recent Activity</div>
        {[
          ...statements.map((r) => ({ type: 'statement', label: `Statement: ${r.accountName || r.filename}`, bank: r.bankName, status: r.status, date: r.createdAt })),
          ...bvnResults.map((r) => ({ type: 'bvn', label: `BVN Verified: ••••${r.bvn?.slice(-4)}`, status: r.status, date: r.createdAt })),
          ...bureauResults.map((r) => ({ type: 'bureau', label: `Credit Bureau Check`, status: r.status, date: r.createdAt })),
        ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10).map((item, i) => (
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
        {statements.length + bvnResults.length + bureauResults.length === 0 && (
          <div style={s.empty}>No analyses yet. Use the tabs above to run checks on this customer.</div>
        )}
      </div>
    </div>
  );
}

const TYPE_COLOR = { statement: '#0ea5e9', bvn: '#16a34a', bureau: '#6d28d9' };

function SummaryCard({ label, value, sub, color, onClick }) {
  return (
    <div style={{ ...s.summaryCard, cursor: 'pointer' }} onClick={onClick}>
      <div style={s.summaryLabel}>{label}</div>
      <div style={{ ...s.summaryValue, color }}>{value}</div>
      <div style={s.summarySub}>{sub}</div>
    </div>
  );
}

// ── Statement tab ────────────────────────────────────────────────────────────

function StatementTab({ customer, statements, onRefresh }) {
  const [file, setFile] = useState(null);
  const [bank, setBank] = useState('');
  const [password, setPassword] = useState('');
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  const BANKS = [
    { value: 'moniepoint', label: 'Moniepoint' }, { value: 'kuda', label: 'Kuda' },
    { value: 'vbank', label: 'VBank' }, { value: 'uba', label: 'UBA' },
    { value: 'optimus', label: 'Optimus' }, { value: 'parallex', label: 'Parallex' },
    { value: 'gtb', label: 'GTBank' }, { value: 'opay', label: 'Opay' },
    { value: 'fidelity', label: 'Fidelity' }, { value: 'sterling', label: 'Sterling' },
    { value: 'access', label: 'Access' },
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

      await axios.post(`${API}/v1/statement/upload-analyze`, fd, { headers: { 'X-Api-Key': apiKey } });
      toast.success('Analysis complete');
      setFile(null);
      setBank('');
      setPassword('');
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Upload form */}
      <div style={s.card}>
        <div style={s.cardTitle}>Upload Bank Statement</div>
        <form onSubmit={handleUpload} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={s.field}>
            <label style={s.label}>Bank *</label>
            <select style={s.input} value={bank} onChange={(e) => setBank(e.target.value)} required>
              <option value="">Select bank…</option>
              {BANKS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
          </div>
          <div style={s.field}>
            <label style={s.label}>Statement File (PDF / JPEG / PNG) *</label>
            <input style={s.input} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files[0])} required />
          </div>
          <div style={s.field}>
            <label style={s.label}>PDF Password (optional)</label>
            <input style={s.input} type="password" placeholder="Leave blank if none" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button style={{ ...s.btn, opacity: uploading ? 0.7 : 1 }} disabled={uploading} type="submit">
              {uploading ? 'Analysing…' : 'Upload & Analyse →'}
            </button>
          </div>
        </form>
      </div>

      {/* History */}
      <div style={s.card}>
        <div style={s.cardTitle}>Statement History</div>
        {statements.length === 0 ? <div style={s.empty}>No statements yet.</div> : (
          <table style={s.table}>
            <thead><tr>{['Account', 'Bank', 'File', 'Status', 'Date', ''].map((h) => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>
              {statements.map((st, i) => (
                <tr key={st._id} style={{ background: i % 2 ? '#f8fafc' : '#fff', cursor: 'pointer' }} onClick={() => navigate(`/dashboard/statements/${st._id}`)}>
                  <td style={s.td}>{st.accountName || '—'}</td>
                  <td style={s.td}>{st.bankName || '—'}</td>
                  <td style={s.td}>{st.filename || '—'}</td>
                  <td style={s.td}><span style={{ ...s.statusBadge, background: st.status === 'success' ? '#dcfce7' : '#fee2e2', color: st.status === 'success' ? '#16a34a' : '#dc2626' }}>{st.status}</span></td>
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

// ── BVN tab ────────────────────────────────────────────────────────────────

function BVNTab({ customer, bvnResults, onRefresh }) {
  const [bvn, setBvn] = useState(customer.bvn || '');
  const [loading, setLoading] = useState(false);

  async function handleVerify(e) {
    e.preventDefault();
    if (bvn.length !== 11) return toast.error('BVN must be 11 digits');
    const apiKey = localStorage.getItem('apiKey');
    if (!apiKey) return toast.error('No API key found');

    setLoading(true);
    try {
      await axios.post(`${API}/v1/identity/verify-bvn`, { bvn, customerId: customer._id }, { headers: { 'X-Api-Key': apiKey } });
      toast.success('BVN verified');
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Verification failed');
    } finally {
      setLoading(false);
    }
  }

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

      <div style={s.card}>
        <div style={s.cardTitle}>Verification History</div>
        {bvnResults.length === 0 ? <div style={s.empty}>No BVN verifications yet.</div> : bvnResults.map((r, i) => (
          <div key={r._id} style={{ ...s.activityRow, background: i % 2 ? '#f8fafc' : '#fff', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 14 }}>
                {r.result?.firstName} {r.result?.lastName} — BVN ••••{r.bvn?.slice(-4)}
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                {r.result?.dateOfBirth} · {r.result?.gender} · {r.result?.phoneNumber}
              </div>
              <div style={s.activityDate}>{new Date(r.createdAt).toLocaleString()}</div>
            </div>
            <span style={{ ...s.statusBadge, background: r.status === 'success' ? '#dcfce7' : '#fee2e2', color: r.status === 'success' ? '#16a34a' : '#dc2626' }}>{r.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Bureau tab ────────────────────────────────────────────────────────────

function BureauTab({ customer, bureauResults, onRefresh }) {
  const [form, setForm] = useState({ bvn: customer.bvn || '', firstName: '', lastName: '', dateOfBirth: '' });
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleCheck(e) {
    e.preventDefault();
    if (form.bvn.length !== 11) return toast.error('BVN must be 11 digits');
    const apiKey = localStorage.getItem('apiKey');
    if (!apiKey) return toast.error('No API key found');

    setLoading(true);
    try {
      await axios.post(`${API}/v1/credit-bureau/check`, { ...form, customerId: customer._id }, { headers: { 'X-Api-Key': apiKey } });
      toast.success('Bureau check complete');
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Bureau check failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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

      <div style={s.card}>
        <div style={s.cardTitle}>Bureau Check History</div>
        {bureauResults.length === 0 ? <div style={s.empty}>No bureau checks yet.</div> : bureauResults.map((r, i) => {
          const score = r.result?.creditScore ?? r.result?.summary?.creditScore;
          return (
            <div key={r._id} style={{ ...s.activityRow, background: i % 2 ? '#f8fafc' : '#fff', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 14 }}>
                  Credit Score: {score ?? '—'} · BVN ••••{r.bvn?.slice(-4)}
                </div>
                <div style={s.activityDate}>{new Date(r.createdAt).toLocaleString()}</div>
              </div>
              <span style={{ ...s.statusBadge, background: r.status === 'success' ? '#dcfce7' : '#fee2e2', color: r.status === 'success' ? '#16a34a' : '#dc2626' }}>{r.status}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Scorecard tab ────────────────────────────────────────────────────────────

function ScorecardTab({ customer, statements, bvnResults, bureauResults }) {
  const latestStatement = statements.find((s) => s.status === 'success');
  const latestBVN = bvnResults.find((r) => r.status === 'success');
  const latestBureau = bureauResults.find((r) => r.status === 'success');

  const risk = latestStatement?.result?.overallRiskScore || {};
  const cashFlow = latestStatement?.result?.cashFlowAnalysis || {};
  const income = latestStatement?.result?.incomeSourceAnalysis || {};
  const debt = latestStatement?.result?.debtServicing || {};
  const bvnData = latestBVN?.result || {};
  const bureauData = latestBureau?.result || {};
  const bureauScore = bureauData.creditScore ?? bureauData.summary?.creditScore;

  const fmt = (v) => (v !== undefined && v !== null ? Number(v).toLocaleString() : '—');

  const GRADE_COLOR = { A: '#16a34a', B: '#0ea5e9', C: '#f59e0b', D: '#ef4444', E: '#7f1d1d' };
  const gradeColor = GRADE_COLOR[risk.overallRiskScore] || '#94a3b8';

  async function handleExport() {
    const { exportScorecardPDF } = await import('../services/exportScorecardPDF');
    exportScorecardPDF({ customer, statement: latestStatement, bvnResult: latestBVN, bureauResult: latestBureau });
  }

  const hasData = latestStatement || latestBVN || latestBureau;

  if (!hasData) {
    return (
      <div style={s.card}>
        <div style={s.empty}>
          No successful analyses yet. Run a Statement Analysis, BVN Verification, or Credit Bureau Check on this customer first.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Action bar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button style={s.btn} onClick={handleExport}>⬇ Export Scorecard PDF</button>
      </div>

      {/* Header card */}
      <div style={s.scorecardHeader}>
        <div style={{ flex: 1 }}>
          <div style={s.scLabel}>CUSTOMER SCORECARD</div>
          <div style={s.scName}>{customer.name}</div>
          <div style={s.scMeta}>
            {customer.email && <span>{customer.email}</span>}
            {customer.phone && <span> · {customer.phone}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          {risk.overallRiskScore && (
            <div style={{ ...s.gradeBox, background: gradeColor }}>
              <div style={s.gradeVal}>{risk.overallRiskScore}</div>
              <div style={s.gradeLabel}>RISK GRADE</div>
            </div>
          )}
          {bureauScore && (
            <div style={{ ...s.gradeBox, background: '#6d28d9' }}>
              <div style={s.gradeVal}>{bureauScore}</div>
              <div style={s.gradeLabel}>BUREAU SCORE</div>
            </div>
          )}
        </div>
      </div>

      {/* Identity */}
      {latestBVN && (
        <Section title="Identity Verification (BVN)">
          <div style={s.infoGrid}>
            {[
              ['Full Name', `${bvnData.firstName || ''} ${bvnData.lastName || ''}`.trim()],
              ['Date of Birth', bvnData.dateOfBirth],
              ['Gender', bvnData.gender],
              ['Phone', bvnData.phoneNumber],
              ['BVN Status', bvnData.isValid !== false ? 'Valid' : 'Invalid'],
              ['Enrollment Bank', bvnData.enrollmentBank],
              ['NIN', bvnData.nin],
              ['Watch Listed', bvnData.watchListed !== undefined ? String(bvnData.watchListed) : undefined],
            ].filter(([, v]) => v).map(([label, value]) => (
              <div key={label} style={s.infoCell}>
                <div style={s.infoLabel}>{label}</div>
                <div style={s.infoValue}>{value}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Statement summary */}
      {latestStatement && (
        <>
          <Section title="Statement Analysis">
            <div style={s.infoGrid}>
              {[
                ['Account', latestStatement.accountName],
                ['Bank', latestStatement.bankName],
                ['Recommendation', risk.recommendation],
                ['Total Cash Inflow', cashFlow.totalCashInflow !== undefined ? `₦${fmt(cashFlow.totalCashInflow)}` : undefined],
                ['Total Cash Outflow', cashFlow.totalCashOutflow !== undefined ? `₦${fmt(cashFlow.totalCashOutflow)}` : undefined],
                ['Cash Flow Status', cashFlow.cashFlowStatus],
                ['Monthly Avg Income', income.monthlyAverageIncome !== undefined ? `₦${fmt(income.monthlyAverageIncome)}` : undefined],
                ['Salary Earner', income.isSalaryEarner !== undefined ? (income.isSalaryEarner ? 'Yes' : 'No') : undefined],
                ['Debt-to-Income', debt.loanRepayments?.DebtToIncomeRatio !== undefined ? `${debt.loanRepayments.DebtToIncomeRatio}%` : undefined],
              ].filter(([, v]) => v !== undefined && v !== null).map(([label, value]) => (
                <div key={label} style={s.infoCell}>
                  <div style={s.infoLabel}>{label}</div>
                  <div style={s.infoValue}>{value}</div>
                </div>
              ))}
            </div>

            {risk.scoreBreakdown && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 16 }}>
                {[
                  ['Income Stability', risk.scoreBreakdown.incomeStability],
                  ['Debt Servicing', risk.scoreBreakdown.debtServicing],
                  ['Spending Behavior', risk.scoreBreakdown.spendingBehavior],
                  ['Liquidity', risk.scoreBreakdown.liquidity],
                ].map(([label, score]) => (
                  <div key={label} style={s.scoreCard}>
                    <div style={s.scoreVal}>{score ?? '—'}</div>
                    <div style={s.scoreLbl}>{label}</div>
                    <div style={s.scoreBar}>
                      <div style={{ ...s.scoreFill, width: `${Math.min(((score || 0) / 25) * 100, 100)}%`, background: (score || 0) >= 20 ? '#16a34a' : (score || 0) >= 12 ? '#f59e0b' : '#ef4444' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </>
      )}

      {/* Bureau summary */}
      {latestBureau && (
        <Section title="Credit Bureau">
          <div style={s.infoGrid}>
            {[
              ['Credit Score', bureauScore],
              ['Total Facilities', bureauData.totalFacilities ?? bureauData.summary?.totalFacilities],
              ['Active Loans', bureauData.activeLoans ?? bureauData.summary?.activeLoans],
              ['Total Outstanding', bureauData.totalOutstanding !== undefined ? `₦${fmt(bureauData.totalOutstanding)}` : bureauData.summary?.totalOutstanding !== undefined ? `₦${fmt(bureauData.summary.totalOutstanding)}` : undefined],
              ['Overdue Amount', bureauData.overdueAmount !== undefined ? `₦${fmt(bureauData.overdueAmount)}` : undefined],
              ['Delinquency', bureauData.delinquencyStatus ?? bureauData.summary?.delinquencyStatus],
            ].filter(([, v]) => v !== undefined && v !== null).map(([label, value]) => (
              <div key={label} style={s.infoCell}>
                <div style={s.infoLabel}>{label}</div>
                <div style={s.infoValue}>{String(value)}</div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={s.card}>
      <div style={s.sectionTitle}>{title}</div>
      {children}
    </div>
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
  avatar: { width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, #0ea5e9, #6d28d9)', color: '#fff', fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  headerInfo: { flex: 1 },
  name: { fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' },
  chips: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  chip: { fontSize: 12, fontWeight: 600, background: '#f1f5f9', color: '#64748b', padding: '3px 10px', borderRadius: 20 },
  headerActions: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  statPill: { fontSize: 13, fontWeight: 600, color: '#0ea5e9', background: '#e0f2fe', padding: '4px 12px', borderRadius: 20 },
  tabs: { display: 'flex', gap: 4, borderBottom: '2px solid #e2e8f0', marginBottom: 24 },
  tabBtn: { padding: '10px 18px', border: 'none', background: 'none', fontSize: 14, fontWeight: 600, color: '#94a3b8', cursor: 'pointer', borderBottom: '2px solid transparent', marginBottom: -2 },
  tabActive: { color: '#0ea5e9', borderBottomColor: '#0ea5e9' },
  tabContent: {},
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 },
  summaryCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem' },
  summaryLabel: { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  summaryValue: { fontSize: 28, fontWeight: 800, lineHeight: 1, marginBottom: 4 },
  summarySub: { fontSize: 12, color: '#94a3b8' },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '1.5rem' },
  cardTitle: { fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 16 },
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
  scLabel: { fontSize: 11, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 },
  scName: { fontSize: 26, fontWeight: 800, color: '#fff', marginBottom: 6 },
  scMeta: { fontSize: 13, color: '#94a3b8' },
  gradeBox: { borderRadius: 12, padding: '1rem 1.5rem', textAlign: 'center', minWidth: 80 },
  gradeVal: { fontSize: 32, fontWeight: 800, color: '#fff', lineHeight: 1 },
  gradeLabel: { fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: '#0ea5e9', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
  infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 },
  infoCell: { background: '#f8fafc', borderRadius: 8, padding: '10px 14px' },
  infoLabel: { fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  infoValue: { fontSize: 14, fontWeight: 600, color: '#0f172a' },
  scoreCard: { background: '#f8fafc', borderRadius: 10, padding: '1rem', textAlign: 'center' },
  scoreVal: { fontSize: 28, fontWeight: 800, color: '#0f172a', lineHeight: 1 },
  scoreLbl: { fontSize: 11, color: '#94a3b8', marginTop: 4, marginBottom: 8 },
  scoreBar: { height: 4, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' },
  scoreFill: { height: '100%', borderRadius: 2, transition: 'width 0.4s ease' },
};
