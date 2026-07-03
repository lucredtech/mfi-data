const router = require('express').Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const MFIClient = require('../models/MFIClient');
const TeamMember = require('../models/TeamMember');
const { sendPasswordReset, sendWelcome, sendVerificationEmail, sendNewSignupAlert } = require('../utils/mailer');
const Notification = require('../models/Notification');
const ApiKey = require('../models/ApiKey');
const Customer = require('../models/Customer');
const BVNResult = require('../models/BVNResult');
const NINResult = require('../models/NINResult');
const BureauResult = require('../models/BureauResult');
const StatementResult = require('../models/StatementResult');
const UsageLog = require('../models/UsageLog');
const { requireJWT } = require('../middleware/auth');

// Get referral info
router.get('/referral', requireJWT, async (req, res) => {
  try {
    let client = await MFIClient.findById(req.client.id).select('referralCode referralCount').lean();
    if (!client) return res.status(404).json({ error: 'Not found' });
    if (!client.referralCode) {
      const referralCode = crypto.randomBytes(4).toString('hex').toUpperCase();
      client = await MFIClient.findByIdAndUpdate(req.client.id, { referralCode }, { new: true }).select('referralCode referralCount').lean();
    }
    res.json({ referralCode: client.referralCode, referralCount: client.referralCount || 0 });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Get current client profile
router.get('/me', requireJWT, async (req, res) => {
  try {
    const ApiKey    = require('../models/ApiKey');
    const Customer  = require('../models/Customer');
    const UsageLog  = require('../models/UsageLog');
    const client = await MFIClient.findById(req.client.id).select('-password -resetToken -resetTokenExpires').lean();
    if (!client) return res.status(404).json({ error: 'Not found' });
    const [hasApiKey, hasCustomer, hasRun] = await Promise.all([
      ApiKey.exists({ client: req.client.id, isActive: true }),
      Customer.exists({ client: req.client.id }),
      UsageLog.exists({ client: req.client.id }),
    ]);
    res.json({ client, onboarding: {
      emailVerified: !!client.emailVerified,
      hasApiKey:    !!hasApiKey,
      hasCustomer:  !!hasCustomer,
      hasRun:       !!hasRun,
    }});
  } catch (err) {
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

// Update current client profile
router.patch('/me', requireJWT, async (req, res) => {
  try {
    const { organizationName, contactPerson, phone } = req.body;
    const update = {};
    if (organizationName?.trim()) update.organizationName = organizationName.trim();
    if (contactPerson?.trim()) update.contactPerson = contactPerson.trim();
    if (phone !== undefined) update.phone = phone.trim();
    const client = await MFIClient.findByIdAndUpdate(req.client.id, update, { new: true }).select('-password -resetToken -resetTokenExpires').lean();
    res.json({ client });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change password (authenticated)
router.post('/change-password', requireJWT, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'currentPassword and newPassword are required' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });
    const client = await MFIClient.findById(req.client.id);
    if (!client) return res.status(404).json({ error: 'Not found' });
    const ok = await client.comparePassword(currentPassword);
    if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });
    client.password = newPassword;
    await client.save();
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Register a new MFI client
router.post('/register', async (req, res) => {
  try {
    const { organizationName, email, password, contactPerson, phone } = req.body;
    if (!organizationName || !email || !password || !contactPerson)
      return res.status(400).json({ error: 'organizationName, email, password, contactPerson are required' });

    const existing = await MFIClient.findOne({ email });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const { ref } = req.body;
    let referrer = null;
    if (ref) {
      referrer = await MFIClient.findOne({ referralCode: ref });
    }

    const referralCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    const client = await MFIClient.create({
      organizationName, email, password, contactPerson, phone,
      referralCode,
      ...(referrer ? { referredBy: referrer._id } : {}),
    });

    if (referrer) {
      MFIClient.findByIdAndUpdate(referrer._id, { $inc: { referralCount: 1 } }).catch(() => {});
    }

    const token = jwt.sign({ id: client._id, email: client.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      client: { id: client._id, organizationName: client.organizationName, email: client.email, status: client.status },
    });

    // Send verification + welcome emails — fire-and-forget
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const hashedVerify = crypto.createHash('sha256').update(verifyToken).digest('hex');
    MFIClient.findByIdAndUpdate(client._id, {
      emailVerifyToken: hashedVerify,
      emailVerifyExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    }).catch(() => {});
    const verifyUrl = `${process.env.FRONTEND_URL || 'https://engine.lucred.co'}/verify-email?token=${verifyToken}`;
    sendVerificationEmail(email, { organizationName, verifyUrl }).catch(err =>
      console.error('[mailer] verify email failed:', err.message)
    );
    sendWelcome(email, { organizationName }).catch(err =>
      console.error('[mailer] welcome email failed:', err.message)
    );
    const adminUrl = `${process.env.FRONTEND_URL || 'https://engine.lucred.co'}/admin/clients/${client._id}`;
    sendNewSignupAlert({ organizationName, email, contactPerson, phone, adminUrl }).catch(err =>
      console.error('[mailer] admin signup alert failed:', err.message)
    );
  } catch (err) {
    console.error('[auth] register error:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const client = await MFIClient.findOne({ email });
    if (!client || !(await client.comparePassword(password)))
      return res.status(401).json({ error: 'Invalid credentials' });

    if (client.status === 'suspended')
      return res.status(403).json({ error: 'Your account has been suspended. Contact support@lucred.co for assistance.' });

    const token = jwt.sign({ id: client._id, email: client.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      client: { id: client._id, organizationName: client.organizationName, email: client.email, status: client.status },
    });
  } catch (err) {
    console.error('[auth] login error:', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// Forgot password — send reset email
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email is required' });
    const client = await MFIClient.findOne({ email: email.toLowerCase() });
    // Always return 200 to avoid account enumeration
    if (!client) return res.json({ message: 'If that email is registered, a reset link has been sent.' });

    const token = crypto.randomBytes(32).toString('hex');
    client.resetToken = crypto.createHash('sha256').update(token).digest('hex');
    client.resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await client.save();

    const resetUrl = `${process.env.FRONTEND_URL || 'https://engine.lucred.co'}/reset-password?token=${token}`;
    await sendPasswordReset(client.email, resetUrl);

    res.json({ message: 'If that email is registered, a reset link has been sent.' });
  } catch (err) {
    console.error('[auth] forgot-password error:', err);
    res.status(500).json({ error: 'Failed to send reset email. Please try again.' });
  }
});

// Reset password — verify token and set new password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'token and password are required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    const client = await MFIClient.findOne({
      resetToken: hashed,
      resetTokenExpires: { $gt: new Date() },
    });
    if (!client) return res.status(400).json({ error: 'Reset link is invalid or has expired.' });

    client.password = password; // pre-save hook will hash it
    client.resetToken = undefined;
    client.resetTokenExpires = undefined;
    await client.save();

    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    console.error('[auth] reset-password error:', err);
    res.status(500).json({ error: 'Password reset failed. Please try again.' });
  }
});

// Delete account — permanently erases all data for this MFI (NDPR right to erasure)
// Requires password confirmation
router.delete('/account', requireJWT, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'password is required to confirm account deletion' });

    const client = await MFIClient.findById(req.client.id);
    if (!client) return res.status(404).json({ error: 'Account not found' });

    const passwordOk = await client.comparePassword(password);
    if (!passwordOk) return res.status(401).json({ error: 'Incorrect password' });

    const clientId = client._id;

    // Delete all customer data, analysis records, API keys and usage logs
    await Promise.all([
      Customer.deleteMany({ client: clientId }),
      BVNResult.deleteMany({ client: clientId }),
      NINResult.deleteMany({ client: clientId }),
      BureauResult.deleteMany({ client: clientId }),
      StatementResult.deleteMany({ client: clientId }),
      ApiKey.deleteMany({ client: clientId }),
      UsageLog.deleteMany({ client: clientId }),
    ]);

    await MFIClient.findByIdAndDelete(clientId);

    res.json({ success: true, message: 'Account and all associated data have been permanently deleted.' });
  } catch (err) {
    console.error('[auth] account deletion error:', err);
    res.status(500).json({ error: 'Account deletion failed. Please try again.' });
  }
});

