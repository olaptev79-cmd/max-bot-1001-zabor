# max-bot-1001-zabor

Telegram/MAX бот-квиз для компании **1001 забор** с webhook интеграцией и автоматической отправкой заявок в amoCRM.

## Возможности

- **11-шаговый квиз**: выбор типа забора, длины, высоты, ворот, калитки, доп. услуг, контактов
- **Валидация пользовательского ввода** на каждом шаге
- **FSM (конечный автомат)** для управления состоянием диалога
- **Webhook-интеграция** с MAX Bot API
- **Автоматическая отправка лидов** в amoCRM
- **Поддержка многоязычных сообщений** (русский)

## Структура проекта

```
max-bot-1001-zabor/
├── src/
│   ├── index.js        # Express webhook-сервер
│   ├── quiz.js         # FSM логика квиза (11 шагов)
│   └── amocrm.js       # Интеграция с amoCRM
├── package.json
├── .env.example
└── README.md
```

## Установка

### 1. Клонировать репозиторий

```bash
git clone https://github.com/olaptev79-cmd/max-bot-1001-zabor.git
cd max-bot-1001-zabor
```

### 2. Установить зависимости

```bash
npm install
```

### 3. Настроить переменные окружения

Скопируйте `.env.example` в `.env` и заполните значения:

```bash
cp .env.example .env
```

Пример `.env`:

```env
MAX_BOT_TOKEN=f9LHodD0cOLnql6etN0oVZ-xKMQqbiCgucaAabJV3j72y_5UnY5uWlp74qlUaJXkrmbP9OAH0LZ2uPYb603a
WEBHOOK_SECRET=your_secret_here
PORT=3000

AMOCRM_DOMAIN=yourdomain.amocrm.ru
AMOCRM_ACCESS_TOKEN=your_access_token
AMOCRM_PIPELINE_ID=123456
AMOCRM_STAGE_ID=654321

COMPANY_PHONE=+79994449897
COMPANY_WORK_HOURS=9:00-20:00
```

### 4. Запустить локально

```bash
npm start
# или для разработки:
npm run dev
```

Сервер запустится на `http://localhost:3000`.

## Деплой

### Деплой на VPS (Docker)

1. Создайте `Dockerfile` (пример):

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

2. Соберите и запустите:

```bash
docker build -t max-bot-1001 .
docker run -d -p 3000:3000 --env-file .env --name max-bot max-bot-1001
```

### Деплой на Render / Railway / Heroku

1. Подключите репозиторий
2. Укажите start command: `npm start`
3. Добавьте environment variables из `.env`
4. Деплой автоматически создаст публичный URL (например, `https://your-app.onrender.com`)

## Настройка Webhook в MAX

После деплоя получите публичный URL (например, `https://your-app.onrender.com`).

### Подписка на webhook

```bash
curl -X POST "https://botapi.messenger.yandex.net/bot/v1/subscriptions/?bot_id=YOUR_BOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-app.onrender.com/webhook",
    "secret": "your_webhook_secret_here"
  }'
```

### Проверка активных подписок

```bash
curl "https://botapi.messenger.yandex.net/bot/v1/subscriptions/?bot_id=YOUR_BOT_TOKEN"
```

## Логика квиза

### Шаги опроса

1. **Тип забора**: Профнастил | Евроштакетник | Сетка-рабица | 3D-панели | Жалюзи
2. **Длина забора** (метры): валидация > 0
3. **Высота**: 1.5м | 1.8м | 2.0м | 2.5м | Другая (свободный ввод)
4. **Ворота**: Да | Нет
5. **Тип ворот** (если Да): Откатные | Распашные
6. **Автоматика** (только для откатных): Автоматический | Механический
7. **Калитка**: Да | Нет
8. **Доп. услуги** (множественный выбор): Бетонирование столбов, Ленточный фундамент, Демонтаж старого забора, Доставка материалов
9. **Адрес объекта**: свободный текст (мин. 5 символов)
10. **Имя клиента**: мин. 2 символа
11. **Телефон**: формат `+7XXXXXXXXXX`

### Подтверждение

После ввода всех данных пользователь видит итоговую заявку и может:
- **«Да, отправить»** → лид отправляется в amoCRM, приходит финальное сообщение
- **«Нет, начать заново»** → сброс и начало сценария заново

## Интеграция с amoCRM

Модуль `src/amocrm.js` создаёт лид через `/api/v4/leads/complex` с:
- Контактом (имя + телефон)
- Заметкой со всеми деталями заявки
- Тегами: `MAX Bot`, тип забора
- Pipeline/Stage из `.env`

## Разработка

### Структура сессий

Бот использует **in-memory** хранилище `sessions` (объект `chatId → session`). При рестарте бота все сессии сбрасываются.

Для продакшена рекомендуется Redis или БД.

### Добавить новый шаг

1. Добавьте хендлер в `src/quiz.js → steps`
2. Обновите переход `session.step = 'new_step'`
3. Добавьте валидацию в `steps.new_step`

## Лицензия

MIT

## Контакты

По вопросам разработки обращайтесь:
- GitHub: [olaptev79-cmd](https://github.com/olaptev79-cmd)
- Telegram: @your_telegram
