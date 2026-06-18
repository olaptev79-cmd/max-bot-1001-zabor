'use strict';
const axios = require('axios');

const AMO_DOMAIN = process.env.AMOCRM_DOMAIN;
const AMO_TOKEN = process.env.AMOCRM_ACCESS_TOKEN;
const AMO_PIPELINE_ID = parseInt(process.env.AMOCRM_PIPELINE_ID) || 0;
const AMO_STAGE_ID = parseInt(process.env.AMOCRM_STAGE_ID) || 0;

async function sendLeadToAmoCRM(leadData) {
  if (!AMO_DOMAIN || !AMO_TOKEN) {
    console.warn('[amoCRM] Credentials not configured, skipping lead creation.');
    return;
  }

  const url = `https://${AMO_DOMAIN}/api/v4/leads/complex`;
  const headers = {
    Authorization: `Bearer ${AMO_TOKEN}`,
    'Content-Type': 'application/json'
  };

  const contactName = leadData.name || 'Клиент';
  const contactPhone = leadData.phone || '';

  const leadName = `Заявка на забор: ${leadData.fence_type || 'Неизвестно'}`;

  // Build notes/custom fields as needed
  let notes = `Тип забора: ${leadData.fence_type}\nДлина: ${leadData.length} м\nВысота: ${leadData.height}\n`;
  if (leadData.gates) {
    notes += `Ворота: ${leadData.gate_type}`;
    if (leadData.gate_automation) notes += ` (${leadData.gate_automation})`;
    notes += '\n';
  } else {
    notes += 'Ворота: Нет\n';
  }
  notes += `Калитка: ${leadData.wicket ? 'Да' : 'Нет'}\n`;
  if (leadData.services && leadData.services.length) {
    notes += `Доп. услуги: ${leadData.services.join(', ')}\n`;
  }
  notes += `Адрес: ${leadData.address}\n`;

  const payload = [
    {
      name: leadName,
      price: 0,
      pipeline_id: AMO_PIPELINE_ID,
      status_id: AMO_STAGE_ID,
      _embedded: {
        contacts: [
          {
            first_name: contactName,
            custom_fields_values: [
              {
                field_code: 'PHONE',
                values: [
                  {
                    enum_code: 'WORK',
                    value: contactPhone
                  }
                ]
              }
            ]
          }
        ]
      },
      custom_fields_values: [],
      _embedded: {
        tags: [
          { name: 'MAX Bot' },
          { name: leadData.fence_type || 'Забор' }
        ]
      }
    }
  ];

  try {
    const resp = await axios.post(url, payload, { headers });
    console.log('[amoCRM] Lead created:', resp.data);
  } catch (err) {
    console.error('[amoCRM] Error creating lead:', err.response?.data || err.message);
    throw err;
  }
}

module.exports = { sendLeadToAmoCRM };
