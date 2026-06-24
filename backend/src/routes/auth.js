const router = require('express').Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const MFIClient = require('../models/MFIClient');
const { sendPasswordReset, sendWelcome } = require('../utils/mailer');
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
    const client = await MFIClient.findById(req.client.id).select('referralCode referralCount').lean();
    if (!client) return res.status(404).json({ error: 'Not found' });
    res.json({ referralCode: client.referralCode, referralCount: client.referralCount || 0 });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Get current client profile
router.get('/me', requireJWT, async (req, res) => {
  try {
    const client = await MFIClient.findById(req.client.id).select('-password -resetToken -resetTokenExpires').lean();
    if (!client) return res.status(404).json({ error: 'Not found' });
    res.json({ client });
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

    // Auto-generate a first API key
    const apiKey = await ApiKey.create({ client: client._id, label: 'Default Key' });

    const token = jwt.sign({ id: client._id, email: client.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      client: { id: client._id, organizationName: client.organizationName, email: client.email },
      apiKey: apiKey.key,
    });

    // Fire-and-forget — don't block the response
    sendWelcome(email, { organizationName }).catch(err =>
      console.error('[mailer] welcome email failed:', err.message)
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
      return res.status(403).json({ error: 'Account suspended' });

    const token = jwt.sign({ id: client._id, email: client.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      client: { id: client._id, organizationName: client.organizationName, email: client.email },
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

    const resetUrl = `${process.env.FRONTEND_URL || 'https://mfi-data.vercel.app'}/reset-password?token=${token}`;
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

module.exports = router;
