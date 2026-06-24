const Notification = require('../models/Notification');

async function notify(clientId, { type = 'general', title, body, meta } = {}) {
  return Notification.create({ client: clientId, type, title, body, meta }).catch(() => {});
}

module.exports = { notify };
