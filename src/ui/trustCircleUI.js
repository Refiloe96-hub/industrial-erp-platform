
import TrustCircle from '../modules/TrustCircle.js';
import { showDetailPanel, dpBar, dpKV } from './panelHelper.js';
import db, { STORES } from '../db/index.js';

class TrustCircleUI {
    constructor(container, aiEngine) {
        this.container = container;
        this.module = new TrustCircle(aiEngine);
        this.currentView = 'dashboard';
    }

    async render() {
        await this.loadView(this.currentView);
    }

    async loadView(view, data = null) {
        this.currentView = view;
        this.container.innerHTML = '<div class="loading">Loading TrustCircle...</div>';

        try {
            switch (view) {
                case 'dashboard':
                    await this.renderDashboard();
                    break;
                case 'create-syndicate':
                    this.renderCreateSyndicate();
                    break;
                case 'syndicate-detail':
                    await this.renderSyndicateDetail(data);
                    break;
                case 'group-buys':
                    await this.renderGroupBuys(data);
                    break;
                case 'funding-requests':
                    await this.renderFundingRequests(data);
                    break;
                default:
                    await this.renderDashboard();
            }
        } catch (err) {
            console.error('Error loading view:', err);
            this.container.innerHTML = `<p class="error">Error: ${err.message}</p>`;
        }
    }

