const parseBureauSections = require('./parseBureauSections');

function detectDiscrepancies(bvnData, ninData) {
  const issues = [];
  if (!bvnData || !ninData) return issues;
  const normalize = s => (s || '').toString().trim().toLowerCase();
  const normalizeName = s => normalize(s).replace(/[^a-z]/g, '');

  const bvnFull = normalizeName(`${bvnData.firstName || ''} ${bvnData.lastName || ''}`);
  const ninFull = normalizeName(`${ninData.firstName || ''} ${ninData.lastName || ''}`);
  if (bvnFull && ninFull && bvnFull !== ninFull) {
    const similarity = bvnFull.split('').filter(c => ninFull.includes(c)).length / Math.max(bvnFull.length, ninFull.length);
    issues.push({ field: 'Name', bvn: `${bvnData.firstName} ${bvnData.lastName}`, nin: `${ninData.firstName} ${ninData.lastName}`, severity: similarity < 0.6 ? 'high' : 'medium' });
  }
  const bvnDob = normalize(bvnData.dateOfBirth || '').replace(/[^0-9]/g, '');
  const ninDob = normalize(ninData.dateOfBirth || '').replace(/[^0-9]/g, '');
  if (bvnDob && ninDob && bvnDob !== ninDob) {
    issues.push({ field: 'Date of Birth', bvn: bvnData.dateOfBirth, nin: ninData.dateOfBirth, severity: 'high' });
  }
  const bvnGender = normalize(bvnData.gender || '')[0];
  const ninGender = normalize(ninData.gender || '')[0];
  if (bvnGender && ninGender && bvnGender !== ninGender) {
    issues.push({ field: 'Gender', bvn: bvnData.gender, nin: ninData.gender, severity: 'high' });
  }
  if (bvnData.watchListed || ninData.watchListed) {
    issues.push({ field: 'Watch Listed', bvn: String(!!bvnData.watchListed), nin: String(!!ninData.watchListed), severity: 'high' });
  }
  return issues;
}

