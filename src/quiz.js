'use strict';
const axios = require('axios');
const { sendLeadToAmoCRM } = require('./amocrm');

const TOKEN = process.env.MAX_BOT_TOKEN;
const BASE_URL = 'https://botapi.messenger.yandex.net/bot/v1';

// In-memory session store { chatId: {...state} }
const sessions = {};

// Helper: send message via MAX API
async function sendMessage(chatId, text, keyboard = null) {
  const url = `${BASE_URL}/messages/sendText/?bot_id=${TOKEN}`;
  const payload = { chat_id: chatId, text };
  if (keyboard) payload.keyboard = keyboard;
  await axios.post(url, payload, { headers: { 'Content-Type': 'application/json' } });
}

function getSession(chatId) {
  if (!sessions[chatId]) {
    sessions[chatId] = { step: 'start', data: {} };
  }
  return sessions[chatId];
}

function resetSession(chatId) {
  sessions[chatId] = { step: 'start', data: {} };
}

// Step handlers
const steps = {
  start: async (msg, session) => {
    const text = `Здравствуйте! Я Бот компании «1001 забор».\nМы строим любые заборы под ключ: от классики до премиум-решений.\nВыберите тип забора — и я задам несколько уточняющих вопросов, чтобы подготовить точную цену и предложение.`;
    const kb = {
      rows: [
        [{ text: 'Профнастил' }, { text: 'Евроштакетник' }],
        [{ text: 'Сетка-рабица' }, { text: '3D-панели' }],
        [{ text: 'Жалюзи' }]
      ]
    };
    await sendMessage(msg.chat.chat_id, text, kb);
    session.step = 'fence_type';
  },

  fence_type: async (msg, session) => {
    const txt = msg.text.trim();
    if (!['Профнастил', 'Евроштакетник', 'Сетка-рабица', '3D-панели', 'Жалюзи'].includes(txt)) {
      return await sendMessage(msg.chat.chat_id, 'Пожалуйста, выберите тип забора из предложенных кнопок.');
    }
    session.data.fence_type = txt;
    await sendMessage(msg.chat.chat_id, 'Укажите общую длину забора (в метрах):', null);
    session.step = 'length';
  },

  length: async (msg, session) => {
    const val = parseFloat(msg.text.trim());
    if (isNaN(val) || val <= 0) {
      return await sendMessage(msg.chat.chat_id, 'Введите положительное число.');
    }
    session.data.length = val;
    const kb = {
      rows: [
        [{ text: '1.5 м' }, { text: '1.8 м' }],
        [{ text: '2.0 м' }, { text: '2.5 м' }],
        [{ text: 'Другая' }]
      ]
    };
    await sendMessage(msg.chat.chat_id, 'Какая высота забора вам нужна?', kb);
    session.step = 'height';
  },

  height: async (msg, session) => {
    const txt = msg.text.trim();
    if (txt === 'Другая') {
      await sendMessage(msg.chat.chat_id, 'Введите желаемую высоту в метрах:', null);
      session.step = 'height_custom';
      return;
    }
    const known = ['1.5 м', '1.8 м', '2.0 м', '2.5 м'];
    if (!known.includes(txt)) {
      return await sendMessage(msg.chat.chat_id, 'Выберите один из вариантов или нажмите «Другая».');
    }
    session.data.height = txt;
    const kb = { rows: [[{ text: 'Да' }, { text: 'Нет' }]] };
    await sendMessage(msg.chat.chat_id, 'Планируете ли ворота?', kb);
    session.step = 'gates';
  },

  height_custom: async (msg, session) => {
    const val = parseFloat(msg.text.trim());
    if (isNaN(val) || val <= 0) {
      return await sendMessage(msg.chat.chat_id, 'Введите положительное число.');
    }
    session.data.height = val + ' м';
    const kb = { rows: [[{ text: 'Да' }, { text: 'Нет' }]] };
    await sendMessage(msg.chat.chat_id, 'Планируете ли ворота?', kb);
    session.step = 'gates';
  },

  gates: async (msg, session) => {
    const txt = msg.text.trim();
    if (txt === 'Да') {
      session.data.gates = true;
      const kb = { rows: [[{ text: 'Откатные' }, { text: 'Распашные' }]] };
      await sendMessage(msg.chat.chat_id, 'Какие ворота рассматриваете?', kb);
      session.step = 'gate_type';
    } else if (txt === 'Нет') {
      session.data.gates = false;
      session.data.gate_type = null;
      session.data.gate_automation = null;
      const kb = { rows: [[{ text: 'Да' }, { text: 'Нет' }]] };
      await sendMessage(msg.chat.chat_id, 'Нужна ли отдельная калитка?', kb);
      session.step = 'wicket';
    } else {
      await sendMessage(msg.chat.chat_id, 'Пожалуйста, выберите «Да» или «Нет».');
    }
  },

  gate_type: async (msg, session) => {
    const txt = msg.text.trim();
    if (txt === 'Откатные') {
      session.data.gate_type = txt;
      const kb = { rows: [[{ text: 'Автоматический' }, { text: 'Механический' }]] };
      await sendMessage(msg.chat.chat_id, 'Привод ворот: автоматический или механический?', kb);
      session.step = 'gate_automation';
    } else if (txt === 'Распашные') {
      session.data.gate_type = txt;
      session.data.gate_automation = 'Механический';
      const kb = { rows: [[{ text: 'Да' }, { text: 'Нет' }]] };
      await sendMessage(msg.chat.chat_id, 'Нужна ли отдельная калитка?', kb);
      session.step = 'wicket';
    } else {
      await sendMessage(msg.chat.chat_id, 'Выберите «Откатные» или «Распашные».');
    }
  },

  gate_automation: async (msg, session) => {
    const txt = msg.text.trim();
    if (txt === 'Автоматический' || txt === 'Механический') {
      session.data.gate_automation = txt;
      const kb = { rows: [[{ text: 'Да' }, { text: 'Нет' }]] };
      await sendMessage(msg.chat.chat_id, 'Нужна ли отдельная калитка?', kb);
      session.step = 'wicket';
    } else {
      await sendMessage(msg.chat.chat_id, 'Выберите «Автоматический» или «Механический».');
    }
  },

  wicket: async (msg, session) => {
    const txt = msg.text.trim();
    if (txt === 'Да') {
      session.data.wicket = true;
    } else if (txt === 'Нет') {
      session.data.wicket = false;
    } else {
      return await sendMessage(msg.chat.chat_id, 'Выберите «Да» или «Нет».');
    }
    const kb = {
      rows: [
        [{ text: 'Бетонирование столбов' }],
        [{ text: 'Ленточный фундамент' }],
        [{ text: 'Демонтаж старого забора' }],
        [{ text: 'Доставка материалов' }],
        [{ text: 'Готово' }]
      ]
    };
    session.data.services = [];
    await sendMessage(msg.chat.chat_id, 'Нужны ли дополнительные работы? (можно выбрать несколько, затем нажмите «Готово»)', kb);
    session.step = 'services';
  },

  services: async (msg, session) => {
    const txt = msg.text.trim();
    if (txt === 'Готово') {
      await sendMessage(msg.chat.chat_id, 'Где планируется установка? Укажите город/населённый пункт и адрес:', null);
      session.step = 'address';
    } else {
      const validServices = ['Бетонирование столбов', 'Ленточный фундамент', 'Демонтаж старого забора', 'Доставка материалов'];
      if (validServices.includes(txt) && !session.data.services.includes(txt)) {
        session.data.services.push(txt);
        await sendMessage(msg.chat.chat_id, `Добавлено: ${txt}. Выберите ещё или нажмите «Готово».`);
      } else if (session.data.services.includes(txt)) {
        await sendMessage(msg.chat.chat_id, 'Эта услуга уже добавлена.');
      } else {
        await sendMessage(msg.chat.chat_id, 'Выберите одну из предложенных услуг или нажмите «Готово».');
      }
    }
  },

  address: async (msg, session) => {
    const txt = msg.text.trim();
    if (txt.length < 5) {
      return await sendMessage(msg.chat.chat_id, 'Укажите более подробно адрес объекта.');
    }
    session.data.address = txt;
    await sendMessage(msg.chat.chat_id, 'Как вас зовут?', null);
    session.step = 'name';
  },

  name: async (msg, session) => {
    const txt = msg.text.trim();
    if (txt.length < 2) {
      return await sendMessage(msg.chat.chat_id, 'Введите корректное имя.');
    }
    session.data.name = txt;
    await sendMessage(msg.chat.chat_id, 'Укажите ваш телефон для связи (формат: +7XXXXXXXXXX):', null);
    session.step = 'phone';
  },

  phone: async (msg, session) => {
    const txt = msg.text.trim();
    if (!/^\+7\d{10}$/.test(txt)) {
      return await sendMessage(msg.chat.chat_id, 'Введите телефон в формате +7XXXXXXXXXX.');
    }
    session.data.phone = txt;
    await confirmLead(msg.chat.chat_id, session);
  }
};

