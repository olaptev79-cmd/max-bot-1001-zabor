'use strict';
require('dotenv').config();

const express = require('express');
const { handleUpdate } = require('./quiz');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';

// Health check
app.get('/', (req, res) => res.json({ status: 'ok', bot: '1001 Zabor' }));

// MAX webhook endpoint
app.post('/webhook', async (req, res) => {
  // Verify secret header if set
  if (WEBHOOK_SECRET) {
    const incoming = req.headers['x-max-bot-api-secret'];
    if (incoming !== WEBHOOK_SECRET) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  }

  const update = req.body;
  res.sendStatus(200); // respond immediately

  try {
    await handleUpdate(update);
  } catch (err) {
    console.error('[Webhook] Error handling update:', err.message);
  }
});

app.listen(PORT, () => {
  console.log(`[Server] MAX bot webhook listening on port ${PORT}`);
  console.log(`[Server] Endpoint: POST /webhook`);
});
