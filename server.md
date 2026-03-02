# ExpertOS / ContentZavod — Документация проекта

> Последнее обновление: 2 марта 2026

## 🔑 Быстрый доступ

| Что | Значение |
|-----|---------|
| **Прод URL** | https://contentzavod.biz |
| **Сервер** | `109.107.176.141` (root) |
| **SSH пароль** | `ja=z795+16t7LC48BhiG` |
| **Репо** | `github.com/dmitrynovikov21/sergei.git` |
| **Ветка прода** | `production` |
| **Путь на сервере** | `/root/sergei` |
| **БД** | SQLite (`/root/sergei/prisma/dev.db`) |

---

## 🏗️ Стек

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript (strict)
- **Styling:** Tailwind CSS + Shadcn/UI
- **DB:** Prisma + SQLite
- **Auth:** NextAuth v5 (Google OAuth, Yandex OAuth, email/password)
- **AI:** Anthropic Claude (primary), Google Gemini (fallback), OpenAI (legacy)
- **Scraping:** Apify (Instagram scraper) + собственный `parser-service`
- **Payments:** YooKassa (рубли), Stripe (долл)
- **Email:** Resend
- **Node:** v20.19.6
- **Package Manager:** npm

---

## 📁 Структура проекта

```
sergei/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Логин, регистрация
│   ├── (protected)/        # Dashboard (требует авторизации)
│   │   └── dashboard/
│   │       ├── chat/[id]/  # Страница чата с AI
│   │       ├── agents/     # Страницы агентов
│   │       ├── datasets/   # Управление датасетами
│   │       └── admin/      # Админка (feedback, клиенты)
│   └── api/                # API routes
│       ├── chat/           # Streaming AI ответов
│       │   ├── [chatId]/route.ts  # POST — стриминг ответа
│       │   └── create/route.ts    # POST — создание чата
│       ├── feedback/       # Like/dislike (без server actions!)
│       └── ...
├── actions/                # Server Actions
│   ├── chat.ts             # saveMessage, createChat
│   ├── agents.ts           # CRUD агентов
│   └── datasets.ts         # Управление датасетами
├── components/
│   ├── dashboard/
│   │   ├── chat-interface.tsx      # Главный компонент чата
│   │   ├── chat/
│   │   │   ├── chat-message.tsx    # Рендер сообщений + HeadlineWithBasket
│   │   │   ├── headline-basket-widget.tsx  # Плавающая корзина заголовков
│   │   │   └── headline-basket-context.tsx # React Context для корзины
│   │   └── edit-agent/             # Редактирование агентов
│   └── ui/                          # Shadcn компоненты
├── hooks/
│   ├── use-start-chat.ts    # Создание чата (API route, не server action)
│   └── ...
├── lib/
│   ├── db.ts                # Prisma client
│   ├── services/
│   │   └── ai-gateway.ts    # Multi-model AI router
│   └── subscription.ts      # Биллинг/лимиты
├── prisma/
│   ├── schema.prisma        # Схема БД
│   └── dev.db               # SQLite база (на сервере!)
├── parser-service/          # Микросервис парсинга Instagram
├── scripts/                 # Утилиты (fix-covers, seed, миграции)
└── .env                     # Переменные окружения
```

---

## 🔧 Переменные окружения (на сервере)

```
# App
NEXT_PUBLIC_APP_URL=https://contentzavod.biz
NEXTAUTH_URL=https://contentzavod.biz
AUTH_SECRET=...
AUTH_TRUST_HOST=true
DATABASE_URL=file:./dev.db

# AI Models
ANTHROPIC_API_KEY=...
GEMINI_API_KEY=...
OPENAI_API_KEY=...
MODEL_NAME_ANTHROPIC=claude-sonnet-4-20250514

# Scraping
APIFY_TOKEN=...
IG_USERNAME=...
IG_PASSWORD=...
IG_2FA_SECRET=...
PARSER_SERVICE_URL=http://localhost:4000

# Auth (OAuth)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
YANDEX_CLIENT_ID=...
YANDEX_CLIENT_SECRET=...

# Payments
YOOKASSA_SHOP_ID=...
YOOKASSA_SECRET_KEY=...
STRIPE_API_KEY=...
STRIPE_WEBHOOK_SECRET=...

# Email
RESEND_API_KEY=...
EMAIL_FROM=...

# LiteLLM (proxy)
LITELLM_API_URL=...
LITELLM_MASTER_KEY=...
```

---

## 🚀 Деплой (Полный цикл)

### Локально:
```bash
git add -A
git commit -m "описание"
git push origin production
```

### На сервере (SSH):
```bash
ssh root@109.107.176.141        # пароль: ja=z795+16t7LC48BhiG
cd /root/sergei
git pull origin production
rm -rf .next                     # ⚠️ ОБЯЗАТЕЛЬНО — иначе кэш ломает server actions
npm run build
fuser -k 3000/tcp 2>/dev/null
pm2 restart content-agents
```

