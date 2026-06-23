const parseBureauSections = require('./parseBureauSections');

function computeScorecard({ latestBVN, latestNIN, latestBureau, latestStatement }) {
  const d = latestStatement?.result || {};
  const risk = d.overallRiskScore || {};
  const cashFlow = d.cashFlowAnalysis || {};
  const income = d.incomeSourceAnalysis || {};
  const debt = d.debtServicing || {};
  const expense = d.expenseAnalysis || {};
  const behavioral = d.behavioralAnalysis || {};

  const bureauSec = latestBureau ? parseBureauSections(latestBureau.result) : null;
  const bureauScoring = bureauSec?.Scoring?.[0];
  const bureauSummaryRaw = bureauSec?.CreditAccountSummary?.[0];
  const bureauDelinq = (bureauSec?.DeliquencyInformation || []).filter(d => d.SubscriberName || d.AccountNo);
  const bureauScore = bureauScoring?.TotalConsumerScore ?? null;
  const bureauScoreNum = bureauScore ? parseInt(bureauScore, 10) : null;

  const sb = risk.scoreBreakdown || {};
  const totalInflow = cashFlow.totalCashInflow || 0;
  const totalOutflow = cashFlow.totalCashOutflow || 0;
  const netCashFlow = totalInflow - totalOutflow;
  const savingsRateNum = totalInflow > 0 ? (netCashFlow / totalInflow) * 100 : null;
  const expenseRatioNum = totalInflow > 0 ? (totalOutflow / totalInflow) * 100 : null;
  const dtiRaw = parseFloat(debt.loanRepayments?.DebtToIncomeRatio) || null;
  const highRiskFlags = (expense.highRiskExpenseFlags || []).filter(f => f.amount > 0);
  const activeArrears = parseInt(bureauSummaryRaw?.TotalAccountarrear || 0);
  const hasJudgement = parseInt(bureauSummaryRaw?.TotalNumberofJudgement || 0) > 0;

  function subGrade(score, max = 25) {
    if (score == null) return null;
    const pct = (score / max) * 100;
    return pct >= 84 ? 'A' : pct >= 64 ? 'B' : pct >= 44 ? 'C' : pct >= 24 ? 'D' : 'E';
  }

  const GRADE_COLOR = { A: 'EXCELLENT', B: 'GOOD', C: 'FAIR', D: 'POOR', E: 'VERY_POOR' };

  return {
    // Statement-derived scores
    riskGrade: risk.overallRiskScore || null,
    riskRecommendation: risk.recommendation || null,
    scoreBreakdown: {
      incomeStability: { score: sb.incomeStability ?? null, grade: subGrade(sb.incomeStability), label: GRADE_COLOR[subGrade(sb.incomeStability)] || null },
      debtServicing:   { score: sb.debtServicing ?? null,   grade: subGrade(sb.debtServicing),   label: GRADE_COLOR[subGrade(sb.debtServicing)] || null },
      spendingBehavior:{ score: sb.spendingBehavior ?? null, grade: subGrade(sb.spendingBehavior), label: GRADE_COLOR[subGrade(sb.spendingBehavior)] || null },
      liquidity:       { score: sb.liquidity ?? null,        grade: subGrade(sb.liquidity),        label: GRADE_COLOR[subGrade(sb.liquidity)] || null },
    },

    // Cash flow
    cashFlow: {
      totalInflow,
      totalOutflow,
      netCashFlow,
      savingsRate: savingsRateNum !== null ? Math.round(savingsRateNum * 10) / 10 : null,
      expenseRatio: expenseRatioNum !== null ? Math.round(expenseRatioNum * 10) / 10 : null,
      monthlyAverageIncome: income.monthlyAverageIncome ?? null,
      isSalaryEarner: income.isSalaryEarner ?? null,
    },

    // Debt
    debtToIncomeRatio: dtiRaw,
    highRiskExpenses: highRiskFlags.map(f => ({ category: f.category || f.merchant, amount: f.amount })),

    // Bureau
    bureau: latestBureau ? {
      score: bureauScoreNum,
      description: bureauScoring?.Description || null,
      activeArrears,
      hasJudgement,
      delinquencyCount: bureauDelinq.length,
      totalOutstanding: parseFloat(bureauSummaryRaw?.TotalOutstandingdebt || 0),
      monthlyInstalment: parseFloat(bureauSummaryRaw?.TotalMonthlyInstalment || 0) || null,
    } : null,

    // Identity
    identity: {
      bvnVerified: !!latestBVN,
      ninVerified: !!latestNIN,
      watchListed: latestBVN?.result?.watchListed === true || latestNIN?.result?.watchListed === true,
    },

    // Behavioural
    behavioural: {
      spendingHabits: behavioral?.spendingHabits || [],
      totalSaved: behavioral?.savingsHabits?.totalSaved ?? null,
      accountSweepDetected: d.account_sweep_analysis?.accountSweepDetected ?? false,
      sweepSeverity: d.account_sweep_analysis?.sweepSeverity || null,
    },

    dataAvailability: {
      bvn: !!latestBVN,
      nin: !!latestNIN,
      bureau: !!latestBureau,
      statement: !!latestStatement,
    },
  };
}

module.exports = computeScorecard;
