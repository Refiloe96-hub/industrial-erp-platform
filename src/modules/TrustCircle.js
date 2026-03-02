// TrustCircle Module - B2B Syndicates & Financing
// Purpose: Unlock capital and leverage collective power
// Role: Board of Directors
// NOT: Social savings club, audio rooms, or consumer stokvels

import db, { STORES } from '../db/index.js';


class TrustCircle {
  constructor(aiEngine) {
    this.aiEngine = aiEngine;
  }

  // Create syndicate
  async createSyndicate(data) {
    const syndicate = {
      name: data.name,
      type: data.type, // 'group_buying', 'equipment_financing', 'mutual_credit', 'warehouse_backed'
      description: data.description,
      maxMembers: data.maxMembers || 10,
      minContribution: data.minContribution,
      contributionFrequency: data.contributionFrequency, // 'weekly', 'monthly'
      purpose: data.purpose,
      rules: data.rules,
      status: 'active', // active, suspended, closed
      totalPool: 0,
      createdBy: data.createdBy,
      createdAt: Date.now()
    };

    const id = await db.add(STORES.syndicates, syndicate);
    console.log('✅ Syndicate created:', id);

    // Add creator as first member
    await this.addMember(id, {
      businessId: data.createdBy,
      businessName: data.businessName || data.createdBy,
      role: 'admin'
    });

    return { id, ...syndicate };
  }

  // Get syndicates
  async getSyndicates(filters = {}) {
    let syndicates = await db.getAll(STORES.syndicates);

    if (filters.type) {
      syndicates = syndicates.filter(s => s.type === filters.type);
    }

    if (filters.status) {
      syndicates = syndicates.filter(s => s.status === filters.status);
    }

    // Enrich with member counts
    for (const syndicate of syndicates) {
      const members = await this.getMembers(syndicate.id);
      syndicate.currentMembers = members.length;
      syndicate.availableSlots = syndicate.maxMembers - members.length;
    }

    return syndicates;
  }

  // Add member to syndicate
  async addMember(syndicateId, data) {
    const syndicate = await db.get(STORES.syndicates, syndicateId);

    if (!syndicate) {
      throw new Error('Syndicate not found');
    }

    const members = await this.getMembers(syndicateId);

    if (members.length >= syndicate.maxMembers) {
      throw new Error('Syndicate is full');
    }

    // AI: Calculate risk score
    let riskScore = 50; // default

    if (this.aiEngine) {
      const riskAssessment = await this.aiEngine.calculateRiskScore(
        data.businessProfile || {},
        syndicate
      );
      riskScore = riskAssessment.score;
    }

    const member = {
      syndicateId,
      businessId: data.businessId,
      businessName: data.businessName,
      role: data.role || 'member', // admin, member
      joinedAt: Date.now(),
      riskScore,
      totalContributions: 0,
      status: 'active', // active, suspended, exited
      approvedBy: data.approvedBy
    };

    const id = await db.add(STORES.members, member);
    console.log('✅ Member added to syndicate:', id);

    return { id, ...member };
  }

  // Get syndicate members
  async getMembers(syndicateId) {
    return await db.query(STORES.members, 'syndicateId', syndicateId);
  }

  // Calculate trust score based on behavior
  async calculateTrustScore(memberId) {
    const member = await db.get(STORES.members, memberId);
    if (!member) return 0;

    const contributions = await this.getContributions({ memberId });
    if (contributions.length === 0) return 50; // Neutral starting score

    let score = 50;
    let onTime = 0;
    let late = 0;
    let missed = 0;
    let totalVolume = 0;

    contributions.forEach(c => {
      totalVolume += c.amount || 0;
      if (c.status === 'paid') {
        onTime++;
        score += 2;
      } else if (c.status === 'late') {
        late++;
        score -= 5;
      } else if (c.status === 'missed') {
        missed++;
        score -= 15;
      }
    });

    if (totalVolume > 50000 && onTime > late) score += 5;
    if (totalVolume > 100000 && missed === 0) score += 10;

    score = Math.max(0, Math.min(100, score));

    if (member.riskScore !== score) {
      member.riskScore = score;
      await db.update(STORES.members, member);
    }

    return score;
  }

