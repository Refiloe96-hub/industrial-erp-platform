// Dashboard data fetching — extracted from main.js
import db from '../db/index.js';
import ChartUtils from '../utils/charts.js';
import { esc, sym } from '../utils/safeJson.js';

export async function updateDashboardStats(app) {
    console.log('🔄 updateDashboardStats: Starting...');

    try {
      // Lazy-load missing dependencies (happens if user just logged in without page refresh)
      if (!app.pocketBooks) {
        const { default: PocketBooks } = await import('./modules/PocketBooks.js');
        app.pocketBooks = new PocketBooks();
      }
      if (!app.poolStock) {
        const { default: PoolStock } = await import('./modules/PoolStock.js');
        app.poolStock = new PoolStock(db);
      }
      if (!db) console.error('❌ DB is missing');

      // 1. Cash Flow
      try {
        if (app.pocketBooks) {
          console.log('📊 Fetching transactions...');
          const txs = await app.pocketBooks.getTransactions();
          console.log(`✅ Got ${txs.length} transactions`);
          const balance = txs.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);
          const el = document.getElementById('stat-cash-flow');
          if (el) el.textContent = `${sym()}${balance.toLocaleString()}`;

          // Chart
          const chartCashflow = document.getElementById('chart-cashflow');
          if (chartCashflow) {
            const now = Date.now();
            const dayMs = 24 * 60 * 60 * 1000;
            const dailyData = [];
            for (let i = 6; i >= 0; i--) {
              const dayStart = now - (i * dayMs);
              const dayEnd = dayStart + dayMs;
              const dayTxs = txs.filter(t => t.date >= dayStart && t.date < dayEnd);
              const net = dayTxs.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);
              const dayLabel = new Date(dayStart).toLocaleDateString('en-ZA', { weekday: 'short' });
              dailyData.push({ label: dayLabel, value: Math.max(0, net) });
            }
            chartCashflow.innerHTML = ChartUtils.renderBarChart(dailyData);
          }
        }
      } catch (e) {
        console.error('❌ Cash Flow Error:', e);
        document.getElementById('stat-cash-flow').textContent = 'Error';
        const c = document.getElementById('chart-cashflow');
        if (c) c.innerHTML = `<p class="error">${e.message}</p>`;
      }

      // 2. Inventory
      try {
        if (app.poolStock) {
          console.log('📦 Fetching inventory...');
          const items = await app.poolStock.getInventory();
          console.log(`✅ Got ${items.length} items`);
          const lowStock = items.filter(i => i.quantity <= i.reorderLevel).length;
          const total = items.length;
          const el = document.getElementById('stat-inventory');
          if (el) el.textContent = `${total} Items (${lowStock} Low)`;

          // Chart
          const chartInventory = document.getElementById('chart-inventory');
          if (chartInventory) {
            const categories = items.reduce((acc, item) => {
              const cat = item.category || 'Other';
              acc[cat] = (acc[cat] || 0) + 1;
              return acc;
            }, {});
            const catData = Object.entries(categories).slice(0, 4).map(([label, value]) => ({ label, value }));
            if (catData.length) {
              chartInventory.innerHTML = ChartUtils.renderDonutChart(catData);
            } else {
              chartInventory.innerHTML = '<p class="text-muted">No inventory data</p>';
            }
          }
        }
      } catch (e) {
        console.error('❌ Inventory Error:', e);
        document.getElementById('stat-inventory').textContent = 'Error';
      }

      // 3. SmartShift - Machines + Production Orders
      try {
        console.log('⚙️ Fetching SmartShift data...');
        const machines = await db.getAll('machines');
        const productionOrders = await db.getAll('productionOrders');
        console.log(`✅ Got ${machines.length} machines, ${productionOrders.length} orders`);
        const elMachine = document.getElementById('stat-machine-util');
        if (elMachine) {
          if (machines.length) {
            const operational = machines.filter(m => m.status === 'operational' || m.status === 'running').length;
            const util = Math.round((operational / machines.length) * 100);
            const pendingOrders = productionOrders.filter(o => o.status === 'pending' || o.status === 'in_progress').length;
            elMachine.textContent = `${util}% (${pendingOrders} Orders)`;
          } else {
            const pendingOrders = productionOrders.filter(o => o.status === 'pending' || o.status === 'in_progress').length;
            elMachine.textContent = pendingOrders > 0 ? `${pendingOrders} Pending Orders` : 'No Machines Yet';
          }
        }
        // Chart
        const chartMachines = document.getElementById('chart-machines');
        if (chartMachines) {
          if (machines.length) {
            const operational = machines.filter(m => m.status === 'operational' || m.status === 'running').length;
            chartMachines.innerHTML = ChartUtils.renderGauge(operational, machines.length, {
              color: operational / machines.length > 0.7 ? '#10b981' : '#f59e0b',
              label: 'Operational'
            });
          } else {
            chartMachines.innerHTML = '<p class="text-muted">No machines registered</p>';
          }
        }
      } catch (e) {
        console.error('❌ Machine Error:', e);
        document.getElementById('stat-machine-util').textContent = 'Error';
      }


      // 4. Syndicates
      try {
        console.log('🤝 Fetching syndicates...');
        const syndicates = await db.getAll('syndicates');
        const elSyndicates = document.getElementById('stat-syndicates');
        if (elSyndicates) elSyndicates.textContent = `${syndicates.length} Active`;

        // Chart
        const chartSyndicates = document.getElementById('chart-syndicates');
        if (chartSyndicates) {
          if (syndicates.length) {
            const contributions = await db.getAll('contributions');
            const statusData = [
              { label: 'Paid', value: contributions.filter(c => c.status === 'completed').length },
              { label: 'Pending', value: contributions.filter(c => c.status === 'pending').length },
              { label: 'Late', value: contributions.filter(c => c.status === 'late').length }
            ].filter(d => d.value > 0);

            if (statusData.length) {
              chartSyndicates.innerHTML = ChartUtils.renderDonutChart(statusData);
            } else {
              chartSyndicates.innerHTML = `<p class="text-muted">${syndicates.length} syndicate(s), no contributions yet</p>`;
            }
          } else {
            chartSyndicates.innerHTML = '<p class="text-muted">No syndicates created</p>';
          }
        }
      } catch (e) {
        console.error('❌ Syndicate Error:', e);
      }

      // Attach click handlers to dashboard stat cards (data now available)
      try {
        const { showDetailPanel, dpBar, dpKV } = await import('./ui/panelHelper.js');
        const txs = app.pocketBooks ? await app.pocketBooks.getTransactions() : [];
        const items = app.poolStock ? await app.poolStock.getInventory() : [];
        const machines = await db.getAll('machines');
        const syndicates = await db.getAll('syndicates');

        const balance = txs.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
        const lowStock = items.filter(i => i.quantity <= (i.reorderLevel || 10)).length;
        const operational = machines.filter(m => m.status === 'operational' || m.status === 'running').length;
        const totalPool = syndicates.reduce((s, sy) => s + (sy.totalPool || 0), 0);
        const byCategory = {};
        items.forEach(i => { const c = i.category || 'Other'; byCategory[c] = (byCategory[c] || 0) + 1; });
        const maxCat = Math.max(...Object.values(byCategory), 1);
        const maxMUtil = Math.max(...machines.map(m => m.utilization || 0), 1);

        const dashPanels = {
          cashflow: {
            title: 'Cash Flow Summary',
            subtitle: `Net balance: ${sym()}${balance.toLocaleString()}`,
            bodyHTML: `<div class="dp-section"><div class="dp-section-title">Overview</div><div class="dp-kv-grid">
              ${dpKV('Total Income', sym() + txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0).toLocaleString())}
              ${dpKV('Total Expenses', sym() + txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0).toLocaleString())}
              ${dpKV('Net Balance', (balance >= 0 ? '+' : '') + sym() + balance.toLocaleString(), true)}
            </div></div>
            <div class="dp-section"><div class="dp-section-title">Recent Transactions</div>
              <ul class="dp-list">${txs.slice(0, 6).map(t => `<li><span>${t.description || t.category}</span>
                <span style="color:${t.type === 'income' ? '#16a34a' : '#dc2626'};font-weight:600">${t.type === 'income' ? '+' : '-'}${sym()}${(t.amount || 0).toLocaleString()}</span>
              </li>`).join('') || '<li>No transactions yet</li>'}</ul>
            </div>`
          },
          inventory: {
            title: 'Inventory Health',
            subtitle: `${items.length} items, ${lowStock} below reorder level`,
            bodyHTML: `<div class="dp-section"><div class="dp-section-title">Stock Health</div><div class="dp-kv-grid">
              ${dpKV('Total SKUs', items.length)}
              ${dpKV('Low Stock', lowStock + ' items')}
              ${dpKV('Out of Stock', items.filter(i => i.quantity === 0).length + ' items')}
              ${dpKV('Total Value', sym() + items.reduce((s, i) => s + (i.quantity * (i.unitPrice || 0)), 0).toLocaleString())}
            </div></div>
            <div class="dp-section"><div class="dp-section-title">By Category</div>
              ${Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([cat, n]) => dpBar(cat, n, maxCat, '#2563eb')).join('')}
            </div>`
          },
          machines: {
            title: 'Machine Utilization',
            subtitle: `${machines.length} machines registered`,
            bodyHTML: `<div class="dp-section"><div class="dp-section-title">Overview</div><div class="dp-kv-grid">
              ${dpKV('Operational', operational)}
              ${dpKV('Total', machines.length)}
              ${dpKV('Utilization', machines.length ? Math.round((operational / machines.length) * 100) + '%' : '—')}
            </div></div>
            ${machines.length ? `<div class="dp-section"><div class="dp-section-title">By Machine</div>
              ${machines.sort((a, b) => (b.utilization || 0) - (a.utilization || 0)).map(m => dpBar(m.name, m.utilization || 0, maxMUtil, m.status === 'running' || m.status === 'operational' ? '#16a34a' : '#94a3b8', v => v + '%')).join('')}
            </div>` : '<div class="dp-empty">No machines yet. Add machines in SmartShift.</div>'}`
          },
          syndicates: {
            title: 'Syndicate Status',
            subtitle: `${syndicates.length} active syndicates, ${sym()}${totalPool.toLocaleString()} in capital pools`,
            bodyHTML: `<div class="dp-section"><div class="dp-section-title">Summary</div><div class="dp-kv-grid">
              ${dpKV('Active Syndicates', syndicates.length)}
              ${dpKV('Total Capital', sym() + totalPool.toLocaleString())}
            </div></div>
            ${syndicates.length ? `<div class="dp-section"><div class="dp-section-title">Capital by Syndicate</div>
              ${syndicates.sort((a, b) => (b.totalPool || 0) - (a.totalPool || 0)).map(s => dpBar(s.name, s.totalPool || 0, Math.max(...syndicates.map(x => x.totalPool || 0), 1), '#f97316', v => sym() + v.toLocaleString())).join('')}
            </div>` : '<div class="dp-empty">No syndicates yet. Create one in TrustCircle.</div>'}`
          }
        };

        document.querySelectorAll('.card.stat-card[data-card]').forEach(card => {
          card.addEventListener('click', () => {
            const p = dashPanels[card.dataset.card];
            if (p) showDetailPanel(p);
          });
        });
      } catch (panelErr) {
        console.warn('Panel wiring skipped:', panelErr.message);
      }

      console.log('✅ updateDashboardStats: Complete');

      // 5. Load AI Advisor card
      app.loadAIAdvisor();

      // 6. First-time empty state — guide new users who have no data
      await checkFirstRunState();

    } catch (error) {
      console.error('🔥 CRITICAL FAIL in updateDashboardStats:', error);
      const chartCashflow = document.getElementById('chart-cashflow');
      if (chartCashflow) {
        chartCashflow.innerHTML = `<div class="text-center p-3">
            <p class="text-danger">Chart unavailable</p>
            <small class="text-muted">${error.message}</small>
          </div>`;
      }
    }
  }

