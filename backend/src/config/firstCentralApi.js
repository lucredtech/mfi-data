const axios = require('axios');

const BASE_URL = 'https://uat.firstcentralcreditbureau.com/firstCentralrestv2';

// Cache the DataTicket for 50 minutes (UAT tokens typically expire in 60 min)
let _cachedTicket = null;
let _ticketExpiry = 0;

async function getDataTicket() {
  if (_cachedTicket && Date.now() < _ticketExpiry) return _cachedTicket;

  const { data } = await axios.post(`${BASE_URL}/login`, {
    username: process.env.FIRSTCENTRAL_USERNAME,
    password: process.env.FIRSTCENTRAL_PASSWORD,
  }, { timeout: 30000 });

  const ticket = data?.DataTicket ?? data?.dataTicket ?? data?.token ?? data?.Token;
  if (!ticket) throw new Error('FirstCentral login failed — no DataTicket in response');

  _cachedTicket = ticket;
  _ticketExpiry = Date.now() + 50 * 60 * 1000; // 50 minutes
  return ticket;
}

async function getXScoreConsumerReport({ consumerID, consumerMergeList, enquiryReason = 'Credit Application' }) {
  const DataTicket = await getDataTicket();
  const body = {
    DataTicket,
    consumerID: consumerID || '',
    consumerMergeList: consumerMergeList || '',
    EnquiryID: `LCR-${Date.now()}`,
    EnquiryReason: enquiryReason,
  };
  if (process.env.FIRSTCENTRAL_SUBSCRIBER_ID) body.SubscriberEnquiryEngineID = process.env.FIRSTCENTRAL_SUBSCRIBER_ID;
  const { data } = await axios.post(`${BASE_URL}/GetXScoreConsumerFullCreditReport`, body, { timeout: 60000 });
  return data;
}

async function matchConsumer({ bvn, name, dateOfBirth, phone }) {
  const DataTicket = await getDataTicket();
  const body = {
    DataTicket,
    EnquiryReason: 'Credit Application',
    ConsumerName: name || '',
    DateOfBirth: dateOfBirth || '',
    Identification: bvn || phone || '',
  };
  if (process.env.FIRSTCENTRAL_SUBSCRIBER_ID) body.SubscriberEnquiryEngineID = process.env.FIRSTCENTRAL_SUBSCRIBER_ID;
  const { data } = await axios.post(`${BASE_URL}/connectConsumerMatch`, body, { timeout: 30000 });
  return data;
}

module.exports = { getDataTicket, getXScoreConsumerReport, matchConsumer };
