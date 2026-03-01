/**
 * aiEngine.js — Cross-Platform AI Insights Service
 * Runs offline deterministic analytics across all 5 modules,
 * then optionally calls Groq free API (llama3-8b) for NL summaries.
 */
import db, { STORES } from '../db/index.js';

// ─── Constants ───────────────────────────────────────────────────────────────
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama3-8b-8192';
const LS_KEY_GROQ = 'erp_groq_api_key';
const LS_KEY_HORIZON = 'erp_forecast_horizon';
const DAY_MS = 86_400_000;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function dayBucket(ts) {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Linear regression: returns { slope, intercept } */
function linearRegression(ys) {
    const n = ys.length;
    if (n < 2) return { slope: 0, intercept: ys[0] ?? 0 };
    const xs = ys.map((_, i) => i);
    const meanX = xs.reduce((a, b) => a + b) / n;
    const meanY = ys.reduce((a, b) => a + b) / n;
    const num = xs.reduce((s, x, i) => s + (x - meanX) * (ys[i] - meanY), 0);
    const den = xs.reduce((s, x) => s + (x - meanX) ** 2, 0);
    const slope = den ? num / den : 0;
    return { slope, intercept: meanY - slope * meanX };
}

/** Holt's double exponential smoothing → forecast array of length `horizon` */
function holtForecast(series, horizon = 14, alpha = 0.3, beta = 0.1) {
    if (!series.length) return Array(horizon).fill(0);
    if (series.length === 1) return Array(horizon).fill(series[0]);

    let L = series[0];
    let T = series[1] - series[0];

    for (let i = 1; i < series.length; i++) {
        const prevL = L;
        L = alpha * series[i] + (1 - alpha) * (L + T);
        T = beta * (L - prevL) + (1 - beta) * T;
    }

    return Array.from({ length: horizon }, (_, h) => Math.max(0, L + (h + 1) * T));
}

/** Zscore anomaly detection */
function detectAnomalies(values, threshold = 2.0) {
    if (values.length < 4) return [];
    const mean = values.reduce((a, b) => a + b) / values.length;
    const std = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length) || 1;
    return values.map((v, i) => ({ index: i, value: v, z: Math.abs((v - mean) / std) }))
        .filter(d => d.z > threshold);
}

// ─── Main Engine ─────────────────────────────────────────────────────────────
class AIEngine {

    // ── API Key Persistence ─────────────────────────────────────────────────
    getApiKey() { return localStorage.getItem(LS_KEY_GROQ) || ''; }
    saveApiKey(key) { localStorage.setItem(LS_KEY_GROQ, key.trim()); }
    getHorizon() { return parseInt(localStorage.getItem(LS_KEY_HORIZON) || '14', 10); }
    saveHorizon(h) { localStorage.setItem(LS_KEY_HORIZON, String(h)); }

    // ── 1. PocketBooks Analysis ─────────────────────────────────────────────
    analyzePocketBooks(txs) {
        if (!txs.length) return { status: 'no_data', score: 50, insights: [] };

        const horizon = this.getHorizon();
        const now = Date.now();

        // Daily net cash map
        const dailyMap = {};
        txs.forEach(t => {
            const day = dayBucket(t.date || t.localTimestamp || now);
            const amt = t.type === 'income' ? (t.amount || 0) : -(t.amount || 0);
            dailyMap[day] = (dailyMap[day] || 0) + amt;
        });

        const sortedDays = Object.keys(dailyMap).sort();
        const series = sortedDays.map(d => dailyMap[d]);

        // Forecast
        const forecast = holtForecast(series, horizon);
        const forecastedRevenue = forecast.map(v => Math.max(v, 0));
        const forecastedExpenses = forecast.map(v => Math.max(-v, 0));

        // Trend
        const { slope } = linearRegression(series);
        const trendLabel = slope > 0 ? 'improving' : slope < -0.05 ? 'declining' : 'stable';

        // Income vs Expense totals
        const totalIncome = txs.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
        const totalExpense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
        const netCashFlow = totalIncome - totalExpense;
        const savingsRate = totalIncome > 0 ? ((netCashFlow / totalIncome) * 100).toFixed(1) : 0;

        // Anomalies (unusual expense spikes)
        const expenseDays = txs.filter(t => t.type === 'expense');
        const expenseByDay = {};
        expenseDays.forEach(t => {
            const day = dayBucket(t.date || t.localTimestamp || now);
            expenseByDay[day] = (expenseByDay[day] || 0) + (t.amount || 0);
        });
        const anomalies = detectAnomalies(Object.values(expenseByDay));

        // Burn rate (avg daily expense)
        const burnRate = Object.values(expenseByDay).length
            ? Object.values(expenseByDay).reduce((a, b) => a + b, 0) / Object.values(expenseByDay).length
            : 0;

        // Category breakdown
        const byCategory = {};
        txs.forEach(t => {
            const cat = t.category || 'Other';
            if (!byCategory[cat]) byCategory[cat] = { income: 0, expense: 0 };
            if (t.type === 'income') byCategory[cat].income += t.amount || 0;
            else byCategory[cat].expense += t.amount || 0;
        });

        // Score: 100 if net positive + savings > 20%, deduct for deficits
        let score = 50;
        if (netCashFlow > 0) score += 25;
        if (parseFloat(savingsRate) > 20) score += 15;
        if (parseFloat(savingsRate) > 30) score += 10;
        if (anomalies.length > 2) score -= 15;
        score = Math.max(0, Math.min(100, score));

        return {
            status: 'ok', score,
            totalIncome, totalExpense, netCashFlow, savingsRate,
            burnRate: Math.round(burnRate),
            trend: trendLabel,
            forecast: forecastedRevenue,
            forecastedExpenses,
            anomalyCount: anomalies.length,
            byCategory,
            topExpenseCategory: Object.entries(byCategory).sort((a, b) => b[1].expense - a[1].expense)[0]?.[0] || 'N/A',
        };
    }