async function checkFirstRunState() {
  // Only show if all four stat values are still "—" (no data yet)
  const allEmpty = ['stat-cash-flow','stat-inventory','stat-machine-util','stat-syndicates']
    .every(id => document.getElementById(id)?.textContent?.trim() === '—');
  if (!allEmpty) return;

  const banner = document.getElementById('first-run-banner');
  if (banner) return; // already showing

  const aiCard = document.getElementById('ai-advisor-card');
  if (!aiCard) return;

  const el = document.createElement('div');
  el.id = 'first-run-banner';
  el.style.cssText = 'grid-column:1/-1;background:rgba(37,99,235,0.06);border:1px solid rgba(37,99,235,0.18);border-radius:10px;padding:1.5rem;margin-bottom:0.5rem;';
  el.innerHTML = `
    <p style="margin:0 0 0.25rem;font-size:0.875rem;font-weight:700;color:#93c5fd;">Welcome to Industrial ERP</p>
    <p style="margin:0 0 1rem;font-size:0.8125rem;color:var(--text-secondary);">Your workspace is ready. Here's how to get started:</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:0.75rem;">
      ${[
        { icon:'ph-duotone ph-package', step:'1', label:'Add inventory', hint:'Go to PoolStock → Add Item', module:'poolstock' },
        { icon:'ph-duotone ph-shopping-cart', step:'2', label:'Make a sale', hint:'Open Sales (POS) and checkout', module:'sales' },
        { icon:'ph-duotone ph-wallet', step:'3', label:'Track finances', hint:'Record income & expenses in PocketBooks', module:'pocketbooks' },
      ].map(s => `
        <button class="first-run-step" data-module="${s.module}" style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem;background:var(--bg-primary);border:1px solid var(--border);border-radius:8px;cursor:pointer;text-align:left;transition:border-color 0.15s;font-family:inherit;">
          <div style="width:36px;height:36px;border-radius:8px;background:rgba(37,99,235,0.1);color:#60a5fa;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <i class="${s.icon}"></i>
          </div>
          <div>
            <p style="margin:0;font-size:0.8125rem;font-weight:600;color:var(--text-primary);">${s.step}. ${s.label}</p>
            <p style="margin:0;font-size:0.75rem;color:var(--text-muted);">${s.hint}</p>
          </div>
        </button>
      `).join('')}
    </div>
  `;

  // Insert before the AI advisor card
  aiCard.parentNode.insertBefore(el, aiCard);

  // Wire navigation
  el.querySelectorAll('.first-run-step').forEach(btn => {
    btn.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('navigate-to', { detail: btn.dataset.module }));
    });
    btn.addEventListener('mouseenter', () => btn.style.borderColor = 'var(--border-strong)');
    btn.addEventListener('mouseleave', () => btn.style.borderColor = 'var(--border)');
  });
}

