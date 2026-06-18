import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import api from '../services/api';

const GRADE_COLOR = { A: '#16a34a', B: '#0ea5e9', C: '#f59e0b', D: '#ef4444', E: '#7f1d1d' };
const SPEND_COLORS = ['#0ea5e9', '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
const fmt = (v) => v !== undefined && v !== null ? Number(v).toLocaleString() : '—';
const pct = (v) => v !== undefined ? `${Number(v * 100).toFixed(1)}%` : '—';

export default function StatementDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [statement, setStatement] = useState(null);

  useEffect(() => {
    api.get(`/api/statements/${id}`).then(({ data }) => setStatement(data)).catch(() => {});
  }, [id]);

  if (!statement) return <p style={{ color: '#94a3b8', padding: '2rem' }}>Loading…</p>;

  const d = statement.result;
  if (!d) return (
    <div>
      <button onClick={() => navigate('/dashboard')} style={s.back}>← Back</button>
      <div style={{ background: '#fee2e2', borderRadius: 10, padding: '1rem 1.25rem', color: '#dc2626' }}>
        This analysis failed. Please retry by uploading the statement again.
      </div>
    </div>
  );

  const risk = d.overallRiskScore || {};
  const cashFlow = d.cashFlowAnalysis || {};
  const income = d.incomeSourceAnalysis || {};
  const spending = d.spendingPatterns || {};
  const debt = d.debtServicing || {};
  const sweep = d.account_sweep_analysis || {};
  const expense = d.expenseAnalysis || {};
  const behavioral = d.behavioralAnalysis || {};
  const meta = d.metaData || {};
  const txRanges = d.transactionRanges || {};
  const weeklySummary = d.weeklyTransactionSummary || [];

  const gradeColor = GRADE_COLOR[risk.overallRiskScore] || '#64748b';

  // Spend category chart data
  const spendCategoryData = Object.entries(spending.spendCategory || {})
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: formatKey(k), value: v }))
    .sort((a, b) => b.value - a.value);

  // Monthly credit/debit chart
  const monthlyData = (d.monthlyTransactionMetrics?.averageMonthlyCredit || []).map((c) => {
    const debit = (d.monthlyTransactionMetricsDebit?.averageMonthlyDebit || []).find(x => x.month === c.month);
    return { month: c.month.slice(5), credit: c.amount, debit: debit?.amount || 0 };
  });

  // Score breakdown chart
  const scoreBreakdownData = Object.entries(risk.scoreBreakdown || {}).map(([k, v]) => ({
    name: formatKey(k), score: v, max: 25,
  }));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button onClick={() => navigate('/dashboard')} style={s.back}>← Back to analyses</button>
        <button
          onClick={async () => {
            const { exportStatementPDF } = await import('../services/exportPDF');
            exportStatementPDF(statement);
          }}
          style={s.exportBtn}
        >⬇ Export PDF</button>
      </div>

      {/* Header */}
      <div style={s.headerCard}>
        <div style={s.headerLeft}>
          <div style={s.metaLine}>
            {statement.accountName && <span style={s.metaChip}>{statement.accountName}</span>}
            {statement.email && <span style={s.metaChip}>{statement.email}</span>}
            {statement.bankName && <span style={{ ...s.metaChip, textTransform: 'capitalize' }}>{statement.bankName}</span>}
            {meta.startDate && <span style={s.metaChip}>{meta.startDate} → {meta.endDate}</span>}
          </div>
          <div style={s.recommendation}>{risk.recommendation || 'Analysis Complete'}</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
            Analysed {new Date(statement.createdAt).toLocaleString()}
          </div>
        </div>
        <div style={s.gradeBox}>
          <div style={{ ...s.grade, color: gradeColor }}>{risk.overallRiskScore || '—'}</div>
          <div style={{ fontSize: 13, color: '#64748b' }}>Risk Grade</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginTop: 8 }}>{risk.creditScore ?? '—'}</div>
          <div style={{ fontSize: 13, color: '#64748b' }}>Credit Score</div>
        </div>
      </div>

      {/* Score Breakdown */}
      {(scoreBreakdownData.length > 0 || risk.affordability != null) && (
        <>
          <SectionTitle>Score Breakdown</SectionTitle>
          <div style={s.row4}>
            {scoreBreakdownData.map(({ name, score }) => (
              <div key={name} style={s.scoreCard}>
                <div style={s.scoreValue}>{score}</div>
                <div style={s.scoreLabel}>{name}</div>
                <div style={s.scoreBar}>
                  <div style={{ ...s.scoreBarFill, width: `${Math.min((score / 25) * 100, 100)}%`, background: score >= 20 ? '#16a34a' : score >= 12 ? '#f59e0b' : '#ef4444' }} />
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>out of 25</div>
              </div>
            ))}
            {risk.affordability != null && (
              <div style={s.scoreCard}>
                <div style={{ ...s.scoreValue, color: '#0ea5e9' }}>₦{fmt(risk.affordability)}</div>
                <div style={s.scoreLabel}>Affordability</div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Cash Flow */}
      {(cashFlow.totalCashInflow != null || cashFlow.totalCashOutflow != null) && (
        <>
          <SectionTitle>Cash Flow Analysis</SectionTitle>
          <div style={s.row3}>
            <MetricCard label="Total Inflow" value={`₦${fmt(cashFlow.totalCashInflow)}`} color="#16a34a" />
            <MetricCard label="Total Outflow" value={`₦${fmt(cashFlow.totalCashOutflow)}`} color="#ef4444" />
            <MetricCard
              label="Cash Flow Difference"
              value={`₦${fmt(Math.abs(cashFlow.CashFlowDifference))}`}
              sub={cashFlow.cashFlowStatus}
              color={cashFlow.CashFlowDifference >= 0 ? '#16a34a' : '#ef4444'}
            />
          </div>
        </>
      )}

      {/* Monthly trend chart */}
      {monthlyData.length > 0 && (
        <div style={s.chartCard}>
          <div style={s.chartTitle}>Monthly Credit vs Debit</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} barCategoryGap="30%">
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => `₦${Number(v).toLocaleString()}`} />
              <Legend />
              <Bar dataKey="credit" name="Credit" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              <Bar dataKey="debit" name="Debit" fill="#f87171" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Weekly Transaction Summary */}
      {weeklySummary.length > 0 && (
        <div style={s.chartCard}>
          <div style={s.chartTitle}>Weekly Transaction Summary</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weeklySummary} barCategoryGap="30%">
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => `₦${Number(v).toLocaleString()}`} />
              <Legend />
              <Bar dataKey="totalCredit" name="Credit" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              <Bar dataKey="totalDebit" name="Debit" fill="#f87171" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div style={s.tableWrapInner}>
            <table style={s.table}>
              <thead>
                <tr>{['Week', 'Total Credit', 'Total Debit', 'Net', 'Transactions'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {weeklySummary.map((w, i) => {
                  const net = (w.totalCredit || 0) - (w.totalDebit || 0);
                  return (
                    <tr key={i} style={{ background: i % 2 ? '#f8fafc' : '#fff' }}>
                      <td style={s.td}>{w.week}</td>
                      <td style={s.td}>₦{fmt(w.totalCredit)}</td>
                      <td style={s.td}>₦{fmt(w.totalDebit)}</td>
                      <td style={{ ...s.td, fontWeight: 600, color: net >= 0 ? '#16a34a' : '#ef4444' }}>
                        {net >= 0 ? '+' : ''}₦{fmt(Math.abs(net))}
                      </td>
                      <td style={s.td}>{w.transactionCount ?? w.count ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transaction Ranges */}
      {Object.keys(txRanges).length > 0 && (
        <>
          <SectionTitle>Transaction Ranges</SectionTitle>
          <div style={s.row2}>
            {Object.entries(txRanges).map(([range, data]) => {
              const count = typeof data === 'object' ? (data.count ?? data.transactionCount ?? data.frequency) : data;
              const amount = typeof data === 'object' ? (data.totalAmount ?? data.amount) : null;
              return (
                <div key={range} style={s.metricCard}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>{range}</div>
                  {count != null && <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{count} <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 400 }}>transactions</span></div>}
                  {amount != null && <div style={{ fontSize: 13, color: '#0ea5e9', marginTop: 4 }}>₦{fmt(amount)}</div>}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Income */}
      {Object.keys(income).length > 0 && (
        <>
          <SectionTitle>Income Analysis</SectionTitle>
          <div style={s.row3}>
            <MetricCard label="Monthly Avg Income" value={`₦${fmt(income.monthlyAverageIncome)}`} />
            <MetricCard label="Total Income" value={`₦${fmt(income.totalIncome)}`} />
            <MetricCard label="Income Stability Score" value={income.incomeStabilityScore ?? '—'} />
          </div>
          <div style={{ ...s.row3, marginTop: 12 }}>
            <FlagCard label="Salary Earner" value={income.isSalaryEarner} />
            <FlagCard label="Gig Worker" value={income.isGigWorker} />
            <FlagCard label="Other Income" value={income.hasOtherIncome} />
          </div>
        </>
      )}

      {/* Top income sources */}
      {income.otherCashInflows?.topSources?.length > 0 && (
        <div style={s.tableCard}>
          <div style={s.chartTitle}>Top Cash Inflow Sources</div>
          <table style={s.table}>
            <thead><tr>{['Narration', 'Total Amount', 'Transactions', 'Avg Amount'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>
              {income.otherCashInflows.topSources.map((src, i) => (
                <tr key={i}>
                  <td style={s.td}><span style={{ fontSize: 12 }}>{src.narration}</span></td>
                  <td style={s.td}>₦{fmt(src.totalAmount)}</td>
                  <td style={s.td}>{src.transactionCount}</td>
                  <td style={s.td}>₦{fmt(src.averageAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Spending */}
      {Object.keys(spending).length > 0 && (
        <>
          <SectionTitle>Spending Patterns</SectionTitle>
          <div style={s.row2}>
            <div style={s.chartCard}>
              <div style={s.chartTitle}>Spend by Category</div>
              {spendCategoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={spendCategoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {spendCategoryData.map((_, i) => <Cell key={i} fill={SPEND_COLORS[i % SPEND_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => `₦${Number(v).toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p style={{ color: '#94a3b8', fontSize: 13 }}>No spend data</p>}
            </div>
            <div style={s.chartCard}>
              <div style={s.chartTitle}>Spend Channels</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                {Object.entries(spending.spendAnalysis || {})
                  .filter(([k, v]) => v > 0 && k !== 'hasRecurringExpense')
                  .sort((a, b) => b[1] - a[1])
                  .map(([k, v], i) => (
                    <div key={k}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                        <span style={{ color: '#334155' }}>{formatKey(k)}</span>
                        <span style={{ fontWeight: 600 }}>₦{fmt(v)}</span>
                      </div>
                      <div style={{ background: '#f1f5f9', borderRadius: 4, height: 6 }}>
                        <div style={{ height: 6, borderRadius: 4, background: SPEND_COLORS[i % SPEND_COLORS.length], width: `${Math.min((v / (cashFlow.totalCashOutflow || 1)) * 100, 100)}%` }} />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Debt Servicing */}
      {Object.keys(debt).length > 0 && (
        <>
          <SectionTitle>Debt Servicing</SectionTitle>
          <div style={s.row3}>
            <MetricCard label="Total Loan Repayments" value={`₦${fmt(debt.loanRepayments?.totalAmount)}`} />
            <MetricCard label="Avg Monthly Repayment" value={`₦${fmt(debt.loanRepayments?.averageMonthlyRepayment)}`} />
            <MetricCard label="Debt-to-Income Ratio" value={`${debt.loanRepayments?.DebtToIncomeRatio ?? 0}%`} />
          </div>
          {debt.recurringCommitments?.topRecurringPayments?.length > 0 && (
            <div style={{ ...s.tableCard, marginTop: 12 }}>
              <div style={s.chartTitle}>Recurring Commitments</div>
              <table style={s.table}>
                <thead><tr>{['Description', 'Avg Monthly', 'Total', 'Frequency'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {debt.recurringCommitments.topRecurringPayments.map((r, i) => (
                    <tr key={i}>
                      <td style={s.td}><span style={{ fontSize: 12 }}>{r.narration}</span></td>
                      <td style={s.td}>₦{fmt(r.averageMonthlyAmount)}</td>
                      <td style={s.td}>₦{fmt(r.totalAmount)}</td>
                      <td style={s.td}>{r.frequencyMonths} months</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Account Sweep */}
      {Object.keys(sweep).length > 0 && (
        <>
          <SectionTitle>Account Sweep Analysis</SectionTitle>
          <div style={{ ...s.sweepCard, borderColor: sweep.accountSweepDetected ? '#fca5a5' : '#bbf7d0', background: sweep.accountSweepDetected ? '#fef2f2' : '#f0fdf4' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 28 }}>{sweep.accountSweepDetected ? '⚠️' : '✅'}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: sweep.accountSweepDetected ? '#dc2626' : '#16a34a' }}>
                  {sweep.sweepDescription}
                </div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                  Severity: <strong>{sweep.sweepSeverity}</strong> · Events: <strong>{sweep.numberOfSweepEvents}</strong> · Swept: <strong>₦{fmt(sweep.totalSweptAmount)}</strong> · Sweep Ratio: <strong>{pct(sweep.overallSweepRatio)}</strong>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Behavioral */}
      {Object.keys(behavioral).length > 0 && (
        <>
          <SectionTitle>Behavioral Insights</SectionTitle>
          <div style={s.row2}>
            <div style={s.tableCard}>
              <div style={s.chartTitle}>Spending Habits</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {behavioral.spendingHabits?.map((h, i) => (
                  <span key={i} style={s.habitChip}>{h}</span>
                ))}
              </div>
            </div>
            <div style={s.tableCard}>
              <div style={s.chartTitle}>Savings</div>
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 26, fontWeight: 700, color: '#0f172a' }}>₦{fmt(behavioral.savingsHabits?.totalSaved)}</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Total saved during period</div>
                {behavioral.savingsHabits?.savingsFrequency && (
                  <div style={{ marginTop: 12, fontSize: 13 }}>
                    <span style={{ ...s.habitChip, background: '#dcfce7', color: '#16a34a' }}>
                      {behavioral.savingsHabits.savingsFrequency} savings
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Top transactions */}
      {expense.topHighValueTransactions?.length > 0 && (
        <>
          <SectionTitle>Top High-Value Transactions</SectionTitle>
          <div style={s.tableCard}>
            <table style={s.table}>
              <thead><tr>{['Date', 'Narration', 'Amount', 'Category'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
              <tbody>
                {expense.topHighValueTransactions.map((t, i) => (
                  <tr key={i}>
                    <td style={s.td}>{t.date}</td>
                    <td style={s.td}><span style={{ fontSize: 12 }}>{t.narration}</span></td>
                    <td style={s.td}>₦{fmt(t.amount)}</td>
                    <td style={s.td}><span style={s.habitChip}>{t.category}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Risk flags */}
      {expense.highRiskExpenseFlags?.length > 0 && (
        <>
          <SectionTitle>Risk Flags</SectionTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {expense.highRiskExpenseFlags.map((f, i) => (
              <div key={i} style={{ ...s.sweepCard, borderColor: '#fca5a5', background: '#fef2f2', padding: '0.75rem 1rem' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#dc2626' }}>{f.category}</span>
                {f.amount > 0 && <span style={{ fontSize: 13, color: '#64748b', marginLeft: 8 }}>₦{fmt(f.amount)}</span>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SectionTitle({ children }) {
  return <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '28px 0 14px', borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>{children}</h2>;
}

function MetricCard({ label, value, color, sub }) {
  return (
    <div style={s.metricCard}>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || '#0f172a' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: color || '#64748b', marginTop: 2 }}>{sub}</div>}
      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{label}</div>
    </div>
  );
}

function FlagCard({ label, value }) {
  return (
    <div style={{ ...s.metricCard, display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 20 }}>{value ? '✅' : '❌'}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{label}</span>
    </div>
  );
}

function formatKey(k) {
  return k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()
    .split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

const s = {
  back: { background: 'none', border: 'none', color: '#0ea5e9', cursor: 'pointer', fontSize: 14, fontWeight: 600, padding: 0 },
  exportBtn: { background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  headerCard: { background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', borderRadius: 14, padding: '1.75rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4, color: '#fff' },
  headerLeft: { flex: 1 },
  metaLine: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  metaChip: { background: 'rgba(255,255,255,0.15)', color: '#e2e8f0', fontSize: 12, padding: '3px 10px', borderRadius: 20 },
  recommendation: { fontSize: 22, fontWeight: 800, color: '#fff' },
  gradeBox: { textAlign: 'center', background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '1rem 1.5rem', minWidth: 120 },
  grade: { fontSize: 52, fontWeight: 900, lineHeight: 1 },
  row4: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 4 },
  row3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  scoreCard: { background: '#fff', borderRadius: 12, padding: '1rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', textAlign: 'center' },
  scoreValue: { fontSize: 26, fontWeight: 800, color: '#0f172a' },
  scoreLabel: { fontSize: 12, color: '#64748b', marginTop: 4 },
  scoreBar: { background: '#f1f5f9', borderRadius: 4, height: 6, margin: '8px 0 0', overflow: 'hidden' },
  scoreBarFill: { height: 6, borderRadius: 4, transition: 'width 0.3s' },
  metricCard: { background: '#fff', borderRadius: 12, padding: '1.25rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' },
  chartCard: { background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' },
  chartTitle: { fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 12 },
  tableCard: { background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' },
  td: { padding: '10px 12px', borderBottom: '1px solid #f1f5f9', color: '#334155', maxWidth: 300 },
  sweepCard: { border: '1px solid', borderRadius: 12, padding: '1.25rem 1.5rem' },
  tableWrapInner: { marginTop: 16, overflowX: 'auto' },
  habitChip: { background: '#f1f5f9', color: '#475569', fontSize: 12, padding: '4px 10px', borderRadius: 20, display: 'inline-block' },
};