function computeLoanReview({ latestBVN, latestNIN, latestBureau, latestStatement, proposedLoanAmount = 0, loanTenor = 0, annualRate = 0 }) {
  const flags = [];
  const conditions = [];
  const analysis = {};

  const bvnData = latestBVN?.result || null;
  const ninData = latestNIN?.result || null;
  const discrepancies = bvnData && ninData ? detectDiscrepancies(bvnData, ninData) : [];

  const bureauSec = latestBureau ? parseBureauSections(latestBureau.result) : null;
  const bureauScoring = bureauSec?.Scoring?.[0];
  const bureauSummary = bureauSec?.CreditAccountSummary?.[0];
  const bureauAgreements = bureauSec?.CreditAgreementSummary || [];
  const bureauDelinquency = (bureauSec?.DeliquencyInformation || []).filter(d => d.SubscriberName || d.AccountNo);

  const d = latestStatement?.result || {};
  const risk = d.overallRiskScore || {};
  const cashFlow = d.cashFlowAnalysis || {};
  const income = d.incomeSourceAnalysis || {};
  const debt = d.debtServicing || {};
  const behavioral = d.behavioralAnalysis || {};
  const sweep = d.account_sweep_analysis || {};

  // ── Identity Integrity ───────────────────────────────────────────────────
  let identityScore = 50, identityStatus = 'WARN', identityNotes = 'No identity verification data available.';
  const identityReasons = [];
  const bvnVerified = !!latestBVN;
  const ninVerified = !!latestNIN;
  const watchlisted = bvnData?.watchListed === true || ninData?.watchListed === true;
  const highDisc = discrepancies.filter(d => d.severity === 'high');
  const mediumDisc = discrepancies.filter(d => d.severity === 'medium');

  if (watchlisted) {
    identityScore = 0; identityStatus = 'FAIL';
    identityNotes = 'Customer appears on government watchlist — loan application cannot proceed.';
    identityReasons.push('Watchlist flag detected on BVN or NIN record. Automatic disqualifier.');
    flags.push('Customer is flagged as watchlisted on government records.');
  } else {
    if (bvnVerified && ninVerified) { identityScore = 90; identityReasons.push('Both BVN and NIN verified — strong identity confidence.'); }
    else if (bvnVerified) { identityScore = 65; identityReasons.push('BVN verified but NIN missing.'); conditions.push('Complete NIN verification before disbursement.'); }
    else if (ninVerified) { identityScore = 60; identityReasons.push('NIN verified but BVN missing.'); conditions.push('Complete BVN verification before disbursement.'); }
    else { identityScore = 10; identityReasons.push('No government identity verification on file.'); flags.push('No BVN or NIN verification on record.'); }
    if (highDisc.length > 0) { identityScore = Math.max(identityScore - 30, 10); identityReasons.push(`${highDisc.length} high-severity discrepancy/ies between BVN and NIN (${highDisc.map(d => d.field).join(', ')}).`); flags.push(`High-severity identity discrepancies: ${highDisc.map(d => d.field).join(', ')}.`); }
    if (mediumDisc.length > 0) { identityScore = Math.max(identityScore - 10, 10); identityReasons.push(`${mediumDisc.length} medium discrepancy/ies noted (${mediumDisc.map(d => d.field).join(', ')}).`); conditions.push(`Clarify discrepancies in ${mediumDisc.map(d => d.field).join(', ')} with customer.`); }
    identityStatus = identityScore >= 70 ? 'PASS' : identityScore >= 45 ? 'WARN' : 'FAIL';
    identityNotes = identityReasons[0] || identityNotes;
  }
  analysis.identityIntegrity = identityReasons;

  // ── Credit History ───────────────────────────────────────────────────────
  let creditScore = 50, creditStatus = 'WARN', creditNotes = 'No bureau data available.';
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
      creditStatus = 'FAIL'; creditNotes = 'Active delinquency on record.';
      if (hasDelinquency) creditReasons.push(`${bureauDelinquency.length} delinquency record(s) on file.`);
      if (amountArrear > 0) creditReasons.push(`₦${Number(amountArrear).toLocaleString()} in arrears across ${accountsInArrear} account(s).`);
      flags.push(`Active delinquency: ₦${Number(amountArrear).toLocaleString()} overdue.`);
    } else {
      if (bScore !== null) {
        if (bScore >= 650) { creditScore = 90; creditStatus = 'PASS'; creditReasons.push(`FirstCentral score ${bScore} (${scoreDesc}) — strong.`); }
        else if (bScore >= 500) { creditScore = 62; creditStatus = 'WARN'; creditReasons.push(`FirstCentral score ${bScore} (${scoreDesc}) — moderate.`); conditions.push('Monitor repayment given moderate bureau score.'); }
        else { creditScore = 28; creditStatus = 'FAIL'; creditReasons.push(`FirstCentral score ${bScore} (${scoreDesc}) — low.`); flags.push(`Low credit score: ${bScore}.`); }
      } else { creditScore = 62; creditStatus = 'PASS'; creditReasons.push('Bureau check completed — no delinquency detected.'); }
      if (totalAccounts > 0) creditReasons.push(`${totalAccounts} facilit(ies) — ${goodAccounts} good standing, ₦${Number(totalOutstanding).toLocaleString()} outstanding.`);
      if (nonPerforming.length > 0) { creditScore = Math.max(creditScore - 20, 20); creditStatus = creditStatus === 'PASS' ? 'WARN' : creditStatus; conditions.push('Resolve non-performing credit agreements before disbursement.'); }
      if (totalJudgements > 0) { creditScore = Math.max(creditScore - 25, 10); creditStatus = 'FAIL'; flags.push(`${totalJudgements} court judgement(s) on record.`); }
      if (rating) creditReasons.push(`Rating: ${rating}.`);
    }
    creditNotes = creditReasons[0] || creditNotes;
  } else {
    creditReasons.push('No bureau check run. Recommend bureau check before approving.');
    conditions.push('Run a credit bureau check before disbursement.');
  }
  analysis.creditHistory = creditReasons;

  // ── Income & Cash Flow ───────────────────────────────────────────────────
  let incomeScore = 50, incomeStatus = 'WARN', incomeNotes = 'No bank statement data.';
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
      incomeReasons.push('No income or cash inflow detected.'); flags.push('No income detected in bank statement.');
    } else {
      if (monthlyIncome > 0) incomeReasons.push(`Monthly avg income ₦${Number(monthlyIncome).toLocaleString()}${isSalary ? ', salary earner' : ', non-salary'}.`);
      const baseScore = Math.min((stabilityScore / 25) * 100, 100);
      const salaryBonus = isSalary ? 8 : 0;
      const ratioBonus = inflowRatio > 0.3 ? 10 : inflowRatio > 0.1 ? 5 : 0;
      incomeScore = Math.min(Math.round(baseScore + salaryBonus + ratioBonus), 100);
      incomeStatus = incomeScore >= 70 ? 'PASS' : incomeScore >= 45 ? 'WARN' : 'FAIL';
      if (incomeScore < 45) flags.push('Low income stability detected.');
      else if (incomeScore < 70) conditions.push('Request payslips to corroborate statement income.');
      if (stabilityScore < 10) incomeReasons.push(`Income stability score low (${stabilityScore}/25).`);
      if (spendingScore < 10) incomeReasons.push(`Spending behaviour score low (${spendingScore}/25).`);
      if (liquidityScore < 10) incomeReasons.push(`Liquidity score low (${liquidityScore}/25).`);
    }
    incomeNotes = incomeReasons[0] || incomeNotes;
  } else {
    incomeReasons.push('No bank statement analysed.');
    conditions.push('Submit bank statement before making a lending decision.');
  }
  analysis.incomeAndCashFlow = incomeReasons;

  // ── Debt Servicing ───────────────────────────────────────────────────────
  let debtScore = 50, debtStatus = 'WARN', debtNotes = 'DTI cannot be calculated without income and loan data.';
  const debtReasons = [];
  let effectiveDTI = null;
  let existingDebtMonthly = 0;
  const existingDTI = debt.loanRepayments?.DebtToIncomeRatio ?? null;
  const bureauMonthlyInstalment = parseFloat(bureauSummary?.TotalMonthlyInstalment || 0);
  const bureauInstalment = bureauMonthlyInstalment > 0 ? bureauMonthlyInstalment : null;

  let proposedMonthlyPayment = 0;
  if (proposedLoanAmount > 0 && loanTenor > 0) {
    const interest = proposedLoanAmount * (annualRate / 100) * (loanTenor / 12);
    proposedMonthlyPayment = Math.round((proposedLoanAmount + interest) / loanTenor);
  }

  if (monthlyIncome > 0 && proposedMonthlyPayment > 0) {
    if (bureauInstalment !== null) { existingDebtMonthly = bureauInstalment; debtReasons.push(`Bureau: ₦${Number(bureauInstalment).toLocaleString()}/mo existing instalments.`); }
    else if (existingDTI !== null) { existingDebtMonthly = (monthlyIncome * existingDTI) / 100; debtReasons.push(`Statement DTI ${existingDTI}% → ₦${Number(existingDebtMonthly).toLocaleString()}/mo existing debt.`); }
    const totalDebtMonthly = existingDebtMonthly + proposedMonthlyPayment;
    effectiveDTI = Math.round((totalDebtMonthly / monthlyIncome) * 100);
    if (effectiveDTI > 60) { debtScore = 15; debtStatus = 'FAIL'; debtReasons.push(`DTI ${effectiveDTI}% exceeds 60% ceiling.`); flags.push(`Combined DTI ${effectiveDTI}% — above hard limit.`); }
    else if (effectiveDTI > 40) { debtScore = 48; debtStatus = 'WARN'; debtReasons.push(`DTI ${effectiveDTI}% in caution zone.`); conditions.push(`DTI ${effectiveDTI}% elevated — consider reducing amount or extending tenure.`); }
    else if (effectiveDTI > 25) { debtScore = 72; debtStatus = 'PASS'; debtReasons.push(`DTI ${effectiveDTI}% acceptable.`); }
    else { debtScore = 92; debtStatus = 'PASS'; debtReasons.push(`DTI ${effectiveDTI}% excellent.`); }
    debtNotes = debtReasons[0] || debtNotes;
  } else if (bureauInstalment !== null && monthlyIncome > 0) {
    const bureauDTI = Math.round((bureauInstalment / monthlyIncome) * 100);
    debtScore = bureauDTI > 60 ? 20 : bureauDTI > 40 ? 50 : 75;
    debtStatus = bureauDTI > 60 ? 'FAIL' : bureauDTI > 40 ? 'WARN' : 'PASS';
    debtReasons.push(`Current bureau DTI ~${bureauDTI}% before this loan.`);
    if (bureauDTI > 60) flags.push(`Existing DTI ${bureauDTI}% already above safe threshold.`);
    debtNotes = debtReasons[0];
  }
  analysis.debtServicing = debtReasons;

  // ── Risk Profile ─────────────────────────────────────────────────────────
  const GRADE_SCORE = { A: 95, B: 78, C: 55, D: 30, E: 10 };
  let riskScore = 50, riskStatus = 'WARN', riskNotes = 'No statement risk profile available.';
  const riskReasons = [];

  if (latestStatement) {
    const grade = risk.overallRiskScore;
    riskScore = GRADE_SCORE[grade] ?? 50;
    riskStatus = riskScore >= 70 ? 'PASS' : riskScore >= 45 ? 'WARN' : 'FAIL';
    if (grade) { riskReasons.push(`Risk grade ${grade}. ${risk.recommendation || ''}`); }
    const sb = risk.scoreBreakdown || {};
    if (sb.incomeStability !== undefined) riskReasons.push(`Income ${sb.incomeStability}/25 | Debt ${sb.debtServicing}/25 | Spending ${sb.spendingBehavior}/25 | Liquidity ${sb.liquidity}/25`);
    if (riskScore < 45) flags.push(`Risk grade ${grade} — elevated default probability.`);
    riskNotes = riskReasons[0] || riskNotes;
  } else {
    riskReasons.push('No statement analysis on file.');
  }
  analysis.riskProfile = riskReasons;

  // ── Behavioural Analysis ─────────────────────────────────────────────────
  let behaviorScore = 50, behaviorStatus = 'WARN', behaviorNotes = 'No behavioural data available.';
  const behaviorReasons = [];

  if (latestStatement) {
    const spendBehaviorScore = risk.scoreBreakdown?.spendingBehavior ?? null;
    const habits = behavioral?.spendingHabits || [];
    const savings = behavioral?.savingsHabits || {};
    const sweepDetected = sweep?.accountSweepDetected ?? false;
    const sweepSeverity = sweep?.sweepSeverity || '';

    if (spendBehaviorScore !== null) { behaviorScore = Math.round((spendBehaviorScore / 25) * 100); behaviorReasons.push(`Spending behaviour score: ${spendBehaviorScore}/25.`); }
    if (savings.totalSaved > 0) { behaviorScore = Math.min(behaviorScore + 12, 100); behaviorReasons.push(`Saved ₦${Number(savings.totalSaved).toLocaleString()} during period — financial discipline.`); }

    const gamblingHabit = habits.find(h => /gambling|betting|casino|lottery/i.test(h));
    const highDiscretionary = habits.filter(h => /high spend on (airtime|online shopping|entertainment|recreation)/i.test(h));
    const p2pHabit = habits.find(h => /peer.to.peer|p2p/i.test(h));

    if (gamblingHabit) { behaviorScore = Math.max(behaviorScore - 35, 5); behaviorReasons.push(`Gambling/betting detected: "${gamblingHabit}"`); flags.push('Gambling or betting spend detected.'); }
    if (highDiscretionary.length > 0) { behaviorScore = Math.max(behaviorScore - 8 * highDiscretionary.length, 10); behaviorReasons.push(`High discretionary spend in ${highDiscretionary.length} category/ies.`); }
    if (p2pHabit) { behaviorScore = Math.max(behaviorScore - 5, 10); conditions.push('Clarify high P2P transfer volumes — may be undisclosed obligations.'); }

    if (sweepDetected) {
      const penalty = sweepSeverity === 'HIGH' ? 30 : sweepSeverity === 'MEDIUM' ? 20 : 10;
      behaviorScore = Math.max(behaviorScore - penalty, 5);
      behaviorReasons.push(`Account sweep detected (${sweepSeverity}, ${sweep.numberOfSweepEvents} events, ₦${Number(sweep.totalSweptAmount || 0).toLocaleString()} swept).`);
      flags.push(`Account sweep detected (${sweepSeverity}).`);
    }

    behaviorStatus = behaviorScore >= 70 ? 'PASS' : behaviorScore >= 45 ? 'WARN' : 'FAIL';
    behaviorNotes = behaviorReasons[0] || 'No strong behavioural signals.';
    if (behaviorScore < 45) flags.push('Concerning spending patterns in statement.');
  } else {
    behaviorReasons.push('No bank statement — spending behaviour not assessed.');
  }
  analysis.behavioralAnalysis = behaviorReasons;

  // ── Verdict ──────────────────────────────────────────────────────────────
  const scores = [identityScore, creditScore, incomeScore, debtScore, riskScore, behaviorScore];
  const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const statuses = [identityStatus, creditStatus, incomeStatus, debtStatus, riskStatus];
  const failCount = statuses.filter(st => st === 'FAIL').length;
  const hasHardFail = watchlisted || (identityStatus === 'FAIL' && !bvnVerified && !ninVerified) || creditStatus === 'FAIL';

  let verdict, confidence;
  if (hasHardFail || failCount >= 2) { verdict = 'NOT_ELIGIBLE'; confidence = watchlisted || failCount >= 3 ? 'HIGH' : 'MEDIUM'; }
  else if (avgScore >= 72 && failCount === 0 && conditions.length <= 1) { verdict = 'ELIGIBLE'; confidence = avgScore >= 85 ? 'HIGH' : 'MEDIUM'; }
  else { verdict = 'CONDITIONAL'; confidence = avgScore >= 60 ? 'MEDIUM' : 'LOW'; }

  // ── Suggested amounts ─────────────────────────────────────────────────────
  let suggestedMinAmount = null, suggestedMaxAmount = null, affordableMonthly = null;
  if (verdict !== 'NOT_ELIGIBLE' && monthlyIncome > 0) {
    const statementDerivedDebt = existingDTI !== null ? (monthlyIncome * existingDTI) / 100 : 0;
    const bothSources = [bureauInstalment, statementDerivedDebt > 0 ? statementDerivedDebt : null].filter(v => v !== null);
    const existingMonthlyEst = bothSources.length > 0 ? Math.round(bothSources.reduce((a, b) => a + b, 0) / bothSources.length) : 0;
    affordableMonthly = Math.max(Math.round(monthlyIncome * 0.40 - existingMonthlyEst), 0);
    const multiplier = verdict === 'ELIGIBLE' ? 6 : 3;
    suggestedMaxAmount = Math.round((affordableMonthly * multiplier) / 5000) * 5000;
    suggestedMinAmount = Math.round(suggestedMaxAmount * 0.4 / 5000) * 5000;
  }

  // ── Repayment schedule ────────────────────────────────────────────────────
  let proposedTotalRepayment = null, proposedTotalInterest = null;
  if (proposedLoanAmount > 0 && loanTenor > 0) {
    proposedTotalInterest = Math.round(proposedLoanAmount * (annualRate / 100) * (loanTenor / 12));
    proposedTotalRepayment = proposedLoanAmount + proposedTotalInterest;
    proposedMonthlyPayment = Math.round(proposedTotalRepayment / loanTenor);
  }

  const summary = {
    ELIGIBLE: `All criteria satisfied. Score ${avgScore}/100. Post-loan DTI ${effectiveDTI !== null ? effectiveDTI + '%' : 'N/A'}.`,
    CONDITIONAL: `Score ${avgScore}/100. ${conditions.length} condition(s) to satisfy before disbursement.`,
    NOT_ELIGIBLE: `Fails ${failCount} of 6 categories. Score ${avgScore}/100. ${watchlisted ? 'Watchlisted.' : ''}`,
  }[verdict];

  return {
    verdict, confidence, avgScore, summary, effectiveDTI,
    suggestedMinAmount, suggestedMaxAmount, affordableMonthly,
    proposedMonthlyPayment, proposedTotalRepayment, proposedTotalInterest,
    loanAmount: proposedLoanAmount, loanTenor, annualRate,
    categories: {
      identityIntegrity: { score: identityScore, status: identityStatus, notes: identityNotes },
      creditHistory:     { score: creditScore,    status: creditStatus,    notes: creditNotes },
      incomeAndCashFlow: { score: incomeScore,     status: incomeStatus,    notes: incomeNotes },
      debtServicing:     { score: debtScore,       status: debtStatus,      notes: debtNotes },
      riskProfile:       { score: riskScore,       status: riskStatus,      notes: riskNotes },
      behavioralAnalysis:{ score: behaviorScore,   status: behaviorStatus,  notes: behaviorNotes },
    },
    analysis, conditions, flags,
    dataAvailability: { bvn: !!latestBVN, nin: !!latestNIN, bureau: !!latestBureau, statement: !!latestStatement },
  };
}

module.exports = computeLoanReview;
