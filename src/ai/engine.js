// AI Engine - Supervisor Layer
// Provides decision assistance, optimization, and insights
// NOT a chatbot - a system optimizer

class AIEngine {
  constructor() {
    this.rules = new Map();
    this.insights = [];
    this.isInitialized = false;
  }

  async init() {
    console.log('🤖 Initializing AI Engine...');

    // Load rules and models
    await this.loadRules();

    this.isInitialized = true;
    console.log('✅ AI Engine initialized');
  }

  async loadRules() {
    // Rule-based AI for Phase 11
    // Will be replaced with ML/RL later

    this.rules.set('inventory_reorder', {
      name: 'Inventory Reorder Alert',
      module: 'poolstock',
      condition: (item) => item.quantity <= item.reorderLevel,
      action: (item) => ({
        type: 'alert',
        severity: 'warning',
        module: 'poolstock',
        message: `Low stock: ${item.name} (${item.quantity} units remaining)`,
        suggestion: `Reorder ${item.reorderQuantity} units from ${item.preferredSupplier}`,
        data: item
      })
    });

    this.rules.set('inventory_overstock', {
      name: 'Overstock Detection',
      module: 'poolstock',
      condition: (item) => item.quantity > (item.averageDemand * 90), // 3 months supply
      action: (item) => ({
        type: 'insight',
        severity: 'info',
        module: 'poolstock',
        message: `Excess inventory: ${item.name}`,
        suggestion: `Consider group-buy discount or reduce next order`,
        impact: {
          capitalTied: item.quantity * item.unitCost,
          daysOfSupply: Math.round(item.quantity / item.averageDemand)
        }
      })
    });

    this.rules.set('machine_idle', {
      name: 'Machine Utilization Alert',
      module: 'smartshift',
      condition: (machine) => machine.utilization < 50 && machine.status === 'operational',
      action: (machine) => ({
        type: 'alert',
        severity: 'warning',
        module: 'smartshift',
        message: `Low utilization: ${machine.name} (${machine.utilization}%)`,
        suggestion: 'Reassign jobs or consider maintenance window',
        data: machine
      })
    });

    this.rules.set('shift_overtime', {
      name: 'Overtime Cost Optimizer',
      module: 'smartshift',
      condition: (shift) => shift.plannedHours > shift.standardHours * 1.2,
      action: (shift) => ({
        type: 'alert',
        severity: 'warning',
        module: 'smartshift',
        message: `Overtime detected in ${shift.name}`,
        suggestion: 'Redistribute workload or add shift',
        costImpact: shift.overtimeCost
      })
    });

    this.rules.set('payment_overdue', {
      name: 'Payment Reminder',
      module: 'pocketbooks',
      condition: (payment) => {
        const daysOverdue = (Date.now() - payment.dueDate) / (1000 * 60 * 60 * 24);
        return payment.status === 'pending' && daysOverdue > 0;
      },
      action: (payment) => ({
        type: 'alert',
        severity: 'high',
        module: 'pocketbooks',
        message: `Payment overdue: ${payment.supplier}`,
        suggestion: 'Process payment to maintain supplier relationship',
        data: payment
      })
    });

    this.rules.set('cashflow_warning', {
      name: 'Cash Flow Warning',
      module: 'pocketbooks',
      condition: (accounts) => {
        const cashBalance = accounts.find(a => a.type === 'cash')?.balance || 0;
        const upcoming = accounts.reduce((sum, a) => sum + (a.upcomingPayments || 0), 0);
        return cashBalance < upcoming * 1.2; // Less than 120% of upcoming payments
      },
      action: (accounts) => ({
        type: 'alert',
        severity: 'high',
        module: 'pocketbooks',
        message: 'Cash flow constraint detected',
        suggestion: 'Consider: 1) Delay non-critical purchases, 2) Accelerate receivables, 3) TrustCircle financing',
        data: { accounts }
      })
    });

    this.rules.set('syndicate_contribution_due', {
      name: 'Syndicate Contribution Reminder',
      module: 'trustcircle',
      condition: (contribution) => {
        const daysToDue = (contribution.dueDate - Date.now()) / (1000 * 60 * 60 * 24);
        return daysToDue <= 3 && daysToDue > 0 && contribution.status === 'pending';
      },
      action: (contribution) => ({
        type: 'alert',
        severity: 'info',
        module: 'trustcircle',
        message: `Syndicate contribution due: ${contribution.syndicateName}`,
        suggestion: `${contribution.amount} due in ${Math.round((contribution.dueDate - Date.now()) / (1000 * 60 * 60 * 24))} days`,
        data: contribution
      })
    });

    this.rules.set('production_bottleneck', {
      name: 'Production Bottleneck Detection',
      module: 'smartshift',
      condition: (order) => {
        return order.status === 'in_progress' &&
          order.progress < 50 &&
          (order.dueDate - Date.now()) / (1000 * 60 * 60 * 24) < 2;
      },
      action: (order) => ({
        type: 'alert',
        severity: 'high',
        module: 'smartshift',
        message: `Production risk: Order #${order.id}`,
        suggestion: 'Prioritize this order or negotiate deadline extension',
        data: order
      })
    });

    this.rules.set('group_buy_opportunity', {
      name: 'Group Buy Recommendation',
      module: 'poolstock',
      condition: (inventory, syndicateMembers) => {
        // If multiple members need similar items
        const similarNeeds = syndicateMembers.filter(m =>
          m.inventory.some(i => i.sku === inventory.sku && i.quantity < i.reorderLevel)
        );
        return similarNeeds.length >= 2;
      },
      action: (inventory, members) => ({
        type: 'insight',
        severity: 'info',
        module: 'poolstock',
        message: `Group buy opportunity: ${inventory.name}`,
        suggestion: `${members.length} businesses need this item - negotiate bulk discount`,
        potentialSavings: inventory.bulkDiscount * members.length
      })
    });
  }

