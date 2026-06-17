import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const fmt = (v) => (v !== undefined && v !== null ? Number(v).toLocaleString() : '—');

const GRADE_COLOR = {
  A: [22, 163, 74], B: [14, 165, 233], C: [245, 158, 11],
  D: [239, 68, 68], E: [127, 29, 29],
};

export function exportScorecardPDF({ customer, statement, bvnResult, ninResult, bureauResult, discrepancies = [] }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210;
  let y = 0;

  const d = statement?.result || {};
  const risk = d.overallRiskScore || {};
  const cashFlow = d.cashFlowAnalysis || {};
  const income = d.incomeSourceAnalysis || {};
  const debt = d.debtServicing || {};
  const behavioral = d.behavioralAnalysis || {};
  const bvn = bvnResult?.result || {};
  const nin = ninResult?.result || {};
  const bureau = bureauResult?.result || {};
  const bureauScore = bureau.creditScore ?? bureau.summary?.creditScore;
  const bvnPhoto = bvn.image;
  const ninPhoto = nin.photo;

  // ── Header banner ──────────────────────────────────────────────
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, W, 48, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(56, 189, 248);
  doc.text('LUCRED', 14, 13);

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'normal');
  doc.text('B2B Credit Engine — Customer Scorecard', 14, 19);

  // Borrower photo (BVN preferred, NIN fallback)
  if (bvnPhoto || ninPhoto) {
    try {
      doc.addImage(`data:image/jpeg;base64,${bvnPhoto || ninPhoto}`, 'JPEG', 14, 6, 26, 32, undefined, 'FAST');
    } catch (_) {}
  }
  const textX = (bvnPhoto || ninPhoto) ? 44 : 14;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(customer.name, textX, 30);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  const metaLine = [
    customer.email,
    customer.phone,
    customer.address,
    customer.bvn ? `BVN: ••••${customer.bvn.slice(-4)}` : null,
    customer.nin ? `NIN: ••••${customer.nin.slice(-4)}` : null,
    `Generated: ${new Date().toLocaleDateString()}`,
  ].filter(Boolean).join('   ·   ');
  doc.text(metaLine, textX, 36);

  // Grade boxes
  let boxX = W - 14;
  if (bureauScore) {
    boxX -= 32;
    doc.setFillColor(109, 40, 217);
    doc.roundedRect(boxX, 6, 30, 36, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text(String(bureauScore), boxX + 15, 26, { align: 'center' });
    doc.setFontSize(6);
    doc.text('BUREAU', boxX + 15, 33, { align: 'center' });
    boxX -= 6;
  }
  if (risk.overallRiskScore) {
    boxX -= 32;
    const gc = GRADE_COLOR[risk.overallRiskScore] || [100, 100, 100];
    doc.setFillColor(...gc);
    doc.roundedRect(boxX, 6, 30, 36, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text(risk.overallRiskScore, boxX + 15, 26, { align: 'center' });
    doc.setFontSize(6);
    doc.text('RISK GRADE', boxX + 15, 33, { align: 'center' });
  }

  y = 56;

  // ── Recommendation banner ──────────────────────────────────────
  if (risk.recommendation) {
    doc.setFillColor(240, 249, 255);
    doc.rect(14, y, W - 28, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(2, 132, 199);
    doc.text(risk.recommendation, W / 2, y + 6.5, { align: 'center' });
    y += 16;
  }

  // ── Identity Verification ──────────────────────────────────────
  if (bvnResult) {
    sectionTitle(doc, 'Identity Verification (BVN)', y);
    y += 8;

    if (bvn.image) {
      try {
        doc.addImage(`data:image/jpeg;base64,${bvn.image}`, 'JPEG', W - 34, y, 20, 24, undefined, 'FAST');
      } catch (_) {}
    }

    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: bvn.image ? 40 : 14 },
      head: [['Full Name', 'Date of Birth', 'Gender', 'Phone', 'BVN Status', 'Enrollment Bank']],
      body: [[
        `${bvn.firstName || ''} ${bvn.lastName || ''}`.trim() || '—',
        bvn.dateOfBirth || '—',
        bvn.gender || '—',
        bvn.phoneNumber || '—',
        bvn.isValid !== false ? 'Valid ✓' : 'Invalid ✗',
        bvn.enrollmentBank || '—',
      ]],
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 8 },
      bodyStyles: { fontSize: 9, textColor: [51, 65, 85] },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  // ── Discrepancies ──────────────────────────────────────────────
  if (discrepancies.length > 0) {
    sectionTitle(doc, `⚠ Data Discrepancies (${discrepancies.length})`, y);
    y += 8;
    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      head: [['Field', 'BVN Record', 'NIN Record', 'Severity']],
      body: discrepancies.map(d => [d.field, d.bvn || '—', d.nin || '—', d.severity.toUpperCase()]),
      headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255], fontSize: 8 },
      bodyStyles: { fontSize: 9, textColor: [51, 65, 85] },
      didParseCell: (data) => {
        if (data.column.index === 3 && data.section === 'body') {
          const val = data.cell.text[0];
          data.cell.styles.textColor = val === 'HIGH' ? [220, 38, 38] : val === 'MEDIUM' ? [217, 119, 6] : [22, 163, 74];
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  // ── NIN Verification ───────────────────────────────────────────
  if (ninResult) {
    sectionTitle(doc, 'Identity Verification (NIN)', y);
    y += 8;

    // NIN photo
    if (nin.photo) {
      try {
        doc.addImage(`data:image/jpeg;base64,${nin.photo}`, 'JPEG', W - 34, y, 20, 24, undefined, 'FAST');
      } catch (_) {}
    }

    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: nin.photo ? 40 : 14 },
      head: [['Full Name', 'Date of Birth', 'Gender', 'Phone', 'NIN Status', 'Address']],
      body: [[
        `${nin.firstName || ''} ${nin.lastName || ''}`.trim() || '—',
        nin.dateOfBirth || '—',
        nin.gender || '—',
        nin.phoneNumber || '—',
        nin.isValid !== false ? 'Valid ✓' : 'Invalid ✗',
        nin.address || '—',
      ]],
      headStyles: { fillColor: [109, 40, 217], textColor: [255, 255, 255], fontSize: 8 },
      bodyStyles: { fontSize: 9, textColor: [51, 65, 85] },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  // ── Bureau Summary ──────────────────────────────────────────────
  if (bureauResult) {
    sectionTitle(doc, 'Credit Bureau Check', y);
    y += 8;

    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      head: [['Credit Score', 'Total Facilities', 'Active Loans', 'Total Outstanding', 'Overdue', 'Delinquency']],
      body: [[
        bureauScore ?? '—',
        bureau.totalFacilities ?? bureau.summary?.totalFacilities ?? '—',
        bureau.activeLoans ?? bureau.summary?.activeLoans ?? '—',
        bureau.totalOutstanding !== undefined ? `₦${fmt(bureau.totalOutstanding)}` : bureau.summary?.totalOutstanding !== undefined ? `₦${fmt(bureau.summary.totalOutstanding)}` : '—',
        bureau.overdueAmount !== undefined ? `₦${fmt(bureau.overdueAmount)}` : '—',
        bureau.delinquencyStatus ?? bureau.summary?.delinquencyStatus ?? '—',
      ]],
      headStyles: { fillColor: [109, 40, 217], textColor: [255, 255, 255], fontSize: 8 },
      bodyStyles: { fontSize: 9, textColor: [51, 65, 85] },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  // ── Statement Analysis ──────────────────────────────────────────
  if (statement) {
    sectionTitle(doc, 'Statement Analysis', y);
    y += 8;

    // Score breakdown boxes
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
      doc.setFillColor(226, 232, 240);
      doc.rect(x + 4, y + 15.5, colW - 12, 1.5, 'F');
      const fill = Math.min((score / 25), 1) * (colW - 12);
      doc.setFillColor(score >= 20 ? 22 : score >= 12 ? 245 : 239, score >= 20 ? 163 : score >= 12 ? 158 : 68, score >= 20 ? 74 : score >= 12 ? 11 : 68);
      doc.rect(x + 4, y + 15.5, fill, 1.5, 'F');
    });
    y += 24;

    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      head: [['Cash Inflow', 'Cash Outflow', 'Net', 'Status', 'Monthly Avg Income', 'DTI Ratio']],
      body: [[
        `₦${fmt(cashFlow.totalCashInflow)}`,
        `₦${fmt(cashFlow.totalCashOutflow)}`,
        `₦${fmt(Math.abs(cashFlow.CashFlowDifference || 0))}`,
        cashFlow.cashFlowStatus || '—',
        `₦${fmt(income.monthlyAverageIncome)}`,
        `${debt.loanRepayments?.DebtToIncomeRatio ?? 0}%`,
      ]],
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 8 },
      bodyStyles: { fontSize: 9, textColor: [51, 65, 85] },
    });
    y = doc.lastAutoTable.finalY + 10;

    if (behavioral.spendingHabits?.length > 0) {
      sectionTitle(doc, 'Behavioral Insights', y);
      y += 8;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      behavioral.spendingHabits.forEach((h) => {
        doc.text(`• ${h}`, 16, y);
        y += 5;
      });
    }
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
    doc.text('Lucred B2B Credit Engine — Customer Scorecard — Confidential', 14, 293);
    doc.text(`Page ${i} of ${pageCount}`, W - 14, 293, { align: 'right' });
  }

  const filename = `lucred-scorecard-${customer.name.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`;
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
