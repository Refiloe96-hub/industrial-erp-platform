// Payment Service - Localized Gateway Abstraction
// Mocks a real African payment gateway (like Yoco, Paystack, or M-Pesa) for Phase 13

class PaymentService {
    constructor() {
        this.isActive = true;
        this.provider = 'Simulated Gateway'; // In production, this would be 'Yoco' or 'Stripe'
    }

    /**
     * Initialize the payment terminal connection (simulated)
     */
    async initializeTerminal() {
        console.log(`💳 Connecting to ${this.provider} terminal...`);
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log('✅ Terminal Connected.');
                resolve(true);
            }, 800);
        });
    }

    /**
     * Process a card payment
     * @param {number} amount - The amount to charge in ZAR or local currency
     * @param {string} orderId - Reference ID for the transaction
     */
    async processCardPayment(amount, orderId) {
        console.log(`💳 Initiating Card Charge: R${amount} for Order ${orderId}`);

        // Simulate terminal interaction delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        // 90% chance of success in this simulation
        const isSuccess = Math.random() > 0.1;

        if (isSuccess) {
            return {
                success: true,
                transactionId: `txn_card_${Date.now()}`,
                method: 'card',
                amount: amount,
                timestamp: Date.now(),
                receiptUrl: `https://receipt.simulated.com/${orderId}`
            };
        } else {
            throw new Error("Card Declined. Insufficient Funds or Terminal Timeout.");
        }
    }

    /**
     * Process a mobile money payment (e.g. M-Pesa push)
     * @param {number} amount - The amount to charge
     * @param {string} phone - The customer's mobile number
     */
    async processMobileMoney(amount, phone) {
        console.log(`📱 Sending STK Push to ${phone} for R${amount}`);

        // Mobile money requests take longer as the user interacts with their phone
        await new Promise(resolve => setTimeout(resolve, 3000));

        return {
            success: true,
            transactionId: `txn_momo_${Date.now()}`,
            method: 'mobile_money',
            phone: phone,
            amount: amount,
            timestamp: Date.now()
        };
    }
}

export default new PaymentService();