    // ── 2. PoolStock Analysis ───────────────────────────────────────────────
    analyzePoolStock(items, movements) {
        if (!items.length) return { status: 'no_data', score: 50, urgencyList: [] };

        const horizon = this.getHorizon();

        // Build daily 'out' series per SKU
        const outBySku = {};
        movements.filter(m => m.type === 'out').forEach(m => {
            if (!outBySku[m.sku]) outBySku[m.sku] = {};
            const day = dayBucket(m.timestamp || m.localTimestamp || Date.now());
            outBySku[m.sku][day] = (outBySku[m.sku][day] || 0) + (m.quantity || 0);
        });

        const urgencyList = items.map(item => {
            const dailyMap = outBySku[item.sku] || {};
            const series = Object.keys(dailyMap).sort().map(d => dailyMap[d]);
            const avgDailyDemand = series.length
                ? series.reduce((a, b) => a + b, 0) / series.length
                : (item.averageDemand || 1);

            const forecastSeries = holtForecast(series.length ? series : [avgDailyDemand], horizon);
            const projectedDemand7 = forecastSeries.slice(0, 7).reduce((a, b) => a + b, 0);

            const daysToStockout = avgDailyDemand > 0
                ? Math.floor((item.quantity || 0) / avgDailyDemand)
                : 999;

            const urgency = daysToStockout <= 0 ? 'critical'
                : daysToStockout <= 3 ? 'high'
                    : daysToStockout <= 7 ? 'medium'
                        : 'low';

            return {
                sku: item.sku,
                name: item.name,
                category: item.category,
                currentStock: item.quantity || 0,
                reorderLevel: item.reorderLevel || 0,
                avgDailyDemand: Math.round(avgDailyDemand * 10) / 10,
                daysToStockout,
                forecastSeries,
                projectedDemand7: Math.round(projectedDemand7),
                urgency,
                unitCost: item.unitCost || 0,
                preferredSupplier: item.preferredSupplier || 'Unknown',
            };
        }).sort((a, b) => a.daysToStockout - b.daysToStockout);

        const criticalCount = urgencyList.filter(i => i.urgency === 'critical').length;
        const highCount = urgencyList.filter(i => i.urgency === 'high').length;

        let score = 100 - (criticalCount * 20) - (highCount * 10);
        score = Math.max(0, Math.min(100, score));

        return { status: 'ok', score, urgencyList, criticalCount, highCount };
    }

    // ── 3. SmartShift Analysis ──────────────────────────────────────────────
    analyzeSmartShift(machines, orders) {
        if (!machines.length) return { status: 'no_data', score: 50, machineScores: [] };

        const totalMachines = machines.length;
        const operational = machines.filter(m => m.status === 'operational' || m.status === 'running').length;
        const avgUtilization = machines.reduce((s, m) => s + (m.utilization || 0), 0) / totalMachines;

        const machineScores = machines.map(m => {
            const utilScore = Math.min((m.utilization || 0) / 100, 1) * 40;
            const statusScore = (m.status === 'operational' || m.status === 'running') ? 40 : 0;
            // Age penalty: older machines score lower
            const ageDays = m.installDate ? (Date.now() - new Date(m.installDate).getTime()) / DAY_MS : 0;
            const agePenalty = Math.min(ageDays / 1825, 1) * 20; // max 20pt penalty at 5 years
            const score = Math.round(utilScore + statusScore - agePenalty);

            return {
                id: m.id,
                name: m.name || `Machine ${m.id}`,
                status: m.status,
                utilization: m.utilization || 0,
                score: Math.max(0, Math.min(100, score)),
                risk: score < 40 ? 'high' : score < 65 ? 'medium' : 'low',
            };
        }).sort((a, b) => a.score - b.score);

        // Bottleneck orders: overdue production orders
        const now = Date.now();
        const overdueOrders = orders.filter(o =>
            o.status !== 'completed' && o.dueDate && new Date(o.dueDate).getTime() < now
        );
        const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'in_progress');