export async function loadAIAdvisor(app) {
    const scoresEl = document.getElementById('ai-module-scores');
    const insightsEl = document.getElementById('ai-insights-list');
    const noteEl = document.getElementById('ai-source-note');
    if (!scoresEl || !insightsEl) return;

    const scoreColor = (s) => s >= 70 ? '#10b981' : s >= 40 ? '#f59e0b' : '#ef4444';
    const moduleLabels = { finance: 'Finance', inventory: 'Inventory', production: 'Production', syndicate: 'Syndicate', sales: 'Sales' };

    try {
      const { default: aiEngine } = await import('./services/aiEngine.js');
      const snapshot = await aiEngine.getBusinessSnapshot();

      // Render module health scores
      scoresEl.innerHTML = Object.entries(moduleLabels).map(([key, label]) => {
        const s = snapshot[key]?.score ?? 50;
        return `<div style="display:flex;align-items:center;gap:0.4rem;font-size:0.78rem;">
          <span style="width:10px;height:10px;border-radius:50%;background:${scoreColor(s)};flex-shrink:0;"></span>
          <span style="color:var(--text-secondary)">${label}</span>
          <span style="font-weight:700;color:${scoreColor(s)}">${s}</span>
        </div>`;
      }).join('') + `<div style="margin-left:auto;font-size:0.78rem;font-weight:700;color:var(--text-secondary)">
        Overall: <span style="color:${scoreColor(snapshot.overallScore)}">${snapshot.overallScore}/100</span>
      </div>`;

      // Get NL insights
      const apiKey = aiEngine.getApiKey();
      const insights = await aiEngine.getNLInsights(snapshot, apiKey);

      const severityColor = { critical: '#ef4444', warning: '#f59e0b', good: '#10b981' };
      insightsEl.innerHTML = insights.map(ins => `
        <div style="display:flex;align-items:flex-start;gap:0.625rem;padding:0.5rem 0.75rem;
          border-radius:6px;border-left:2px solid ${severityColor[ins.severity] || '#2563eb'};">
          <span style="font-size:0.8125rem;line-height:1.55;color:var(--text-primary)">${ins.text}</span>
        </div>`).join('');

      if (!apiKey && noteEl) noteEl.style.display = 'block';

    } catch (err) {
      console.warn('AI Advisor load error:', err.message);
      if (insightsEl) insightsEl.innerHTML = `<p style="font-size:0.8125rem;color:var(--text-muted)">Add data to your modules to generate insights.</p>`;
    }

    // Wire Refresh button
    document.getElementById('ai-refresh-btn')?.addEventListener('click', () => {
      if (insightsEl) insightsEl.innerHTML = '<p style="font-size:0.8125rem;color:var(--text-muted);">Refreshing...</p>';
      app.loadAIAdvisor();
    });
  }