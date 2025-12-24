/**
 * NOWPayments Service
 * Crypto payment gateway integration for subscription payments
 * https://nowpayments.io/
 */

interface CreatePaymentParams {
    priceAmount: number;      // USD amount
    priceCurrency: string;    // 'usd'
    payCurrency?: string;     // 'btc', 'eth', 'usdt', etc.
    orderId: string;          // Our internal order ID
    orderDescription: string;
    callbackUrl?: string;     // IPN webhook URL
    successUrl?: string;      // Redirect after payment
    cancelUrl?: string;       // Redirect on cancel
}

interface CreateInvoiceParams {
    priceAmount: number;
    priceCurrency: string;
    orderId: string;
    orderDescription: string;
    successUrl?: string;
    cancelUrl?: string;
}

interface PaymentResponse {
    payment_id: string;
    payment_status: string;
    pay_address: string;
    price_amount: number;
    price_currency: string;
    pay_amount: number;
    pay_currency: string;
    order_id: string;
    order_description: string;
    created_at: string;
    updated_at: string;
    purchase_id?: string;
    network?: string;
    invoice_url?: string;
}

interface InvoiceResponse {
    id: string;
    order_id: string;
    order_description: string;
    price_amount: string;
    price_currency: string;
    pay_currency: string | null;
    invoice_url: string;
    created_at: string;
    updated_at: string;
}

interface PaymentStatus {
    payment_id: string;
    payment_status: 'waiting' | 'confirming' | 'confirmed' | 'sending' | 'finished' | 'failed' | 'expired' | 'refunded';
    pay_address: string;
    price_amount: number;
    price_currency: string;
    pay_amount: number;
    actually_paid: number;
    pay_currency: string;
    order_id: string;
    order_description: string;
    purchase_id: string;
    created_at: string;
    updated_at: string;
    outcome_amount?: number;
    outcome_currency?: string;
}

interface WebhookPayload {
    payment_id: string;
    payment_status: string;
    pay_address: string;
    price_amount: number;
    price_currency: string;
    pay_amount: number;
    actually_paid: number;
    pay_currency: string;
    order_id: string;
    order_description: string;
    purchase_id: string;
    created_at: string;
    updated_at: string;
    outcome_amount?: number;
    outcome_currency?: string;
}

class NOWPaymentsService {
    private apiKey: string;
    private ipnSecret: string;
    private baseUrl: string;
    private isSandbox: boolean;

    constructor() {
        this.apiKey = process.env.NOWPAYMENTS_API_KEY || '';
        this.ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET || '';
        this.isSandbox = process.env.NOWPAYMENTS_SANDBOX === 'true';
        this.baseUrl = this.isSandbox
            ? 'https://api-sandbox.nowpayments.io/v1'
            : 'https://api.nowpayments.io/v1';
    }

    /**
     * Check if NOWPayments is configured
     */
    isConfigured(): boolean {
        return !!this.apiKey;
    }

    /**
     * Get API status
     */
    async getStatus(): Promise<{ message: string }> {
        const response = await fetch(`${this.baseUrl}/status`, {
            headers: { 'x-api-key': this.apiKey }
        });
        return response.json() as Promise<{ message: string }>;
    }

    /**
     * Get available cryptocurrencies
     */
    async getAvailableCurrencies(): Promise<string[]> {
        const response = await fetch(`${this.baseUrl}/currencies`, {
            headers: { 'x-api-key': this.apiKey }
        });
        const data = await response.json() as { currencies: string[] };
        return data.currencies || [];
    }

    /**
     * Get minimum payment amount for a currency
     */
    async getMinimumAmount(currencyFrom: string, currencyTo: string): Promise<number> {
        const response = await fetch(
            `${this.baseUrl}/min-amount?currency_from=${currencyFrom}&currency_to=${currencyTo}`,
            { headers: { 'x-api-key': this.apiKey } }
        );
        const data = await response.json() as { min_amount: number };
        return data.min_amount;
    }

    /**
     * Get estimated price for an amount
     */
    async getEstimatedPrice(amount: number, currencyFrom: string, currencyTo: string): Promise<number> {
        const response = await fetch(
            `${this.baseUrl}/estimate?amount=${amount}&currency_from=${currencyFrom}&currency_to=${currencyTo}`,
            { headers: { 'x-api-key': this.apiKey } }
        );
        const data = await response.json() as { estimated_amount: number };
        return data.estimated_amount;
    }

