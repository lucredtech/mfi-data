import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL || 'https://mfi-data-production.up.railway.app';

function authHeaders() { return { Authorization: `Bearer ${localStorage.getItem('token')}` }; }
function apiKeyHeaders() { return { 'X-Api-Key': localStorage.getItem('apiKey') }; }

const TABS = ['Overview', 'Statement Analysis', 'BVN Verification', 'NIN Verification', 'Credit Bureau', 'Scorecard'];

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
    } catch {
      toast.error('Failed to load customer');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  if (loading) return <div style={s.loading}>Loading…</div>;
  if (!data) return <div style={s.loading}>Customer not found.</div>;

  const { customer, statements, bvnResults, ninResults, bureauResults } = data;
  const latestBVN = bvnResults?.find((r) => r.status === 'success');
  const latestNIN = ninResults?.find((r) => r.status === 'success');
  const discrepancies = latestBVN?.result && latestNIN?.result
    ? detectDiscrepancies(customer, latestBVN.result, latestNIN.result)
    : [];

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
          {discrepancies.length > 0 && (
            <div
              style={{ ...s.discrepancyBadge, background: discrepancies.some(d => d.severity === 'high') ? '#fee2e2' : '#fef3c7', color: discrepancies.some(d => d.severity === 'high') ? '#dc2626' : '#d97706', cursor: 'pointer' }}
              onClick={() => setTab('Overview')}
            >
              ⚠ {discrepancies.length} discrepanc{discrepancies.length === 1 ? 'y' : 'ies'}
            </div>
          )}
          <div style={s.statPill}>{(statements || []).length} Statements</div>
          <div style={s.statPill}>{(bvnResults || []).length} BVN</div>
          <div style={s.statPill}>{(ninResults || []).length} NIN</div>
          <div style={s.statPill}>{(bureauResults || []).length} Bureau</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        {TABS.map((t) => (
          <button key={t} style={{ ...s.tabBtn, ...(tab === t ? s.tabActive : {}) }} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      <div>
        {tab === 'Overview' && <OverviewTab customer={customer} statements={statements || []} bvnResults={bvnResults || []} ninResults={ninResults || []} bureauResults={bureauResults || []} discrepancies={discrepancies} setTab={setTab} />}
        {tab === 'Statement Analysis' && <StatementTab customer={customer} statements={statements || []} onRefresh={load} />}
        {tab === 'BVN Verification' && <BVNTab customer={customer} bvnResults={bvnResults || []} onRefresh={load} />}
        {tab === 'NIN Verification' && <NINTab customer={customer} ninResults={ninResults || []} onRefresh={load} />}
        {tab === 'Credit Bureau' && <BureauTab customer={customer} bureauResults={bureauResults || []} onRefresh={load} />}
        {tab === 'Scorecard' && <ScorecardTab customer={customer} statements={statements || []} bvnResults={bvnResults || []} ninResults={ninResults || []} bureauResults={bureauResults || []} discrepancies={discrepancies} />}
      </div>
    </div>
  );
}

// ── Overview ─────────────────────────────────────────────────────────────────

function OverviewTab({ customer, statements, bvnResults, ninResults, bureauResults, discrepancies, setTab }) {
  const latestStatement = statements[0];
  const latestBVN = bvnResults.find(r => r.status === 'success');
  const latestNIN = ninResults.find(r => r.status === 'success');
  const latestBureau = bureauResults[0];
  const risk = latestStatement?.result?.overallRiskScore || {};
  const creditScore = latestBureau?.result?.creditScore ?? latestBureau?.result?.summary?.creditScore;

  return (
    <div>
      <div style={s.summaryGrid}>
        <SummaryCard label="Risk Grade" value={risk.overallRiskScore || '—'} sub={risk.recommendation || 'No statement'} color="#0ea5e9" onClick={() => setTab('Statement Analysis')} />
        <SummaryCard label="BVN Status" value={latestBVN ? (latestBVN.result?.isValid !== false ? 'Verified' : 'Failed') : '—'} sub={latestBVN?.result?.firstName ? `${latestBVN.result.firstName} ${latestBVN.result.lastName}` : 'Not verified'} color={latestBVN ? '#16a34a' : '#94a3b8'} onClick={() => setTab('BVN Verification')} />
        <SummaryCard label="NIN Status" value={latestNIN ? (latestNIN.result?.isValid !== false ? 'Verified' : 'Failed') : '—'} sub={latestNIN?.result?.firstName ? `${latestNIN.result.firstName} ${latestNIN.result.lastName}` : 'Not verified'} color={latestNIN ? '#6d28d9' : '#94a3b8'} onClick={() => setTab('NIN Verification')} />
        <SummaryCard label="Bureau Score" value={creditScore ?? '—'} sub={latestBureau ? 'From bureau check' : 'No bureau check'} color="#f59e0b" onClick={() => setTab('Credit Bureau')} />
      </div>

      {/* Discrepancy panel */}
      {discrepancies.length > 0 && (
        <div style={s.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={s.cardTitle}>Data Discrepancies</div>
            <span style={{ fontSize: 12, fontWeight: 700, background: '#fee2e2', color: '#dc2626', padding: '2px 10px', borderRadius: 20 }}>
              {discrepancies.filter(d => d.severity === 'high').length} high · {discrepancies.filter(d => d.severity === 'medium').length} medium · {discrepancies.filter(d => d.severity === 'low').length} low
            </span>
          </div>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 0, marginBottom: 16 }}>
            The following fields differ between the customer's BVN and NIN records. These may indicate identity fraud or data entry errors.
          </p>
          <table style={s.table}>
            <thead>
              <tr>{['Field', 'BVN Record', 'NIN Record', 'Profile', 'Severity'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {discrepancies.map((d, i) => (
                <tr key={i} style={{ background: i % 2 ? '#fafafa' : '#fff' }}>
                  <td style={{ ...s.td, fontWeight: 600, color: '#0f172a' }}>{d.field}</td>
                  <td style={s.td}>{d.bvn || '—'}</td>
                  <td style={s.td}>{d.nin || '—'}</td>
                  <td style={s.td}>{d.profile || '—'}</td>
                  <td style={s.td}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20,
                      background: d.severity === 'high' ? '#fee2e2' : d.severity === 'medium' ? '#fef3c7' : '#f0fdf4',
                      color: d.severity === 'high' ? '#dc2626' : d.severity === 'medium' ? '#d97706' : '#16a34a',
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
      setFile(null); setBank(''); setPassword('');
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
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
            <input style={s.input} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files[0])} required />
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

  async function handleVerify(e) {
    e.preventDefault();
    if (nin.length !== 11) return toast.error('NIN must be 11 digits');
    const apiKey = localStorage.getItem('apiKey');
    if (!apiKey) return toast.error('No API key found');
    setLoading(true);
    try {
      await axios.post(`${API}/v1/identity/verify-nin`, { nin, customerId: customer._id }, { headers: { 'X-Api-Key': apiKey } });
      toast.success('NIN verified');
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
            <div key={r._id} style={{ ...s.activityRow, padding: '12px 0', borderBottom: '1px solid #f1f5f9', background: i % 2 ? '#f8fafc' : '#fff' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 14 }}>Credit Score: {score ?? '—'} · BVN ••••{r.bvn?.slice(-4)}</div>
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

function ScorecardTab({ customer, statements, bvnResults, ninResults, bureauResults, discrepancies }) {
  const latestStatement = statements.find(s => s.status === 'success');
  const latestBVN = bvnResults.find(r => r.status === 'success');
  const latestNIN = ninResults.find(r => r.status === 'success');
  const latestBureau = bureauResults.find(r => r.status === 'success');

  const risk = latestStatement?.result?.overallRiskScore || {};
  const cashFlow = latestStatement?.result?.cashFlowAnalysis || {};
  const income = latestStatement?.result?.incomeSourceAnalysis || {};
  const debt = latestStatement?.result?.debtServicing || {};
  const bureauData = latestBureau?.result || {};
  const bureauScore = bureauData.creditScore ?? bureauData.summary?.creditScore;

  const fmt = (v) => (v !== undefined && v !== null ? Number(v).toLocaleString() : '—');
  const GRADE_COLOR = { A: '#16a34a', B: '#0ea5e9', C: '#f59e0b', D: '#ef4444', E: '#7f1d1d' };
  const gradeColor = GRADE_COLOR[risk.overallRiskScore] || '#94a3b8';

  const bvnPhoto = latestBVN?.result?.image;
  const ninPhoto = latestNIN?.result?.photo;

  async function handleExport() {
    const { exportScorecardPDF } = await import('../services/exportScorecardPDF');
    exportScorecardPDF({ customer, statement: latestStatement, bvnResult: latestBVN, ninResult: latestNIN, bureauResult: latestBureau, discrepancies });
  }

  if (!latestStatement && !latestBVN && !latestNIN && !latestBureau) {
    return <div style={s.card}><div style={s.empty}>No successful analyses yet. Run checks on this customer first.</div></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button style={s.btn} onClick={handleExport}>⬇ Export Scorecard PDF</button>
      </div>

      {/* Header */}
      <div style={s.scorecardHeader}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flex: 1 }}>
          {(bvnPhoto || ninPhoto) && (
            <img
              src={`data:image/jpeg;base64,${bvnPhoto || ninPhoto}`}
              alt={customer.name}
              style={{ width: 72, height: 86, borderRadius: 10, objectFit: 'cover', border: '3px solid rgba(255,255,255,0.2)', flexShrink: 0 }}
            />
          )}
          <div>
            <div style={s.scLabel}>CUSTOMER SCORECARD</div>
            <div style={s.scName}>{customer.name}</div>
            <div style={s.scMeta}>
              {customer.email && <span>{customer.email}</span>}
              {customer.phone && <span> · {customer.phone}</span>}
              {customer.address && <span> · {customer.address}</span>}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {discrepancies.length > 0 && (
            <div style={{ background: '#fef3c7', borderRadius: 10, padding: '0.75rem 1rem', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#d97706' }}>⚠</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>{discrepancies.length} Issue{discrepancies.length > 1 ? 's' : ''}</div>
            </div>
          )}
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

      {/* Discrepancies */}
      {discrepancies.length > 0 && (
        <div style={{ ...s.card, borderLeft: '4px solid #ef4444' }}>
          <div style={s.sectionTitle}>⚠ Data Discrepancies Detected</div>
          <table style={s.table}>
            <thead><tr>{['Field', 'BVN Record', 'NIN Record', 'Severity'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>
              {discrepancies.map((d, i) => (
                <tr key={i} style={{ background: i % 2 ? '#fafafa' : '#fff' }}>
                  <td style={{ ...s.td, fontWeight: 600 }}>{d.field}</td>
                  <td style={s.td}>{d.bvn || '—'}</td>
                  <td style={s.td}>{d.nin || '—'}</td>
                  <td style={s.td}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: d.severity === 'high' ? '#fee2e2' : '#fef3c7', color: d.severity === 'high' ? '#dc2626' : '#d97706' }}>{d.severity.toUpperCase()}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Identity */}
      {(latestBVN || latestNIN) && (
        <div style={s.card}>
          <div style={s.sectionTitle}>Identity Verification</div>
          <div style={{ display: 'grid', gridTemplateColumns: latestBVN && latestNIN ? '1fr 1fr' : '1fr', gap: 20 }}>
            {latestBVN && <IdentityPanel title="BVN Record" data={latestBVN.result} color="#16a34a" photoKey="image" />}
            {latestNIN && <IdentityPanel title="NIN Record" data={latestNIN.result} color="#6d28d9" photoKey="photo" />}
          </div>
        </div>
      )}

      {/* Bureau */}
      {latestBureau && (
        <div style={s.card}>
          <div style={s.sectionTitle}>Credit Bureau</div>
          <div style={s.infoGrid}>
            {[
              ['Credit Score', bureauScore],
              ['Total Facilities', bureauData.totalFacilities ?? bureauData.summary?.totalFacilities],
              ['Active Loans', bureauData.activeLoans ?? bureauData.summary?.activeLoans],
              ['Total Outstanding', bureauData.totalOutstanding !== undefined ? `₦${fmt(bureauData.totalOutstanding)}` : undefined],
              ['Overdue Amount', bureauData.overdueAmount !== undefined ? `₦${fmt(bureauData.overdueAmount)}` : undefined],
              ['Delinquency', bureauData.delinquencyStatus ?? bureauData.summary?.delinquencyStatus],
            ].filter(([, v]) => v !== undefined && v !== null).map(([label, value]) => (
              <div key={label} style={s.infoCell}>
                <div style={s.infoLabel}>{label}</div>
                <div style={s.infoValue}>{String(value)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Statement */}
      {latestStatement && (
        <div style={s.card}>
          <div style={s.sectionTitle}>Statement Analysis</div>
          <div style={s.infoGrid}>
            {[
              ['Account', latestStatement.accountName],
              ['Bank', latestStatement.bankName],
              ['Recommendation', risk.recommendation],
              ['Total Cash Inflow', cashFlow.totalCashInflow !== undefined ? `₦${fmt(cashFlow.totalCashInflow)}` : undefined],
              ['Total Cash Outflow', cashFlow.totalCashOutflow !== undefined ? `₦${fmt(cashFlow.totalCashOutflow)}` : undefined],
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
              {[['Income Stability', risk.scoreBreakdown.incomeStability], ['Debt Servicing', risk.scoreBreakdown.debtServicing], ['Spending Behavior', risk.scoreBreakdown.spendingBehavior], ['Liquidity', risk.scoreBreakdown.liquidity]].map(([label, score]) => (
                <div key={label} style={s.scoreCard}>
                  <div style={s.scoreVal}>{score ?? '—'}</div>
                  <div style={s.scoreLbl}>{label}</div>
                  <div style={s.scoreBar}><div style={{ ...s.scoreFill, width: `${Math.min(((score || 0) / 25) * 100, 100)}%`, background: (score || 0) >= 20 ? '#16a34a' : (score || 0) >= 12 ? '#f59e0b' : '#ef4444' }} /></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────────

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
