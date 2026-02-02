# MISSION 05: PAYMENT INTEGRATION (STRIPE)

## 🎯 ЦЕЛЬ
Подключить Stripe для пополнения баланса. Пользователь должен иметь возможность:
1. Выбрать сумму пополнения (например, $10, $50, $100).
2. Оплатить через Stripe Checkout.
3. После успешной оплаты автоматически пополнить баланс в системе.

## 🛠 ИНСТРУМЕНТЫ
- **Stripe SDK**: `npm install stripe @stripe/stripe-js`.
- **Webhooks**: Принимать события о платежах (`checkout.session.completed`).
- **Server Actions**: Создание Checkout Session.

## 📋 ПЛАН ДЕЙСТВИЙ

### ЭТАП 1: Stripe Setup
1. Зарегистрируйся на stripe.com (или используй тестовый режим).
2. Получи ключи: `STRIPE_SECRET_KEY` и `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
3. Добавь их в `.env`.

### ЭТАП 2: Create Checkout Session
1. Создай Server Action `actions/create-checkout.ts`.
2. Функция `createCheckoutSession(amount)`:
   - Создает Stripe Checkout Session.
   - Metadata включает `userId` и `amount`.
   - Возвращает `sessionId`.

### ЭТАП 3: UI для пополнения
1. Создай страницу `/dashboard/credits`.
2. Компонент с кнопками: "$10", "$50", "$100".
3. При клике на кнопку:
   - Вызов `createCheckoutSession(amount)`.
   - Редирект на Stripe Checkout.

### ЭТАП 4: Webhook для обработки платежей
1. Создай API Route `app/api/webhooks/stripe/route.ts`.
2. Обрабатывай событие `checkout.session.completed`.
3. Извлеки `userId` и `amount` из metadata.
4. Вызови `addCredits(userId, amount, 'stripe_payment')`.

### ЭТАП 5: Настрой Webhook в Stripe
1. В Dashboard Stripe добавь URL: `https://your-domain.com/api/webhooks/stripe`.
2. Выбери событие `checkout.session.completed`.
3. Сохрани Webhook Secret в `.env` как `STRIPE_WEBHOOK_SECRET`.

## 🧠 БИЗНЕС-ЛОГИКА
- **Idempotency**: Webhook может прилететь несколько раз. Используй `metadata.paymentId` для дедупликации.
- **Security**: Проверяй подпись Stripe через `stripe.webhooks.constructEvent`.

## 🚦 DEFINITION OF DONE
1. Пользователь может перейти на `/dashboard/credits`.
2. Выбрать сумму и оплатить через Stripe.
3. После оплаты баланс в системе автоматически пополняется.
4. В таблице `CreditTransaction` появляется запись с типом `deposit`.
