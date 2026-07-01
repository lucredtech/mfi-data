import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const fmt = (v) => (v !== undefined && v !== null ? Number(v).toLocaleString() : '—');

const VERDICT_RGB = {
  ELIGIBLE: [22, 163, 74],
  CONDITIONAL: [217, 119, 6],
  NOT_ELIGIBLE: [220, 38, 38],
};
const STATUS_RGB = {
  PASS: [22, 163, 74],
  WARN: [217, 119, 6],
  FAIL: [220, 38, 38],
};
const CAT_LABEL = {
  identityIntegrity: 'Identity Integrity',
  creditHistory: 'Credit History',
  incomeAndCashFlow: 'Income & Cash Flow',
  debtServicing: 'Debt Servicing',
  riskProfile: 'Risk Profile',
  behavioralAnalysis: 'Behavioural Analysis',
};

export function exportLoanReviewPDF({ customer, review, loanParams }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  let y = 0;

  function addPage() {
    doc.addPage();
    y = 20;
    // Header on every page
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, W, 12, 'F');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Lucred Credit Engine — Loan Eligibility Review (CONFIDENTIAL)', 10, 8);
    doc.text(`${customer?.name || ''}`, W - 10, 8, { align: 'right' });
  }

  function checkY(needed = 20) {
    if (y + needed > 275) addPage();
  }

  // ── Cover header ────────────────────────────────────────────────────────────
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, W, 42, 'F');

  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text('LUCRED B2B PLATFORM', 10, 12);
  doc.text(new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }), W - 10, 12, { align: 'right' });

  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('Loan Eligibility Review', 10, 26);

  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'normal');
  doc.text('BETA — Algorithmic decision support. Not a substitute for human credit judgement.', 10, 35);

  y = 52;

  // ── Customer info ──────────────────────────────────────────────────────────
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text('Customer', 10, y);
  doc.setFont('helvetica', 'normal');
  doc.text(customer?.name || '—', 45, y);

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Customer Type', 10, y);
  doc.setFont('helvetica', 'normal');
  doc.text(customer?.customerType || '—', 45, y);

  if (customer?.bvn) {
    doc.setFont('helvetica', 'bold');
    doc.text('BVN', 110, y - 6);
    doc.setFont('helvetica', 'normal');
    doc.text(`****${customer.bvn.slice(-4)}`, 125, y - 6);
  }

  y += 10;

  // ── Verdict banner ─────────────────────────────────────────────────────────
  const vColor = VERDICT_RGB[review.verdict] || [100, 116, 139];
  const VERDICT_LABEL = { ELIGIBLE: 'ELIGIBLE', CONDITIONAL: 'CONDITIONAL', NOT_ELIGIBLE: 'NOT ELIGIBLE' };

  doc.setFillColor(...vColor);
  doc.roundedRect(10, y, W - 20, 28, 4, 4, 'F');

  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text(VERDICT_LABEL[review.verdict] || review.verdict, 20, y + 13);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Confidence: ${review.confidence}`, 20, y + 21);

  // Combined score on right
  const avgScore = Math.round(
    Object.values(review.categories).reduce((s, c) => s + c.score, 0) /
    Object.values(review.categories).length
  );
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(`${avgScore}`, W - 20, y + 14, { align: 'right' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('/100 combined', W - 20, y + 21, { align: 'right' });

  y += 35;

  // ── Summary ────────────────────────────────────────────────────────────────
  doc.setFillColor(248, 250, 252);
  doc.rect(10, y, W - 20, 2, 'F');
  y += 5;

  const summaryLines = doc.splitTextToSize(review.summary || '', W - 30);
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'italic');
  doc.text(summaryLines, 15, y);
  y += summaryLines.length * 5 + 6;

  // ── Loan parameters ────────────────────────────────────────────────────────
  if (loanParams?.amount > 0) {
    checkY(40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('Loan Parameters', 10, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      margin: { left: 10, right: 10 },
      head: [['Parameter', 'Value']],
      body: [
        ['Proposed Loan Amount', `N${fmt(loanParams.amount)}`],
        ['Loan Tenure', `${loanParams.tenor} months`],
        ['Annual Interest Rate (flat)', `${loanParams.rate}%`],
        ['Monthly Repayment', `N${fmt(review.proposedMonthlyPayment)}`],
        ['Total Repayment', `N${fmt(review.proposedTotalRepayment)}`],
        ['Total Interest', `N${fmt(review.proposedTotalInterest)}`],
        ['Post-Loan DTI', review.effectiveDTI !== null ? `${review.effectiveDTI}%` : '—'],
      ],
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9, textColor: [51, 65, 85] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 70 } },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // Suggested range
  if (review.suggestedMinAmount || review.suggestedMaxAmount) {
    checkY(20);
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(10, y, W - 20, 16, 3, 3, 'F');
    doc.setFontSize(8);
    doc.setTextColor(22, 163, 74);
    doc.setFont('helvetica', 'bold');
    doc.text('SYSTEM SUGGESTED PRINCIPAL RANGE', 16, y + 6);
    doc.setFontSize(12);
    doc.setTextColor(21, 128, 61);
    doc.text(`N${fmt(review.suggestedMinAmount)} – N${fmt(review.suggestedMaxAmount)}`, 16, y + 13);
    if (review.loanAmountReasoning) {
      doc.setFontSize(7.5);
      doc.setTextColor(74, 222, 128);
      doc.setFont('helvetica', 'normal');
      doc.text(review.loanAmountReasoning, W - 14, y + 13, { align: 'right', maxWidth: 90 });
    }
    y += 22;
  }

  // ── Category breakdown ─────────────────────────────────────────────────────
  checkY(60);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Eligibility Category Breakdown', 10, y);
  y += 6;

  const catRows = Object.entries(review.categories).map(([key, cat]) => [
    CAT_LABEL[key] || key,
    cat.score,
    cat.status,
    (cat.notes || []).join(' '),
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: 10, right: 10 },
    head: [['Category', 'Score', 'Status', 'Notes']],
    body: catRows,
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 42 },
      1: { cellWidth: 16, halign: 'center' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 'auto' },
    },
    didDrawCell(data) {
      if (data.column.index === 2 && data.section === 'body') {
        const status = catRows[data.row.index]?.[2];
        const rgb = STATUS_RGB[status] || [100, 116, 139];
        doc.setFillColor(...rgb);
        doc.setTextColor(255, 255, 255);
        const pad = 3;
        doc.roundedRect(data.cell.x + pad, data.cell.y + 2.5, data.cell.width - pad * 2, 5.5, 1, 1, 'F');
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        doc.text(status || '', data.cell.x + data.cell.width / 2, data.cell.y + 6.2, { align: 'center' });
      }
    },
  });
  y = doc.lastAutoTable.finalY + 8;

  // ── Flags ──────────────────────────────────────────────────────────────────
  if (review.flags?.length) {
    checkY(20 + review.flags.length * 7);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('Flags', 10, y);
    y += 6;

    review.flags.forEach((flag) => {
      checkY(10);
      doc.setFillColor(254, 226, 226);
      doc.roundedRect(10, y, W - 20, 8, 2, 2, 'F');
      doc.setFontSize(8);
      doc.setTextColor(185, 28, 28);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(`! ${flag}`, W - 30);
      doc.text(lines[0], 15, y + 5.5);
      y += 10;
    });
    y += 2;
  }

  // ── Conditions ─────────────────────────────────────────────────────────────
  if (review.conditions?.length) {
    checkY(20 + review.conditions.length * 9);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('Conditions to Satisfy', 10, y);
    y += 6;

    review.conditions.forEach((cond, i) => {
      checkY(12);
      doc.setFillColor(255, 243, 199);
      doc.roundedRect(10, y, W - 20, 9, 2, 2, 'F');
      doc.setFontSize(8);
      doc.setTextColor(146, 64, 14);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(`${i + 1}. ${cond}`, W - 30);
      doc.text(lines[0], 15, y + 6);
      y += 11;
    });
    y += 2;
  }

  // ── Data availability ──────────────────────────────────────────────────────
  checkY(30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('Data Availability', 10, y);
  y += 5;

  const da = review.dataAvailability || {};
  const daItems = [
    ['BVN Verification', da.bvn],
    ['NIN Verification', da.nin],
    ['Credit Bureau', da.bureau],
    ['Bank Statement', da.statement],
  ];
  const daRow = daItems.map(([label, ok]) => [label, ok ? 'Available' : 'Missing']);
  autoTable(doc, {
    startY: y,
    margin: { left: 10, right: 10 },
    head: [['Data Source', 'Status']],
    body: daRow,
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 40 } },
    didDrawCell(data) {
      if (data.column.index === 1 && data.section === 'body') {
        const ok = daRow[data.row.index]?.[1] === 'Available';
        doc.setTextColor(ok ? 22 : 220, ok ? 163 : 38, ok ? 74 : 38);
      }
    },
  });
  y = doc.lastAutoTable.finalY + 8;

  // ── Disclaimer ─────────────────────────────────────────────────────────────
  checkY(20);
  doc.setFillColor(241, 245, 249);
  doc.rect(10, y, W - 20, 18, 'F');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'italic');
  const disclaimer = 'This report is generated by the Lucred Credit Engine and is intended solely for the use of the MFI client to whom it is addressed. It constitutes algorithmic decision support only and does not constitute a binding credit assessment or financial advice. All lending decisions must comply with CBN guidelines and your institution\'s internal credit policy.';
  const dLines = doc.splitTextToSize(disclaimer, W - 30);
  doc.text(dLines, 15, y + 5);

  // ── Footer on all pages ────────────────────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 289, W, 8, 'F');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.text('Lucred Technology LLC — Confidential', 10, 294);
    doc.text(`Page ${i} of ${pageCount}`, W - 10, 294, { align: 'right' });
  }

  const safeName = (customer?.name || 'customer').replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`loan_review_${safeName}_${Date.now()}.pdf`);
}
