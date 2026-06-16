const axios = require('axios');

const lucredApi = axios.create({
  baseURL: process.env.LUCRED_API_BASE,
  headers: {
    'X-API-KEY': process.env.LUCRED_API_KEY,
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

module.exports = lucredApi;
