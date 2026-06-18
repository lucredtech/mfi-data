const axios = require('axios');

const dojahApi = axios.create({
  baseURL: 'https://api.dojah.io',
  headers: {
    'AppId': process.env.DOJAH_APP_ID,
    'Authorization': process.env.DOJAH_SECRET_KEY,
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

module.exports = dojahApi;
