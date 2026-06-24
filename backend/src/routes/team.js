const router = require('express').Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const TeamMember = require('../models/TeamMember');
const MFIClient = require('../models/MFIClient');
const { requireJWT } = require('../middleware/auth');
const { sendTeamInvite } = require('../utils/mailer');
const { notify } = require('../utils/notify');

// All team management routes require JWT (org owner or admin member)
router.use(requireJWT);

// Enforce: only org owner or admin members can manage team
function requireAdmin(req, res, next) {
  if (req.client._type === 'member' && req.client.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// List team members
router.get('/', async (req, res) => {
  try {
    const members = await TeamMember.find({ client: req.client.id })
      .select('-password -inviteToken')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ members });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Invite a new team member
router.post('/invite', requireAdmin, async (req, res) => {
  try {
    const { email, role = 'viewer' } = req.body;
    if (!email) return res.status(400).json({ error: 'email is required' });
    if (!['admin', 'viewer'].includes(role)) return res.status(400).json({ error: 'role must be admin or viewer' });

    const existing = await TeamMember.findOne({ email: email.toLowerCase(), client: req.client.id });
    if (existing) return res.status(409).json({ error: 'This email has already been invited' });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Get org name and inviter name
    const org = await MFIClient.findById(req.client.id).select('organizationName contactPerson').lean();
    const inviterName = req.client.name || org?.contactPerson || org?.organizationName || 'Your team';

    const member = await TeamMember.create({
      client: req.client.id,
      email: email.toLowerCase(),
      role,
      status: 'pending',
      inviteToken: hashed,
      inviteExpires: new Date(Date.now() + 48 * 60 * 60 * 1000),
      invitedBy: inviterName,
    });

    const inviteUrl = `${process.env.FRONTEND_URL || 'https://mfi-data.vercel.app'}/accept-invite?token=${rawToken}`;
    sendTeamInvite(email, {
      inviterName,
      orgName: org?.organizationName || 'your organisation',
      inviteUrl,
      role,
    }).catch(e => console.error('[mailer] team invite failed:', e.message));

    notify(req.client.id, {
      type: 'team_invite',
      title: `Invite sent to ${email}`,
      body: `${inviterName} invited ${email} as ${role}.`,
      meta: { email, role },
    });
    res.status(201).json({ member: { ...member.toObject(), inviteToken: undefined } });
  } catch (err) {
    console.error('[team] invite error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update member role
router.patch('/:id/role', requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['admin', 'viewer'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
    const member = await TeamMember.findOneAndUpdate(
      { _id: req.params.id, client: req.client.id },
      { role },
      { new: true }
    ).select('-password -inviteToken');
    if (!member) return res.status(404).json({ error: 'Member not found' });
    res.json({ member });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove a member
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const member = await TeamMember.findOneAndDelete({ _id: req.params.id, client: req.client.id });
    if (!member) return res.status(404).json({ error: 'Member not found' });
    res.json({ message: 'Member removed' });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Resend invite
router.post('/:id/resend', requireAdmin, async (req, res) => {
  try {
    const member = await TeamMember.findOne({ _id: req.params.id, client: req.client.id, status: 'pending' });
    if (!member) return res.status(404).json({ error: 'Pending member not found' });

    const rawToken = crypto.randomBytes(32).toString('hex');
    member.inviteToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    member.inviteExpires = new Date(Date.now() + 48 * 60 * 60 * 1000);
    await member.save();

    const org = await MFIClient.findById(req.client.id).select('organizationName').lean();
    const inviteUrl = `${process.env.FRONTEND_URL || 'https://mfi-data.vercel.app'}/accept-invite?token=${rawToken}`;
    sendTeamInvite(member.email, {
      inviterName: member.invitedBy || org?.organizationName,
      orgName: org?.organizationName || 'your organisation',
      inviteUrl,
      role: member.role,
    }).catch(() => {});

    res.json({ message: 'Invite resent' });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
