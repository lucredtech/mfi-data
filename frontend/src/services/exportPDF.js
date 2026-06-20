import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const fmt = (v) => v !== undefined && v !== null ? Number(v).toLocaleString() : '—';
const pct = (v) => v !== undefined ? `${Number(v * 100).toFixed(1)}%` : '—';

const GRADE_COLOR = {
  A: [22, 163, 74],
  B: [14, 165, 233],
  C: [245, 158, 11],
  D: [239, 68, 68],
  E: [127, 29, 29],
};

export function exportStatementPDF(statement) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const d = statement.result || {};
  const risk = d.overallRiskScore || {};
  const cashFlow = d.cashFlowAnalysis || {};
  const income = d.incomeSourceAnalysis || {};
  const spending = d.spendingPatterns || {};
  const debt = d.debtServicing || {};
  const sweep = d.account_sweep_analysis || {};
  const behavioral = d.behavioralAnalysis || {};
  const expense = d.expenseAnalysis || {};
  const meta = d.metaData || {};
  const txRanges = d.transactionRanges || {};
  const weeklySummary = d.weeklyTransactionSummary || [];
  const monthlyCredit = d.monthlyTransactionMetrics?.averageMonthlyCredit || [];
  const monthlyDebit = d.monthlyTransactionMetricsDebit?.averageMonthlyDebit || [];

  const W = 210;
  let y = 0;

  // ── Header banner ──────────────────────────────────────────────
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, W, 42, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(56, 189, 248);
  doc.text('LUCRED', 14, 14);

  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'normal');
  doc.text('B2B Credit Engine — Bank Statement Analysis Report', 14, 20);

  // Borrower info
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text(statement.accountName || 'Borrower Analysis', 14, 30);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  const infoLine = [
    statement.email,
    statement.bankName ? statement.bankName.toUpperCase() : null,
    meta.startDate && meta.endDate ? `${meta.startDate} → ${meta.endDate}` : null,
    `Generated: ${new Date().toLocaleDateString()}`,
  ].filter(Boolean).join('   ·   ');
  doc.text(infoLine, 14, 36);

  // Grade box
  const gradeColor = GRADE_COLOR[risk.overallRiskScore] || [100, 100, 100];
  doc.setFillColor(...gradeColor);
  doc.roundedRect(W - 46, 6, 32, 30, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(255, 255, 255);
  doc.text(risk.overallRiskScore || '—', W - 32, 24, { align: 'center' });
  doc.setFontSize(7);
  doc.text('RISK GRADE', W - 32, 31, { align: 'center' });

  y = 50;

  // ── Recommendation banner ──────────────────────────────────────
  doc.setFillColor(240, 249, 255);
  doc.rect(14, y, W - 28, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(2, 132, 199);
  doc.text(risk.recommendation || 'Analysis Complete', W / 2, y + 6.5, { align: 'center' });
  y += 16;

  // ── Score Breakdown ────────────────────────────────────────────
  sectionTitle(doc, 'Score Breakdown', y);
  y += 8;

  const breakdown = risk.scoreBreakdown || {};
  const scores = [
    ['Income Stability', breakdown.incomeStability ?? 0],
    ['Debt Servicing', breakdown.debtServicing ?? 0],
    ['Spending Behavior', breakdown.spendingBehavior ?? 0],
    ['Liquidity', breakdown.liquidity ?? 0],
  ];

  const colW = (W - 28) / 4;
  scores.forEach(([label, score], i) => {
    const x = 14 + i * colW;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y, colW - 4, 18, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(String(score), x + (colW - 4) / 2, y + 9, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(label, x + (colW - 4) / 2, y + 14, { align: 'center' });
    // Bar
    doc.setFillColor(226, 232, 240);
    doc.rect(x + 4, y + 15.5, colW - 12, 1.5, 'F');
    const fill = Math.min((score / 25), 1) * (colW - 12);
    doc.setFillColor(score >= 20 ? 22 : score >= 12 ? 245 : 239, score >= 20 ? 163 : score >= 12 ? 158 : 68, score >= 20 ? 74 : score >= 12 ? 11 : 68);
    doc.rect(x + 4, y + 15.5, fill, 1.5, 'F');
  });

  y += 24;

  // ── Cash Flow ──────────────────────────────────────────────────
  sectionTitle(doc, 'Cash Flow Analysis', y);
  y += 8;

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [['Total Cash Inflow', 'Total Cash Outflow', 'Difference', 'Status']],
    body: [[
      `₦${fmt(cashFlow.totalCashInflow)}`,
      `₦${fmt(cashFlow.totalCashOutflow)}`,
      `₦${fmt(Math.abs(cashFlow.CashFlowDifference || 0))}`,
      cashFlow.cashFlowStatus || '—',
    ]],
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9, textColor: [51, 65, 85] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });
  y = doc.lastAutoTable.finalY + 8;

  // ── Income Analysis ────────────────────────────────────────────
  sectionTitle(doc, 'Income Analysis', y);
  y += 8;

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [['Monthly Avg Income', 'Total Income', 'Stability Score', 'Salary Earner', 'Gig Worker']],
    body: [[
      `₦${fmt(income.monthlyAverageIncome)}`,
      `₦${fmt(income.totalIncome)}`,
      income.incomeStabilityScore ?? '—',
      income.isSalaryEarner ? 'Yes' : 'No',
      income.isGigWorker ? 'Yes' : 'No',
    ]],
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: [51, 65, 85] },
  });
  y = doc.lastAutoTable.finalY + 4;

  if (income.otherCashInflows?.topSources?.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      head: [['Top Cash Inflow Sources', 'Total Amount', 'Transactions', 'Avg Amount']],
      body: income.otherCashInflows.topSources.map(s => [
        s.narration?.substring(0, 55) + (s.narration?.length > 55 ? '…' : ''),
        `₦${fmt(s.totalAmount)}`,
        s.transactionCount,
        `₦${fmt(s.averageAmount)}`,
      ]),
      headStyles: { fillColor: [30, 58, 95], textColor: [255, 255, 255], fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // ── Spending ───────────────────────────────────────────────────
  sectionTitle(doc, 'Spending Patterns', y);
  y += 8;

  const spendCats = Object.entries(spending.spendCategory || {})
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);

  if (spendCats.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      head: [['Spend Category', 'Amount']],
      body: spendCats.map(([k, v]) => [formatKey(k), `₦${fmt(v)}`]),
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: [51, 65, 85] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 60 } },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // ── New page ───────────────────────────────────────────────────
  doc.addPage();
  y = 20;

  // ── Debt Servicing ─────────────────────────────────────────────
  sectionTitle(doc, 'Debt Servicing', y);
  y += 8;

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [['Total Repayments', 'Avg Monthly Repayment', 'Debt-to-Income Ratio', 'DTI Score']],
    body: [[
      `₦${fmt(debt.loanRepayments?.totalAmount)}`,
      `₦${fmt(debt.loanRepayments?.averageMonthlyRepayment)}`,
      `${debt.loanRepayments?.DebtToIncomeRatio ?? 0}%`,
      debt.loanRepayments?.DebtToIncomeScore ?? '—',
    ]],
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
  });
  y = doc.lastAutoTable.finalY + 8;

  // ── Account Sweep ──────────────────────────────────────────────
  sectionTitle(doc, 'Account Sweep Analysis', y);
  y += 8;

  const sweepColor = sweep.accountSweepDetected ? [254, 242, 242] : [240, 253, 244];
  const sweepTextColor = sweep.accountSweepDetected ? [220, 38, 38] : [22, 163, 74];
  doc.setFillColor(...sweepColor);
  doc.roundedRect(14, y, W - 28, 14, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...sweepTextColor);
  doc.text(sweep.sweepDescription || '—', 20, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Severity: ${sweep.sweepSeverity}   Events: ${sweep.numberOfSweepEvents}   Swept: ₦${fmt(sweep.totalSweptAmount)}   Ratio: ${pct(sweep.overallSweepRatio)}`, 20, y + 11);
  y += 20;

  // Monthly sweep analysis
  if (sweep.monthlySweepAnalysis?.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      head: [['Month', 'Events', 'Swept Amount', 'Incoming Amount', 'Sweep Ratio']],
      body: sweep.monthlySweepAnalysis.map((m) => [
        m.month || '—',
        m.sweep_count ?? '—',
        `₦${fmt(m.swept_amount)}`,
        `₦${fmt(m.incoming_amount)}`,
        `${((m.sweep_ratio || 0) * 100).toFixed(1)}%`,
      ]),
      headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255], fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
      alternateRowStyles: { fillColor: [255, 248, 248] },
      didDrawPage: (data) => {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(220, 38, 38);
        doc.text('Monthly Sweep Summary', 14, data.settings.startY - 3);
      },
    });
    y = doc.lastAutoTable.finalY + 6;
  }

  // Sweep candidate events
  if (sweep.sweepCandidates?.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      head: [['Credit Date', 'Credit Amount', 'Debit Date', 'Debit Amount', 'Hours Gap', 'Sweep %']],
      body: sweep.sweepCandidates.map((c) => [
        c.credit_date?.slice(0, 10) || '—',
        `₦${fmt(c.credit_amount)}`,
        c.debit_date?.slice(0, 10) || '—',
        `₦${fmt(c.debit_amount)}`,
        `${c.time_difference_hours ?? '—'}h`,
        `${Number(c.sweep_percentage || 0).toFixed(1)}%`,
      ]),
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
      alternateRowStyles: { fillColor: [255, 248, 248] },
      didDrawPage: (data) => {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('Sweep Events', 14, data.settings.startY - 3);
      },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // ── Behavioral ─────────────────────────────────────────────────
  sectionTitle(doc, 'Behavioral Insights', y);
  y += 8;

  if (behavioral.spendingHabits?.length > 0) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text('Spending Habits:', 14, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    behavioral.spendingHabits.forEach((h) => {
      doc.text(`• ${h}`, 18, y);
      y += 4.5;
    });
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`Total Saved: ₦${fmt(behavioral.savingsHabits?.totalSaved)}   Frequency: ${behavioral.savingsHabits?.savingsFrequency || '—'}`, 14, y + 2);
  y += 10;

  // ── Monthly Credit vs Debit ────────────────────────────────────
  if (monthlyCredit.length > 0) {
    sectionTitle(doc, 'Monthly Credit vs Debit', y);
    y += 8;
    const monthlyRows = monthlyCredit.map((c) => {
      const deb = monthlyDebit.find(x => x.month === c.month);
      const net = (c.amount || 0) - (deb?.amount || 0);
      return [
        c.month,
        `₦${fmt(c.amount)}`,
        `₦${fmt(deb?.amount ?? 0)}`,
        `${net >= 0 ? '+' : ''}₦${fmt(Math.abs(net))}`,
      ];
    });
    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      head: [['Month', 'Total Credit', 'Total Debit', 'Net']],
      body: monthlyRows,
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: [51, 65, 85] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didParseCell: (data) => {
        if (data.column.index === 3 && data.section === 'body') {
          const isPos = data.cell.text[0]?.startsWith('+');
          data.cell.styles.textColor = isPos ? [22, 163, 74] : [220, 38, 38];
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // ── Weekly Transaction Summary ─────────────────────────────────
  if (weeklySummary.length > 0) {
    sectionTitle(doc, 'Weekly Transaction Summary', y);
    y += 8;
    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      head: [['Week Start', 'Credit', 'Debit', 'Net']],
      body: weeklySummary.map((w) => {
        const credit = w.credit_sum ?? w.totalCredit ?? 0;
        const debit  = w.debit_sum  ?? w.totalDebit  ?? 0;
        const net = credit - debit;
        return [
          w.week_start_date ?? w.week ?? '—',
          `₦${fmt(credit)}`,
          `₦${fmt(debit)}`,
          `${net >= 0 ? '+' : ''}₦${fmt(Math.abs(net))}`,
        ];
      }),
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 9 },
      bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didParseCell: (data) => {
        if (data.column.index === 3 && data.section === 'body') {
          const isPos = data.cell.text[0]?.startsWith('+');
          data.cell.styles.textColor = isPos ? [22, 163, 74] : [220, 38, 38];
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // ── Transaction Ranges ─────────────────────────────────────────
  if (Object.keys(txRanges).length > 0) {
    sectionTitle(doc, 'Transaction Ranges', y);
    y += 8;
    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      head: [['Range', 'Transactions', 'Total Amount']],
      body: Object.entries(txRanges).map(([range, data]) => {
        const count = typeof data === 'object' ? (data.count ?? data.transactionCount ?? data.frequency ?? '—') : data;
        const amount = typeof data === 'object' ? (data.totalAmount ?? data.amount) : null;
        return [range, count, amount != null ? `₦${fmt(amount)}` : '—'];
      }),
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 9 },
      bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // ── Top Transactions ───────────────────────────────────────────
  if (expense.topHighValueTransactions?.length > 0) {
    sectionTitle(doc, 'Top High-Value Transactions', y);
    y += 8;

    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      head: [['Date', 'Narration', 'Amount', 'Category']],
      body: expense.topHighValueTransactions.map(t => [
        t.date,
        t.narration?.substring(0, 50) + (t.narration?.length > 50 ? '…' : ''),
        `₦${fmt(t.amount)}`,
        t.category,
      ]),
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 9 },
      bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 1: { cellWidth: 80 } },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // ── Footer on all pages ────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 287, W, 10, 'F');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text('Lucred B2B Credit Engine — Confidential', 14, 293);
    doc.text(`Page ${i} of ${pageCount}`, W - 14, 293, { align: 'right' });
  }

  const filename = `lucred-analysis-${statement.accountName?.replace(/\s+/g, '-') || 'report'}-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

function sectionTitle(doc, title, y) {
  doc.setFillColor(248, 250, 252);
  doc.rect(14, y, 182, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(14, 165, 233);
  doc.text(title.toUpperCase(), 16, y + 5);
}

function formatKey(k) {
  return k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()
    .split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
