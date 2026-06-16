const axios = require('axios');

const lucredApi = axios.create({
  baseURL: process.env.LUCRED_API_BASE,
  headers: {
    Authorization: `Bearer ${process.env.LUCRED_ADMIN_TOKEN}`,
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

module.exports = lucredApi;
