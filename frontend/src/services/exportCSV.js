export function downloadCSV(filename, headers, rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.map(esc), ...rows.map((r) => r.map(esc))];
  const csv = lines.map((r) => r.join(',')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportCustomersCSV(customers) {
  downloadCSV(
    `lucred-customers-${today()}.csv`,
    ['Name', 'Email', 'Phone', 'BVN', 'NIN', 'Address', 'Date Added'],
    customers.map((c) => [
      c.name,
      c.email || '',
      c.phone || '',
      c.bvn || '',
      c.nin || '',
      c.address || '',
      new Date(c.createdAt).toLocaleDateString(),
    ]),
  );
}

export function exportStatementsCSV(statements) {
  downloadCSV(
    `lucred-statements-${today()}.csv`,
    ['Account Name', 'Email', 'Bank', 'Filename', 'Risk Grade', 'Recommendation', 'Status', 'Date'],
    statements.map((s) => [
      s.accountName || '',
      s.email || '',
      s.bankName || '',
      s.filename || '',
      s.result?.overallRiskScore?.overallRiskScore || '',
      s.result?.overallRiskScore?.recommendation || '',
      s.status,
      new Date(s.createdAt).toLocaleDateString(),
    ]),
  );
}

export function exportBVNHistoryCSV(results) {
  downloadCSV(
    `lucred-bvn-verifications-${today()}.csv`,
    ['First Name', 'Last Name', 'Date of Birth', 'Gender', 'Phone', 'BVN (masked)', 'Customer', 'Status', 'Date'],
    results.map((r) => [
      r.result?.firstName || '',
      r.result?.lastName || '',
      r.result?.dateOfBirth || '',
      r.result?.gender || '',
      r.result?.phoneNumber || '',
      r.bvn ? `****${r.bvn.slice(-4)}` : '',
      r.customer?.name || '',
      r.status,
      new Date(r.createdAt).toLocaleDateString(),
    ]),
  );
}

export function exportNINHistoryCSV(results) {
  downloadCSV(
    `lucred-nin-verifications-${today()}.csv`,
    ['First Name', 'Last Name', 'Date of Birth', 'Gender', 'Phone', 'Address', 'NIN (masked)', 'Customer', 'Status', 'Date'],
    results.map((r) => [
      r.result?.firstName || '',
      r.result?.lastName || '',
      r.result?.dateOfBirth || '',
      r.result?.gender || '',
      r.result?.phoneNumber || '',
      r.result?.address || '',
      r.nin ? `****${r.nin.slice(-4)}` : '',
      r.customer?.name || '',
      r.status,
      new Date(r.createdAt).toLocaleDateString(),
    ]),
  );
}

export function exportBureauHistoryCSV(results) {
  downloadCSV(
    `lucred-bureau-checks-${today()}.csv`,
    ['BVN (masked)', 'Credit Score', 'Total Facilities', 'Active Loans', 'Total Outstanding', 'Overdue', 'Delinquency', 'Customer', 'Status', 'Date'],
    results.map((r) => {
      const d = r.result || {};
      const sum = d.summary || d;
      return [
        r.bvn ? `****${r.bvn.slice(-4)}` : '',
        d.creditScore ?? sum.creditScore ?? '',
        d.totalFacilities ?? sum.totalFacilities ?? '',
        d.activeLoans ?? sum.activeLoans ?? '',
        d.totalOutstanding ?? sum.totalOutstanding ?? '',
        d.overdueAmount ?? sum.overdueAmount ?? '',
        d.delinquencyStatus ?? sum.delinquencyStatus ?? '',
        r.customer?.name || '',
        r.status,
        new Date(r.createdAt).toLocaleDateString(),
      ];
    }),
  );
}

export function exportUsageLogCSV(logs) {
  downloadCSV(
    `lucred-api-usage-${today()}.csv`,
    ['Time', 'Endpoint', 'Method', 'Status Code', 'Response Time (ms)'],
    logs.map((l) => [
      new Date(l.createdAt).toLocaleString(),
      l.endpoint,
      l.method,
      l.statusCode,
      l.responseTimeMs,
    ]),
  );
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
