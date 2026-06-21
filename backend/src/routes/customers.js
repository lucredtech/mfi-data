const router = require('express').Router();
const { requireJWT } = require('../middleware/auth');
const dojahApi = require('../config/dojahApi');
const Anthropic = require('@anthropic-ai/sdk');
const Customer = require('../models/Customer');
const StatementResult = require('../models/StatementResult');
const BVNResult = require('../models/BVNResult');
const BureauResult = require('../models/BureauResult');
const NINResult = require('../models/NINResult');
const MFIClient = require('../models/MFIClient');
const ApiKey = require('../models/ApiKey');
const UsageLog = require('../models/UsageLog');
const CustomerNote = require('../models/CustomerNote');
const AuditLog = require('../models/AuditLog');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

router.use(requireJWT);

// Escape user input before using in RegExp to prevent injection
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Strip biometric fields from identity results before persisting
function stripBiometrics(result) {
  if (!result || typeof result !== 'object') return result;
  const { image, photo, ...safe } = result;
  return safe;
}

// List customers for the logged-in MFI client
router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    const filter = { client: req.client.id };
    if (q) {
      const safe = escapeRegex(q);
      filter.$or = [
        { name: new RegExp(safe, 'i') },
        { email: new RegExp(safe, 'i') },
        { phone: new RegExp(safe, 'i') },
        { bvn: new RegExp(safe, 'i') },
      ];
    }
    const customers = await Customer.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ customers });
  } catch (err) {
    console.error("[route] unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create customer
router.post('/', async (req, res) => {
  try {
    const { name, email, bvn, nin, phone, customerType } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const customer = await Customer.create({ client: req.client.id, name, email, bvn, nin, phone, customerType: customerType || 'individual' });
    AuditLog.create({ client: req.client.id, action: 'CUSTOMER_CREATED', entityType: 'Customer', entityId: customer._id, label: `Created customer profile: ${name}`, meta: { name, email } }).catch(() => {});
    res.status(201).json({ customer });
  } catch (err) {
    console.error("[route] unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
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
    console.error("[route] unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
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
    console.error("[route] unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete customer — cascade-deletes all associated analysis records
router.delete('/:id', async (req, res) => {
  try {
    const customer = await Customer.findOneAndDelete({ _id: req.params.id, client: req.client.id });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    // Hard-delete all records tied to this customer (NDPR right-to-erasure)
    await Promise.all([
      BVNResult.deleteMany({ customer: customer._id }),
      NINResult.deleteMany({ customer: customer._id }),
      BureauResult.deleteMany({ customer: customer._id }),
      StatementResult.deleteMany({ customer: customer._id }),
      CustomerNote.deleteMany({ customer: customer._id }),
    ]);

    AuditLog.create({ client: req.client.id, action: 'CUSTOMER_DELETED', entityType: 'Customer', label: `Deleted customer and all records: ${customer.name}`, meta: { name: customer.name } }).catch(() => {});
    res.json({ success: true });
  } catch (err) {
    console.error("[route] unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Customer Notes ────────────────────────────────────────────────────────────

// List notes for a customer
router.get('/:id/notes', async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, client: req.client.id }).lean();
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    const notes = await CustomerNote.find({ customer: customer._id }).sort({ createdAt: -1 }).lean();
    res.json({ notes });
  } catch (err) {
    console.error("[route] unhandled error:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a note
router.post('/:id/notes', async (req, res) => {
  try {
    const { text, author } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'text is required' });
    const customer = await Customer.findOne({ _id: req.params.id, client: req.client.id }).lean();
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    const note = await CustomerNote.create({
      client: req.client.id,
      customer: customer._id,
      text: text.trim().slice(0, 2000),
      author: author?.trim() || 'Credit Officer',
    });
    AuditLog.create({ client: req.client.id, action: 'NOTE_ADDED', entityType: 'CustomerNote', entityId: note._id, label: `Note added to customer: ${customer.name}`, meta: { customerName: customer.name } }).catch(() => {});
    res.status(201).json({ note });
  } catch (err) {
    console.error("[route] unhandled error:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a note
router.delete('/:id/notes/:noteId', async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, client: req.client.id }).lean();
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    const note = await CustomerNote.findOneAndDelete({ _id: req.params.noteId, client: req.client.id, customer: customer._id });
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json({ success: true });
  } catch (err) {
    console.error("[route] unhandled error:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Analysis history endpoints (flat, across all customers) ──────────────────

// List all BVN results for this MFI
router.get('/analyses/bvn', async (req, res) => {
  try {
    const { q } = req.query;
    const filter = { client: req.client.id };
    if (q) filter.bvn = new RegExp(escapeRegex(q), 'i');
    const results = await BVNResult.find(filter)
      .populate('customer', 'name email')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    const total = await BVNResult.countDocuments({ client: req.client.id });
    res.json({ total, results });
  } catch (err) {
    console.error("[route] unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// List all NIN results for this MFI
router.get('/analyses/nin', async (req, res) => {
  try {
    const { q } = req.query;
    const filter = { client: req.client.id };
    if (q) filter.nin = new RegExp(escapeRegex(q), 'i');
    const results = await NINResult.find(filter)
      .populate('customer', 'name email')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    const total = await NINResult.countDocuments({ client: req.client.id });
    res.json({ total, results });
  } catch (err) {
    console.error("[route] unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// List all bureau results for this MFI
router.get('/analyses/bureau', async (req, res) => {
  try {
    const { q } = req.query;
    const filter = { client: req.client.id };
    if (q) filter.bvn = new RegExp(escapeRegex(q), 'i');
    const results = await BureauResult.find(filter)
      .populate('customer', 'name email')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    const total = await BureauResult.countDocuments({ client: req.client.id });
    res.json({ total, results });
  } catch (err) {
    console.error("[route] unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
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
    console.error("[route] unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Export all data for this MFI (NDPR data portability)
router.get('/export/all', async (req, res) => {
  try {
    const clientId = req.client.id;
    const [customers, bvnResults, ninResults, bureauResults, statements] = await Promise.all([
      Customer.find({ client: clientId }).lean(),
      BVNResult.find({ client: clientId }).lean(),
      NINResult.find({ client: clientId }).lean(),
      BureauResult.find({ client: clientId }).lean(),
      StatementResult.find({ client: clientId }).lean(),
    ]);

    res.setHeader('Content-Disposition', 'attachment; filename="lucred-data-export.json"');
    res.setHeader('Content-Type', 'application/json');
    res.json({
      exportedAt: new Date().toISOString(),
      organization: req.client.organizationName,
      customers,
      bvnResults,
      ninResults,
      bureauResults,
      statements,
    });
  } catch (err) {
    console.error("[route] unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
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
        image: e.image, // returned to caller but not stored in DB
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
      result: stripBiometrics(normalized),
      status: 'success',
    });

    AuditLog.create({ client: req.client.id, action: 'BVN_CHECK', entityType: 'BVNResult', entityId: saved._id, label: `BVN verification: ****${bvn.slice(-4)}`, meta: { bvnLast4: bvn.slice(-4), customerId } }).catch(() => {});
    res.json({ success: true, data: normalized, resultId: saved._id });
  } catch (err) {
    console.error("[route] unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
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
        photo: e.photo, // returned to caller but not stored in DB
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
      result: stripBiometrics(normalized),
      status: 'success',
    });

    AuditLog.create({ client: req.client.id, action: 'NIN_CHECK', entityType: 'NINResult', entityId: saved._id, label: `NIN verification: ****${nin.slice(-4)}`, meta: { ninLast4: nin.slice(-4), customerId } }).catch(() => {});
    res.json({ success: true, data: normalized, resultId: saved._id });
  } catch (err) {
    console.error("[route] unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
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
    console.error("[route] unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