### Однострочник для деплоя с локальной машины:
```bash
sshpass -p 'ja=z795+16t7LC48BhiG' ssh -o StrictHostKeyChecking=no root@109.107.176.141 \
  "cd /root/sergei && git pull origin production && rm -rf .next && npm run build 2>&1 | tail -5 && fuser -k 3000/tcp 2>/dev/null; sleep 1 && pm2 restart content-agents"
```

---

## 🖥️ PM2 Процессы

| Имя | Путь | Порт | Описание |
|-----|------|------|---------|
| `content-agents` | `/root/sergei` | 3000 | Next.js приложение |
| `parser-service` | `/root/sergei/parser-service` | 4000 | Парсер Instagram |

### Полезные команды PM2:
```bash
pm2 list                          # Статус всех процессов
pm2 logs content-agents --lines 50 # Логи приложения
pm2 restart content-agents        # Рестарт
pm2 delete content-agents         # Удалить (если errored)
pm2 start 'npm start' --name content-agents  # Создать заново
pm2 save                          # Сохранить конфиг для автостарта
```

---

## 🌐 Nginx

- Конфиг: `/etc/nginx/sites-enabled/default`
- SSL: Let's Encrypt (`/etc/letsencrypt/live/contentzavod.biz/`)
- HTTP → HTTPS redirect
- Proxy: `localhost:3000`
- `client_max_body_size 50M`
- Увеличенные таймауты (600s) для парсинга

---

## 🏛️ Архитектура

### AI Chat Flow
```
User types → ChatInterface.handleSendMessage()
  → fetch POST /api/chat/{chatId}
  → ai-gateway.ts routes to Claude/Gemini
  → Server-Sent Events stream back
  → ChatMessage.tsx renders with markdown
```

### Headline Basket Flow
```
AI генерит заголовки → HeadlineWithBasket компоненты
  → Юзер кликает (+) → BasketContext.addHeadline()
  → localStorage persistence
  → HeadlineBasketWidget (floating dot)
  → "Сделать описания" → useStartChat()
  → fetch /api/chat/create → sessionStorage → navigate
  → ChatInterface auto-send from sessionStorage
```

### Server Actions vs API Routes

> ⚠️ **ВАЖНО:** Server actions ломаются после каждого деплоя (хеши меняются).
> Юзеры со старым кэшем получают "Failed to find Server Action".
> 
> **Правило:** Для любых user-facing actions (like, dislike, feedback) используй 
> **только API routes** (`/api/...`), не server actions.
> Server actions OK только для SSR/initial load операций (createChat через агент-страницу).

---

## 🗄️ Ключевые модели Prisma

- **User** — пользователи, OAuth аккаунты, подписки
- **Agent** — AI агенты (системный промпт, привязка к датасету)
- **Chat** — чаты (user → agent)
- **Message** — сообщения в чате (role, content, feedback, feedbackText)
- **Dataset** — наборы контента
- **ContentItem** — элементы контента (headline, transcript, coverUrl, views, likes)
- **Subscription** — подписки и лимиты
- **Transaction** — история платежей

---

## 🐛 Известные gotchas

1. **Server actions после деплоя** — хеши меняются, старый JS кэш вызывает "Failed to find Server Action". Решение: API routes + `Cmd+Shift+R`.

2. **ENOENT 500.html при билде** — некритическая ошибка, билд проходит нормально. 

3. **PM2 errored с 1000+ restarts** — обычно из-за порта 3000 занятого старым процессом. Решение:
   ```bash
   fuser -k 3000/tcp
   pm2 delete content-agents
   pm2 start 'npm start' --name content-agents
   ```

4. **Cover URLs (Instagram CDN)** — истекают через ~30 дней. Скрипт `scripts/fix-broken-covers.ts` для массового обновления.

5. **SQLite column names** — Prisma использует camelCase в коде, но snake_case в БД. При raw SQL запросах используй `created_at`, не `createdAt`.

6. **`rm -rf .next` перед `npm run build`** — ОБЯЗАТЕЛЬНО на сервере. Без этого кэш webpack ломает всё.

---

## 📋 Глобальные агенты (предустановленные)

Создаются через `scripts/seed_global_agents_v2.ts`:

| Агент | ID | Описание |
|-------|-----|---------|
| Заголовки Reels | `cmkpetsop00014o2vrwz3qygk` | Генерация вирусных заголовков |
| Описание Reels | `cmkpetsp700034o2v1o755wd8` | Генерация описаний для Reels |
| Заголовки Carousels | (dynamic) | Заголовки для каруселей |
| Структура Carousels | (dynamic) | Структура контента каруселей |

---

## 📊 Админка

- `/dashboard/admin/feedback` — отзывы пользователей (like/dislike)
- `/dashboard/admin/clients` — управление клиентами
- `/dashboard/admin/payouts` — выплаты

---

## 🔐 Безопасность

- API ключи только в `.env` (не в коде)
- Auth middleware проверяет сессию на всех protected routes
- Nginx SSL (Let's Encrypt, auto-renew)
- `AUTH_TRUST_HOST=true` для Next-Auth за proxy