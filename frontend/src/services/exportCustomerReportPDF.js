import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const W = 210;

function hdr(doc, y, text, bgRgb = [15, 23, 42], fgRgb = [255, 255, 255]) {
  doc.setFillColor(...bgRgb);
  doc.rect(14, y, W - 28, 7, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...fgRgb);
  doc.text(text.toUpperCase(), 17, y + 4.8);
  return y + 9;
}

function kv(doc, y, pairs, cols = 2) {
  const colW = (W - 28) / cols;
  let x = 14;
  pairs.forEach(([label, value], i) => {
    if (i > 0 && i % cols === 0) { y += 10; x = 14; }
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text(label, x, y);
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(String(value ?? '—'), x, y + 4.5);
    x += colW;
  });
  return y + 10;
}

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : '—'; }
function fmt(n) { return n != null ? Number(n).toLocaleString() : '—'; }

function parseBureauSections(result) {
  const arr = result?.data ?? (Array.isArray(result) ? result : []);
  const sec = {};
  arr.forEach(item => { const k = Object.keys(item || {})[0]; if (k) sec[k] = item[k]; });
  return sec;
}

export function exportCustomerReportPDF({ customer, bvnResults, ninResults, bureauResults, statements, loanReviews, org }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const latestBVN = bvnResults?.find(r => r.status === 'success');
  const latestNIN = ninResults?.find(r => r.status === 'success');
  const latestBureau = bureauResults?.find(r => r.status === 'success');
  const latestStatement = statements?.find(r => r.status === 'success');
  const latestReview = loanReviews?.[0];

  const bureauSec = latestBureau ? parseBureauSections(latestBureau.result) : null;
  const scoring = bureauSec?.Scoring?.[0];
  const summary = bureauSec?.CreditAccountSummary?.[0];
  const bvn = latestBVN?.result || {};
  const nin = latestNIN?.result || {};
  const stmt = latestStatement?.result || {};
  const cashFlow = stmt.cashFlowAnalysis || {};
  const income = stmt.incomeSourceAnalysis || {};

  // ── Cover banner ─────────────────────────────────────────────────────────────
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, W, 48, 'F');

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(56, 189, 248);
  doc.text('LUCRED', 14, 14);

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'normal');
  doc.text('Borrower Credit Report', 14, 20);

  // Verdict badge
  if (latestReview) {
    const vColor = latestReview.verdict === 'ELIGIBLE' ? [22, 163, 74] : latestReview.verdict === 'CONDITIONAL' ? [245, 158, 11] : [220, 38, 38];
    doc.setFillColor(...vColor);
    doc.roundedRect(W - 55, 10, 41, 10, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(latestReview.verdict, W - 34.5, 16.5, { align: 'center' });
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(customer.name, 14, 32);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  const meta = [customer.email, customer.phone, `Generated ${new Date().toLocaleDateString()}`, org ? `Prepared by ${org}` : null].filter(Boolean).join('  ·  ');
  doc.text(meta, 14, 39);

  let y = 56;

  // ── Identity ─────────────────────────────────────────────────────────────────
  y = hdr(doc, y, 'Identity Verification');
  y = kv(doc, y, [
    ['Full Name', bvn.firstName ? `${bvn.firstName} ${bvn.lastName}` : nin.firstName ? `${nin.firstName} ${nin.lastName}` : customer.name],
    ['Date of Birth', bvn.dateOfBirth || nin.dateOfBirth || '—'],
    ['Gender', cap(bvn.gender || nin.gender)],
    ['Phone', bvn.phoneNumber || nin.phoneNumber || customer.phone || '—'],
    ['BVN Status', latestBVN ? '✓ Verified' : 'Not verified'],
    ['NIN Status', latestNIN ? '✓ Verified' : 'Not verified'],
    ['Watch Listed', (latestBVN?.result?.watchListed || latestNIN?.result?.watchListed) ? '⚠ YES' : 'No'],
    ['Address', nin.address || customer.address || '—'],
  ], 2);
  y += 4;

  // ── Credit bureau ─────────────────────────────────────────────────────────────
  if (bureauSec) {
    y = hdr(doc, y, 'Credit Bureau');
    y = kv(doc, y, [
      ['Credit Score', scoring?.TotalConsumerScore ?? '—'],
      ['Rating', scoring?.Description ?? '—'],
      ['Active Accounts', summary?.NoOfActiveAccounts ?? '—'],
      ['Closed Accounts', summary?.NoOfClosedAccounts ?? '—'],
      ['Total Owed', fmt(summary?.TotalOutstandingBalance)],
      ['Monthly Installment', fmt(summary?.TotalMonthlyInstalment)],
      ['Overdue Amount', fmt(summary?.TotalOverdueBalance)],
      ['Delinquent Accounts', summary?.NoOfDelinquentFacilities ?? '—'],
    ], 2);
    y += 4;
  }

  // ── Income & cash flow ────────────────────────────────────────────────────────
  if (latestStatement) {
    y = hdr(doc, y, 'Income & Cash Flow');
    y = kv(doc, y, [
      ['Avg Monthly Income', `₦${fmt(cashFlow.averageMonthlyIncome)}`],
      ['Avg Monthly Spend', `₦${fmt(cashFlow.averageMonthlyExpenditure)}`],
      ['Net Cash Flow', `₦${fmt(cashFlow.netCashFlow)}`],
      ['Savings Rate', cashFlow.savingsRate != null ? `${(cashFlow.savingsRate * 100).toFixed(1)}%` : '—'],
      ['Income Stability', cap(income.stabilityScore)],
      ['Primary Source', cap(income.primarySource)],
      ['Bank', cap(latestStatement.bankName)],
      ['Period', stmt.metaData?.startDate ? `${stmt.metaData.startDate} → ${stmt.metaData.endDate}` : '—'],
    ], 2);
    y += 4;
  }

  // ── Loan review ───────────────────────────────────────────────────────────────
  if (latestReview) {
    y = hdr(doc, y, 'Loan Review');
    const vColor = latestReview.verdict === 'ELIGIBLE' ? [22, 163, 74] : latestReview.verdict === 'CONDITIONAL' ? [245, 158, 11] : [220, 38, 38];
    doc.setFillColor(...vColor, 0.15);
    doc.setDrawColor(...vColor);
    doc.roundedRect(14, y, W - 28, 12, 2, 2, 'FD');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...vColor);
    doc.text(latestReview.verdict, W / 2, y + 5, { align: 'center' });
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text(`Confidence: ${latestReview.confidence ?? '—'}%  ·  Score: ${latestReview.avgScore ?? '—'}/100`, W / 2, y + 10, { align: 'center' });
    y += 16;

    y = kv(doc, y, [
      ['Suggested Amount', `₦${fmt(latestReview.suggestedAmount)}`],
      ['Max Amount', `₦${fmt(latestReview.maxAmount)}`],
      ['Recommended Tenor', latestReview.recommendedTenor ? `${latestReview.recommendedTenor} months` : '—'],
      ['DTI', latestReview.dti != null ? `${latestReview.dti.toFixed(1)}%` : '—'],
    ], 2);

    if (latestReview.flags?.length) {
      y += 2;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(220, 38, 38);
      doc.text('Flags:', 14, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      const flagText = latestReview.flags.join('  ·  ');
      doc.text(flagText, 28, y, { maxWidth: W - 42 });
      y += 8;
    }
  }

  // ── Category scores table ─────────────────────────────────────────────────────
  if (latestReview?.categories?.length) {
    y += 2;
    y = hdr(doc, y, 'Category Scores');
    autoTable(doc, {
      startY: y,
      head: [['Category', 'Score', 'Weight', 'Status']],
      body: latestReview.categories.map(c => [
        c.name || c.label,
        `${c.score ?? '—'}/100`,
        c.weight ? `${(c.weight * 100).toFixed(0)}%` : '—',
        c.status || '—',
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [30, 41, 59], textColor: [248, 250, 252], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 6;
  }

  // ── Footer ────────────────────────────────────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.text(`Lucred B2B Credit Engine  ·  Confidential  ·  Page ${i} of ${pageCount}`, W / 2, 290, { align: 'center' });
  }

  doc.save(`lucred-report-${customer.name.replace(/\s+/g, '-').toLowerCase()}.pdf`);
}