async function confirmLead(chatId, session) {
  const d = session.data;
  let summary = `Спасибо! Проверьте вашу заявку:\n\n`;
  summary += `Тип забора: ${d.fence_type}\n`;
  summary += `Длина: ${d.length} м\n`;
  summary += `Высота: ${d.height}\n`;
  if (d.gates) {
    summary += `Ворота: ${d.gate_type}`;
    if (d.gate_automation) summary += ` (${d.gate_automation})`;
    summary += `\n`;
  } else {
    summary += `Ворота: Нет\n`;
  }
  summary += `Калитка: ${d.wicket ? 'Да' : 'Нет'}\n`;
  if (d.services.length > 0) {
    summary += `Доп. услуги: ${d.services.join(', ')}\n`;
  }
  summary += `Адрес: ${d.address}\n`;
  summary += `Имя: ${d.name}\n`;
  summary += `Телефон: ${d.phone}\n\n`;
  summary += `Всё верно?`;
  const kb = { rows: [[{ text: 'Да, отправить' }, { text: 'Нет, начать заново' }]] };
  await sendMessage(chatId, summary, kb);
  session.step = 'confirm';
}

steps.confirm = async (msg, session) => {
  const txt = msg.text.trim();
  if (txt === 'Да, отправить') {
    try {
      await sendLeadToAmoCRM(session.data);
      const final = `✅ Спасибо, ваша заявка принята в работу!\n\nНаш менеджер свяжется с вами в течение 15 минут (в рабочее время с ${process.env.COMPANY_WORK_HOURS || '9:00-20:00'}).\n\nЕсли хотите ускорить процесс — позвоните нам сами:\n📞 ${process.env.COMPANY_PHONE || '+79994449897'}`;
      await sendMessage(msg.chat.chat_id, final, null);
      resetSession(msg.chat.chat_id);
    } catch (err) {
      console.error('[Quiz] Failed to send lead to amoCRM:', err.message);
      await sendMessage(msg.chat.chat_id, 'Произошла ошибка при отправке заявки. Попробуйте позже.', null);
      resetSession(msg.chat.chat_id);
    }
  } else if (txt === 'Нет, начать заново') {
    resetSession(msg.chat.chat_id);
    await steps.start(msg, getSession(msg.chat.chat_id));
  } else {
    await sendMessage(msg.chat.chat_id, 'Выберите «Да, отправить» или «Нет, начать заново».');
  }
};

async function handleUpdate(update) {
  if (update.message && update.message.text) {
    const msg = update.message;
    const chatId = msg.chat.chat_id;
    const session = getSession(chatId);
    const handler = steps[session.step];
    if (handler) {
      await handler(msg, session);
    } else {
      await sendMessage(chatId, 'Неизвестный шаг. Начните заново.');
      resetSession(chatId);
    }
  }
}

module.exports = { handleUpdate };