        let score = Math.round((operational / totalMachines) * 60 + (avgUtilization / 100) * 40);
        if (overdueOrders.length) score -= overdueOrders.length * 5;
        score = Math.max(0, Math.min(100, score));

        return {
            status: 'ok', score,
            totalMachines, operational, avgUtilization: Math.round(avgUtilization),
            machineScores,
            atRiskMachines: machineScores.filter(m => m.risk === 'high'),
            overdueOrders, pendingOrders: pendingOrders.length,
        };
    }

    // ── 4. TrustCircle Analysis ─────────────────────────────────────────────
    analyzeTrustCircle(syndicates, members, contributions) {
        if (!syndicates.length) return { status: 'no_data', score: 50, memberRisks: [] };

        const now = Date.now();

        // Member risk scoring
        const memberRisks = members.map(m => {
            const memberContribs = contributions.filter(c => c.memberId === m.id || c.memberId === m.memberId);
            const total = memberContribs.length;
            const late = memberContribs.filter(c => c.status === 'late').length;
            const pending = memberContribs.filter(c => c.status === 'pending').length;
            const lateRatio = total > 0 ? late / total : 0;

            // Check for longest overdue
            const overdueDays = memberContribs
                .filter(c => c.status === 'pending' && c.dueDate)
                .map(c => Math.floor((now - new Date(c.dueDate).getTime()) / DAY_MS))
                .filter(d => d > 0);
            const maxOverdue = overdueDays.length ? Math.max(...overdueDays) : 0;

            const riskScore = Math.round((lateRatio * 60) + (Math.min(maxOverdue, 30) / 30 * 40));
            const risk = riskScore > 60 ? 'high' : riskScore > 30 ? 'medium' : 'low';

            return {
                id: m.id,
                name: m.name || m.businessName || 'Unknown Member',
                riskScore,
                risk,
                lateRatio: (lateRatio * 100).toFixed(0),
                maxOverdueDays: maxOverdue,
                totalContributions: total,
                lateCount: late,
                pendingCount: pending,
            };
        }).sort((a, b) => b.riskScore - a.riskScore);

        // Syndicate health
        const totalPool = syndicates.reduce((s, sy) => s + (sy.totalPool || 0), 0);
        const highRisk = memberRisks.filter(m => m.risk === 'high').length;
        const medRisk = memberRisks.filter(m => m.risk === 'medium').length;

        let score = 100 - (highRisk * 20) - (medRisk * 10);
        score = Math.max(0, Math.min(100, score));

        return {
            status: 'ok', score,
            syndicateCount: syndicates.length,
            memberCount: members.length,
            totalPool,
            memberRisks,
            highRiskCount: highRisk,
            medRiskCount: medRisk,
        };
    }

    // ── 5. Sales Analysis ───────────────────────────────────────────────────
    analyzeSales(salesHistory, inventory) {
        if (!salesHistory.length) return { status: 'no_data', score: 50, topItems: [], slowMovers: [] };

        const now = Date.now();
        const week1Start = now - 7 * DAY_MS;
        const week2Start = now - 14 * DAY_MS;

        const week1 = salesHistory.filter(s => (s.date || s.localTimestamp || 0) >= week1Start);
        const week2 = salesHistory.filter(s => {
            const ts = s.date || s.localTimestamp || 0;
            return ts >= week2Start && ts < week1Start;
        });

        const rev1 = week1.reduce((s, t) => s + (t.total || t.amount || 0), 0);
        const rev2 = week2.reduce((s, t) => s + (t.total || t.amount || 0), 0);
        const revTrend = rev2 > 0 ? ((rev1 - rev2) / rev2 * 100).toFixed(1) : null;
        const trendLabel = revTrend === null ? 'no prior data'
            : parseFloat(revTrend) > 5 ? `up ${revTrend}%`
                : parseFloat(revTrend) < -5 ? `down ${Math.abs(revTrend)}%`
                    : 'stable';

        // Item frequency from salesHistory items array
        const itemFreq = {};
        salesHistory.forEach(sale => {
            (sale.items || []).forEach(item => {
                if (!itemFreq[item.sku || item.name]) itemFreq[item.sku || item.name] = { name: item.name || item.sku, qty: 0, revenue: 0 };
                itemFreq[item.sku || item.name].qty += (item.quantity || 1);
                itemFreq[item.sku || item.name].revenue += (item.total || (item.price || 0) * (item.quantity || 1));
            });
        });

        const ranked = Object.values(itemFreq).sort((a, b) => b.revenue - a.revenue);
        const topItems = ranked.slice(0, 5);
        const slowMovers = ranked.slice(-5).reverse();

        // Peak day of week
        const dayCounts = {};
        salesHistory.forEach(s => {
            const dow = new Date(s.date || s.localTimestamp || now).toLocaleDateString('en-ZA', { weekday: 'short' });
            dayCounts[dow] = (dayCounts[dow] || 0) + 1;
        });
        const peakDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';

        let score = 50;
        if (parseFloat(revTrend) > 0) score += 20;
        if (parseFloat(revTrend) > 10) score += 15;
        if (topItems.length) score += 15;
        score = Math.max(0, Math.min(100, score));

        return {
            status: 'ok', score,
            totalSales: salesHistory.length,
            revenueThisWeek: rev1, revenuePriorWeek: rev2,
            revenueTrend: trendLabel, revTrendPct: revTrend,
            topItems, slowMovers,
            peakDay,
        };
    }

    // ── 6. Business Snapshot (aggregates all modules) ───────────────────────
    async getBusinessSnapshot() {
        const [txs, items, movements, machines, orders, syndicates, members, contributions, salesHistory] =
            await Promise.all([
                db.getAll(STORES.transactions).catch(() => []),
                db.getAll(STORES.inventory).catch(() => []),
                db.getAll(STORES.stockMovements).catch(() => []),
                db.getAll(STORES.machines).catch(() => []),
                db.getAll(STORES.productionOrders).catch(() => []),
                db.getAll(STORES.syndicates).catch(() => []),
                db.getAll(STORES.members).catch(() => []),
                db.getAll(STORES.contributions).catch(() => []),
                db.getAll('sales').catch(() => db.getAll(STORES.transactions).catch(() => [])),
            ]);

        const finance = this.analyzePocketBooks(txs);
        const inventory = this.analyzePoolStock(items, movements);
        const production = this.analyzeSmartShift(machines, orders);
        const syndicate = this.analyzeTrustCircle(syndicates, members, contributions);
        const sales = this.analyzeSales(salesHistory, items);

        // Cross-module overall score (weighted average)
        const overallScore = Math.round(
            finance.score * 0.25 +
            inventory.score * 0.25 +
            production.score * 0.20 +
            syndicate.score * 0.15 +
            sales.score * 0.15
        );

        return { finance, inventory, production, syndicate, sales, overallScore };
    }

    // ── 7. Natural Language Insights ────────────────────────────────────────
    async getNLInsights(snapshot, apiKey) {
        if (apiKey) {
            try {
                return await this._callGroq(snapshot, apiKey);
            } catch (e) {
                console.warn('Groq API failed, using rule-based fallback:', e.message);
            }
        }
        return this._ruleBasedInsights(snapshot);
    }

    async _callGroq(snapshot, apiKey) {
        // Build compact summary for prompt (stay under ~400 tokens)
        const s = snapshot;
        const compact = {
            financialHealth: `Net cash ${s.finance.netCashFlow > 0 ? '+' : ''}R${Math.round(s.finance.netCashFlow)}, trend: ${s.finance.trend}, ${s.finance.anomalyCount} anomalies`,
            inventory: `${s.inventory.criticalCount} critical stockouts, ${s.inventory.highCount} high-urgency. Score: ${s.inventory.score}/100`,
            topLowStock: s.inventory.urgencyList?.slice(0, 3).map(i => `${i.name} (${i.daysToStockout}d left)`).join(', '),
            production: `${s.production.operational}/${s.production.totalMachines} machines OK. ${s.production.overdueOrders?.length || 0} overdue orders. Score: ${s.production.score}/100`,
            atRiskMachines: s.production.atRiskMachines?.map(m => m.name).join(', ') || 'none',
            syndicate: `${s.syndicate.highRiskCount} high-risk members, score: ${s.syndicate.score}/100`,
            sales: `Revenue trend: ${s.sales.revenueTrend}. Peak day: ${s.sales.peakDay}. Top item: ${s.sales.topItems?.[0]?.name || 'N/A'}`,
        };

        const res = await fetch(GROQ_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: GROQ_MODEL,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a practical business advisor for a small African SME using an ERP system. Given a business snapshot, provide exactly 5 short, actionable plain-English insights. Each insight must: start with an emoji, be one sentence, be specific and practical. Rank by urgency. No markdown headers, just 5 lines.',
                    },
                    {
                        role: 'user',
                        content: `Here is today's business snapshot:\n${JSON.stringify(compact, null, 2)}\n\nGive me 5 prioritised insights.`,
                    },
                ],
                temperature: 0.4,
                max_tokens: 500,
            }),
        });

        if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`);
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content || '';

        // Parse into array of { emoji, text, severity }
        return text.split('\n')
            .map(l => l.trim())
            .filter(l => l.length > 5)
            .slice(0, 5)
            .map(line => {
                const severity = /stockout|overdue|critical|fail|risk|late/i.test(line) ? 'critical'
                    : /warn|low|decline|behind/i.test(line) ? 'warning' : 'good';
                return { text: line, severity, source: 'ai' };
            });
    }

    _ruleBasedInsights(snapshot) {
        const insights = [];

        // Finance
        const f = snapshot.finance;
        if (f.netCashFlow < 0) {
            insights.push({ text: `🔴 Cash flow is negative (R${Math.abs(Math.round(f.netCashFlow))} deficit) — review your ${f.topExpenseCategory} spending urgently.`, severity: 'critical', source: 'rule' });
        } else if (f.savingsRate < 10) {
            insights.push({ text: `🟡 Your savings rate is only ${f.savingsRate}% — aim for at least 20% to build a buffer.`, severity: 'warning', source: 'rule' });
        } else {
            insights.push({ text: `🟢 Cash flow is healthy with a ${f.savingsRate}% savings rate — keep it up.`, severity: 'good', source: 'rule' });
        }

        // Inventory
        const inv = snapshot.inventory;
        if (inv.criticalCount > 0) {
            const first = inv.urgencyList?.[0];
            insights.push({ text: `🔴 ${inv.criticalCount} item(s) are out of stock${first ? ` — order ${first.name} from ${first.preferredSupplier} immediately` : ''}.`, severity: 'critical', source: 'rule' });
        } else if (inv.highCount > 0) {
            insights.push({ text: `🟡 ${inv.highCount} item(s) will run out within 3 days — check PoolStock for reorder recommendations.`, severity: 'warning', source: 'rule' });
        } else {
            insights.push({ text: `🟢 All stock levels are healthy — no urgent reorders needed.`, severity: 'good', source: 'rule' });
        }

        // Production
        const p = snapshot.production;
        if (p.atRiskMachines?.length) {
            insights.push({ text: `🔴 ${p.atRiskMachines.map(m => m.name).join(', ')} ${p.atRiskMachines.length === 1 ? 'has' : 'have'} a low health score — schedule maintenance soon.`, severity: 'critical', source: 'rule' });
        } else if ((p.overdueOrders?.length || 0) > 0) {
            insights.push({ text: `🟡 ${p.overdueOrders.length} production order(s) are overdue — review SmartShift to unblock the bottleneck.`, severity: 'warning', source: 'rule' });
        } else if (p.status !== 'no_data') {
            insights.push({ text: `🟢 Production is running at ${p.avgUtilization}% utilization with no overdue orders.`, severity: 'good', source: 'rule' });
        }

        // Syndicate
        const sy = snapshot.syndicate;
        if (sy.highRiskCount > 0) {
            insights.push({ text: `🟡 ${sy.highRiskCount} syndicate member(s) are high-risk — consider sending a payment reminder via TrustCircle.`, severity: 'warning', source: 'rule' });
        } else if (sy.status !== 'no_data') {
            insights.push({ text: `🟢 TrustCircle syndicates are healthy — all members are contributing on time.`, severity: 'good', source: 'rule' });
        }

        // Sales
        const s = snapshot.sales;
        if (s.status !== 'no_data') {
            const trendAmt = s.revTrendPct !== null ? ` (${s.revenueTrend})` : '';
            insights.push({ text: `📊 Revenue this week${trendAmt}. ${s.peakDay !== 'Unknown' ? `Your busiest day is ${s.peakDay}.` : ''} ${s.topItems?.[0] ? `Top seller: ${s.topItems[0].name}.` : ''}`, severity: parseFloat(s.revTrendPct) < -10 ? 'warning' : 'good', source: 'rule' });
        }

        return insights.slice(0, 5);
    }
}

export default new AIEngine();
