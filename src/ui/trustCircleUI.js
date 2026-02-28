
import TrustCircle from '../modules/TrustCircle.js';
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

        this.container.innerHTML = `
      <div class="trustcircle-dashboard">
        <header class="module-header">
          <h1><i class="ph-duotone ph-handshake"></i> TrustCircle Syndicates</h1>
          <p>Result-based cooperation for SMEs</p>
          <button id="create-syndicate-btn" class="btn btn-primary"><i class="ph ph-plus"></i> New Syndicate</button>
        </header>

        <div class="stats-overview">
          <div class="stat-card">
            <h3>Active Syndicates</h3>
            <div class="value">${syndicates.length}</div>
          </div>
          <div class="stat-card">
            <h3>Total Capital Pools</h3>
            <div class="value">R ${syndicates.reduce((sum, s) => sum + (s.totalPool || 0), 0).toLocaleString()}</div>
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

        this.container.querySelectorAll('.syndicate-card').forEach(card => {
            card.addEventListener('click', () => {
                this.loadView('syndicate-detail', card.dataset.id);
            });
        });
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
                `).join('')}
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
                                    <th>Risk Score <i class="ph-duotone ph-robot"></i></th>
                                    <th>Pay Rate</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${memberPerformance.map(m => `
                                    <tr>
                                        <td>${m.businessName}</td>
                                        <td>
                                            <span class="risk-score ${m.riskScore > 80 ? 'good' : m.riskScore > 50 ? 'medium' : 'bad'}">
                                                ${m.riskScore}/100
                                            </span>
                                        </td>
                                        <td>${Math.round(m.paymentRate)}%</td>
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
                <h3>Add New Member</h3>
                <div class="form-group">
                    <label>Business Name</label>
                    <input type="text" name="businessName" required>
                </div>
                <div class="form-group">
                    <label>Business ID (Simulated)</label>
                    <input type="text" name="businessId" value="biz_${Date.now()}" readonly>
                </div>
                <div class="form-group">
                    <label>Role</label>
                    <select name="role">
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                    </select>
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
                    businessName: formData.get('businessName'),
                    businessId: formData.get('businessId'),
                    role: formData.get('role'),
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
                <h3>Record Contribution</h3>
                <div class="form-group">
                    <label>Member</label>
                    <select name="memberId" required>
                        ${members.map(m => `<option value="${m.id}">${m.businessName}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Amount (R)</label>
                    <input type="number" name="amount" required>
                </div>
                <div class="form-group">
                    <label>Type</label>
                    <select name="type">
                        <option value="regular">Regular Contribution</option>
                        <option value="penalty">Penalty / Late Fee</option>
                    </select>
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
