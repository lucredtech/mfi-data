import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

function parseBureauSections(result) {
  const arr = result?.data ?? (Array.isArray(result) ? result : []);
  const sec = {};
  arr.forEach(item => {
    const key = Object.keys(item || {})[0];
    if (key) sec[key] = item[key];
  });
  return sec;
}

const fmt = (v) => (v !== undefined && v !== null && v !== '0.00' && v !== 0)
  ? `₦${Number(v).toLocaleString()}` : '—';

export default function exportBureauPDF(record) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const raw = record.result || {};

  const sec = parseBureauSections(raw);
  const scoring = sec.Scoring?.[0] || {};
  const summary = sec.CreditAccountSummary?.[0] || {};
  const accounts = sec.CreditAccountDetails || [];
  const delinquencies = (sec.DeliquencyInformation || []).filter(d => d.SubscriberName || d.AccountNo);
  const personal = sec.PersonalInformation?.[0] || {};

  const score = scoring.TotalConsumerScore ? parseInt(scoring.TotalConsumerScore, 10) : null;
  const scoreColor = score >= 650 ? [22, 163, 74] : score >= 500 ? [245, 158, 11] : [220, 38, 38];

  // Header
  doc.setFillColor(245, 158, 11);
  doc.rect(0, 0, W, 38, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Credit Bureau Report', 14, 16);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 24);
  doc.text(`Lucred Credit Engine · Confidential`, 14, 30);

  // Credit score banner
  if (score !== null) {
    doc.setFillColor(...scoreColor);
    doc.roundedRect(14, 44, 80, 24, 3, 3, 'F');
    doc.setFontSize(26);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(String(score), 26, 60);
    doc.setFontSize(8);
    doc.text('XSCORE', 26, 66);
    if (scoring.Description) {
      doc.setFontSize(10);
      doc.text(scoring.Description, 70, 57, { align: 'center' });
    }
  }

  // Summary table
  const summaryFields = [
    ['BVN (masked)', record.bvn ? `****${record.bvn.slice(-4)}` : '—'],
    ['Total Accounts', summary.TotalAccounts ?? '—'],
    ['Accounts in Good Standing', summary.TotalaccountinGoodcondition ?? summary.TotalaccountinGodcondition ?? '—'],
    ['Accounts in Arrears', summary.TotalAccountarrear ?? '—'],
    ['Amount in Arrears', parseFloat(summary.Amountarrear || 0) > 0 ? `₦${Number(summary.Amountarrear).toLocaleString()}` : '₦0'],
    ['Total Outstanding Debt', parseFloat(summary.TotalOutstandingdebt || 0) > 0 ? `₦${Number(summary.TotalOutstandingdebt).toLocaleString()}` : '₦0'],
    ['Monthly Instalment', parseFloat(summary.TotalMonthlyInstalment || 0) > 0 ? `₦${Number(summary.TotalMonthlyInstalment).toLocaleString()}` : '—'],
    ['Rating', summary.Rating ?? '—'],
    ['Verification Status', record.status],
    ['Date Checked', new Date(record.createdAt).toLocaleString()],
  ];

  doc.autoTable({
    startY: 74,
    head: [['Field', 'Value']],
    body: summaryFields,
    theme: 'striped',
    headStyles: { fillColor: [245, 158, 11], textColor: 255, fontStyle: 'bold', fontSize: 10 },
    alternateRowStyles: { fillColor: [255, 251, 235] },
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 70 } },
    margin: { left: 14, right: 14 },
  });

  // Score sub-components
  if (scoring.RepaymentHistoryScore || scoring.TotalAmountOwedScore) {
    const scoreFields = [
      ['Repayment History Score', scoring.RepaymentHistoryScore ?? '—'],
      ['Amount Owed Score', scoring.TotalAmountOwedScore ?? '—'],
      ['Types of Credit Score', scoring.TypesOfCreditScore ?? '—'],
      ['Length of Credit History', scoring.LengthOfCreditHistoryScore ?? '—'],
    ];
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 8,
      head: [['Score Component', 'Value']],
      body: scoreFields,
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 9 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 70 } },
      margin: { left: 14, right: 14 },
      didDrawPage: (data) => {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('Score Breakdown', 14, data.settings.startY - 3);
      },
    });
  }

  // Credit account details
  if (accounts.length > 0) {
    const accountBody = accounts.map((a) => [
      a.SubscriberName || a.Lender || '—',
      a.AccountType || a.Type || '—',
      a.LoanAmount || a.Amount ? `₦${Number(a.LoanAmount || a.Amount).toLocaleString()}` : '—',
      a.OutstandingBalance || a.BalanceAmount ? `₦${Number(a.OutstandingBalance || a.BalanceAmount).toLocaleString()}` : '—',
      a.AccountStatus || a.Status || '—',
      a.OpeningDate || a.StartDate || '—',
    ]);

    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Lender', 'Type', 'Loan Amount', 'Outstanding', 'Status', 'Opening Date']],
      body: accountBody,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 3 },
      margin: { left: 14, right: 14 },
      didDrawPage: (data) => {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('Credit Account Details', 14, data.settings.startY - 3);
      },
    });
  }

  // Delinquency records
  if (delinquencies.length > 0) {
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 12,
      head: [['Lender', 'Account No', 'Period', 'Months in Arrears']],
      body: delinquencies.map((d) => [d.SubscriberName || '—', d.AccountNo || '—', d.PeriodNum || '—', d.MonthsinArrears || '—']),
      theme: 'grid',
      headStyles: { fillColor: [220, 38, 38], textColor: 255, fontSize: 9 },
      styles: { fontSize: 9, cellPadding: 3 },
      margin: { left: 14, right: 14 },
      didDrawPage: (data) => {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(220, 38, 38);
        doc.text(`Delinquency Records (${delinquencies.length})`, 14, data.settings.startY - 3);
      },
    });
  }

  // Footer on all pages
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFillColor(248, 250, 252);
    doc.rect(0, pageH - 18, W, 18, 'F');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text('This report is generated by the Lucred Credit Engine Developer Portal. For official use only.', 14, pageH - 8);
    doc.text(`Page ${i} of ${pageCount}`, W - 14, pageH - 8, { align: 'right' });
  }

  const bvnSuffix = record.bvn ? record.bvn.slice(-4) : 'report';
  doc.save(`credit-bureau-${bvnSuffix}.pdf`);
}
