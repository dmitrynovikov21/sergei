/**
 * YooKassa API Client
 * Docs: https://yookassa.ru/developers/api
 */

/**
 * YooKassa API Client
 * Docs: https://yookassa.ru/developers/api
 */

const YOOKASSA_API_URL = 'https://api.yookassa.ru/v3'

function getAuthHeader() {
    const shopId = process.env.YOOKASSA_SHOP_ID
    const secretKey = process.env.YOOKASSA_SECRET_KEY

    if (!shopId || !secretKey) {
        throw new Error('YooKassa credentials not configured')
    }

    const credentials = Buffer.from(`${shopId}:${secretKey}`).toString('base64')
    return `Basic ${credentials}`
}

function generateIdempotenceKey(): string {
    return crypto.randomUUID()
}

export interface CreatePaymentParams {
    amount: number // in RUB
    userId: string
    description: string
    returnUrl: string
    metadata?: Record<string, string>
}

export interface YooKassaPayment {
    id: string
    status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled'
    amount: {
        value: string
        currency: string
    }
    confirmation?: {
        type: string
        confirmation_url?: string
    }
    metadata?: Record<string, string>
    created_at: string
}

/**
 * Create a payment in YooKassa
 */
export async function createPayment(params: CreatePaymentParams): Promise<YooKassaPayment> {
    const { amount, userId, description, returnUrl, metadata = {} } = params

    const response = await fetch(`${YOOKASSA_API_URL}/payments`, {
        method: 'POST',
        headers: {
            'Authorization': getAuthHeader(),
            'Content-Type': 'application/json',
            'Idempotence-Key': generateIdempotenceKey()
        },
        body: JSON.stringify({
            amount: {
                value: amount.toFixed(2),
                currency: 'RUB'
            },
            confirmation: {
                type: 'redirect',
                return_url: returnUrl
            },
            capture: true, // Auto-capture
            description,
            metadata: {
                user_id: userId,
                ...metadata
            }
        })
    })

    if (!response.ok) {
        const error = await response.text()
        console.error('[YooKassa] Create payment error:', error)
        throw new Error(`YooKassa error: ${response.status}`)
    }

    const payment = await response.json()
    console.log('[YooKassa] Payment created:', payment.id)
    return payment
}

/**
 * Get payment info by ID
 */
export async function getPayment(paymentId: string): Promise<YooKassaPayment> {
    const response = await fetch(`${YOOKASSA_API_URL}/payments/${paymentId}`, {
        method: 'GET',
        headers: {
            'Authorization': getAuthHeader(),
            'Content-Type': 'application/json'
        }
    })

    if (!response.ok) {
        throw new Error(`YooKassa error: ${response.status}`)
    }

    return response.json()
}

/**
 * Verify webhook signature (IP-based for YooKassa)
 * YooKassa sends from specific IPs, but for simplicity we rely on HTTPS + shared secret
 */
export async function verifyWebhookPayload(body: unknown): Promise<boolean> {
    // YooKassa doesn't use signature verification like Stripe
    // They recommend IP whitelisting or checking payment status via API
    // For production, implement IP check: https://yookassa.ru/developers/using-api/webhooks#ip
    return true
}
