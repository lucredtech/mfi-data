import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import adminApi from '../../services/adminApi';
import toast from 'react-hot-toast';

const TX_COLOR = { topup: '#16a34a', charge: '#dc2626', refund: '#0ea5e9', subscription_credit: '#6d28d9' };
const TX_LABEL = { topup: 'Top-up', charge: 'Charge', refund: 'Refund', subscription_credit: 'Sub credits' };

export default function AdminClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [analyses, setAnalyses] = useState(null);
  const [payments, setPayments] = useState([]);
  const [payForm, setPayForm] = useState({ plan: 'growth', amount: '', method: 'bank_transfer', reference: '', note: '', months: 1 });
  const [paying, setPaying] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [walletTxs, setWalletTxs] = useState([]);
  const [creditForm, setCreditForm] = useState({ amount: '', description: '' });
  const [crediting, setCrediting] = useState(false);
  const [kybNotes, setKybNotes] = useState('');
  const [kybSaving, setKybSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [sendingSla, setSendingSla] = useState(false);

  const load = () => {
    adminApi.get(`/api/admin/clients/${id}`).then(({ data }) => setClient(data)).catch(() => {});
    adminApi.get(`/api/admin/clients/${id}/analyses`).then(({ data }) => setAnalyses(data)).catch(() => {});
    adminApi.get(`/api/admin/clients/${id}/payments`).then(({ data }) => setPayments(data.payments || [])).catch(() => {});
    adminApi.get(`/api/admin/clients/${id}/wallet/transactions?limit=10`).then(({ data }) => {
      setWallet(data.wallet);
      setWalletTxs(data.transactions || []);
    }).catch(() => {});
  };

  const recordPayment = async (e) => {
    e.preventDefault();
    if (!payForm.amount) return;
    setPaying(true);
    try {
      await adminApi.post(`/api/admin/clients/${id}/payments`, { ...payForm, amount: Number(payForm.amount), months: Number(payForm.months) });
      toast.success(`Payment recorded — plan upgraded to ${payForm.plan}`);
      setPayForm({ plan: 'growth', amount: '', method: 'bank_transfer', reference: '', note: '', months: 1 });
      load();
    } catch { toast.error('Failed to record payment'); }
    finally { setPaying(false); }
  };

  const creditWallet = async (e) => {
    e.preventDefault();
    if (!creditForm.amount) return;
    setCrediting(true);
    try {
      await adminApi.post(`/api/admin/clients/${id}/wallet/credit`, { amount: Number(creditForm.amount), description: creditForm.description || 'Admin top-up' });
      toast.success(`₦${Number(creditForm.amount).toLocaleString()} credited to wallet`);
      setCreditForm({ amount: '', description: '' });
      load();
    } catch { toast.error('Failed to credit wallet'); }
    finally { setCrediting(false); }
  };

  const approveClient = async () => {
    if (!confirm('Approve this client and send activation email?')) return;
    setApproving(true);
    try {
      await adminApi.post(`/api/admin/clients/${id}/approve`, { kybNotes });
      toast.success('Client approved and notified');
      load();
    } catch { toast.error('Failed to approve'); }
    finally { setApproving(false); }
  };

  const sendSla = async () => {
    if (!confirm('Send SLA agreement email to this client?')) return;
    setSendingSla(true);
    try {
      await adminApi.post(`/api/admin/clients/${id}/send-sla`);
      toast.success('SLA email sent');
      load();
    } catch { toast.error('Failed to send SLA'); }
    finally { setSendingSla(false); }
  };

  const saveKybNotes = async () => {
    setKybSaving(true);
    try {
      await adminApi.patch(`/api/admin/clients/${id}/kyb`, { kybNotes });
      toast.success('KYB notes saved');
    } catch { toast.error('Failed to save notes'); }
    finally { setKybSaving(false); }
  };

  useEffect(() => { load(); }, [id]);
  useEffect(() => { if (client?.kybNotes) setKybNotes(client.kybNotes); }, [client?.kybNotes]);

  const updatePlan = async (plan) => {
    try {
      await adminApi.patch(`/api/admin/clients/${id}/plan`, { plan });
      toast.success(`Plan updated to ${plan}`);
      load();
    } catch { toast.error('Failed to update plan'); }
  };

  const toggleStatus = async () => {
    const next = client.status === 'active' ? 'suspended' : 'active';
    if (!confirm(`${next === 'suspended' ? 'Suspend' : 'Reactivate'} this client?`)) return;
    try {
      await adminApi.patch(`/api/admin/clients/${id}/status`, { status: next });
      toast.success(`Client ${next}`);
      load();
    } catch { toast.error('Failed'); }
  };

  if (!client) return <p style={{ color: '#94a3b8' }}>Loading…</p>;

  return (
    <div>
      <button onClick={() => navigate('/admin/clients')} style={s.back}>← Back to clients</button>

      <div style={s.header}>
        <div>
          <h1 style={s.h1}>{client.organizationName}</h1>
          <p style={s.sub}>{client.email} · {client.contactPerson}{client.phone ? ` · ${client.phone}` : ''}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ ...s.badge,
            background: client.status === 'active' ? '#dcfce7' : client.status === 'pending' ? '#fef3c7' : '#fee2e2',
            color: client.status === 'active' ? '#16a34a' : client.status === 'pending' ? '#d97706' : '#dc2626',
          }}>
            {client.status}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>Plan:</span>
            <select
              value={client.plan || 'free'}
              onChange={e => updatePlan(e.target.value)}
              style={{ fontSize: 13, fontWeight: 700, padding: '6px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer', color: { free: '#0ea5e9', growth: '#6d28d9', scale: '#16a34a' }[client.plan || 'free'] }}
            >
              <option value="free">Free</option>
              <option value="starter">Starter</option>
              <option value="growth">Growth</option>
              <option value="scale">Scale</option>
            </select>
          </div>
          <button onClick={toggleStatus} style={{ ...s.btn, background: client.status === 'active' ? '#dc2626' : '#16a34a' }}>
            {client.status === 'active' ? 'Suspend Client' : 'Reactivate Client'}
          </button>
        </div>
      </div>

      {/* KYB & Approval */}
      {client.status === 'pending' && (
        <div style={{ ...s.box, border: '2px solid #fcd34d', background: '#fffbeb', marginBottom: 24 }}>
          <h3 style={{ ...s.boxTitle, color: '#d97706', marginBottom: 12 }}>⏳ Pending KYB Approval</h3>
          <p style={{ fontSize: 13, color: '#92400e', marginTop: 0, marginBottom: 16 }}>
            This organisation is awaiting KYB review and admin approval before they can access the platform.
            Complete KYB, optionally send the SLA, then approve when ready.
          </p>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <button onClick={sendSla} disabled={sendingSla} style={{ padding: '9px 18px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: sendingSla ? 0.6 : 1 }}>
              {sendingSla ? 'Sending…' : `${client.slaSentAt ? 'Resend' : 'Send'} SLA Email`}
            </button>
            <button onClick={approveClient} disabled={approving} style={{ padding: '9px 18px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: approving ? 0.6 : 1 }}>
              {approving ? 'Approving…' : '✓ Approve & Activate'}
            </button>
          </div>
          {client.slaSentAt && (
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
              SLA sent: {new Date(client.slaSentAt).toLocaleString()}
            </p>
          )}
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>KYB Notes (internal)</label>
          <textarea
            value={kybNotes}
            onChange={e => setKybNotes(e.target.value)}
            rows={4}
            placeholder="Add KYB review notes, CAC number, documents checked, etc."
            style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
          />
          <button onClick={saveKybNotes} disabled={kybSaving} style={{ marginTop: 8, padding: '7px 16px', background: '#f1f5f9', color: '#334155', border: '1.5px solid #e2e8f0', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            {kybSaving ? 'Saving…' : 'Save Notes'}
          </button>
        </div>
      )}

      {/* KYB summary (approved clients) */}
      {client.status !== 'pending' && (client.approvedAt || client.kybNotes) && (
        <div style={{ ...s.box, marginBottom: 24 }}>
          <h3 style={{ ...s.boxTitle, marginBottom: 10 }}>KYB Record</h3>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13, color: '#64748b', marginBottom: 12 }}>
            {client.approvedAt && <span>Approved: <strong style={{ color: '#16a34a' }}>{new Date(client.approvedAt).toLocaleString()}</strong>{client.approvedBy ? ` by ${client.approvedBy}` : ''}</span>}
            {client.slaSentAt && <span>SLA sent: <strong>{new Date(client.slaSentAt).toLocaleDateString()}</strong></span>}
            {client.kybCompletedAt && <span>KYB completed: <strong>{new Date(client.kybCompletedAt).toLocaleDateString()}</strong></span>}
          </div>
          {client.kybNotes && <p style={{ fontSize: 13, color: '#334155', background: '#f8fafc', padding: '10px 14px', borderRadius: 8, margin: 0, whiteSpace: 'pre-wrap' }}>{client.kybNotes}</p>}
        </div>
      )}

      {/* Account stats */}
      <div style={s.sectionLabel}>Account</div>
      <div style={{ ...s.statRow, gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 24 }}>
        <StatCard label="Total API Requests" value={client.totalRequests?.toLocaleString() ?? '—'} color="#0ea5e9" />
        <StatCard label="Active API Keys" value={client.keys?.filter(k => k.isActive).length ?? '—'} color="#6d28d9" />
        <StatCard label="Member Since" value={new Date(client.createdAt).toLocaleDateString()} color="#94a3b8" />
      </div>

      {/* Analysis stats */}
      <div style={s.sectionLabel}>Analysis Usage</div>
      <div style={{ ...s.statRow, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginBottom: 28 }}>
        <StatCard
          label="Customers"
          value={analyses?.customers ?? '—'}
          sub="Borrower profiles"
          color="#0ea5e9"
        />
        <StatCard
          label="Statement Analyses"
          value={analyses?.statements?.total ?? '—'}
          sub={analyses?.statements ? `${analyses.statements.failed ?? 0} failed` : ''}
          color="#6d28d9"
        />
        <StatCard
          label="BVN Verifications"
          value={analyses?.bvn?.total ?? '—'}
          sub={analyses?.bvn ? `${analyses.bvn.failed ?? 0} failed` : ''}
          color="#16a34a"
        />
        <StatCard
          label="NIN Verifications"
          value={analyses?.nin?.total ?? '—'}
          sub={analyses?.nin ? `${analyses.nin.failed ?? 0} failed` : ''}
          color="#6d28d9"
        />
        <StatCard
          label="Bureau Checks"
          value={analyses?.bureau?.total ?? '—'}
          sub={analyses?.bureau ? `${analyses.bureau.failed ?? 0} failed` : ''}
          color="#f59e0b"
        />
      </div>

      {/* Referral info */}
      {(client.referredBy || client.referralCount > 0) && (
        <div style={s.box}>
          <h3 style={s.boxTitle}>Referrals</h3>
          {client.referredBy && (
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
              Referred by: <strong style={{ color: '#6d28d9' }}>{client.referredBy.organizationName}</strong>
              <span style={{ color: '#94a3b8', marginLeft: 6 }}>({client.referredBy.email})</span>
            </div>
          )}
          {client.referrals?.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>{['Organisation', 'Email', 'Plan', 'Joined'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {client.referrals.map(r => (
                  <tr key={r._id}>
                    <td style={s.td}><strong>{r.organizationName}</strong></td>
                    <td style={s.td}>{r.email}</td>
                    <td style={s.td}><span style={{ fontWeight: 700, color: { free: '#64748b', growth: '#0284c7', scale: '#6d28d9' }[r.plan || 'free'] }}>{r.plan || 'free'}</span></td>
                    <td style={s.td}>{new Date(r.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {(!client.referrals || client.referrals.length === 0) && client.referralCount === 0 && (
            <p style={{ color: '#94a3b8', fontSize: 13 }}>No referrals yet.</p>
          )}
        </div>
      )}

      {/* Billing / Payments */}
      <div style={s.box}>
        <h3 style={s.boxTitle}>Billing & Payments</h3>
        <form onSubmit={recordPayment} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20, background: '#f8fafc', borderRadius: 10, padding: '14px 16px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', width: '100%', marginBottom: 2 }}>Record a payment</div>
          <select value={payForm.plan} onChange={e => setPayForm(f => ({ ...f, plan: e.target.value }))} style={si.sel}>
            <option value="starter">Starter — ₦25,000</option>
            <option value="growth">Growth — ₦50,000</option>
            <option value="scale">Scale — ₦100,000</option>
          </select>
          <select value={payForm.months} onChange={e => setPayForm(f => ({ ...f, months: e.target.value }))} style={si.sel}>
            {[1,2,3,4,5,6,9,12].map(m => <option key={m} value={m}>{m} month{m > 1 ? 's' : ''}</option>)}
          </select>
          <input placeholder="Amount (₦)" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} style={si.inp} required type="number" min="1" />
          <select value={payForm.method} onChange={e => setPayForm(f => ({ ...f, method: e.target.value }))} style={si.sel}>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="card">Card</option>
            <option value="paystack">Paystack</option>
            <option value="manual">Manual</option>
          </select>
          <input placeholder="Reference (optional)" value={payForm.reference} onChange={e => setPayForm(f => ({ ...f, reference: e.target.value }))} style={si.inp} />
          <input placeholder="Note (optional)" value={payForm.note} onChange={e => setPayForm(f => ({ ...f, note: e.target.value }))} style={{ ...si.inp, flex: 2 }} />
          <button disabled={paying || !payForm.amount} style={{ padding: '8px 18px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: paying || !payForm.amount ? 0.6 : 1 }}>
            {paying ? 'Saving…' : 'Record'}
          </button>
        </form>
        {payments.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr>{['Date','Plan','Amount','Method','Reference','Note'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>
              {payments.map(p => (
                <tr key={p._id}>
                  <td style={s.td}>{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td style={s.td}><strong>{p.plan}</strong></td>
                  <td style={s.td}>₦{Number(p.amount).toLocaleString()}</td>
                  <td style={s.td}>{p.method}</td>
                  <td style={s.td}><code style={{ fontSize: 11 }}>{p.reference || '—'}</code></td>
                  <td style={s.td}>{p.note || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p style={{ color: '#94a3b8', fontSize: 13 }}>No payments recorded yet.</p>}
      </div>

      {/* Wallet */}
      <div style={s.box}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ ...s.boxTitle, margin: 0 }}>Wallet</h3>
          {wallet !== null && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: wallet?.balance <= 1000 ? '#dc2626' : '#0f172a' }}>
                ₦{(wallet?.balance || 0).toLocaleString()}
              </div>
              {wallet?.balance <= 1000 && <div style={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>Low balance</div>}
            </div>
          )}
        </div>

        {/* Credit form */}
        <form onSubmit={creditWallet} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20, background: '#f0fdf4', borderRadius: 10, padding: '14px 16px', border: '1px solid #bbf7d0' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', width: '100%', marginBottom: 2 }}>Credit wallet (manual top-up)</div>
          <input placeholder="Amount (₦)" value={creditForm.amount} onChange={e => setCreditForm(f => ({ ...f, amount: e.target.value }))} style={si.inp} required type="number" min="1" />
          <input placeholder="Description (optional)" value={creditForm.description} onChange={e => setCreditForm(f => ({ ...f, description: e.target.value }))} style={{ ...si.inp, flex: 2 }} />
          <button disabled={crediting || !creditForm.amount} style={{ padding: '8px 18px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: crediting || !creditForm.amount ? 0.6 : 1 }}>
            {crediting ? 'Crediting…' : 'Credit'}
          </button>
        </form>

        {/* Recent wallet transactions */}
        {walletTxs.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr>{['Time','Description','Type','Amount','Balance After'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>
              {walletTxs.map((tx, i) => (
                <tr key={tx._id} style={{ background: i % 2 ? '#fafafa' : '#fff' }}>
                  <td style={{ ...s.td, fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>{new Date(tx.createdAt).toLocaleString()}</td>
                  <td style={s.td}>{tx.description || '—'}{tx.freeQuota && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: '#0ea5e9', background: '#e0f2fe', padding: '1px 6px', borderRadius: 8 }}>FREE</span>}</td>
                  <td style={s.td}><span style={{ fontSize: 11, fontWeight: 700, color: TX_COLOR[tx.type] || '#64748b', background: `${TX_COLOR[tx.type]}18`, padding: '2px 8px', borderRadius: 10 }}>{TX_LABEL[tx.type] || tx.type}</span></td>
                  <td style={{ ...s.td, fontWeight: 700, color: tx.type === 'charge' ? '#dc2626' : '#16a34a' }}>{tx.type === 'charge' ? '-' : '+'}₦{tx.amount.toLocaleString()}</td>
                  <td style={{ ...s.td, color: '#64748b' }}>₦{tx.balanceAfter.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p style={{ color: '#94a3b8', fontSize: 13 }}>No wallet transactions yet.</p>}
      </div>

      {/* API Keys */}
      <div style={s.box}>
        <h3 style={s.boxTitle}>API Keys</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>{['Label', 'Key', 'Status', 'Last Used', 'Created'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {client.keys?.map((k) => (
              <tr key={k._id}>
                <td style={s.td}>{k.label}</td>
                <td style={s.td}><code style={{ fontSize: 11 }}>{k.key}</code></td>
                <td style={s.td}>
                  <span style={{ color: k.isActive ? '#16a34a' : '#dc2626', fontWeight: 600 }}>{k.isActive ? 'Active' : 'Revoked'}</span>
                </td>
                <td style={s.td}>{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : 'Never'}</td>
                <td style={s.td}>{new Date(k.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recent logs */}
      <div style={s.box}>
        <h3 style={s.boxTitle}>Recent Requests</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>{['Endpoint', 'Status', 'Response Time', 'Time'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {client.recentLogs?.map((r) => (
              <tr key={r._id}>
                <td style={s.td}><code style={{ fontSize: 12 }}>{r.endpoint}</code></td>
                <td style={s.td}><span style={{ color: r.statusCode < 400 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>{r.statusCode}</span></td>
                <td style={s.td}>{r.responseTimeMs}ms</td>
                <td style={s.td}>{new Date(r.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '1.25rem 1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 26, fontWeight: 700, color: color || '#0f172a' }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

const si = {
  inp: { padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, flex: 1, minWidth: 120, outline: 'none' },
  sel: { padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, background: '#fff', cursor: 'pointer' },
};

const s = {
  back: { background: 'none', border: 'none', color: '#6d28d9', cursor: 'pointer', fontSize: 14, fontWeight: 600, padding: 0, marginBottom: 20 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  h1: { fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 },
  sub: { color: '#64748b', fontSize: 14, marginTop: 4 },
  badge: { padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  btn: { color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  sectionLabel: { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  statRow: { display: 'grid', gap: 16 },
  box: { background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: 20 },
  boxTitle: { fontSize: 15, fontWeight: 600, color: '#0f172a', marginTop: 0, marginBottom: 16 },
  th: { textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600 },
  td: { padding: '10px 12px', borderBottom: '1px solid #f1f5f9', color: '#334155' },
};