  // Analyze data and generate insights
  async analyze(module, data) {
    const insights = [];

    for (const [ruleId, rule] of this.rules.entries()) {
      // Apply relevant rules based on module
      if (rule.module === module || module === 'all') {
        try {
          // Check if data matches rule conditions
          if (Array.isArray(data)) {
            for (const item of data) {
              if (rule.condition(item)) {
                const insight = rule.action(item);
                insights.push({ ...insight, ruleId, timestamp: Date.now() });
              }
            }
          } else {
            if (rule.condition(data)) {
              const insight = rule.action(data);
              insights.push({ ...insight, ruleId, timestamp: Date.now() });
            }
          }
        } catch (error) {
          console.warn(`Rule ${ruleId} failed:`, error);
        }
      }
    }

    this.insights = insights;
    return insights;
  }

  // Get actionable recommendations
  async getRecommendations(module) {
    // This is where ML would live in future phases
    // For now, return rule-based insights
    return this.insights.filter(i => i.module === module);
  }

  // Optimization engine for SmartShift scheduling
  async optimizeSchedule(orders, machines, workers) {
    console.log('🤖 AI: Optimizing production schedule...');

    // Simple greedy algorithm for Phase 11
    // Will be replaced with optimization algorithms later

    const schedule = [];
    const machineUtilization = new Map();
    const workerAssignments = new Map();

    // Initialize utilization tracking
    machines.forEach(m => machineUtilization.set(m.id, 0));
    workers.forEach(w => workerAssignments.set(w.id, []));

    // Sort orders by priority and due date
    const sortedOrders = [...orders].sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return a.dueDate - b.dueDate;
    });

    for (const order of sortedOrders) {
      // Find best machine (highest capacity, lowest utilization)
      const availableMachines = machines.filter(m =>
        m.capabilities.includes(order.requiredCapability) &&
        m.status === 'operational'
      );

      if (availableMachines.length === 0) {
        schedule.push({
          orderId: order.id,
          status: 'blocked',
          reason: 'No available machines',
          recommendation: 'Queue or outsource'
        });
        continue;
      }

      const bestMachine = availableMachines.reduce((best, current) => {
        const currentUtil = machineUtilization.get(current.id);
        const bestUtil = machineUtilization.get(best.id);
        return currentUtil < bestUtil ? current : best;
      });

      // Find worker with required skills
      const capableWorkers = workers.filter(w =>
        w.skills.includes(order.requiredSkill) &&
        w.availability === 'available'
      );

      if (capableWorkers.length === 0) {
        schedule.push({
          orderId: order.id,
          machineId: bestMachine.id,
          status: 'blocked',
          reason: 'No available workers',
          recommendation: 'Train workers or delay production'
        });
        continue;
      }

      const bestWorker = capableWorkers[0]; // Simple: pick first available

      // Calculate production time
      const productionTime = order.quantity / bestMachine.throughput;

      // Add to schedule
      schedule.push({
        orderId: order.id,
        machineId: bestMachine.id,
        workerId: bestWorker.id,
        startTime: Date.now() + (machineUtilization.get(bestMachine.id) * 3600000),
        duration: productionTime,
        status: 'scheduled'
      });

      // Update utilization
      machineUtilization.set(
        bestMachine.id,
        machineUtilization.get(bestMachine.id) + productionTime
      );
    }

    // Generate insights
    const insights = {
      totalOrders: orders.length,
      scheduled: schedule.filter(s => s.status === 'scheduled').length,
      blocked: schedule.filter(s => s.status === 'blocked').length,
      avgMachineUtilization: Array.from(machineUtilization.values()).reduce((a, b) => a + b, 0) / machines.length,
      recommendations: []
    };

    // Add recommendations based on schedule
    if (insights.blocked > 0) {
      insights.recommendations.push({
        type: 'warning',
        message: `${insights.blocked} orders blocked`,
        action: 'Review capacity constraints'
      });
    }

    if (insights.avgMachineUtilization < 60) {
      insights.recommendations.push({
        type: 'info',
        message: 'Low machine utilization detected',
        action: 'Consider taking on more orders'
      });
    }

    return { schedule, insights };
  }

  // Machine Learning: Demand Forecasting using Linear Regression
  async forecastDemand(sku, historicalData) {
    console.log('🤖 AI: Running ML linear regression for', sku);

    if (!historicalData || historicalData.length < 7) {
      return {
        forecast: null,
        confidence: 'low',
        message: 'Insufficient data for ML forecasting'
      };
    }

    // Sort chronologically just in case
    const sortedData = [...historicalData].sort((a, b) => a.timestamp - b.timestamp);

    // Use up to the last 30 data points
    const modelData = sortedData.slice(-30);
    const n = modelData.length;

    // We will map 'x' as day index (1 to n), 'y' as quantity used/sold
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

    for (let i = 0; i < n; i++) {
      const x = i + 1;
      const y = modelData[i].quantity;
      sumX += x;
      sumY += y;
      sumXY += (x * y);
      sumXX += (x * x);
    }

    // Calculate Least Squares Regression (y = mx + b)
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Predict for the next 30 days (x = n+1 to n+30)
    let projected30DayTotal = 0;
    for (let d = 1; d <= 30; d++) {
      const prediction = slope * (n + d) + intercept;
      // Floor to 0 if the projection goes negative
      projected30DayTotal += Math.max(0, prediction);
    }

    const currentDailyAvg = sumY / n;

    // Determine trend based on slope severity 
    // If slope moves more than 5% of daily avg per day
    let trend = 'stable';
    if (slope > (currentDailyAvg * 0.05)) trend = 'increasing';
    if (slope < -(currentDailyAvg * 0.05)) trend = 'decreasing';

    // R-squared value for confidence could be calculated, but standard deviation is faster
    const variance = modelData.reduce((sum, d) =>
      sum + Math.pow(d.quantity - currentDailyAvg, 2), 0
    ) / n;
    const stdDev = Math.sqrt(variance);
    const confidence = stdDev < currentDailyAvg * 0.3 ? 'high' :
      stdDev < currentDailyAvg * 0.6 ? 'medium' : 'low';

    return {
      forecast: Math.round(projected30DayTotal), // 30-day ML forecast
      daily: Math.round(currentDailyAvg),
      trend,
      confidence,
      slope: slope.toFixed(4), // Expose the ML metric for UI
      recommendation: trend === 'increasing' ?
        'ML detects upward momentum. Increase reorder buffer.' :
        trend === 'decreasing' ?
          'ML detects waning demand. Delay stock purchases.' :
          'Demand is stable. Maintain standard reorder levels.'
    };
  }

  // Machine Learning: Dynamic Pricing Optimization
  async suggestDynamicPrice(sku, currentPrice, inventoryRecord, recentSalesData) {
    console.log('🤖 AI: Calculating semantic dynamic pricing for', sku);

    let suggestedPrice = currentPrice;
    let rationale = "Market equilibrium.";

    // 1. Scarcity Multiplier (Supply curve)
    // If we have less than a 7-day supply based on current velocity, increase price to slow demand and maximize remaining margin.
    if (inventoryRecord && recentSalesData && recentSalesData.length > 0) {
      const dailyVelocity = recentSalesData.reduce((sum, sale) => sum + sale.quantity, 0) / Math.max(7, recentSalesData.length);
      const daysOfSupply = inventoryRecord.quantity / (dailyVelocity || 1);

      if (daysOfSupply < 7 && inventoryRecord.quantity > 0) {
        suggestedPrice *= 1.15; // 15% surge pricing for scarcity
        rationale = "High scarcity detected. Surging price to maximize remaining margin.";
      } else if (daysOfSupply > 60) {
        suggestedPrice *= 0.90; // 10% discount to move stagnant stock
        rationale = "Stagnant inventory detected. Discounting to free up working capital.";
      } else {
        // 2. Elasticity Multiplier (Demand curve)
        // If it's selling incredibly fast at the current price, test a 5% increase.
        if (dailyVelocity > (inventoryRecord.reorderQuantity / 30) * 1.5) {
          suggestedPrice *= 1.05;
          rationale = "Strong buying velocity. Minor price increase to test ceiling.";
        }
      }
    }

    return {
      sku,
      originalPrice: currentPrice,
      suggestedPrice: Number(suggestedPrice.toFixed(2)),
      differencePercentage: ((suggestedPrice - currentPrice) / currentPrice * 100).toFixed(1),
      rationale
    };
  }

  // Risk scoring for TrustCircle
  async calculateRiskScore(member, syndicate) {
    console.log('🤖 AI: Calculating risk score for', member.name);

    // Simple scoring model for Phase 11
    let score = 100; // Start at 100 (perfect)

    // Payment history (40 points)
    const paymentHistory = member.contributions || [];
    const latePayments = paymentHistory.filter(c => c.status === 'late').length;
    const missedPayments = paymentHistory.filter(c => c.status === 'missed').length;

    score -= (latePayments * 5);
    score -= (missedPayments * 15);

    // Business age (20 points)
    const businessAge = (Date.now() - member.businessStartDate) / (1000 * 60 * 60 * 24 * 365);
    if (businessAge < 1) score -= 20;
    else if (businessAge < 2) score -= 10;
    else if (businessAge < 3) score -= 5;

    // Financial health (20 points)
    if (member.cashFlowRatio < 0.5) score -= 20;
    else if (member.cashFlowRatio < 1.0) score -= 10;

    // Syndicate engagement (10 points)
    const contributionRate = member.contributions?.filter(c => c.status === 'paid').length /
      (member.contributions?.length || 1);
    if (contributionRate < 0.8) score -= 10;
    else if (contributionRate < 0.9) score -= 5;

    // Social proof (10 points)
    const references = member.references || [];
    if (references.length === 0) score -= 10;
    else if (references.length < 2) score -= 5;

    // Normalize to 0-100
    score = Math.max(0, Math.min(100, score));

    return {
      score,
      rating: score >= 80 ? 'excellent' :
        score >= 60 ? 'good' :
          score >= 40 ? 'fair' : 'risky',
      factors: {
        paymentHistory: 100 - (latePayments * 5 + missedPayments * 15),
        businessMaturity: businessAge,
        financialHealth: member.cashFlowRatio,
        engagement: contributionRate * 100
      },
      recommendation: score >= 60 ?
        'Approved for syndicate participation' :
        'Recommend probation period or co-guarantor'
    };
  }
}

export { AIEngine };