  // Record contribution
  async recordContribution(data) {
    const contribution = {
      syndicateId: data.syndicateId,
      memberId: data.memberId,
      amount: data.amount,
      type: data.type, // 'regular', 'penalty', 'interest', 'principal'
      date: data.date || Date.now(),
      dueDate: data.dueDate,
      status: data.status || 'pending', // pending, paid, late, missed
      paymentMethod: data.paymentMethod,
      reference: data.reference,
      notes: data.notes
    };

    const id = await db.add(STORES.contributions, contribution);
    console.log('✅ Contribution recorded:', id);

    // Update member total contributions if paid
    if (contribution.status === 'paid') {
      await this.updateMemberContributions(contribution.memberId, contribution.amount);
    }

    // Update syndicate pool if paid
    if (contribution.status === 'paid') {
      await this.updateSyndicatePool(contribution.syndicateId, contribution.amount);
    }

    return { id, ...contribution };
  }

  async updateMemberContributions(memberId, amount) {
    const member = await db.get(STORES.members, memberId);

    if (member) {
      member.totalContributions += amount;
      await db.update(STORES.members, member);
    }
  }

  async updateSyndicatePool(syndicateId, amount) {
    const syndicate = await db.get(STORES.syndicates, syndicateId);

    if (syndicate) {
      syndicate.totalPool += amount;
      await db.update(STORES.syndicates, syndicate);
    }
  }

  // Get contributions
  async getContributions(filters = {}) {
    let contributions = await db.getAll(STORES.contributions);

    if (filters.syndicateId) {
      contributions = contributions.filter(c => c.syndicateId === filters.syndicateId);
    }

    if (filters.memberId) {
      contributions = contributions.filter(c => c.memberId === filters.memberId);
    }

    if (filters.status) {
      contributions = contributions.filter(c => c.status === filters.status);
    }

    return contributions.sort((a, b) => b.date - a.date);
  }

  // Request funding from syndicate
  async requestFunding(data) {
    const request = {
      syndicateId: data.syndicateId,
      memberId: data.memberId,
      amount: data.amount,
      purpose: data.purpose, // 'equipment', 'inventory', 'working_capital', 'group_purchase'
      description: data.description,
      repaymentTerms: data.repaymentTerms,
      collateral: data.collateral,
      status: 'pending', // pending, approved, rejected, disbursed, repaid
      requestDate: Date.now(),
      votesFor: 0,
      votesAgainst: 0,
      votesRequired: data.votesRequired || Math.ceil(data.totalMembers * 0.5)
    };

    const id = await db.add(STORES.fundingRequests, request);
    console.log('✅ Funding request created:', id);

    return { id, ...request };
  }

  // Group buying coordination
  async createGroupBuy(data) {
    const groupBuy = {
      syndicateId: data.syndicateId,
      item: data.item,
      sku: data.sku,
      supplier: data.supplier,
      unitPrice: data.unitPrice,
      bulkPrice: data.bulkPrice,
      minQuantity: data.minQuantity,
      participants: [],
      totalQuantity: 0,
      status: 'open', // open, committed, ordered, delivered
      deadline: data.deadline,
      savingsPerUnit: data.unitPrice - data.bulkPrice,
      createdBy: data.createdBy,
      createdAt: Date.now()
    };

    const id = await db.add(STORES.groupBuys, groupBuy);
    console.log('✅ Group buy created:', id);

    return { id, ...groupBuy };
  }

  // Join group buy
  async joinGroupBuy(groupBuyId, data) {
    const groupBuy = await db.get(STORES.groupBuys, groupBuyId);

    if (!groupBuy) {
      throw new Error('Group buy not found');
    }

    if (groupBuy.status !== 'open') {
      throw new Error('Group buy is no longer open');
    }

    const participant = {
      memberId: data.memberId,
      businessName: data.businessName,
      quantity: data.quantity,
      commitment: data.quantity * groupBuy.bulkPrice,
      joinedAt: Date.now()
    };

    groupBuy.participants.push(participant);
    groupBuy.totalQuantity += data.quantity;

    // Check if min quantity reached
    if (groupBuy.totalQuantity >= groupBuy.minQuantity && groupBuy.status === 'open') {
      groupBuy.status = 'committed';
      groupBuy.committedAt = Date.now();
    }

    await db.update(STORES.groupBuys, groupBuy);
    console.log('✅ Joined group buy:', groupBuyId);

    return groupBuy;
  }