// Billing history — lender's own payment records
router.get('/billing', requireJWT, async (req, res) => {
  try {
    const Payment = require('../models/Payment');
    const payments = await Payment.find({ client: req.client.id }).sort({ createdAt: -1 }).lean();
    const client = await MFIClient.findById(req.client.id).select('plan organizationName email').lean();
    res.json({ payments, plan: client?.plan || 'free' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify email address
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'token is required' });
    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    const client = await MFIClient.findOne({ emailVerifyToken: hashed, emailVerifyExpires: { $gt: new Date() } });
    if (!client) return res.status(400).json({ error: 'Verification link is invalid or has expired.' });
    client.emailVerified = true;
    client.emailVerifyToken = undefined;
    client.emailVerifyExpires = undefined;
    await client.save();
    res.json({ message: 'Email verified successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Resend verification email
router.post('/resend-verification', requireJWT, async (req, res) => {
  try {
    const client = await MFIClient.findById(req.client.id);
    if (!client) return res.status(404).json({ error: 'Not found' });
    if (client.emailVerified) return res.status(400).json({ error: 'Email is already verified.' });
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const hashedVerify = crypto.createHash('sha256').update(verifyToken).digest('hex');
    client.emailVerifyToken = hashedVerify;
    client.emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await client.save();
    const verifyUrl = `${process.env.FRONTEND_URL || 'https://engine.lucred.co'}/verify-email?token=${verifyToken}`;
    await sendVerificationEmail(client.email, { organizationName: client.organizationName, verifyUrl });
    res.json({ message: 'Verification email sent.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to resend verification email' });
  }
});

// Validate invite token (GET — for pre-filling the accept form)
router.get('/invite', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'token is required' });
    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    const member = await TeamMember.findOne({ inviteToken: hashed, inviteExpires: { $gt: new Date() }, status: 'pending' })
      .populate('client', 'organizationName')
      .lean();
    if (!member) return res.status(400).json({ error: 'Invite link is invalid or has expired.' });
    res.json({ email: member.email, role: member.role, orgName: member.client?.organizationName });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Accept invite — set name + password, activate member
router.post('/accept-invite', async (req, res) => {
  try {
    const { token, name, password } = req.body;
    if (!token || !name || !password) return res.status(400).json({ error: 'token, name and password are required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    const member = await TeamMember.findOne({ inviteToken: hashed, inviteExpires: { $gt: new Date() }, status: 'pending' })
      .populate('client', 'organizationName');
    if (!member) return res.status(400).json({ error: 'Invite link is invalid or has expired.' });

    member.name = name;
    member.password = password;
    member.status = 'active';
    member.inviteToken = undefined;
    member.inviteExpires = undefined;
    await member.save();

    const jwtToken = jwt.sign(
      { id: member.client._id, email: member.email, _type: 'member', memberId: member._id, role: member.role, name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      token: jwtToken,
      client: { id: member.client._id, organizationName: member.client.organizationName, email: member.email, role: member.role, name },
    });
  } catch (err) {
    console.error('[auth] accept-invite error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Team member login
router.post('/member-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

    const member = await TeamMember.findOne({ email: email.toLowerCase(), status: 'active' })
      .populate('client', 'organizationName status');
    if (!member || !(await member.comparePassword(password)))
      return res.status(401).json({ error: 'Invalid credentials' });
    if (member.client.status !== 'active')
      return res.status(403).json({ error: 'Organisation account is suspended' });

    const jwtToken = jwt.sign(
      { id: member.client._id, email: member.email, _type: 'member', memberId: member._id, role: member.role, name: member.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      token: jwtToken,
      client: { id: member.client._id, organizationName: member.client.organizationName, email: member.email, role: member.role, name: member.name },
    });
  } catch (err) {
    console.error('[auth] member-login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Invoice PDF download
router.get('/billing/invoices/:id', requireJWT, async (req, res) => {
  try {
    const Payment = require('../models/Payment');
    const PDFDocument = require('pdfkit');
    const payment = await Payment.findOne({ _id: req.params.id, client: req.client.id }).lean();
    if (!payment) return res.status(404).json({ error: 'Invoice not found' });
    const client = await MFIClient.findById(req.client.id).select('organizationName email').lean();

    const doc = new PDFDocument({ margin: 60, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="lucred-invoice-${payment._id}.pdf"`);
    doc.pipe(res);

    doc.fontSize(22).fillColor('#6d28d9').text('Lucred Credit Engine', 60, 60);
    doc.fontSize(10).fillColor('#64748b').text('Credit Engine · mfi.lucred.co', 60, 88);
    doc.moveTo(60, 110).lineTo(535, 110).strokeColor('#e2e8f0').stroke();

    doc.fontSize(18).fillColor('#0f172a').text('Invoice', 60, 130);
    doc.fontSize(10).fillColor('#64748b');
    doc.text(`Invoice #: ${payment._id}`, 60, 158);
    doc.text(`Date: ${new Date(payment.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, 60, 172);
    doc.text(`Reference: ${payment.reference || '—'}`, 60, 186);

    doc.fontSize(10).fillColor('#94a3b8').text('BILL TO', 60, 220);
    doc.fontSize(11).fillColor('#0f172a').text(client.organizationName, 60, 236);
    doc.fontSize(10).fillColor('#64748b').text(client.email, 60, 252);

    doc.moveTo(60, 290).lineTo(535, 290).strokeColor('#e2e8f0').stroke();
    doc.fontSize(10).fillColor('#64748b').text('DESCRIPTION', 60, 300).text('AMOUNT', 440, 300, { align: 'right', width: 95 });
    doc.moveTo(60, 316).lineTo(535, 316).strokeColor('#e2e8f0').stroke();

    const planLabel = payment.plan.charAt(0).toUpperCase() + payment.plan.slice(1);
    doc.fontSize(11).fillColor('#0f172a').text(`Lucred Credit Engine ${planLabel} Plan — Monthly Subscription`, 60, 328);
    doc.text(`₦${Number(payment.amount).toLocaleString()}`, 440, 328, { align: 'right', width: 95 });

    doc.moveTo(60, 356).lineTo(535, 356).strokeColor('#e2e8f0').stroke();
    doc.fontSize(12).fillColor('#0f172a').font('Helvetica-Bold').text('Total', 60, 370);
    doc.text(`₦${Number(payment.amount).toLocaleString()}`, 440, 370, { align: 'right', width: 95 });
    doc.font('Helvetica');

    if (payment.note) doc.fontSize(10).fillColor('#64748b').text(`Note: ${payment.note}`, 60, 410);

    doc.fontSize(9).fillColor('#94a3b8').text('Thank you for your business. Questions? support@lucred.co', 60, 720, { align: 'center', width: 475 });
    doc.end();
  } catch (err) {
    console.error('[invoice]', err);
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
});

// Diagnostic: POST /api/auth/test-email  (requires ?secret=<ADMIN_SECRET>)
router.post('/test-email', async (req, res) => {
  const { to, secret } = req.body;
  if (!to || secret !== process.env.ADMIN_SECRET) return res.status(403).json({ error: 'Forbidden' });
  try {
    await sendWelcome(to, { organizationName: 'Lucred Test' });
    res.json({ ok: true, message: `Test email sent to ${to}` });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message, details: err.response?.data });
  }
});

module.exports = router;
