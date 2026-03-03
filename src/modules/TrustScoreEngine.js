import db, { STORES } from '../db/index.js';
import sales from './Sales.js';
import pocketBooks from './PocketBooks.js';

/**
 * 🏦 TrustScore Engine (The Financial Moat)
 * 
 * Traditional banks have zero visibility into Africa's informal sector.
 * We have granular data: Sales velocity, attendance, group-buy reliability, and cash flow.
 * 
 * This engine deterministically calculates a "Trust Score" (0-1000) that can be
 * used to unlock micro-credit, inventory financing, or better terms in the B2B network.
 */
class TrustScoreEngine {
    constructor() {
        this.weights = {
            salesVelocity: 0.35,      // Consistent transaction volume is king
            attendanceReliability: 0.15, // SmartShift reliability shows discipline
            syndicateStanding: 0.25,  // TrustCircle repayment/contribution history
            cashFlowHealth: 0.25      // PocketBooks net positive balance history
        };
    }

    /**
     * Calculate the comprehensive Trust Score for the current tenant.
     * @returns {Promise<number>} Score from 0 to 1000
     */
    async calculateScore() {
        try {
            const [salesScore, attendanceScore, syndicateScore, cashFlowScore] = await Promise.all([
                this.evaluateSalesVelocity(),
                this.evaluateAttendance(),
                this.evaluateSyndicateStanding(),
                this.evaluateCashFlow()
            ]);

            const finalScore = (
                (salesScore * this.weights.salesVelocity) +
                (attendanceScore * this.weights.attendanceReliability) +
                (syndicateScore * this.weights.syndicateStanding) +
                (cashFlowScore * this.weights.cashFlowHealth)
            ) * 10; // Scale from 0-100 to 0-1000

            return Math.min(Math.max(Math.round(finalScore), 0), 1000);
        } catch (err) {
            console.error('Error calculating Trust Score:', err);
            // Default baseline score for new accounts
            return 300;
        }
    }

    async evaluateSalesVelocity() {
        // Look at the last 30 days of sales
        const past30Days = Date.now() - (30 * 24 * 60 * 60 * 1000);
        const transactions = await db.getAll(STORES.transactions);

        const recentTx = transactions.filter(t => (t.timestamp || t.createdAt) > past30Days && t.type !== 'expense');

        // Metrics: Frequency (more is better) and Volume
        const txCount = recentTx.length;
        const totalVolume = recentTx.reduce((sum, tx) => sum + (tx.total || tx.amount || 0), 0);

        // Scoring algorithm (Mock baseline: 100 tx/month or R50k volume = 100 points)
        const frequencyScore = Math.min((txCount / 100) * 50, 50);
        const volumeScore = Math.min((totalVolume / 50000) * 50, 50);

        return frequencyScore + volumeScore;
    }

    async evaluateAttendance() {
        // Look at SmartShift data
        const shifts = await db.getAll(STORES.shifts) || [];
        if (shifts.length === 0) return 50; // Neutral score if no shift data used

        const completedShifts = shifts.filter(s => s.status === 'completed');
        const completionRate = completedShifts.length / shifts.length;

        return completionRate * 100;
    }

    async evaluateSyndicateStanding() {
        // Look at TrustCircle participation
        const syndicates = await db.getAll(STORES.syndicates) || [];
        if (syndicates.length === 0) return 40; // Slight penalty for not using network features

        let goodStanding = 0;
        syndicates.forEach(s => {
            // Did they complete funding? Are they blacklisted?
            if (s.status === 'funded' || s.status === 'completed') goodStanding++;
        });

        const successRate = goodStanding / syndicates.length;
        return (successRate * 80) + 20; // Base 20 points for trying
    }

    async evaluateCashFlow() {
        // Look at PocketBooks balances
        const accounts = await db.getAll(STORES.accounts) || [];
        if (accounts.length === 0) return 10; // High risk if no accounts

        const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);

        // Simple metric: More than R10,000 cash on hand = 100 score
        const cashScore = Math.min((totalBalance / 10000) * 100, 100);

        // Optional: Analyze expenses vs income rhythm
        return cashScore;
    }

    /**
     * Get the breakdown of the score for UI display
     */
    async getScoreBreakdown() {
        const score = await this.calculateScore();

        let tier = 'Unrated';
        let color = '#6b7280';
        let maxLimit = 0;

        if (score >= 800) { tier = 'Platinum'; color = '#8b5cf6'; maxLimit = 150000; }
        else if (score >= 650) { tier = 'Gold'; color = '#10b981'; maxLimit = 50000; }
        else if (score >= 500) { tier = 'Silver'; color = '#3b82f6'; maxLimit = 10000; }
        else if (score >= 300) { tier = 'Bronze'; color = '#f59e0b'; maxLimit = 2000; }
        else { tier = 'High Risk'; color = '#ef4444'; maxLimit = 0; }

        return {
            score,
            tier,
            color,
            maxCreditLimit: maxLimit,
            lastCalculated: Date.now()
        };
    }
}

export default new TrustScoreEngine();