  // Syndicate analytics
  async getSyndicateAnalytics(syndicateId) {
    const syndicate = await db.get(STORES.syndicates, syndicateId);
    const members = await this.getMembers(syndicateId);
    const contributions = await this.getContributions({ syndicateId });

    const paidContributions = contributions.filter(c => c.status === 'paid');
    const pendingContributions = contributions.filter(c => c.status === 'pending');
    const lateContributions = contributions.filter(c => c.status === 'late');

    const totalContributed = paidContributions.reduce((sum, c) => sum + c.amount, 0);
    const totalPending = pendingContributions.reduce((sum, c) => sum + c.amount, 0);

    const collectionRate = contributions.length > 0
      ? (paidContributions.length / contributions.length) * 100
      : 0;

    // Member performance
    const memberPerformance = await Promise.all(members.map(async member => {
      const score = await this.calculateTrustScore(member.id);
      const memberContributions = contributions.filter(c => c.memberId === member.id);
      const memberPaid = memberContributions.filter(c => c.status === 'paid').length;
      const memberLate = memberContributions.filter(c => c.status === 'late').length;

      return {
        ...member,
        riskScore: score,
        paymentRate: memberContributions.length > 0
          ? (memberPaid / memberContributions.length) * 100
          : 0,
        latePayments: memberLate
      };
    }));

    return {
      syndicate,
      members: members.length,
      totalPool: syndicate.totalPool,
      totalContributed,
      totalPending,
      collectionRate: Math.round(collectionRate),
      latePayments: lateContributions.length,
      memberPerformance,
      insights: this.generateSyndicateInsights(syndicate, collectionRate, lateContributions.length)
    };
  }

  generateSyndicateInsights(syndicate, collectionRate, latePayments) {
    const insights = [];

    if (collectionRate < 80) {
      insights.push({
        type: 'warning',
        message: 'Low collection rate',
        action: 'Review member commitments and follow up on pending contributions'
      });
    } else if (collectionRate > 95) {
      insights.push({
        type: 'success',
        message: 'Excellent collection rate',
        action: null
      });
    }

    if (latePayments > syndicate.maxMembers * 0.2) {
      insights.push({
        type: 'warning',
        message: 'Multiple late payments detected',
        action: 'Consider adjusting contribution amounts or frequency'
      });
    }

    if (syndicate.totalPool > syndicate.minContribution * syndicate.maxMembers * 6) {
      insights.push({
        type: 'info',
        message: 'Strong capital pool',
        action: 'Consider group equipment purchase or funding opportunity'
      });
    }

    return insights;
  }

  // AI: Optimal group size recommendation
  async recommendGroupSize(purpose, businessProfile) {
    if (!this.aiEngine) {
      // Default recommendation
      return {
        recommended: 5,
        min: 3,
        max: 10,
        reasoning: 'Standard recommendation for small business syndicates'
      };
    }

    // AI would analyze various factors
    // For Phase 11, return rule-based recommendation

    const recommendations = {
      'group_buying': { min: 3, max: 8, optimal: 5 },
      'equipment_financing': { min: 3, max: 6, optimal: 4 },
      'mutual_credit': { min: 5, max: 12, optimal: 8 },
      'warehouse_backed': { min: 4, max: 10, optimal: 6 }
    };

    const rec = recommendations[purpose] || { min: 3, max: 10, optimal: 5 };

    return {
      recommended: rec.optimal,
      min: rec.min,
      max: rec.max,
      reasoning: `Based on ${purpose} dynamics and risk distribution`
    };
  }
}

export default TrustCircle;
