import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import api from '../services/api';
import toast from 'react-hot-toast';

function isStale(statement) {
  if (!statement) return false;
  const endDateStr = statement.result?.metaData?.endDate;
  const ref = endDateStr ? new Date(endDateStr) : new Date(statement.createdAt);
  if (isNaN(ref.getTime())) return false;
  return (Date.now() - ref.getTime()) > 90 * 24 * 60 * 60 * 1000;
}

const GRADE_COLOR = { A: '#16a34a', B: '#0ea5e9', C: '#f59e0b', D: '#ef4444', E: '#7f1d1d' };
const GRADE_BG   = { A: '#dcfce7', B: '#e0f2fe', C: '#fef3c7', D: '#fee2e2', E: '#fce7f3' };
const COLORS = ['#0ea5e9', '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4'];
const fmt  = (v) => v !== undefined && v !== null ? Number(v).toLocaleString() : '—';
const fmtN = (v, dp = 2) => v !== undefined && v !== null ? Number(v).toFixed(dp) : '—';
const pct  = (v) => v !== undefined && v !== null ? `${(Number(v) * 100).toFixed(1)}%` : '—';

const BUCKET_KEYS = ['0-1000', '1000-10000', '10000-100000', '100000-500000', '500000-1000000', '1000000+'];

export default function StatementDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [statement, setStatement] = useState(null);
  const [reanalyzing, setReanalyzing] = useState(false);
  const fileRef = useRef(null);

  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    api.get(`/api/statements/${id}`)
      .then(({ data }) => setStatement(data))
      .catch((err) => {
        if (err?.response?.status === 401) navigate('/login');
        else setLoadError(true);
      });
  }, [id]);

  async function handleReanalyze(file) {
    if (!file) return;
    setReanalyzing(true);
    try {
      const form = new FormData();
      form.append('statement', file);
      const { data } = await api.post(`/api/statements/${id}/reanalyze`, form);
      setStatement(prev => ({ ...prev, result: data, status: 'success' }));
      toast.success('Statement re-analysed successfully');
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Re-analysis failed');
    } finally {
      setReanalyzing(false);
    }
  }

  if (loadError) return <p style={{ color: '#dc2626', padding: '2rem' }}>Failed to load statement. Please go back and try again.</p>;
  if (!statement) return <p style={{ color: '#94a3b8', padding: '2rem' }}>Loading…</p>;

  const d = statement.result;
  if (!d) return (
    <div style={{ padding: '2rem' }}>
      <button onClick={() => navigate('/dashboard')} style={s.back}>← Back</button>
      <div style={{ background: '#fee2e2', borderRadius: 10, padding: '1rem 1.25rem', color: '#dc2626', marginTop: 16 }}>
        This analysis failed. Please retry by uploading the statement again.
      </div>
    </div>
  );

  const risk       = d.overallRiskScore || {};
  const cashFlow   = d.cashFlowAnalysis || {};
  const income     = d.incomeSourceAnalysis || {};
  const spending   = d.spendingPatterns || {};
  const debt       = d.debtServicing || {};
  const sweep      = d.account_sweep_analysis || {};
  const expense    = d.expenseAnalysis || {};
  const behavioral = d.behavioralAnalysis || {};
  const meta       = d.metaData || {};
  const txRanges   = d.transactionRanges || {};
  const weekly     = d.weeklyTransactionSummary || [];

  const gradeColor = GRADE_COLOR[risk.overallRiskScore] || '#64748b';
  const gradeBg    = GRADE_BG[risk.overallRiskScore] || '#f1f5f9';

  const spendCatData = Object.entries(spending.spendCategory || {})
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: fmtKey(k), value: v }))
    .sort((a, b) => b.value - a.value);

  const monthlyData = (d.monthlyTransactionMetrics?.averageMonthlyCredit || []).map((c) => {
    const deb = (d.monthlyTransactionMetricsDebit?.averageMonthlyDebit || []).find(x => x.month === c.month);
    return { month: c.month.slice(5), credit: c.amount, debit: deb?.amount || 0 };
  });

  const scoreData = Object.entries(risk.scoreBreakdown || {}).map(([k, v]) => ({ name: fmtKey(k), score: v }));

  // Parse transaction ranges — handles {credit_range:{min,max,avg,"0-1000":N,...}, debit_range:{...}} shape
  const parsedRanges = Object.entries(txRanges).map(([label, obj]) => {
    if (typeof obj !== 'object' || obj === null) return null;
    const buckets = BUCKET_KEYS.filter(k => obj[k] !== undefined).map(k => ({ label: k, count: obj[k] }));
    const totalCount = buckets.reduce((s, b) => s + (b.count || 0), 0);
    return { label, min: obj.min, max: obj.max, average: obj.average, buckets, totalCount };
  }).filter(Boolean);

  // Income composition
  const comp = income.incomeComposition || {};
  const incomeCompData = [
    comp.primaryIncomePercentage > 0 && { name: 'Primary', value: comp.primaryIncomePercentage, color: '#0ea5e9' },
    comp.gigIncomePercentage > 0 && { name: 'Gig', value: comp.gigIncomePercentage, color: '#6366f1' },
    comp.otherIncomePercentage > 0 && { name: 'Other', value: comp.otherIncomePercentage, color: '#10b981' },
  ].filter(Boolean);

  // Expense breakdown
  const expBreakdown = Object.entries(expense.expenseBreakdown || {})
    .map(([k, v]) => ({ name: k, value: v }))
    .sort((a, b) => b.value - a.value);
  const totalExpenses = expense.totalExpenses || 0;

  return (
    <div style={{ padding: '0 0 3rem' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button onClick={() => navigate('/dashboard')} style={s.back}>← Back to analyses</button>
        <button onClick={async () => { const { exportStatementPDF } = await import('../services/exportPDF'); exportStatementPDF(statement); }} style={s.exportBtn}>Export PDF</button>
        <input ref={fileRef} type="file" accept=".pdf,.xlsx,.xls,.csv,.docx" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) handleReanalyze(e.target.files[0]); e.target.value = ''; }} />
        <button onClick={() => fileRef.current?.click()} disabled={reanalyzing} style={{ ...s.exportBtn, background: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0' }}>
          {reanalyzing ? 'Re-analysing…' : 'Re-analyse'}
        </button>
      </div>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div style={s.headerCard}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {statement.accountName && <Chip>{statement.accountName}</Chip>}
            {statement.email && <Chip>{statement.email}</Chip>}
            {(statement.bankName || meta.bank) && <Chip style={{ textTransform: 'capitalize' }}>{statement.bankName || meta.bank}</Chip>}
            {meta.accountNumber && <Chip>Acct: {meta.accountNumber}</Chip>}
            {meta.startDate && <Chip>{meta.startDate} → {meta.endDate}</Chip>}
            {income.monthPeriod && <Chip>{income.monthPeriod}-month period</Chip>}
            {isStale(statement)
              ? <Chip style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d', fontWeight: 700 }}>⚠ Stale Statement</Chip>
              : <Chip style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', fontWeight: 700 }}>✓ Current</Chip>
            }
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 4 }}>{risk.recommendation || 'Analysis Complete'}</div>
          <div style={{ fontSize: 13, color: '#94a3b8' }}>Analysed {new Date(statement.createdAt).toLocaleString()}</div>

          {/* Key metrics row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 20 }}>
            <KPITile label="Total Inflow"   value={`₦${fmt(cashFlow.totalCashInflow)}`}   color="#34d399" />
            <KPITile label="Total Outflow"  value={`₦${fmt(cashFlow.totalCashOutflow)}`}  color="#f87171" />
            <KPITile label="Net Difference" value={`₦${fmt(Math.abs(cashFlow.CashFlowDifference))}`} color={cashFlow.CashFlowDifference >= 0 ? '#34d399' : '#f87171'} sub={cashFlow.cashFlowStatus} />
            <KPITile label="Monthly Avg Income" value={`₦${fmt(income.monthlyAverageIncome)}`} color="#60a5fa" />
            {risk.affordability != null && <KPITile label="Affordability" value={`₦${fmt(risk.affordability)}`} color="#a78bfa" />}
            {income.closingBalance != null && <KPITile label="Closing Balance" value={`₦${fmt(income.closingBalance)}`} color="#fbbf24" />}
          </div>
        </div>
        <div style={{ textAlign: 'center', background: gradeBg, borderRadius: 14, padding: '1.25rem 1.75rem', minWidth: 130, marginLeft: 24 }}>
          <div style={{ fontSize: 56, fontWeight: 900, color: gradeColor, lineHeight: 1 }}>{risk.overallRiskScore || '—'}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: gradeColor, textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>Risk Grade</div>
          {risk.creditScore != null && <>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', marginTop: 12 }}>{fmtN(risk.creditScore, 1)}</div>
            <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Credit Score</div>
          </>}
        </div>
      </div>

      {/* ── Stale statement warning ──────────────────────────────────────── */}
      {isStale(statement) && (() => {
        const endDateStr = statement.result?.metaData?.endDate;
        const ref = endDateStr ? new Date(endDateStr) : new Date(statement.createdAt);
        const daysOld = Math.floor((Date.now() - ref.getTime()) / (24 * 60 * 60 * 1000));
        return (
          <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: '#92400e' }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <div>
              <strong>Stale bank statement ({daysOld} days old)</strong>
              <span style={{ marginLeft: 8 }}>{endDateStr ? `Statement period ended ${ref.toLocaleDateString()}` : `Statement analysed ${ref.toLocaleDateString()}`} — this statement may not reflect the borrower's current financial position. Consider requesting a more recent statement.</span>
            </div>
          </div>
        );
      })()}

      {/* ── Score Breakdown ───────────────────────────────────────────────── */}
      {scoreData.length > 0 && (
        <Section title="Score Breakdown">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {scoreData.map(({ name, score }) => (
              <div key={name} style={{ ...s.card, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: score >= 20 ? '#16a34a' : score >= 12 ? '#f59e0b' : '#ef4444' }}>{fmtN(score, 1)}</div>
                <div style={{ fontSize: 12, color: '#64748b', margin: '4px 0 8px' }}>{name}</div>
                <div style={{ background: '#f1f5f9', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                  <div style={{ height: 6, borderRadius: 4, width: `${Math.min((score / 25) * 100, 100)}%`, background: score >= 20 ? '#16a34a' : score >= 12 ? '#f59e0b' : '#ef4444' }} />
                </div>
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>/ 25</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Monthly Credit vs Debit ───────────────────────────────────────── */}
      {monthlyData.length > 0 && (
        <Section title="Monthly Credit vs Debit">
          <div style={s.card}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyData} barCategoryGap="30%">
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => `₦${Number(v).toLocaleString()}`} />
                <Legend />
                <Bar dataKey="credit" name="Credit" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                <Bar dataKey="debit"  name="Debit"  fill="#f87171" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
      )}

      {/* ── Transaction Ranges ────────────────────────────────────────────── */}
      {parsedRanges.length > 0 && (
        <Section title="Transaction Ranges">
          <div style={{ display: 'grid', gridTemplateColumns: parsedRanges.length > 1 ? '1fr 1fr' : '1fr', gap: 16 }}>
            {parsedRanges.map((range, ri) => {
              const color = ri === 0 ? '#0ea5e9' : '#6366f1';
              return (
                <div key={range.label} style={{ ...s.card, borderTop: `3px solid ${color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: 0.5 }}>{fmtKey(range.label)}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{fmt(range.totalCount)} transactions</div>
                  </div>

                  {/* Stats row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
                    {[['Min', range.min], ['Avg', range.average], ['Max', range.max]].map(([lbl, val]) => (
                      <div key={lbl} style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 3 }}>{lbl}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{val != null ? `₦${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}</div>
                      </div>
                    ))}
                  </div>

                  {/* Stacked bar */}
                  {range.totalCount > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }}>Count Distribution</div>
                      <div style={{ display: 'flex', height: 10, borderRadius: 99, overflow: 'hidden', gap: 1 }}>
                        {range.buckets.map((b, bi) => {
                          const w = (b.count / range.totalCount) * 100;
                          return w > 0 ? <div key={b.label} title={`${b.label}: ${b.count} (${w.toFixed(1)}%)`} style={{ width: `${w}%`, background: COLORS[bi % COLORS.length] }} /> : null;
                        })}
                      </div>
                    </div>
                  )}

                  {/* Bucket table */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
                    <thead>
                      <tr>
                        {['Bucket', 'Count', 'Share'].map(h => (
                          <th key={h} style={{ padding: '6px 8px', textAlign: h === 'Bucket' ? 'left' : 'right', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {range.buckets.map((b, bi) => {
                        const sharePct = range.totalCount > 0 ? (b.count / range.totalCount) * 100 : 0;
                        return (
                          <tr key={b.label} style={{ borderBottom: '1px solid #f8fafc' }}>
                            <td style={{ padding: '7px 8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{ width: 8, height: 8, borderRadius: 2, background: COLORS[bi % COLORS.length], flexShrink: 0 }} />
                                <span style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>₦{b.label}</span>
                              </div>
                            </td>
                            <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{b.count}</td>
                            <td style={{ padding: '7px 8px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                                <div style={{ width: 40, height: 4, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                                  <div style={{ width: `${sharePct}%`, height: '100%', background: COLORS[bi % COLORS.length] }} />
                                </div>
                                <span style={{ fontSize: 11, color: '#475569', minWidth: 32, textAlign: 'right' }}>{sharePct.toFixed(1)}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                        <td style={{ padding: '7px 8px', fontWeight: 700, fontSize: 11, color: '#64748b' }}>TOTAL</td>
                        <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 800, fontSize: 13 }}>{fmt(range.totalCount)}</td>
                        <td style={{ padding: '7px 8px', textAlign: 'right', fontSize: 11, color: '#64748b' }}>100%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* ── Income Analysis ───────────────────────────────────────────────── */}
      {Object.keys(income).length > 0 && (
        <Section title="Income Analysis">
          {/* Top metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
            <Metric label="Monthly Avg Income"    value={`₦${fmt(income.monthlyAverageIncome)}`} color="#0ea5e9" />
            <Metric label="Total Income"          value={`₦${fmt(income.totalIncome)}`} />
            <Metric label="Stability Score"       value={fmtN(income.incomeStabilityScore, 2)} sub="out of 100" color={income.incomeStabilityScore >= 60 ? '#16a34a' : income.incomeStabilityScore >= 35 ? '#f59e0b' : '#ef4444'} />
            <Metric label="Closing Balance"       value={`₦${fmt(income.closingBalance)}`} />
          </div>

          {/* Flags row */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            {[['Salary Earner', income.isSalaryEarner], ['Gig Worker', income.isGigWorker], ['Other Income', income.hasOtherIncome]].map(([lbl, val]) => (
              <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 8, background: val ? '#f0fdf4' : '#f8fafc', border: `1px solid ${val ? '#bbf7d0' : '#e2e8f0'}`, borderRadius: 10, padding: '8px 14px' }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: val ? '#16a34a' : '#dc2626', flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{lbl}</span>
              </div>
            ))}
          </div>

          {/* Income composition bar */}
          {incomeCompData.length > 0 && (
            <div style={{ ...s.card, marginBottom: 16 }}>
              <div style={s.cardTitle}>Income Composition</div>
              <div style={{ display: 'flex', height: 14, borderRadius: 99, overflow: 'hidden', gap: 2, marginBottom: 10 }}>
                {incomeCompData.map(({ name, value, color }) => (
                  value > 0 ? <div key={name} title={`${name}: ${value.toFixed(1)}%`} style={{ width: `${value}%`, background: color }} /> : null
                ))}
              </div>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                {incomeCompData.map(({ name, value, color }) => (
                  <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
                    <span style={{ fontSize: 12, color: '#475569' }}>{name}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{value.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Income stability per source */}
          {income.incomeStabilityDetails && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
              {Object.entries(income.incomeStabilityDetails).map(([type, detail]) => (
                <div key={type} style={{ ...s.card, borderLeft: `3px solid ${detail.is_stable ? '#16a34a' : detail.score > 0 ? '#f59e0b' : '#94a3b8'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'capitalize' }}>{type} Income</div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: detail.is_stable ? '#dcfce7' : '#fef3c7', color: detail.is_stable ? '#16a34a' : '#d97706' }}>
                      {detail.is_stable ? 'Stable' : 'Unstable'}
                    </span>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: detail.score >= 60 ? '#16a34a' : detail.score >= 30 ? '#f59e0b' : '#ef4444' }}>{fmtN(detail.score, 1)}<span style={{ fontSize: 12, fontWeight: 400, color: '#94a3b8' }}>/100</span></div>
                  {detail.months_present != null && <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{detail.months_present}/{detail.total_months} months present</div>}
                  {detail.flags?.map((f, i) => (
                    <div key={i} style={{ fontSize: 11, color: '#d97706', marginTop: 5 }}>Note: {f}</div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Primary income top sources */}
          {income.primaryIncome?.topSources?.length > 0 && (
            <div style={{ ...s.card, marginBottom: 12 }}>
              <div style={s.cardTitle}>Primary Income Sources</div>
              <SourcesTable sources={income.primaryIncome.topSources} />
            </div>
          )}

          {/* Gig income */}
          {income.gigIncome?.topSources?.length > 0 && (
            <div style={{ ...s.card, marginBottom: 12 }}>
              <div style={s.cardTitle}>Gig / Freelance Income Sources</div>
              <SourcesTable sources={income.gigIncome.topSources} />
            </div>
          )}

          {/* Other cash inflows */}
          {income.otherCashInflows?.topSources?.length > 0 && (
            <div style={s.card}>
              <div style={s.cardTitle}>Other Cash Inflow Sources <span style={{ fontSize: 11, fontWeight: 400, color: '#94a3b8' }}>(non-income credits)</span></div>
              <SourcesTable sources={income.otherCashInflows.topSources} />
            </div>
          )}
        </Section>
      )}

      {/* ── Spending Patterns ─────────────────────────────────────────────── */}
      {Object.keys(spending).length > 0 && (
        <Section title="Spending Patterns">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            {/* Spend by category pie */}
            <div style={s.card}>
              <div style={s.cardTitle}>Spend by Category</div>
              {spendCatData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={spendCatData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label={({ name, percent }) => percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''} labelLine={false}>
                      {spendCatData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => `₦${Number(v).toLocaleString()}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p style={{ color: '#94a3b8', fontSize: 13 }}>No category spend data</p>}
            </div>

            {/* Spend channels */}
            <div style={s.card}>
              <div style={s.cardTitle}>Spend Channels</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                {Object.entries(spending.spendAnalysis || {})
                  .filter(([k, v]) => typeof v === 'number' && v > 0 && k !== 'hasRecurringExpense' && k !== 'averageRecurringExpense')
                  .sort((a, b) => b[1] - a[1])
                  .map(([k, v], i) => (
                    <div key={k}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                        <span style={{ color: '#334155' }}>{fmtKey(k)}</span>
                        <span style={{ fontWeight: 700 }}>₦{fmt(v)}</span>
                      </div>
                      <div style={{ background: '#f1f5f9', borderRadius: 4, height: 5, overflow: 'hidden' }}>
                        <div style={{ height: 5, borderRadius: 4, background: COLORS[i % COLORS.length], width: `${Math.min((v / (cashFlow.totalCashOutflow || 1)) * 100, 100)}%` }} />
                      </div>
                    </div>
                  ))}
                {spending.spendAnalysis?.hasRecurringExpense && (
                  <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>
                    Avg recurring expense: <strong>₦{fmt(spending.spendAnalysis.averageRecurringExpense)}</strong>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Category breakdown table */}
          {spendCatData.length > 0 && (
            <div style={s.card}>
              <div style={s.cardTitle}>Category Breakdown</div>
              <table style={s.table}>
                <thead><tr>{['Category', 'Amount', 'Share of Spend'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {spendCatData.map(({ name, value }, i) => {
                    const total = spendCatData.reduce((s, r) => s + r.value, 0);
                    const share = total > 0 ? (value / total) * 100 : 0;
                    return (
                      <tr key={name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={s.td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 8, height: 8, borderRadius: 2, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                            {name}
                          </div>
                        </td>
                        <td style={{ ...s.td, fontWeight: 700 }}>₦{fmt(value)}</td>
                        <td style={s.td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 5, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                              <div style={{ width: `${share}%`, height: '100%', background: COLORS[i % COLORS.length] }} />
                            </div>
                            <span style={{ fontSize: 12, minWidth: 36, textAlign: 'right', color: '#475569' }}>{share.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      )}

      {/* ── Expense Analysis ──────────────────────────────────────────────── */}
      {Object.keys(expense).length > 0 && (expense.totalExpenses > 0 || expBreakdown.length > 0) && (
        <Section title="Expense Analysis">
          {/* Essential vs Discretionary */}
          {(expense.totalEssentialExpenses != null || expense.totalDiscretionaryExpenses != null) && (
            <div style={{ ...s.card, marginBottom: 16 }}>
              <div style={s.cardTitle}>Essential vs Discretionary</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                <Metric label="Total Expenses"       value={`₦${fmt(expense.totalExpenses)}`} />
                <Metric label="Essential"            value={`₦${fmt(expense.totalEssentialExpenses)}`} color="#0ea5e9" sub={expense.essentialSpendingRatio != null ? `${(expense.essentialSpendingRatio * 100).toFixed(0)}% of expenses` : undefined} />
                <Metric label="Discretionary"        value={`₦${fmt(expense.totalDiscretionaryExpenses)}`} color="#f59e0b" sub={expense.essentialSpendingRatio != null ? `${((1 - expense.essentialSpendingRatio) * 100).toFixed(0)}% of expenses` : undefined} />
              </div>
              {expense.essentialSpendingRatio != null && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Spend Split</div>
                  <div style={{ display: 'flex', height: 12, borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ width: `${expense.essentialSpendingRatio * 100}%`, background: '#0ea5e9' }} title={`Essential: ${(expense.essentialSpendingRatio * 100).toFixed(0)}%`} />
                    <div style={{ flex: 1, background: '#f59e0b' }} title="Discretionary" />
                  </div>
                  <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}><div style={{ width: 8, height: 8, borderRadius: 2, background: '#0ea5e9' }} />Essential</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}><div style={{ width: 8, height: 8, borderRadius: 2, background: '#f59e0b' }} />Discretionary</div>
                  </div>
                </div>
              )}
              {expense.monthlyAverageSpend && (
                <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
                  <div style={{ background: '#f0f9ff', borderRadius: 8, padding: '8px 14px', fontSize: 13 }}>Monthly Avg Essential: <strong>₦{fmt(expense.monthlyAverageSpend.essential)}</strong></div>
                  <div style={{ background: '#fefce8', borderRadius: 8, padding: '8px 14px', fontSize: 13 }}>Monthly Avg Discretionary: <strong>₦{fmt(expense.monthlyAverageSpend.discretionary)}</strong></div>
                </div>
              )}
            </div>
          )}

          {/* Expense breakdown */}
          {expBreakdown.length > 0 && (
            <div style={s.card}>
              <div style={s.cardTitle}>Expense Breakdown</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                {expBreakdown.map(({ name, value }, i) => {
                  const share = totalExpenses > 0 ? (value / totalExpenses) * 100 : 0;
                  return (
                    <div key={name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <div style={{ width: 8, height: 8, borderRadius: 2, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                          <span style={{ color: '#334155' }}>{name}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                          <span style={{ fontWeight: 700 }}>₦{fmt(value)}</span>
                          <span style={{ color: '#94a3b8', minWidth: 36, textAlign: 'right' }}>{share.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div style={{ background: '#f1f5f9', borderRadius: 4, height: 5, overflow: 'hidden' }}>
                        <div style={{ height: 5, borderRadius: 4, background: COLORS[i % COLORS.length], width: `${share}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* High risk flags — show all categories; green = cleared, red = detected */}
          {expense.highRiskExpenseFlags?.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>High-Risk Category Checks</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {expense.highRiskExpenseFlags.map((f, i) => {
                  const flagged = f.amount > 0;
                  return (
                    <div key={i} style={{ background: flagged ? '#fef2f2' : '#f0fdf4', border: `1px solid ${flagged ? '#fca5a5' : '#bbf7d0'}`, borderRadius: 10, padding: '8px 14px', fontSize: 13 }}>
                      <span style={{ fontWeight: 600, color: flagged ? '#dc2626' : '#16a34a' }}>{f.category}</span>
                      {flagged && <span style={{ color: '#64748b', marginLeft: 8 }}>₦{fmt(f.amount)} ({(f.percentageOfIncome * 100).toFixed(1)}% of income)</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Section>
      )}

      {/* ── Debt Servicing ────────────────────────────────────────────────── */}
      {Object.keys(debt).length > 0 && (
        <Section title="Debt Servicing">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
            <Metric label="Total Loan Repayments"   value={`₦${fmt(debt.loanRepayments?.totalAmount)}`} />
            <Metric label="Avg Monthly Repayment"   value={`₦${fmt(debt.loanRepayments?.averageMonthlyRepayment)}`} />
            <Metric label="Number of Payments"      value={debt.loanRepayments?.numberOfPayments ?? '—'} />
            <Metric label="Debt-to-Income Ratio"    value={`${debt.loanRepayments?.DebtToIncomeRatio ?? 0}%`} color={debt.loanRepayments?.DebtToIncomeRatio > 40 ? '#ef4444' : '#16a34a'} />
            <Metric label="DTI Score"               value={fmtN(debt.loanRepayments?.DebtToIncomeScore, 1)} sub="out of 100" />
          </div>
          {debt.recurringCommitments && (
            <div style={{ ...s.card, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                <div style={s.cardTitle}>Recurring Commitments</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  {debt.recurringCommitments.numberOfUniqueCommitments} commitments · ₦{fmt(debt.recurringCommitments.totalAmount)} total · {debt.recurringCommitments.numberOfPayments} payments
                </div>
              </div>
              {debt.recurringCommitments.topRecurringPayments?.length > 0 && (
                <table style={s.table}>
                  <thead><tr>{['Description', 'Avg Monthly', 'Total', 'Frequency'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {debt.recurringCommitments.topRecurringPayments.map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ ...s.td, maxWidth: 300 }}><span style={{ fontSize: 11 }}>{truncate(r.narration, 80)}</span></td>
                        <td style={{ ...s.td, fontWeight: 700 }}>₦{fmt(r.averageMonthlyAmount)}</td>
                        <td style={s.td}>₦{fmt(r.totalAmount)}</td>
                        <td style={s.td}>{r.frequencyMonths} month{r.frequencyMonths !== 1 ? 's' : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </Section>
      )}

      {/* ── Account Sweep Analysis ────────────────────────────────────────── */}
      {Object.keys(sweep).length > 0 && (
        <Section title="Account Sweep Analysis">
          {/* Status banner */}
          <div style={{ background: sweep.accountSweepDetected ? '#fef2f2' : '#f0fdf4', border: `1px solid ${sweep.accountSweepDetected ? '#fca5a5' : '#bbf7d0'}`, borderRadius: 12, padding: '1.25rem 1.5rem', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: sweep.accountSweepDetected ? '#dc2626' : '#16a34a', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: sweep.accountSweepDetected ? '#dc2626' : '#16a34a', marginBottom: 4 }}>{sweep.sweepDescription}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 13, color: '#64748b' }}>
                  <span>Severity: <strong>{sweep.sweepSeverity}</strong></span>
                  <span>Events: <strong>{sweep.numberOfSweepEvents}</strong></span>
                  <span>Swept: <strong>₦{fmt(sweep.totalSweptAmount)}</strong></span>
                  <span>Ratio: <strong>{pct(sweep.overallSweepRatio)}</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* Sweep candidates */}
          {sweep.sweepCandidates?.length > 0 && (
            <div style={{ ...s.card, marginBottom: 16 }}>
              <div style={s.cardTitle}>Sweep Events</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={s.table}>
                  <thead>
                    <tr>{['Credit Date', 'Credit Amount', 'Credit Narration', 'Debit Date', 'Debit Amount', 'Hours Gap', 'Sweep %'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {sweep.sweepCandidates.map((c, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: c.sweep_percentage >= 100 ? '#fff7ed' : '#fff' }}>
                        <td style={s.td}>{c.credit_date?.slice(0, 10)}</td>
                        <td style={{ ...s.td, fontWeight: 700, color: '#16a34a' }}>₦{fmt(c.credit_amount)}</td>
                        <td style={{ ...s.td, maxWidth: 200 }}><span style={{ fontSize: 11 }}>{truncate(c.credit_narration, 60)}</span></td>
                        <td style={s.td}>{c.debit_date?.slice(0, 10)}</td>
                        <td style={{ ...s.td, fontWeight: 700, color: '#ef4444' }}>₦{fmt(c.debit_amount)}</td>
                        <td style={s.td}>{c.time_difference_hours}h</td>
                        <td style={s.td}>
                          <span style={{ fontWeight: 700, color: c.sweep_percentage >= 100 ? '#dc2626' : '#d97706' }}>{fmtN(c.sweep_percentage, 1)}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Monthly sweep analysis */}
          {sweep.monthlySweepAnalysis?.length > 0 && (
            <div style={s.card}>
              <div style={s.cardTitle}>Monthly Sweep Summary</div>
              <table style={s.table}>
                <thead><tr>{['Month', 'Events', 'Swept Amount', 'Incoming', 'Sweep Ratio'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {sweep.monthlySweepAnalysis.map((m, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ ...s.td, fontWeight: 600 }}>{m.month}</td>
                      <td style={s.td}>{m.sweep_count}</td>
                      <td style={{ ...s.td, color: '#ef4444', fontWeight: 700 }}>₦{fmt(m.swept_amount)}</td>
                      <td style={s.td}>₦{fmt(m.incoming_amount)}</td>
                      <td style={s.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 60, height: 5, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(m.sweep_ratio * 100, 100)}%`, height: '100%', background: m.sweep_ratio > 0.3 ? '#ef4444' : '#f59e0b' }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600 }}>{(m.sweep_ratio * 100).toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      )}

      {/* ── Behavioral Insights ───────────────────────────────────────────── */}
      {Object.keys(behavioral).length > 0 && (
        <Section title="Behavioral Insights">
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
            <div style={s.card}>
              <div style={s.cardTitle}>Spending Habits</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                {behavioral.spendingHabits?.map((h, i) => (
                  <span key={i} style={{ background: '#f1f5f9', color: '#475569', fontSize: 12, padding: '5px 12px', borderRadius: 20, display: 'inline-block' }}>{h}</span>
                ))}
              </div>
            </div>
            <div style={s.card}>
              <div style={s.cardTitle}>Savings Behaviour</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>₦{fmt(behavioral.savingsHabits?.totalSaved)}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Saved during period</div>
              {behavioral.savingsHabits?.savingsFrequency && (
                <span style={{ display: 'inline-block', marginTop: 10, background: '#dcfce7', color: '#16a34a', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20 }}>
                  {behavioral.savingsHabits.savingsFrequency} savings
                </span>
              )}
            </div>
          </div>
        </Section>
      )}

      {/* ── Top High-Value Transactions ───────────────────────────────────── */}
      {expense.topHighValueTransactions?.length > 0 && (
        <Section title="Top High-Value Transactions">
          <div style={s.card}>
            <table style={s.table}>
              <thead><tr>{['Date', 'Narration', 'Amount', 'Category'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
              <tbody>
                {expense.topHighValueTransactions.map((t, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ ...s.td, whiteSpace: 'nowrap' }}>{t.date}</td>
                    <td style={{ ...s.td, maxWidth: 320 }}><span style={{ fontSize: 12 }}>{truncate(t.narration, 100)}</span></td>
                    <td style={{ ...s.td, fontWeight: 700, whiteSpace: 'nowrap' }}>₦{fmt(t.amount)}</td>
                    <td style={s.td}><span style={{ background: '#f1f5f9', color: '#475569', fontSize: 11, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>{t.category}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* ── Weekly Summary ────────────────────────────────────────────────── */}
      {weekly.length > 0 && (
        <Section title="Weekly Transaction Summary">
          <div style={s.card}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weekly} barCategoryGap="20%">
                <XAxis dataKey="week_start_date" tick={{ fontSize: 10 }} tickFormatter={v => v?.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => `₦${Number(v).toLocaleString()}`} labelFormatter={v => `Week of ${v}`} />
                <Legend />
                <Bar dataKey="credit_sum" name="Credit" fill="#0ea5e9" radius={[3, 3, 0, 0]} />
                <Bar dataKey="debit_sum"  name="Debit"  fill="#f87171" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div style={{ marginTop: 16, overflowX: 'auto' }}>
              <table style={s.table}>
                <thead><tr>{['Week Start', 'Credit', 'Debit', 'Net'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {weekly.map((w, i) => {
                    const net = (w.credit_sum || 0) - (w.debit_sum || 0);
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 ? '#f8fafc' : '#fff' }}>
                        <td style={{ ...s.td, fontWeight: 600 }}>{w.week_start_date}</td>
                        <td style={{ ...s.td, color: '#16a34a', fontWeight: 600 }}>₦{fmt(w.credit_sum)}</td>
                        <td style={{ ...s.td, color: '#ef4444', fontWeight: 600 }}>₦{fmt(w.debit_sum)}</td>
                        <td style={{ ...s.td, fontWeight: 700, color: net >= 0 ? '#16a34a' : '#ef4444' }}>{net >= 0 ? '+' : ''}₦{fmt(Math.abs(net))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Section>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div style={{ marginTop: 32 }}>
      <h2 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: '0 0 14px', paddingBottom: 8, borderBottom: '2px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</h2>
      {children}
    </div>
  );
}

function Metric({ label, value, color, sub }) {
  return (
    <div style={s.card}>
      <div style={{ fontSize: 20, fontWeight: 800, color: color || '#0f172a' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
      <div style={{ fontSize: 11, color: '#64748b', marginTop: 6, textTransform: 'uppercase', letterSpacing: 0.3, fontWeight: 600 }}>{label}</div>
    </div>
  );
}

function KPITile({ label, value, color, sub }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 16px', minWidth: 140 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: color || '#fff' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Chip({ children, style }) {
  return <span style={{ background: 'rgba(255,255,255,0.15)', color: '#e2e8f0', fontSize: 12, padding: '3px 10px', borderRadius: 20, ...style }}>{children}</span>;
}

function SourcesTable({ sources }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={s.table}>
        <thead><tr>{['Narration', 'Amount', 'Transactions', 'Avg Amount', 'Last Date'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
        <tbody>
          {sources.map((src, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ ...s.td, maxWidth: 280 }}><span style={{ fontSize: 11 }}>{truncate(src.narration, 80)}</span></td>
              <td style={{ ...s.td, fontWeight: 700 }}>₦{fmt(src.totalAmount)}</td>
              <td style={s.td}>{src.transactionCount ?? 1}</td>
              <td style={s.td}>₦{fmt(src.averageAmount)}</td>
              <td style={{ ...s.td, whiteSpace: 'nowrap', color: '#64748b' }}>{src.lastTransactionDate?.slice(0, 10) || src.date?.slice(0, 10) || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function fmtKey(k) {
  return k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()
    .split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function truncate(str, n) {
  if (!str) return '—';
  return str.length > n ? str.slice(0, n) + '…' : str;
}

const s = {
  back:      { background: 'none', border: 'none', color: '#0ea5e9', cursor: 'pointer', fontSize: 14, fontWeight: 600, padding: 0 },
  exportBtn: { background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  headerCard:{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', borderRadius: 14, padding: '1.75rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', color: '#fff', gap: 24 },
  card:      { background: '#fff', borderRadius: 12, padding: '1.25rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' },
  cardTitle: { fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 12 },
  table:     { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th:        { textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid #e2e8f0', color: '#94a3b8', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, whiteSpace: 'nowrap', background: '#f8fafc' },
  td:        { padding: '10px 12px', color: '#334155', verticalAlign: 'middle' },
};
