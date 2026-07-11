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
    // FirstCentral returns either an object or a single-element array
    return Array.isArray(data) ? data[0] : data;
  });
}

async function getXScoreConsumerReport({ consumerID, consumerMergeList, subscriberEnquiryEngineID, enquiryID }) {
  return withRetry(async () => {
    const DataTicket = await getDataTicket();
    const idNum   = parseInt(consumerID, 10) || 0;
    const engID   = parseInt(subscriberEnquiryEngineID, 10) || 0;
    const mergeID = parseInt(consumerMergeList, 10) || 0;
    const enqID   = parseInt(enquiryID, 10) || 0;
    const body = {
      DataTicket,
      consumerID: idNum,
      EnquiryID: enqID || Date.now(),
      EnquiryReason: ENQUIRY_REASON,
    };
    if (engID)   body.SubscriberEnquiryEngineID = engID;
    if (mergeID) body.consumerMergeList = mergeID;
    const { data } = await axios.post(`${BASE_URL}/GetXScoreConsumerFullCreditReport`, body, { timeout: 60000 });
    return data;
  });
}

// Commercial (business) match — equivalent of connectConsumerMatch for companies
async function matchCommercial({ cacNumber, businessName }) {
  return withRetry(async () => {
    const DataTicket = await getDataTicket();
    const body = {
      DataTicket,
      EnquiryReason: ENQUIRY_REASON,
      CommercialName: businessName || '',
      Identification: cacNumber || '',
    };
    const { data } = await axios.post(`${BASE_URL}/connectCommercialMatch`, body, { timeout: 30000 });
    return Array.isArray(data) ? data[0] : data;
  });
}

// Commercial full credit report — uses fields from matchCommercial response
async function getCommercialFullCreditReport({ commercialID, commercialMergeList, subscriberEnquiryEngineID, enquiryID }) {
  return withRetry(async () => {
    const DataTicket = await getDataTicket();
    const body = {
      DataTicket,
      commercialID:              parseInt(commercialID, 10) || 0,
      EnquiryID:                 parseInt(enquiryID, 10) || Date.now(),
      commercialMergeList:       parseInt(commercialMergeList, 10) || 0,
      SubscriberEnquiryEngineID: parseInt(subscriberEnquiryEngineID, 10) || 0,
    };
    const { data } = await axios.post(`${BASE_URL}/GetCommercialFullCreditReport`, body, { timeout: 60000 });
    return data;
  });
}

module.exports = { getDataTicket, getXScoreConsumerReport, matchConsumer, matchCommercial, getCommercialFullCreditReport };
