# Sergei - AI Content Platform

## 🎯 Описание проекта

Платформа для автоматизированного создания контента с AI агентами. Включает:
- **AI Чаты** с контекстом из датасетов (RAG)
- **Парсинг Instagram** через Apify для сбора трендов
- **Master Agent** — AI продюсер для генерации заголовков и скриптов
- **База знаний** для агентов (документы, заметки)

---

## 🛠 Tech Stack

| Компонент | Технология |
|-----------|------------|
| Frontend | Next.js 14, React, TypeScript |
| Styling | Tailwind CSS, Shadcn/ui |
| Auth | NextAuth.js v5 (Auth.js) |
| Database | SQLite (dev) / PostgreSQL (prod) via Prisma |
| AI | Anthropic Claude (claude-sonnet-4-5) |
| Parsing | Apify Instagram Scraper |
| Payments | Stripe |

---

## 📁 Структура проекта

```
sergei/
├── app/                      # Next.js App Router
│   ├── (protected)/          # Защищённые страницы
│   │   └── dashboard/
│   │       ├── chat/         # AI чаты
│   │       ├── agents/       # Настройки агентов
│   │       ├── datasets/     # Датасеты и контент
│   │       └── producer/     # Master Agent UI
│   └── api/
│       ├── chat/             # Chat API с RAG
│       └── producer/         # Producer API с function calling
├── actions/                  # Server Actions
│   ├── datasets.ts           # CRUD датасетов, парсинг
│   └── chat.ts               # Управление чатами
├── lib/
│   ├── parser/
│   │   ├── harvester.ts      # Логика парсинга Instagram
│   │   └── apify-service.ts  # Интеграция с Apify
│   └── services/
│       ├── chat/             # ChatService, StreamingService
│       └── agent/            # AgentService
├── components/
│   ├── dashboard/            # Компоненты дэшборда
│   └── datasets/             # Компоненты датасетов
├── prisma/
│   ├── schema.prisma         # Схема БД
│   └── dev.db                # SQLite для разработки
├── master-agent/             # FastAPI микросервис (Python)
└── config/
    └── dashboard.ts          # Конфиг сайдбара
```

---

## 🔑 Environment Variables

### Локальная разработка (.env)

```env
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Auth
AUTH_SECRET=your_secret_here
AUTH_URL=http://localhost:3000

# Database
DATABASE_URL=file:./prisma/dev.db

# AI
ANTHROPIC_API_KEY=sk-ant-...
MODEL_NAME_ANTHROPIC=claude-sonnet-4-5

# Parsing
APIFY_TOKEN=apify_api_...

# Optional
OPENAI_API_KEY=sk-...
RESEND_API_KEY=re_...
STRIPE_API_KEY=sk_test_...
```

### Production (.env на сервере)

```env
NEXT_PUBLIC_APP_URL=https://contentzavod.biz
AUTH_URL=https://contentzavod.biz
DATABASE_URL=file:./prisma/dev.db
# ... остальные ключи такие же
```

---

## 🚀 Деплой на Production

### Сервер
- **IP:** `109.107.176.141`
- **User:** `root`
- **Password:** `ja=z795+16t7LC48BhiG`
- **URL:** https://contentzavod.biz

### Деплой скрипт

```bash
# 1. Синхронизация файлов (исключая node_modules, .next, БД)
rsync -avz --exclude 'node_modules' --exclude '.next' --exclude 'prisma/dev.db' \
  -e "sshpass -p 'ja=z795+16t7LC48BhiG' ssh -o StrictHostKeyChecking=no" \
  ./ root@109.107.176.141:/root/sergei/

# 2. SSH на сервер и rebuild
sshpass -p 'ja=z795+16t7LC48BhiG' ssh root@109.107.176.141

# На сервере:
cd /root/sergei
npm install
NODE_OPTIONS='--max-old-space-size=4096' npm run build
pm2 restart content-agents
```

### Nginx конфиг
Файл: `/etc/nginx/sites-enabled/contentzavod.biz`
- SSL через Let's Encrypt
- Proxy на localhost:3000

---

## 📊 Ключевые модели Prisma

```prisma
model Agent {
  id          String    @id
  name        String
  systemPrompt String?
  datasetId   String?   // Привязка к датасету для RAG
  userId      String?
  isPublic    Boolean   @default(false)
}

model Dataset {
  id        String   @id
  name      String
  userId    String
  isPublic  Boolean  @default(false)
  items     ContentItem[]
  sources   TrackingSource[]
}

model ContentItem {
  id            String    @id
  instagramId   String    @unique
  originalUrl   String
  coverUrl      String?
  views         Int
  likes         Int
  headline      String?   // Извлечённый заголовок (Claude Vision)
  transcript    String?   // Транскрипт видео
  viralityScore Float?    // Коэффициент виральности
  publishedAt   DateTime?
  datasetId     String
}

model TrackingSource {
  id             String   @id
  url            String
  username       String?
  minViewsFilter Int      @default(0)
  fetchLimit     Int      @default(50)
  datasetId      String
}
```

---

## 🧠 Ключевые концепции

### 1. Dataset Priority (RAG)
В `app/api/chat/[chatId]/route.ts`:
- `agent.datasetId` имеет приоритет над `chat.datasetId`
- Контент фильтруется по последним 14 дням

### 2. Парсинг Instagram
`lib/parser/harvester.ts`:
- Скрейпит через Apify
- Извлекает headline через Claude Vision (анализ coverUrl)
- Считает viralityScore = views / avgViews

### 3. Master Agent (в разработке)
`/dashboard/producer` — UI для:
- Генерации заголовков через AI
- Написания скриптов с reasoning
- Function calling через Claude

---

## 🐛 Известные проблемы и решения

### 1. JavaScript heap out of memory при build
```bash
NODE_OPTIONS='--max-old-space-size=4096' npm run build
```

### 2. Instagram coverUrl истекают через 24-48ч
Ссылки на изображения временные. При ошибке "fetch failed" нужно перепарсить источник.

### 3. Auth redirect на /api/auth/error
Проверить что `AUTH_URL` и `NEXT_PUBLIC_APP_URL` установлены на production URL.

---

## 🔧 Полезные команды

```bash
# Локальный запуск
npm run dev

# Миграции Prisma
npx prisma migrate dev
npx prisma generate

# Проверка логов на сервере
pm2 logs content-agents --lines 50

# Перезапуск на сервере
pm2 restart content-agents

# Очистка кеша Next.js
rm -rf .next && npm run build
```

---

## 📝 TODO / В разработке

- [ ] Master Agent с реальным Gemini function calling
- [ ] Интеграция Veo API для генерации видео
- [ ] Celery workers для фоновых задач
- [ ] Деплой master-agent микросервиса

---

## 👤 Контакты

Проект разрабатывается для **Дмитрий Новиков**.