    /**
     * Create a payment invoice (recommended for subscriptions)
     * Returns a hosted payment page URL
     */
    async createInvoice(params: CreateInvoiceParams): Promise<InvoiceResponse> {
        const response = await fetch(`${this.baseUrl}/invoice`, {
            method: 'POST',
            headers: {
                'x-api-key': this.apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                price_amount: params.priceAmount,
                price_currency: params.priceCurrency,
                order_id: params.orderId,
                order_description: params.orderDescription,
                success_url: params.successUrl,
                cancel_url: params.cancelUrl,
                ipn_callback_url: process.env.NOWPAYMENTS_WEBHOOK_URL || `${process.env.BACKEND_URL}/api/subscription/webhook`
            })
        });

        if (!response.ok) {
            const error = await response.json() as { message?: string };
            throw new Error(`NOWPayments error: ${error.message || 'Failed to create invoice'}`);
        }

        return response.json() as Promise<InvoiceResponse>;
    }

    /**
     * Create a direct payment (specific crypto)
     */
    async createPayment(params: CreatePaymentParams): Promise<PaymentResponse> {
        const response = await fetch(`${this.baseUrl}/payment`, {
            method: 'POST',
            headers: {
                'x-api-key': this.apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                price_amount: params.priceAmount,
                price_currency: params.priceCurrency,
                pay_currency: params.payCurrency || 'btc',
                order_id: params.orderId,
                order_description: params.orderDescription,
                ipn_callback_url: params.callbackUrl || process.env.NOWPAYMENTS_WEBHOOK_URL
            })
        });

        if (!response.ok) {
            const error = await response.json() as { message?: string };
            throw new Error(`NOWPayments error: ${error.message || 'Failed to create payment'}`);
        }

        return response.json() as Promise<PaymentResponse>;
    }

    /**
     * Get payment status
     */
    async getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
        const response = await fetch(`${this.baseUrl}/payment/${paymentId}`, {
            headers: { 'x-api-key': this.apiKey }
        });

        if (!response.ok) {
            throw new Error('Failed to get payment status');
        }

        return response.json() as Promise<PaymentStatus>;
    }

    /**
     * Verify webhook signature (IPN)
     */
    verifyWebhookSignature(payload: string, signature: string): boolean {
        if (!this.ipnSecret) {
            console.warn('[NOWPayments] IPN secret not configured, skipping signature verification');
            return true;
        }

        const crypto = require('crypto');
        const hmac = crypto.createHmac('sha512', this.ipnSecret);
        hmac.update(JSON.stringify(JSON.parse(payload)));
        const calculatedSignature = hmac.digest('hex');

        return calculatedSignature === signature;
    }

    /**
     * Parse webhook payload
     */
    parseWebhook(body: any): WebhookPayload {
        return {
            payment_id: body.payment_id,
            payment_status: body.payment_status,
            pay_address: body.pay_address,
            price_amount: body.price_amount,
            price_currency: body.price_currency,
            pay_amount: body.pay_amount,
            actually_paid: body.actually_paid,
            pay_currency: body.pay_currency,
            order_id: body.order_id,
            order_description: body.order_description,
            purchase_id: body.purchase_id,
            created_at: body.created_at,
            updated_at: body.updated_at,
            outcome_amount: body.outcome_amount,
            outcome_currency: body.outcome_currency
        };
    }

    /**
     * Map NOWPayments status to our PaymentStatus enum
     */
    mapPaymentStatus(npStatus: string): 'PENDING' | 'CONFIRMING' | 'CONFIRMED' | 'SENDING' | 'FINISHED' | 'FAILED' | 'EXPIRED' | 'REFUNDED' {
        const statusMap: Record<string, any> = {
            'waiting': 'PENDING',
            'confirming': 'CONFIRMING',
            'confirmed': 'CONFIRMED',
            'sending': 'SENDING',
            'finished': 'FINISHED',
            'failed': 'FAILED',
            'expired': 'EXPIRED',
            'refunded': 'REFUNDED'
        };
        return statusMap[npStatus] || 'PENDING';
    }
}

export const nowPaymentsService = new NOWPaymentsService();
export type { PaymentResponse, InvoiceResponse, PaymentStatus, WebhookPayload };
