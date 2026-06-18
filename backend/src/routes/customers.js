const router = require('express').Router();
const { requireJWT } = require('../middleware/auth');
const dojahApi = require('../config/dojahApi');
const Anthropic = require('@anthropic-ai/sdk');
const Customer = require('../models/Customer');
const StatementResult = require('../models/StatementResult');
const BVNResult = require('../models/BVNResult');
const BureauResult = require('../models/BureauResult');
const NINResult = require('../models/NINResult');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

router.use(requireJWT);

// List customers for the logged-in MFI client
router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    const filter = { client: req.client.id };
    if (q) {
      filter.$or = [
        { name: new RegExp(q, 'i') },
        { email: new RegExp(q, 'i') },
        { phone: new RegExp(q, 'i') },
        { bvn: new RegExp(q, 'i') },
      ];
    }
    const customers = await Customer.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ customers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create customer
router.post('/', async (req, res) => {
  try {
    const { name, email, bvn, nin, phone, customerType } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const customer = await Customer.create({ client: req.client.id, name, email, bvn, nin, phone, customerType: customerType || 'individual' });
    res.status(201).json({ customer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single customer with all their analyses
router.get('/:id', async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, client: req.client.id }).lean();
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const [statements, bvnResults, ninResults, bureauResults] = await Promise.all([
      StatementResult.find({ customer: customer._id }).sort({ createdAt: -1 }).lean(),
      BVNResult.find({ customer: customer._id }).sort({ createdAt: -1 }).lean(),
      NINResult.find({ customer: customer._id }).sort({ createdAt: -1 }).lean(),
      BureauResult.find({ customer: customer._id }).sort({ createdAt: -1 }).lean(),
    ]);

    res.json({ customer, statements, bvnResults, ninResults, bureauResults });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update customer
router.patch('/:id', async (req, res) => {
  try {
    const { name, email, bvn, nin, phone, address, customerType } = req.body;
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, client: req.client.id },
      { name, email, bvn, nin, phone, address, customerType },
      { new: true }
    );
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json({ customer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete customer
router.delete('/:id', async (req, res) => {
  try {
    const customer = await Customer.findOneAndDelete({ _id: req.params.id, client: req.client.id });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Analysis history endpoints (flat, across all customers) ──────────────────

// List all BVN results for this MFI
router.get('/analyses/bvn', async (req, res) => {
  try {
    const { q } = req.query;
    const filter = { client: req.client.id };
    if (q) filter.bvn = new RegExp(q, 'i');
    const results = await BVNResult.find(filter)
      .populate('customer', 'name email')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    const total = await BVNResult.countDocuments({ client: req.client.id });
    res.json({ total, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List all NIN results for this MFI
router.get('/analyses/nin', async (req, res) => {
  try {
    const { q } = req.query;
    const filter = { client: req.client.id };
    if (q) filter.nin = new RegExp(q, 'i');
    const results = await NINResult.find(filter)
      .populate('customer', 'name email')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    const total = await NINResult.countDocuments({ client: req.client.id });
    res.json({ total, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List all bureau results for this MFI
router.get('/analyses/bureau', async (req, res) => {
  try {
    const { q } = req.query;
    const filter = { client: req.client.id };
    if (q) filter.bvn = new RegExp(q, 'i');
    const results = await BureauResult.find(filter)
      .populate('customer', 'name email')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    const total = await BureauResult.countDocuments({ client: req.client.id });
    res.json({ total, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dashboard-wide stats (all analysis types)
router.get('/analyses/stats', async (req, res) => {
  try {
    const clientId = req.client.id;
    const [statements, bvn, nin, bureau, customers] = await Promise.all([
      StatementResult.countDocuments({ client: clientId }),
      BVNResult.countDocuments({ client: clientId }),
      NINResult.countDocuments({ client: clientId }),
      BureauResult.countDocuments({ client: clientId }),
      Customer.countDocuments({ client: clientId }),
    ]);
    const [stFailed, bvnFailed, ninFailed, buFailed] = await Promise.all([
      StatementResult.countDocuments({ client: clientId, status: 'failed' }),
      BVNResult.countDocuments({ client: clientId, status: 'failed' }),
      NINResult.countDocuments({ client: clientId, status: 'failed' }),
      BureauResult.countDocuments({ client: clientId, status: 'failed' }),
    ]);
    res.json({
      customers,
      statements: { total: statements, failed: stFailed },
      bvn: { total: bvn, failed: bvnFailed },
      nin: { total: nin, failed: ninFailed },
      bureau: { total: bureau, failed: buFailed },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Dashboard-level identity verification (JWT auth, no API key needed) ─────

// BVN verification via dashboard (Dojah)
router.post('/verify/bvn', async (req, res) => {
  try {
    const { bvn, customerId } = req.body;
    if (!bvn) return res.status(400).json({ error: 'bvn is required' });

    let normalized;
    try {
      const { data } = await dojahApi.get('/api/v1/kyc/bvn/advance', { params: { bvn } });
      const e = data.entity || {};
      normalized = {
        isValid: true,
        bvn,
        firstName: e.first_name,
        lastName: e.last_name,
        middleName: e.middle_name,
        dateOfBirth: e.date_of_birth,
        gender: e.gender,
        phoneNumber: e.phone_number1 || e.phone_number,
        email: e.email,
        enrollmentBank: e.enrollment_bank,
        enrollmentBranch: e.enrollment_branch,
        registrationDate: e.registration_date,
        nin: e.nin,
        watchListed: e.watch_listed,
        levelOfAccount: e.level_of_account,
        image: e.image,
      };
    } catch (upstreamErr) {
      await BVNResult.create({
        client: req.client.id,
        customer: customerId || undefined,
        bvn,
        result: upstreamErr.response?.data || {},
        status: 'failed',
      }).catch(() => {});
      const status = upstreamErr.response?.status || 502;
      return res.status(status).json({ error: upstreamErr.response?.data?.error || 'BVN verification failed' });
    }

    const saved = await BVNResult.create({
      client: req.client.id,
      customer: customerId || undefined,
      bvn,
      result: normalized,
      status: 'success',
    });

    res.json({ success: true, data: normalized, resultId: saved._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// NIN verification via dashboard (Dojah)
router.post('/verify/nin', async (req, res) => {
  try {
    const { nin, customerId } = req.body;
    if (!nin) return res.status(400).json({ error: 'nin is required' });

    let normalized;
    try {
      const { data } = await dojahApi.get('/api/v1/kyc/nin', { params: { nin } });
      const e = data.entity || {};
      normalized = {
        isValid: true,
        nin,
        firstName: e.first_name,
        lastName: e.last_name,
        middleName: e.middle_name,
        dateOfBirth: e.date_of_birth,
        gender: e.gender,
        phoneNumber: e.phone_number,
        email: e.email,
        address: e.address,
        stateOfOrigin: e.state_of_origin,
        lga: e.lga,
        nationality: e.nationality,
        religion: e.religion,
        maritalStatus: e.marital_status,
        watchListed: e.watch_listed,
        photo: e.photo,
      };
    } catch (upstreamErr) {
      await NINResult.create({
        client: req.client.id,
        customer: customerId || undefined,
        nin,
        result: upstreamErr.response?.data || {},
        status: 'failed',
      }).catch(() => {});
      const status = upstreamErr.response?.status || 502;
      return res.status(status).json({ error: upstreamErr.response?.data?.error || 'NIN verification failed' });
    }

    const saved = await NINResult.create({
      client: req.client.id,
      customer: customerId || undefined,
      nin,
      result: normalized,
      status: 'success',
    });

    res.json({ success: true, data: normalized, resultId: saved._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI loan eligibility review
router.post('/:id/loan-review', async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, client: req.client.id }).lean();
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const [statements, bvnResults, ninResults, bureauResults] = await Promise.all([
      StatementResult.find({ customer: customer._id }).sort({ createdAt: -1 }).lean(),
      BVNResult.find({ customer: customer._id }).sort({ createdAt: -1 }).lean(),
      NINResult.find({ customer: customer._id }).sort({ createdAt: -1 }).lean(),
      BureauResult.find({ customer: customer._id }).sort({ createdAt: -1 }).lean(),
    ]);

    const latestStatement = statements.find(s => s.status === 'success');
    const latestBVN = bvnResults.find(r => r.status === 'success');
    const latestNIN = ninResults.find(r => r.status === 'success');
    const latestBureau = bureauResults.find(r => r.status === 'success');

    const sections = [];

    sections.push(`## Customer Profile\nName: ${customer.name}\nEmail: ${customer.email || 'N/A'}\nPhone: ${customer.phone || 'N/A'}\nBVN: ${customer.bvn || 'N/A'}\nNIN: ${customer.nin || 'N/A'}`);

    if (latestBVN) {
      const b = latestBVN.result;
      sections.push(`## BVN Identity Data\nName: ${b.firstName} ${b.middleName || ''} ${b.lastName}\nDOB: ${b.dateOfBirth || 'N/A'}\nGender: ${b.gender || 'N/A'}\nPhone: ${b.phoneNumber || 'N/A'}\nEmail: ${b.email || 'N/A'}\nEnrollment Bank: ${b.enrollmentBank || 'N/A'}\nLevel of Account: ${b.levelOfAccount || 'N/A'}\nWatchlisted: ${b.watchListed ?? 'N/A'}\nNIN on BVN: ${b.nin || 'N/A'}`);
    }

    if (latestNIN) {
      const n = latestNIN.result;
      sections.push(`## NIN Identity Data\nName: ${n.firstName} ${n.middleName || ''} ${n.lastName}\nDOB: ${n.dateOfBirth || 'N/A'}\nGender: ${n.gender || 'N/A'}\nPhone: ${n.phoneNumber || 'N/A'}\nAddress: ${n.address || 'N/A'}\nState of Origin: ${n.stateOfOrigin || 'N/A'}\nMarital Status: ${n.maritalStatus || 'N/A'}\nNationality: ${n.nationality || 'N/A'}\nWatchlisted: ${n.watchListed ?? 'N/A'}`);
    }

    if (latestBVN && latestNIN) {
      const discFields = ['firstName', 'lastName', 'dateOfBirth', 'gender', 'phoneNumber'];
      const discrepancies = discFields
        .filter(f => latestBVN.result[f] && latestNIN.result[f] && String(latestBVN.result[f]).toLowerCase() !== String(latestNIN.result[f]).toLowerCase())
        .map(f => `${f}: BVN="${latestBVN.result[f]}" vs NIN="${latestNIN.result[f]}"`);
      if (discrepancies.length > 0) {
        sections.push(`## Identity Discrepancies\n${discrepancies.join('\n')}`);
      }
    }

    if (latestBureau) {
      const bd = latestBureau.result;
      const summary = bd.summary || bd;
      sections.push(`## Credit Bureau Data\nCredit Score: ${bd.creditScore ?? summary.creditScore ?? 'N/A'}\nTotal Facilities: ${bd.totalFacilities ?? summary.totalFacilities ?? 'N/A'}\nActive Loans: ${bd.activeLoans ?? summary.activeLoans ?? 'N/A'}\nTotal Outstanding: ${bd.totalOutstanding ?? summary.totalOutstanding ?? 'N/A'}\nOverdue Amount: ${bd.overdueAmount ?? summary.overdueAmount ?? 'N/A'}\nDelinquency Status: ${bd.delinquencyStatus ?? summary.delinquencyStatus ?? 'N/A'}`);
    }

    if (latestStatement) {
      const r = latestStatement.result || {};
      const risk = r.overallRiskScore || {};
      const cf = r.cashFlowAnalysis || {};
      const inc = r.incomeSourceAnalysis || {};
      const debt = r.debtServicing || {};
      sections.push(`## Bank Statement Analysis\nRisk Grade: ${risk.overallRiskScore || 'N/A'}\nRecommendation: ${risk.recommendation || 'N/A'}\nTotal Cash Inflow: ${cf.totalCashInflow ?? 'N/A'}\nTotal Cash Outflow: ${cf.totalCashOutflow ?? 'N/A'}\nMonthly Avg Income: ${inc.monthlyAverageIncome ?? 'N/A'}\nSalary Earner: ${inc.isSalaryEarner ?? 'N/A'}\nDebt-to-Income Ratio: ${debt.loanRepayments?.DebtToIncomeRatio ?? 'N/A'}%\nIncome Stability Score: ${risk.scoreBreakdown?.incomeStability ?? 'N/A'}\nDebt Servicing Score: ${risk.scoreBreakdown?.debtServicing ?? 'N/A'}\nSpending Behavior Score: ${risk.scoreBreakdown?.spendingBehavior ?? 'N/A'}\nLiquidity Score: ${risk.scoreBreakdown?.liquidity ?? 'N/A'}`);
    }

    const prompt = `You are a senior credit analyst at a Nigerian microfinance institution. Review the following customer data and provide a structured loan eligibility assessment.

${sections.join('\n\n')}

Based on all available data, provide a JSON response (and ONLY JSON, no other text) in this exact structure:
{
  "verdict": "ELIGIBLE" | "CONDITIONAL" | "NOT_ELIGIBLE",
  "suggestedMinAmount": <number in NGN or null>,
  "suggestedMaxAmount": <number in NGN or null>,
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "summary": "<2-3 sentence overall assessment>",
  "categories": {
    "identityIntegrity": { "score": <0-100>, "status": "PASS"|"WARN"|"FAIL", "notes": "<brief note>" },
    "creditHistory": { "score": <0-100>, "status": "PASS"|"WARN"|"FAIL", "notes": "<brief note>" },
    "incomeAndCashFlow": { "score": <0-100>, "status": "PASS"|"WARN"|"FAIL", "notes": "<brief note>" },
    "debtServicing": { "score": <0-100>, "status": "PASS"|"WARN"|"FAIL", "notes": "<brief note>" },
    "riskProfile": { "score": <0-100>, "status": "PASS"|"WARN"|"FAIL", "notes": "<brief note>" }
  },
  "conditions": ["<condition if CONDITIONAL, else empty array>"],
  "flags": ["<any red flags or concerns>"],
  "dataAvailability": { "bvn": ${!!latestBVN}, "nin": ${!!latestNIN}, "bureau": ${!!latestBureau}, "statement": ${!!latestStatement} }
}`;

    const stream = await anthropic.messages.stream({
      model: 'claude-opus-4-8',
      max_tokens: 2048,
      thinking: { type: 'adaptive' },
      messages: [{ role: 'user', content: prompt }],
    });

    const message = await stream.finalMessage();
    const textContent = message.content.find(b => b.type === 'text');
    if (!textContent) return res.status(502).json({ error: 'No response from AI' });

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(502).json({ error: 'Could not parse AI response' });

    const review = JSON.parse(jsonMatch[0]);
    res.json({ success: true, review });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
