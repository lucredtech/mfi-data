// Intercepts requests from test-mode API keys and returns deterministic mock data.
// Import and place AFTER requireApiKey on any route you want sandboxed.

const MOCK_BVN = {
  bvn: '22200000000',
  firstName: 'Test', middleName: 'Sandbox', lastName: 'User',
  dateOfBirth: '1990-01-01', phoneNumber: '08000000000',
  gender: 'Male', nationality: 'Nigerian',
  enrollmentBank: 'First Bank', enrollmentBranch: 'Lagos Island',
  image: null,
};

const MOCK_NIN = {
  nin: '00000000000',
  firstname: 'Test', middlename: 'Sandbox', surname: 'User',
  birthdate: '01-01-1990', gender: 'M', phone: '08000000000',
  photo: null,
};

const MOCK_BUREAU = {
  status: 'success',
  creditScore: 720,
  creditRating: 'Good',
  totalLoans: 2,
  activeLoans: 1,
  nonPerformingLoans: 0,
  totalOutstanding: 150000,
  repaymentHistory: 'Excellent',
};

const MOCK_STATEMENT = {
  status: 'success',
  bankName: 'Test Bank',
  accountName: 'Test Sandbox User',
  accountNumber: '0000000000',
  currency: 'NGN',
  totalCredits: 500000,
  totalDebits: 320000,
  averageMonthlyCredit: 125000,
  averageMonthlyDebit: 80000,
  monthlyNetCashflow: 45000,
  overallRiskScore: { overallRiskScore: 'B', label: 'Low Risk' },
};

const MOCK_LOAN_REVIEW = {
  verdict: 'ELIGIBLE',
  summary: 'Sandbox test — applicant meets all criteria.',
  maxRecommendedLoan: 500000,
  recommendedTenor: 12,
  dti: 0.28,
  repaymentSchedule: [
    { month: 1, payment: 46000, principal: 41000, interest: 5000, balance: 459000 },
    { month: 2, payment: 46000, principal: 41000, interest: 5000, balance: 418000 },
  ],
};

const sandboxMock = (type) => (req, res, next) => {
  if (!req._sandbox) return next();
  switch (type) {
    case 'bvn': return res.json({ success: true, sandbox: true, data: MOCK_BVN });
    case 'nin': return res.json({ success: true, sandbox: true, data: MOCK_NIN });
    case 'bureau': return res.json({ success: true, sandbox: true, data: MOCK_BUREAU });
    case 'statement': return res.json({ success: true, sandbox: true, result: MOCK_STATEMENT });
    case 'loan_review': return res.json({ success: true, sandbox: true, review: MOCK_LOAN_REVIEW });
    default: return next();
  }
};

module.exports = { sandboxMock };
