const axios = require('axios');

const BASE_URL = process.env.FIRSTCENTRAL_BASE_URL || 'https://online.firstcentralcreditbureau.com/firstcentralrestv2';

// Cache the DataTicket for 50 minutes (UAT tokens typically expire in 60 min)
let _cachedTicket = null;
let _ticketExpiry = 0;

function clearTicketCache() {
  _cachedTicket = null;
  _ticketExpiry = 0;
}

async function getDataTicket() {
  if (_cachedTicket && Date.now() < _ticketExpiry) return _cachedTicket;

  const username = process.env.FIRSTCENTRAL_USERNAME;
  const password = process.env.FIRSTCENTRAL_PASSWORD;

  const { data } = await axios.post(`${BASE_URL}/login`, {
    username,
    password,
  }, {
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' },
  });

  console.log('[Bureau] login response:', JSON.stringify(data));

  const payload = Array.isArray(data) ? data[0] : data;
  const ticket = payload?.DataTicket ?? payload?.dataTicket ?? payload?.Token ?? payload?.token
    ?? payload?.data?.DataTicket ?? payload?.data?.Token;
  if (!ticket) throw new Error(`FirstCentral login returned no DataTicket. Response: ${JSON.stringify(data)}`);

  _cachedTicket = ticket;
  _ticketExpiry = Date.now() + 270 * 60 * 1000; // 4.5 hours (ticket expires every 5 hours)
  return ticket;
}

// Wrap an API call with one automatic retry if FirstCentral returns 401
// (token expired before our 50-min cache expired — clear and re-login)
async function withRetry(fn) {
  try {
    return await fn();
  } catch (err) {
    if (err.response?.status === 401) {
      clearTicketCache();
      return fn(); // retry once with fresh ticket
    }
    throw err;
  }
}

const ENQUIRY_REASON = 'Application of Existing Credit by a Borrower';

async function matchConsumer({ bvn, name, dateOfBirth, phone }) {
  return withRetry(async () => {
    const DataTicket = await getDataTicket();
    const body = {
      DataTicket,
      EnquiryReason: ENQUIRY_REASON,
      ConsumerName: name || '',
      DateOfBirth: dateOfBirth || '',
      Identification: bvn || phone || '',
    };
    const { data } = await axios.post(`${BASE_URL}/connectConsumerMatch`, body, { timeout: 30000 });
    return data;
  });
}

async function getXScoreConsumerReport({ consumerID, consumerMergeList, subscriberEnquiryEngineID }) {
  return withRetry(async () => {
    const DataTicket = await getDataTicket();
    const body = {
      DataTicket,
      consumerID: consumerID || '',
      consumerMergeList: consumerMergeList || '',
      EnquiryID: `LCR-${Date.now()}`,
      EnquiryReason: ENQUIRY_REASON,
    };
    // SubscriberEnquiryEngineID must come from the match response per FirstCentral requirements
    if (subscriberEnquiryEngineID) body.SubscriberEnquiryEngineID = subscriberEnquiryEngineID;
    const { data } = await axios.post(`${BASE_URL}/GetXScoreConsumerFullCreditReport`, body, { timeout: 60000 });
    return data;
  });
}

module.exports = { getDataTicket, getXScoreConsumerReport, matchConsumer };
