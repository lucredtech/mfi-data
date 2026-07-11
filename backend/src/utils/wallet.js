const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');
const { notify } = require('./notify');
const { sendLowBalanceAlert } = require('./mailer');
const MFIClient = require('../models/MFIClient');

const LOW_BALANCE_THRESHOLD = 1000;

const RATES = {
  BVN_CHECK:          75,
  NIN_CHECK:          100,
  BUREAU_CHECK:       700,
  STATEMENT_ANALYSIS: 500,
  CAC_CHECK:          175,
  TIN_CHECK:          100,
};

const FREE_QUOTA_FIELD = {
  BVN_CHECK:          'bvn',
  NIN_CHECK:          'nin',
  STATEMENT_ANALYSIS: 'statement',
  // BUREAU_CHECK has no free quota
};

const SERVICE_LABEL = {
  BVN_CHECK:          'BVN check',
  NIN_CHECK:          'NIN check',
  BUREAU_CHECK:       'Credit bureau check',
  STATEMENT_ANALYSIS: 'Statement analysis',
  CAC_CHECK:          'CAC verification',
  TIN_CHECK:          'TIN verification',
};

module.exports = { RATES, getOrCreateWallet, deductCharge, refundCharge, creditWallet };

async function getOrCreateWallet(clientId) {
  let wallet = await Wallet.findOne({ client: clientId });
  if (!wallet) wallet = await Wallet.create({ client: clientId });
  return wallet;
}

async function getRateForClient(clientId, service) {
  const client = await MFIClient.findById(clientId).select('customRates').lean();
  return client?.customRates?.[service] ?? RATES[service];
}

// Returns { ok, error, freeQuota } — call before upstream API
async function deductCharge(clientId, service, { customerName, customerId } = {}) {
  const rate = await getRateForClient(clientId, service);
  if (rate == null) return { ok: false, error: `Unknown service: ${service}` };

  const wallet = await getOrCreateWallet(clientId);

  // Reset free quota if the month has rolled over
  const now = new Date();
  if (wallet.freeQuota.resetAt <= now) {
    wallet.freeQuota.bvn = 3;
    wallet.freeQuota.nin = 3;
    wallet.freeQuota.statement = 3;
    wallet.freeQuota.resetAt = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }

  // Try free quota first
  const quotaField = FREE_QUOTA_FIELD[service];
  if (quotaField && wallet.freeQuota[quotaField] > 0) {
    wallet.freeQuota[quotaField] -= 1;
    await wallet.save();
    const desc = `${SERVICE_LABEL[service]}${customerName ? ` — ${customerName}` : ''} (free quota)`;
    await WalletTransaction.create({
      client: clientId, type: 'charge', amount: rate,
      balanceAfter: wallet.balance, service, customerName, customerId,
      description: desc, freeQuota: true,
    });
    return { ok: true, freeQuota: true, charged: 0 };
  }

  // Check wallet balance
  if (wallet.balance < rate) {
    return {
      ok: false,
      error: `Insufficient wallet balance. This check costs ₦${rate.toLocaleString()} but your balance is ₦${wallet.balance.toLocaleString()}. Please top up your wallet.`,
      required: rate,
      balance: wallet.balance,
    };
  }

  // Atomic deduction
  const updated = await Wallet.findOneAndUpdate(
    { client: clientId, balance: { $gte: rate } },
    { $inc: { balance: -rate } },
    { new: true }
  );
  if (!updated) {
    return { ok: false, error: 'Insufficient wallet balance. Please top up your wallet.' };
  }

  const desc = `${SERVICE_LABEL[service]}${customerName ? ` — ${customerName}` : ''}`;
  await WalletTransaction.create({
    client: clientId, type: 'charge', amount: rate,
    balanceAfter: updated.balance, service, customerName, customerId,
    description: desc, freeQuota: false,
  });

  // Low balance alert
  if (updated.balance <= LOW_BALANCE_THRESHOLD) {
    fireLowBalanceAlert(clientId, updated.balance).catch(() => {});
  }

  return { ok: true, freeQuota: false, charged: rate, balanceAfter: updated.balance };
}

// Call on upstream failure to reverse the charge
async function refundCharge(clientId, service, { customerName, customerId } = {}) {
  const rate = await getRateForClient(clientId, service);
  if (rate == null) return;

  const updated = await Wallet.findOneAndUpdate(
    { client: clientId },
    { $inc: { balance: rate } },
    { new: true }
  );
  if (!updated) return;

  await WalletTransaction.create({
    client: clientId, type: 'refund', amount: rate,
    balanceAfter: updated.balance, service, customerName, customerId,
    description: `Refund — ${SERVICE_LABEL[service]} failed${customerName ? ` — ${customerName}` : ''}`,
  });
}

// Credit wallet manually (admin top-up or subscription load)
async function creditWallet(clientId, amount, { type = 'topup', description = 'Manual top-up', ref } = {}) {
  const updated = await Wallet.findOneAndUpdate(
    { client: clientId },
    { $inc: { balance: amount } },
    { new: true, upsert: true }
  );
  await WalletTransaction.create({
    client: clientId, type, amount,
    balanceAfter: updated.balance, description, ref,
  });
  return updated;
}

async function fireLowBalanceAlert(clientId, balance) {
  const client = await MFIClient.findById(clientId).select('email organizationName').lean();
  if (!client) return;

  notify(clientId, {
    type: 'low_balance',
    title: 'Low wallet balance',
    body: `Your wallet balance is ₦${balance.toLocaleString()}. Top up to continue running analyses without interruption.`,
    meta: { balance },
  });

  if (client.email) {
    sendLowBalanceAlert(client.email, {
      organizationName: client.organizationName,
      balance,
      threshold: LOW_BALANCE_THRESHOLD,
    }).catch(() => {});
  }
}
