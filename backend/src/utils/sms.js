const axios = require('axios');

const BASE = process.env.SENDCHAMP_URL || 'https://api.sendchamp.com/api/v1/';
const KEY = process.env.SENDCHAMP_PUBLIC_KEY;

async function sendSMS(to, message) {
  if (!KEY) { console.warn('[sms] SENDCHAMP_PUBLIC_KEY not set — skipping'); return; }
  // Normalise Nigerian numbers to international format
  const number = to.replace(/^0/, '234').replace(/\D/g, '');
  await axios.post(`${BASE}sms/send`, {
    to: [number],
    message,
    sender_name: 'Lucred',
    route: 'non_dnd',
  }, {
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
  });
}

async function smsBorrowerDecision(phone, { borrowerName, verdict, organizationName }) {
  const label = verdict === 'ELIGIBLE' ? 'approved' : verdict === 'CONDITIONAL' ? 'conditionally approved' : 'not approved';
  const msg = `Hi ${borrowerName}, your loan application with ${organizationName} has been ${label}. Contact them for next steps. Powered by Lucred.`;
  await sendSMS(phone, msg);
}

async function smsPlanLimitWarning(phone, { organizationName, used, limit, plan }) {
  const pct = Math.round((used / limit) * 100);
  const msg = `Lucred alert: ${organizationName}, you've used ${pct}% of your ${plan} plan API quota (${used}/${limit} calls). Upgrade at mfi.lucred.co/pricing to avoid disruption.`;
  await sendSMS(phone, msg);
}

module.exports = { smsBorrowerDecision, smsPlanLimitWarning };