    // Helper: attach backdrop + Escape close to a modal
    _attachModalClose(modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) { modal.close(); modal.remove(); }
        });
        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') { modal.close(); modal.remove(); }
        });
    }

    async renderDashboard() {
        const syndicates = await this.module.getSyndicates();
        const totalPool = syndicates.reduce((sum, s) => sum + (s.totalPool || 0), 0);

        this.container.innerHTML = `
      <div class="trustcircle-dashboard">
        <header class="module-header" style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:1rem">
          <div>
            <h1 style="margin:0; font-size:1.5rem; display:flex; align-items:center; gap:0.5rem;"><i class="ph-duotone ph-handshake"></i> TrustCircle Syndicates</h1>
            <p style="margin:0; color:var(--text-secondary); font-size:0.9rem;">Result-based cooperation for SMEs</p>
          </div>
          <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap">
            <button id="tc-ai-btn" class="btn btn-secondary" style="border:1px solid #6366f1;color:#6366f1">
              <i class="ph-duotone ph-robot"></i> AI Insights
            </button>
            <button id="create-syndicate-btn" class="btn btn-primary"><i class="ph ph-plus"></i> New Syndicate</button>
          </div>
        </header>

        <div class="stats-overview">
          <div class="stat-card" data-card="syndicates" style="cursor:pointer" title="Click for breakdown">
            <h3>Active Syndicates</h3>
            <div class="value">${syndicates.length}</div>
          </div>
          <div class="stat-card" data-card="capital" style="cursor:pointer" title="Click for breakdown">
            <h3>Total Capital Pools</h3>
            <div class="value">R ${totalPool.toLocaleString()}</div>
          </div>
        </div>

        <div class="syndicates-list">
            ${syndicates.length === 0 ?
                '<div class="empty-state">No active syndicates. Create one to get started!</div>' :
                syndicates.map(s => this.renderSyndicateCard(s)).join('')}
        </div>
      </div>
    `;

        this.container.querySelector('#create-syndicate-btn').addEventListener('click', () => {
            this.loadView('create-syndicate');
        });

        // AI Insights Button
        this.container.querySelector('#tc-ai-btn')?.addEventListener('click', async () => {
            const { default: aiEngine } = await import('../services/aiEngine.js');
            const members = await db.getAll('members');
            const contributions = await db.getAll('contributions');
            const result = aiEngine.analyzeTrustCircle(syndicates, members, contributions);

            const sevColors = { critical: '#ef4444', warning: '#f59e0b', good: '#10b981' };

            // Load NL Insights
            const apiKey = aiEngine.getApiKey();
            const insights = await aiEngine.getNLInsights(
                { finance: { score: 50 }, inventory: { score: 50 }, production: { score: 50 }, syndicate: result, sales: { score: 50, status: 'no_data' }, overallScore: result.score },
                apiKey
            );

            const insightsHTML = insights.map(ins => `
                                <li style="background:var(--bg-secondary); padding:0.75rem; border-radius:8px; border-left:3px solid ${sevColors[ins.severity] || '#6366f1'}">
                                    <span style="display:block; font-size:0.95rem;">${ins.text}</span>
                                </li>
                            `).join('');

            showDetailPanel({
                title: '🤝 TrustCircle AI Insights',
                subtitle: `Syndicate Trust Score: ${result.score}/100`,
                bodyHTML: `
                    <div class="dp-section">
                        <div class="dp-section-title">Syndicate Health</div>
                        <div class="dp-kv-grid">
                            ${dpKV('Total Syndicates', result.syndicateCount)}
                            ${dpKV('Total Capital', 'R ' + result.totalPool.toLocaleString())}
                            ${dpKV('High-Risk Members', result.highRiskCount, result.highRiskCount === 0)}
                            ${dpKV('Medium-Risk Members', result.medRiskCount, result.medRiskCount === 0)}
                        </div>
                    </div>

                    <div class="dp-section">
                        <div class="dp-section-title">AI Advisor</div>
                        <ul class="dp-list" style="gap:0.75rem;">
                            ${insightsHTML}
                        </ul>
                    </div>

                    <div class="dp-section">
                        <div class="dp-section-title">Member Risk Analysis</div>
                        ${result.memberRisks.length ? result.memberRisks.map(m =>
                    dpBar(m.name, m.riskScore, 100, m.risk === 'high' ? '#ef4444' : m.risk === 'medium' ? '#f59e0b' : '#10b981', v => v + ' Risk Score')
                ).join('') : '<div class="dp-empty">No active members found</div>'}
                    </div>
                `
            });
        });

        this.container.querySelectorAll('.syndicate-card').forEach(card => {
            card.addEventListener('click', () => {
                this.loadView('syndicate-detail', card.dataset.id);
            });
        });

        // Stat card click → drill-down panels
        this.container.querySelectorAll('.stat-card[data-card]').forEach(card => {
            card.addEventListener('click', () => this.showStatPanel(card.dataset.card, syndicates, totalPool));
        });
    }

    showStatPanel(card, syndicates, totalPool) {
        const maxPool = Math.max(...syndicates.map(s => s.totalPool || 0), 1);
        const maxMembers = Math.max(...syndicates.map(s => s.maxMembers || 1), 1);
        const byType = {};
        syndicates.forEach(s => { byType[s.type] = (byType[s.type] || 0) + 1; });
        const maxType = Math.max(...Object.values(byType), 1);

        const panels = {
            syndicates: {
                title: 'Active Syndicates',
                subtitle: `${syndicates.length} syndicates registered`,
                bodyHTML: syndicates.length ? `
            <div class="dp-section">
            <div class="dp-section-title">By Type</div>
                        ${Object.entries(byType).map(([type, count]) =>
                    dpBar(type.replace(/_/g, ' '), count, maxType, '#6366f1')).join('')
                    }
                    </div>
                <div class="dp-section">
                    <div class="dp-section-title">Capacity</div>
                    ${syndicates.map(s => dpBar(s.name, s.currentMembers || 0, s.maxMembers || 1, '#f97316', v => `${v}/${s.maxMembers} members`)).join('')}
                </div>` : '<div class="dp-empty">No syndicates yet.</div>'
            },
            capital: {
                title: 'Capital Pools',
                subtitle: `Total: R ${totalPool.toLocaleString()} across ${syndicates.length} syndicates`,
                bodyHTML: syndicates.length ? `
            <div class="dp-section">
            <div class="dp-section-title">Pool by Syndicate</div>
                        ${syndicates.sort((a, b) => (b.totalPool || 0) - (a.totalPool || 0)).map(s =>
                    dpBar(s.name, s.totalPool || 0, maxPool, '#16a34a', v => 'R ' + v.toLocaleString())).join('')
                    }
                    </div>` : '<div class="dp-empty">No syndicates yet.</div>'
            }
        };
        showDetailPanel(panels[card]);
    }

    renderSyndicateCard(syndicate) {
        return `
                <div class="card syndicate-card" data-id="${syndicate.id}">
        <div class="card-header">
            <h3>${syndicate.name}</h3>
            <span class="badge ${syndicate.status}">${syndicate.status}</span>
        </div>
        <div class="card-body">
            <p><strong>Type:</strong> ${syndicate.type}</p>
            <p><strong>Members:</strong> ${syndicate.currentMembers || 0} / ${syndicate.maxMembers}</p>
            <p><strong>Pool:</strong> R ${(syndicate.totalPool || 0).toLocaleString()}</p>
            <div class="progress-bar">
                <div class="progress" style="width: ${(syndicate.currentMembers / syndicate.maxMembers) * 100}%"></div>
            </div>
        </div>
      </div>
                `;
    }

    renderCreateSyndicate() {
        this.container.innerHTML = `
                <div class="form-container">
        <h2>Create New Syndicate</h2>
        <form id="create-syndicate-form">
          <div class="form-group">
            <label>Syndicate Name</label>
            <input type="text" name="name" required placeholder="e.g. Durban Textiles Group Buy">
          </div>

          <div class="form-group">
            <label>Type</label>
            <select name="type" required>
                <option value="group_buying">Group Buying (Bulk Discount)</option>
                <option value="equipment_financing">Equipment Financing</option>
                <option value="mutual_credit">Mutual Credit / Stokvel</option>
            </select>
          </div>

          <div class="form-group">
            <label>Max Members</label>
            <input type="number" name="maxMembers" value="10" required>
          </div>

          <div class="form-group">
            <label>Contribution Amount (R)</label>
            <input type="number" name="minContribution" required>
          </div>

          <div class="form-group">
            <label>Frequency</label>
            <select name="contributionFrequency" required>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="adhoc">Ad-hoc (Per Order)</option>
            </select>
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-secondary" id="cancel-btn">Cancel</button>
            <button type="submit" class="btn btn-primary">Create Syndicate</button>
          </div>
        </form>
      </div>
                `;

        this.container.querySelector('#cancel-btn').addEventListener('click', () => {
            this.loadView('dashboard');
        });

        this.container.querySelector('#create-syndicate-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);

            const currentUser = JSON.parse(localStorage.getItem('erp_session'));
            const userId = currentUser ? currentUser.id : 'anonymous';
            const businessName = currentUser ? (currentUser.businessName || currentUser.username || userId) : userId;

            try {
                await this.module.createSyndicate({
                    name: formData.get('name'),
                    type: formData.get('type'),
                    maxMembers: parseInt(formData.get('maxMembers')),
                    minContribution: parseFloat(formData.get('minContribution')),
                    contributionFrequency: formData.get('contributionFrequency'),
                    createdBy: userId,
                    businessName,
                    description: 'Created via UI'
                });
                await this.loadView('dashboard');
            } catch (err) {
                alert('Failed to create syndicate: ' + err.message);
            }
        });
    }

    _renderDetailTabs(syndicateId, activeTab) {
        const tabs = [
            { key: 'syndicate-detail', label: 'Members' },
            { key: 'group-buys', label: '<i class="ph ph-shopping-bag"></i> Group Buys' },
            { key: 'funding-requests', label: '<i class="ph ph-bank"></i> Funding' },
        ];
        return `
                <nav class="detail-tab-nav">
                ${tabs.map(t => `
                    <button class="detail-tab ${t.key === activeTab ? 'active' : ''}"
                            data-view="${t.key}" data-id="${syndicateId}">
                        ${t.label}
                    </button>
                `).join('')
            }
            </nav>
                `;
    }

    async renderSyndicateDetail(id) {
        const analytics = await this.module.getSyndicateAnalytics(id);
        const { syndicate, memberPerformance, insights } = analytics;

        this.container.innerHTML = `
                <div class="syndicate-detail">
            <button class="btn btn-secondary mb-4" id="back-btn">← Back</button>

            <header>
                <h1>${syndicate.name}</h1>
                <div class="badges">
                    <span class="badge">${syndicate.type}</span>
                    <span class="badge">${syndicate.contributionFrequency}</span>
                </div>
            </header>

            ${this._renderDetailTabs(id, 'syndicate-detail')}

            <div class="grid-layout">
            <div class="main-content">
                <section class="pool-visualizer">
                    <h3><i class="ph-duotone ph-coins"></i> Money Pot</h3>
                    <div class="pot-circle">
                        <span class="amount">R ${(syndicate.totalPool || 0).toLocaleString()}</span>
                        <span class="label">Total Collected</span>
                    </div>
                    <button id="record-contribution-btn" class="btn btn-primary mt-4"><i class="ph-duotone ph-money"></i> Record Contribution</button>
                </section>

                <section class="members-section">
                    <h3>Members (${syndicate.currentMembers}/${syndicate.maxMembers})</h3>
                    <button id="add-member-btn" class="btn btn-sm btn-outline"><i class="ph ph-plus"></i> Add Member</button>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Business</th>
                                <th>Trust Score <i class="ph-duotone ph-shield-check"></i></th>
                                <th>Pay Rate</th>
                                <th>Borrow Limit</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${memberPerformance.map(m => `
                                    <tr>
                                        <td>${m.businessName}</td>
                                        <td>
                                            <span class="badge ${m.riskScore >= 80 ? 'success' : m.riskScore >= 50 ? 'warning' : 'danger'}">
                                                ${m.riskScore}/100
                                            </span>
                                        </td>
                                        <td>${Math.round(m.paymentRate)}%</td>
                                        <td><span style="color:var(--text-secondary)">R ${(Math.max(0, m.totalContributions * (m.riskScore / 50))).toLocaleString()}</span></td>
                                        <td><button class="btn-icon">View</button></td>
                                    </tr>
                                `).join('')}
                        </tbody>
                    </table>
                </section>

                <section class="ai-insights">
                    <h3><i class="ph-duotone ph-robot"></i> TrustCircle AI Insights</h3>
                    <div class="insights-list">
                        ${insights.map(i => `
                                <div class="insight-card ${i.type}">
                                    <p>${i.message}</p>
                                    ${i.action ? `<small>Suggested: ${i.action}</small>` : ''}
                                </div>
                            `).join('')}
                    </div>
                </section>
            </div>
            </div>
        </div>
                `;

        this.container.querySelector('#back-btn').addEventListener('click', () => {
            this.loadView('dashboard');
        });

        this.container.querySelector('#add-member-btn').addEventListener('click', () => {
            this.renderAddMemberModal(id);
        });

        this.container.querySelector('#record-contribution-btn').addEventListener('click', () => {
            this.renderRecordContributionModal(id, memberPerformance);
        });

        this.container.querySelectorAll('.detail-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                this.loadView(btn.dataset.view, btn.dataset.id);
            });
        });
    }

    // ─── GROUP BUYS ───────────────────────────────────────────────────────────

    async renderGroupBuys(syndicateId) {
        const groupBuys = await db.query(STORES.groupBuys, 'syndicateId', parseInt(syndicateId));
        const syndicate = await db.get(STORES.syndicates, parseInt(syndicateId));

        const statusBadge = (status) => {
            const map = { open: 'success', committed: 'primary', ordered: 'warning', delivered: 'secondary' };
            return map[status] || 'secondary';
        };

        this.container.innerHTML = `
                <div class="syndicate-detail">
                <button class="btn btn-secondary mb-4" id="back-btn">← Back</button>
                <header>
                    <h1>${syndicate?.name || 'Syndicate'}</h1>
                </header>

                ${this._renderDetailTabs(syndicateId, 'group-buys')}

            <section class="group-buys-section">
            <div class="section-header">
                <h3><i class="ph-duotone ph-shopping-bag"></i> Group Buys</h3>
                <button id="create-group-buy-btn" class="btn btn-primary"><i class="ph ph-plus"></i> Create Group Buy</button>
            </div>

                    ${groupBuys.length === 0 ? `
                        <div class="empty-state">
                            <i class="ph-duotone ph-shopping-bag" style="font-size:3rem;opacity:.4"></i>
                            <p>No group buys yet. Create one to start coordinating bulk purchases with syndicate members.</p>
                        </div>
                    ` : `
                        <div class="table-container">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Item</th>
                                        <th>SKU</th>
                                        <th>Unit Price</th>
                                        <th>Bulk Price</th>
                                        <th>Savings/Unit</th>
                                        <th>Qty Committed</th>
                                        <th>Min Qty</th>
                                        <th>Status</th>
                                        <th>Deadline</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${groupBuys.map(gb => `
                                        <tr>
                                            <td><strong>${gb.item}</strong></td>
                                            <td class="mono">${gb.sku || '—'}</td>
                                            <td>R ${(gb.unitPrice || 0).toFixed(2)}</td>
                                            <td>R ${(gb.bulkPrice || 0).toFixed(2)}</td>
                                            <td class="text-success">R ${(gb.savingsPerUnit || 0).toFixed(2)}</td>
                                            <td>${gb.totalQuantity || 0}</td>
                                            <td>${gb.minQuantity}</td>
                                            <td><span class="badge ${statusBadge(gb.status)}">${gb.status}</span></td>
                                            <td>${gb.deadline ? new Date(gb.deadline).toLocaleDateString() : '—'}</td>
                                            <td>
                                                ${gb.status === 'open' ? `<button class="btn btn-sm btn-outline join-gb-btn" data-id="${gb.id}">Join</button>` : ''}
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `}
                </section>
            </div>
                `;

        this.container.querySelector('#back-btn').addEventListener('click', () => this.loadView('dashboard'));

        this.container.querySelector('#create-group-buy-btn').addEventListener('click', () => {
            this.renderCreateGroupBuyModal(syndicateId);
        });

        this.container.querySelectorAll('.join-gb-btn').forEach(btn => {
            btn.addEventListener('click', () => this.renderJoinGroupBuyModal(btn.dataset.id, syndicateId));
        });

        this.container.querySelectorAll('.detail-tab').forEach(btn => {
            btn.addEventListener('click', () => this.loadView(btn.dataset.view, btn.dataset.id));
        });
    }

    renderCreateGroupBuyModal(syndicateId) {
        const modal = document.createElement('dialog');
        modal.className = 'tc-modal';
        modal.innerHTML = `
                <form id="gb-form">
                <h3><i class="ph-duotone ph-shopping-bag"></i> Create Group Buy</h3>

                <div class="form-row">
                    <div class="form-group">
                        <label>Item Name *</label>
                        <input type="text" name="item" required placeholder="e.g. Steel Bolts M10">
                    </div>
                    <div class="form-group">
                        <label>SKU</label>
                        <input type="text" name="sku" placeholder="e.g. BOLT-M10">
                    </div>
                </div>

                <div class="form-group">
                    <label>Supplier</label>
                    <input type="text" name="supplier" placeholder="Supplier name">
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>Normal Unit Price (R) *</label>
                        <input type="number" name="unitPrice" min="0" step="0.01" required id="gb-unit-price">
                    </div>
                    <div class="form-group">
                        <label>Bulk Price (R) *</label>
                        <input type="number" name="bulkPrice" min="0" step="0.01" required id="gb-bulk-price">
                    </div>
                </div>

                <div class="savings-preview" id="gb-savings" style="display:none;">
                    <span class="text-success"><i class="ph ph-trend-down"></i> Savings per unit: <strong id="gb-savings-amt">R 0.00</strong></span>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>Minimum Quantity *</label>
                        <input type="number" name="minQuantity" min="1" required placeholder="e.g. 100">
                    </div>
                    <div class="form-group">
                        <label>Deadline</label>
                        <input type="date" name="deadline">
                    </div>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" id="cancel-modal">Cancel</button>
                    <button type="submit" class="btn btn-primary">Create Group Buy</button>
                </div>
            </form>
                `;
        document.body.appendChild(modal);
        modal.showModal();
        this._attachModalClose(modal);
        modal.querySelector('#cancel-modal').addEventListener('click', () => { modal.close(); modal.remove(); });

        // Live savings preview
        const calcSavings = () => {
            const unit = parseFloat(modal.querySelector('#gb-unit-price').value) || 0;
            const bulk = parseFloat(modal.querySelector('#gb-bulk-price').value) || 0;
            const savings = unit - bulk;
            const preview = modal.querySelector('#gb-savings');
            if (unit > 0 && bulk > 0) {
                preview.style.display = 'block';
                modal.querySelector('#gb-savings-amt').textContent = `R ${savings.toFixed(2)}`;
                preview.style.color = savings > 0 ? 'var(--color-success, #10b981)' : '#ef4444';
            } else {
                preview.style.display = 'none';
            }
        };
        modal.querySelector('#gb-unit-price').addEventListener('input', calcSavings);
        modal.querySelector('#gb-bulk-price').addEventListener('input', calcSavings);

        modal.querySelector('#gb-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            const currentUser = JSON.parse(localStorage.getItem('erp_session'));
            try {
                await this.module.createGroupBuy({
                    syndicateId: parseInt(syndicateId),
                    item: fd.get('item'),
                    sku: fd.get('sku'),
                    supplier: fd.get('supplier'),
                    unitPrice: parseFloat(fd.get('unitPrice')),
                    bulkPrice: parseFloat(fd.get('bulkPrice')),
                    minQuantity: parseInt(fd.get('minQuantity')),
                    deadline: fd.get('deadline') ? new Date(fd.get('deadline')).getTime() : null,
                    createdBy: currentUser?.username || 'unknown'
                });
                modal.close();
                modal.remove();
                this.loadView('group-buys', syndicateId);
            } catch (err) {
                alert('Failed to create group buy: ' + err.message);
            }
        });
    }

    renderJoinGroupBuyModal(groupBuyId, syndicateId) {
        const modal = document.createElement('dialog');
        modal.className = 'tc-modal';
        modal.innerHTML = `
            <form id="join-gb-form">
                <h3><i class="ph-duotone ph-users-three"></i> Join Group Buy</h3>
                <div class="form-group">
                    <label>Quantity to Commit *</label>
                    <input type="number" name="quantity" min="1" required placeholder="e.g. 20" id="join-qty">
                </div>
                <div class="commitment-preview" id="join-preview" style="margin:.5rem 0;font-weight:600;"></div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" id="cancel-modal">Cancel</button>
                    <button type="submit" class="btn btn-primary">Commit to Buy</button>
                </div>
            </form>
                `;
        document.body.appendChild(modal);
        modal.showModal();
        this._attachModalClose(modal);
        modal.querySelector('#cancel-modal').addEventListener('click', () => { modal.close(); modal.remove(); });

        // Show commitment total live
        db.get(STORES.groupBuys, parseInt(groupBuyId)).then(gb => {
            if (!gb) return;
            modal.querySelector('#join-qty').addEventListener('input', (e) => {
                const qty = parseInt(e.target.value) || 0;
                const total = qty * gb.bulkPrice;
                modal.querySelector('#join-preview').textContent = `Commitment: R ${total.toFixed(2)}`;
            });

            modal.querySelector('#join-gb-form').addEventListener('submit', async (ev) => {
                ev.preventDefault();
                const fd = new FormData(ev.target);
                const currentUser = JSON.parse(localStorage.getItem('erp_session'));
                try {
                    await this.module.joinGroupBuy(parseInt(groupBuyId), {
                        memberId: currentUser?.username || 'unknown',
                        businessName: currentUser?.businessName || currentUser?.username || 'Unknown',
                        quantity: parseInt(fd.get('quantity'))
                    });
                    modal.close();
                    modal.remove();
                    this.loadView('group-buys', syndicateId);
                } catch (err) {
                    alert('Failed to join group buy: ' + err.message);
                }
            });
        });
    }

    // ─── FUNDING REQUESTS ─────────────────────────────────────────────────────

    async renderFundingRequests(syndicateId) {
        const requests = await db.query(STORES.fundingRequests, 'syndicateId', parseInt(syndicateId));
        const syndicate = await db.get(STORES.syndicates, parseInt(syndicateId));

        const statusBadge = (status) => {
            const map = { pending: 'warning', approved: 'success', rejected: 'danger', disbursed: 'primary', repaid: 'secondary' };
            return map[status] || 'secondary';
        };
        const purposeLabel = (p) => ({ equipment: 'Equipment', inventory: 'Inventory', working_capital: 'Working Capital', group_purchase: 'Group Purchase' }[p] || p);

        this.container.innerHTML = `
            <div class="syndicate-detail">
                <button class="btn btn-secondary mb-4" id="back-btn">← Back</button>
                <header>
                    <h1>${syndicate?.name || 'Syndicate'}</h1>
                </header>

                ${this._renderDetailTabs(syndicateId, 'funding-requests')}

            <section class="funding-section">
            <div class="section-header">
                <h3><i class="ph-duotone ph-bank"></i> Funding Requests</h3>
                <button id="request-funding-btn" class="btn btn-primary"><i class="ph ph-plus"></i> Request Funding</button>
            </div>

                    ${requests.length === 0 ? `
                        <div class="empty-state">
                            <i class="ph-duotone ph-bank" style="font-size:3rem;opacity:.4"></i>
                            <p>No funding requests yet. Members can request financing from the syndicate pool.</p>
                        </div>
                    ` : `
                        <div class="table-container">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Amount</th>
                                        <th>Purpose</th>
                                        <th>Description</th>
                                        <th>Repayment</th>
                                        <th>Status</th>
                                        <th>Votes For</th>
                                        <th>Votes Against</th>
                                        <th>Required</th>
                                        <th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${requests.map(r => `
                                        <tr>
                                            <td><strong>R ${(r.amount || 0).toLocaleString()}</strong></td>
                                            <td><span class="badge category">${purposeLabel(r.purpose)}</span></td>
                                            <td>${r.description || '—'}</td>
                                            <td>${r.repaymentTerms || '—'}</td>
                                            <td><span class="badge ${statusBadge(r.status)}">${r.status}</span></td>
                                            <td class="text-success">👍 ${r.votesFor || 0}</td>
                                            <td class="text-danger">👎 ${r.votesAgainst || 0}</td>
                                            <td>${r.votesRequired || '—'}</td>
                                            <td>${new Date(r.requestDate).toLocaleDateString()}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `}
                </section>
            </div>
                `;

        this.container.querySelector('#back-btn').addEventListener('click', () => this.loadView('dashboard'));

        this.container.querySelector('#request-funding-btn').addEventListener('click', async () => {
            const members = await this.module.getMembers(parseInt(syndicateId));
            this.renderFundingRequestModal(syndicateId, members.length);
        });

        this.container.querySelectorAll('.detail-tab').forEach(btn => {
            btn.addEventListener('click', () => this.loadView(btn.dataset.view, btn.dataset.id));
        });
    }

    renderFundingRequestModal(syndicateId, totalMembers) {
        const modal = document.createElement('dialog');
        modal.className = 'tc-modal';
        modal.innerHTML = `
                <form id="fr-form">
                <h3><i class="ph-duotone ph-bank"></i> Request Syndicate Funding</h3>

                <div class="form-row">
                    <div class="form-group">
                        <label>Amount (R) *</label>
                        <input type="number" name="amount" min="1" step="0.01" required placeholder="e.g. 50000">
                    </div>
                    <div class="form-group">
                        <label>Purpose *</label>
                        <select name="purpose" required>
                            <option value="equipment">Equipment Purchase</option>
                            <option value="inventory">Inventory Financing</option>
                            <option value="working_capital">Working Capital</option>
                            <option value="group_purchase">Group Purchase</option>
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label>Description *</label>
                    <textarea name="description" required rows="3" placeholder="Explain what the funds will be used for..."></textarea>
                </div>

                <div class="form-group">
                    <label>Repayment Terms *</label>
                    <input type="text" name="repaymentTerms" required placeholder="e.g. 12 monthly instalments of R 4,500">
                </div>

                <div class="form-group">
                    <label>Collateral (optional)</label>
                    <input type="text" name="collateral" placeholder="e.g. Equipment, inventory, personal guarantee">
                </div>

                <div class="info-box" style="background:var(--bg-secondary);padding:.75rem 1rem;border-radius:8px;margin:.5rem 0;font-size:.9rem;">
                    <i class="ph ph-info"></i> This request requires approval from <strong>${Math.ceil(totalMembers * 0.5)} of ${totalMembers} members</strong> to proceed.
                </div>

                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" id="cancel-modal">Cancel</button>
                    <button type="submit" class="btn btn-primary">Submit Request</button>
                </div>
            </form>
                `;
        document.body.appendChild(modal);
        modal.showModal();
        this._attachModalClose(modal);
        modal.querySelector('#cancel-modal').addEventListener('click', () => { modal.close(); modal.remove(); });

        modal.querySelector('#fr-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            const currentUser = JSON.parse(localStorage.getItem('erp_session'));
            try {
                await this.module.requestFunding({
                    syndicateId: parseInt(syndicateId),
                    memberId: currentUser?.username || 'unknown',
                    amount: parseFloat(fd.get('amount')),
                    purpose: fd.get('purpose'),
                    description: fd.get('description'),
                    repaymentTerms: fd.get('repaymentTerms'),
                    collateral: fd.get('collateral'),
                    totalMembers
                });
                modal.close();
                modal.remove();
                this.loadView('funding-requests', syndicateId);
            } catch (err) {
                alert('Failed to submit funding request: ' + err.message);
            }
        });
    }

    // ─── MEMBER / CONTRIBUTION MODALS ─────────────────────────────────────────

    renderAddMemberModal(syndicateId) {
        const modal = document.createElement('dialog');
        modal.innerHTML = `
            <form method="dialog">
                <h3><i class="ph-duotone ph-user-plus"></i> Add Member</h3>
                <div class="form-group">
                    <label>Business / Member Name *</label>
                    <input type="text" name="name" required placeholder="e.g. Jabulani Hardware">
                </div>
                <div class="form-group">
                    <label>Contact Number *</label>
                    <input type="tel" name="phone" required placeholder="e.g. 082 123 4567">
                </div>
                <div class="form-group">
                    <label>Registration Number (Optional)</label>
                    <input type="text" name="regNumber" placeholder="K2023...">
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" id="cancel-modal">Cancel</button>
                    <button type="submit" class="btn btn-primary">Add Member</button>
                </div>
            </form>
                `;
        document.body.appendChild(modal);
        modal.showModal();
        this._attachModalClose(modal);
        modal.querySelector('#cancel-modal').addEventListener('click', () => { modal.close(); modal.remove(); });

        modal.querySelector('form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            try {
                await this.module.addMember(syndicateId, {
                    businessName: formData.get('name'), // Changed from businessName to name
                    businessId: formData.get('regNumber') || `biz_${Date.now()}`, // Use regNumber if provided, otherwise generate
                    role: 'member', // Default role
                    phone: formData.get('phone'),
                    businessProfile: { creditScore: Math.floor(Math.random() * 100) }
                });
                modal.close();
                modal.remove();
                this.loadView('syndicate-detail', syndicateId);
            } catch (err) {
                alert(err.message);
            }
        });
    }

    renderRecordContributionModal(syndicateId, members) {
        const modal = document.createElement('dialog');
        modal.innerHTML = `
            <form method="dialog">
                <h3><i class="ph-duotone ph-money"></i> Record Syndicate Contribution</h3>
                
                <div class="form-group">
                    <label>Member *</label>
                    <select name="memberId" required>
                        <option value="">Select Member</option>
                        ${members.map(m => `<option value="${m.id}">${m.businessName || m.name}</option>`).join('')}
                    </select>
                </div>

                <div class="form-group">
                    <label>Amount Paid (R) *</label>
                    <input type="number" name="amount" min="1" step="0.01" required placeholder="e.g. 1500">
                </div>

                <div class="form-group">
                    <label>Reference</label>
                    <input type="text" name="reference" placeholder="e.g. EFT DEC-24">
                </div>

                <div class="form-group">
                    <label>Date *</label>
                    <input type="date" name="date" required id="contrib-date">
                </div>

                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" id="cancel-modal">Cancel</button>
                    <button type="submit" class="btn btn-primary">Record Payment</button>
                </div>
            </form>
                `;
        document.body.appendChild(modal);
        modal.showModal();
        this._attachModalClose(modal);
        modal.querySelector('#cancel-modal').addEventListener('click', () => { modal.close(); modal.remove(); });

        modal.querySelector('form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            try {
                await this.module.recordContribution({
                    syndicateId,
                    memberId: formData.get('memberId'),
                    amount: parseFloat(formData.get('amount')),
                    type: formData.get('type'),
                    status: 'paid',
                    paymentMethod: 'cash',
                    date: Date.now()
                });
                modal.close();
                modal.remove();
                this.loadView('syndicate-detail', syndicateId);
            } catch (err) {
                alert(err.message);
            }
        });
    }
}

export default TrustCircleUI;
