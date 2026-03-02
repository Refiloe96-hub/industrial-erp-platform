
import SmartShift from '../modules/SmartShift.js';
import db from '../db/index.js';
import { showDetailPanel, dpBar, dpKV } from './panelHelper.js';
import IoTService from '../services/iotService.js';

class SmartShiftUI {
  constructor(container, aiEngine, pocketBooks) {
    this.container = container;
    this.module = new SmartShift(aiEngine, pocketBooks);
    this.iotService = new IoTService(this.module);
    this.currentView = 'dashboard';
  }

  async render() {
    this.container.innerHTML = `
      <div class="smart-shift-layout">
        <header class="module-header" style="padding: 1rem 1.5rem; background: var(--bg-primary); border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h1 style="margin:0; font-size:1.5rem; display:flex; align-items:center; gap:0.5rem;">
              <i class="ph-duotone ph-gear" style="color:var(--primary-color)"></i> SmartShift
            </h1>
            <p style="margin:0; color:var(--text-secondary); font-size:0.9rem;">Production & Machine Management</p>
          </div>
          <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap">
            <button id="ss-ai-btn" class="btn btn-secondary" style="border:1px solid #6366f1;color:#6366f1">
              <i class="ph-duotone ph-robot"></i> AI Insights
            </button>
          </div>
        </header>

        <div class="module-nav">
          <button class="btn-tab active" data-view="dashboard">Dashboard</button>
          <button class="btn-tab" data-view="scheduler"><i class="ph-duotone ph-calendar"></i> Scheduler</button>
          <button class="btn-tab" data-view="machines">Machines</button>
          <button class="btn-tab" data-view="orders">Production Orders</button>
          <button class="btn-tab" data-view="shifts">Shifts</button>
          <button class="btn-tab" data-view="workers">Workers</button>
        </div>
        <div id="smart-shift-content" class="module-content">
          <div class="loading-spinner">Loading...</div>
        </div>
      </div>
    `;

    this.attachNavHandlers();
    this.injectStyles();
    await this.loadView('dashboard');
  }

  attachNavHandlers() {
    this.container.querySelectorAll('.btn-tab').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.container.querySelectorAll('.btn-tab').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.loadView(e.target.dataset.view);
      });
    });

    // AI Insights Button
    this.container.querySelector('#ss-ai-btn')?.addEventListener('click', async () => {
      const { default: aiEngine } = await import('../services/aiEngine.js');
      const { showDetailPanel, dpKV, dpBar } = await import('./panelHelper.js');
      const machines = await this.module.getMachines();
      const orders = await db.getAll('productionOrders');
      const result = aiEngine.analyzeSmartShift(machines, orders);

      const sevColors = { critical: '#ef4444', warning: '#f59e0b', good: '#10b981' };

      // Load NL Insights
      const apiKey = aiEngine.getApiKey();
      const insights = await aiEngine.getNLInsights(
        { finance: { score: 50 }, inventory: { score: 50 }, production: result, syndicate: { score: 50 }, sales: { score: 50, status: 'no_data' }, overallScore: result.score },
        apiKey
      );

      const maxScore = 100;

      showDetailPanel({
        title: '⚙️ SmartShift AI Insights',
        subtitle: `Production Score: ${result.score}/100`,
        bodyHTML: `
          <div class="dp-section">
            <div class="dp-section-title">Production Health</div>
            <div class="dp-kv-grid">
              ${dpKV('Active Machines', `${result.operational} / ${result.totalMachines}`, result.operational === result.totalMachines)}
              ${dpKV('Avg Utilization', result.avgUtilization + '%')}
              ${dpKV('Pending Orders', result.pendingOrders)}
              ${dpKV('Overdue Orders', result.overdueOrders?.length || 0, !(result.overdueOrders?.length > 0))}
            </div>
          </div>
          
          <div class="dp-section">
            <div class="dp-section-title">AI Advisor</div>
            <ul class="dp-list" style="gap:0.75rem;">
              ${insights.map(ins => `
                <li style="background:var(--bg-secondary); padding:0.75rem; border-radius:8px; border-left:3px solid ${sevColors[ins.severity] || '#6366f1'}">
                  <span style="display:block; font-size:0.95rem;">${ins.text}</span>
                </li>
              `).join('')}
            </ul>
          </div>

          <div class="dp-section">
            <div class="dp-section-title">Machine Health Scores</div>
            ${result.machineScores.length ? result.machineScores.map(m =>
          dpBar(m.name, m.score, maxScore, m.score > 65 ? '#10b981' : m.score > 40 ? '#f59e0b' : '#ef4444', v => v + '/100')
        ).join('') : '<div class="dp-empty">No machines found</div>'}
          </div>
        `
      });
    });
  }

  async loadView(view) {
    this.currentView = view;
    const content = this.container.querySelector('#smart-shift-content');
    content.innerHTML = '<div class="loading-spinner">Loading...</div>';

    switch (view) {
      case 'dashboard':
        await this.renderDashboard(content);
        break;
      case 'scheduler':
        await this.renderScheduler(content);
        break;
      case 'machines':
        await this.renderMachines(content);
        break;
      case 'orders':
        await this.renderOrders(content);
        break;
      case 'shifts':
        await this.renderShifts(content);
        break;
      case 'workers':
        await this.renderWorkers(content);
        break;
    }
  }

  async renderScheduler(container) {
    const machines = await this.module.getMachines();
    const orders = await this.module.getProductionOrders();

    container.innerHTML = `
      <div class="action-bar">
        <h2>Production Scheduler</h2>
        <div style="display:flex; gap:0.5rem">
          <button id="auto-schedule-btn" class="btn btn-secondary"><i class="ph-duotone ph-magic-wand"></i> Auto-Schedule</button>
          <button id="refresh-schedule-btn" class="btn btn-secondary"><i class="ph-duotone ph-arrows-clockwise"></i> Refresh</button>
        </div>
      </div>
      
      <div class="scheduler-container" style="background:var(--bg-primary); border:1px solid var(--border-color); border-radius:8px; overflow-x:auto;">
        <div class="timeline" style="display:grid; grid-template-columns: 150px repeat(24, minmax(60px, 1fr)); min-width: 1200px;">
          <!-- Header Row: Time Slots -->
          <div class="timeline-cell header-cell" style="position:sticky; left:0; background:var(--bg-secondary); z-index:10; border-right:1px solid var(--border-color); padding:0.5rem; font-weight:bold;">Machine</div>
          ${Array.from({ length: 24 }).map((_, i) => `
            <div class="timeline-cell header-cell" style="background:var(--bg-secondary); padding:0.5rem; border-right:1px solid var(--border-color); text-align:center; font-size:0.8rem; color:var(--text-secondary)">
              ${i.toString().padStart(2, '0')}:00
            </div>
          `).join('')}

          <!-- Machine Rows -->
          ${machines.map(m => {
      const mOrders = orders.filter(o => o.assignedMachineId === m.id && o.scheduledStartTime);

      return `
              <div class="timeline-cell machine-cell" style="position:sticky; left:0; background:var(--bg-primary); z-index:10; border-right:1px solid var(--border-color); border-top:1px solid var(--border-color); padding:1rem 0.5rem; font-weight:500;">
                <div>${m.name}</div>
                <div style="font-size:0.75rem; color:var(--text-secondary)">${m.type}</div>
              </div>
              
              <div style="grid-column: 2 / span 24; border-top:1px solid var(--border-color); position:relative; background-image: linear-gradient(to right, var(--border-color) 1px, transparent 1px); background-size: calc(100% / 24) 100%;">
                ${mOrders.map(o => {
        const startDt = new Date(o.scheduledStartTime);
        const startHourDecimal = startDt.getHours() + (startDt.getMinutes() / 60);
        const durationHours = o.estimatedDuration || Math.max(1, Math.floor(o.quantity / 50));
        const leftPercentage = (startHourDecimal / 24) * 100;
        const widthPercentage = (durationHours / 24) * 100;
        const color = o.status === 'in_progress' ? '#3b82f6' : o.status === 'completed' ? '#10b981' : '#6366f1';

        return `
                    <div class="order-block" title="${o.product} (${o.quantity} units)" style="
                      position:absolute; 
                      left: ${leftPercentage}%; 
                      width: calc(${widthPercentage}% - 2px); 
                      top: 10px; 
                      bottom: 10px; 
                      background: ${color}; 
                      color: white; 
                      border-radius: 6px; 
                      padding: 0.25rem 0.5rem; 
                      font-size: 0.75rem; 
                      overflow: hidden; 
                      text-overflow: ellipsis; 
                      white-space: nowrap;
                      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                      cursor: pointer;
                    ">
                      <strong>${o.orderNumber || o.product}</strong>
                      <br/>${o.quantity} qty
                    </div>
                  `;
      }).join('')}
              </div>
            `;
    }).join('')}
        </div>
      </div>
      
      <div class="unassigned-orders mt-4">
        <h3>Unassigned Orders</h3>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Due Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${orders.filter(o => !o.assignedMachineId).map(o => `
                <tr>
                  <td>${o.product} (${o.quantity})</td>
                  <td>${new Date(o.dueDate).toLocaleDateString()}</td>
                  <td><button class="btn-sm btn-primary assign-btn" data-id="${o.id}">Quick Assign</button></td>
                </tr>
              `).join('')}
              ${orders.filter(o => !o.assignedMachineId).length === 0 ? '<tr><td colspan="3" class="text-center text-muted">All orders assigned</td></tr>' : ''}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Handlers
    container.querySelector('#auto-schedule-btn').addEventListener('click', async () => {
      await this.autoAssignOrders(orders, machines);
      this.renderScheduler(container);
    });

    container.querySelector('#refresh-schedule-btn').addEventListener('click', () => {
      this.renderScheduler(container);
    });

    container.querySelectorAll('.assign-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const orderId = Number(e.target.dataset.id);
        const order = orders.find(o => o.id === orderId);
        if (order && machines.length > 0) {
          order.assignedMachineId = machines[Math.floor(Math.random() * machines.length)].id;
          order.scheduledStartTime = new Date().getTime();
          order.estimatedDuration = Math.max(1, Math.floor(order.quantity / 50));
          await db.put('productionOrders', order);
          this.renderScheduler(container);
        } else {
          alert('Please add a machine first.');
        }
      });
    });
  }

  async autoAssignOrders(orders, machines) {
    if (machines.length === 0) {
      alert('No machines available to schedule');
      return;
    }

    // Call the embedded proprietary scheduling engine
    const scheduledCount = await this.module.localOptimizeSchedule(orders, machines);

    if (scheduledCount > 0) {
      console.log(`Auto-scheduled ${scheduledCount} orders using proprietary engine.`);
    } else {
      console.log('No order required scheduling.');
    }
  }

  async renderDashboard(container) {
    const metrics = await this.module.getProductionMetrics();
    const machines = await this.module.getMachines();

    container.innerHTML = `
      <div class="dashboard-grid">
        <div class="card" data-card="running" style="cursor:pointer" title="Click for details">
          <h3>Running Orders</h3>
          <div class="big-number">${metrics.orders.inProgress}</div>
        </div>
        <div class="card" data-card="pending" style="cursor:pointer" title="Click for details">
          <h3>Pending Orders</h3>
          <div class="big-number">${metrics.orders.pending}</div>
        </div>
        <div class="card" data-card="utilization" style="cursor:pointer" title="Click for machine breakdown">
          <h3>Machine Utilization</h3>
          <div class="big-number">${metrics.machineUtilization}%</div>
        </div>
        <div class="card" data-card="delivery" style="cursor:pointer" title="Click for details">
          <h3>On-Time Delivery</h3>
          <div class="big-number">${metrics.onTimeDeliveryRate}%</div>
        </div>
      </div>

          <div class="card mt-4">
            <h3>Recent Insights</h3>
            <ul class="insight-list">
              ${metrics.insights.map(i => `
            <li class="insight-item ${i.type}">
              <strong>${i.message}</strong>
              ${i.action ? `<p>${i.action}</p>` : ''}
            </li>
          `).join('')}
            </ul>
          </div>
    `;

    // Stat card click handlers
    container.querySelectorAll('.card[data-card]').forEach(card => {
      card.addEventListener('click', () => this.showStatPanel(card.dataset.card, metrics, machines));
    });
  }

  showStatPanel(card, metrics, machines) {
    const running = machines.filter(m => m.status === 'running');
    const idle = machines.filter(m => m.status === 'idle');
    const maintenance = machines.filter(m => m.status === 'maintenance');
    const maxUtil = Math.max(...machines.map(m => m.utilization || 0), 1);

    const machineList = (list, color) => list.length
      ? `<ul class="dp-list">${list.map(m => `<li><span>${m.name} <small style="color:var(--text-secondary,#9ca3af)">(${m.type})</small></span><span style="color:${color};font-weight:600">${m.utilization || 0}%</span></li>`).join('')}</ul>`
      : '<div class="dp-empty">None</div>';

    const panels = {
      running: {
        title: 'Running Production Orders',
        subtitle: `${metrics.orders.inProgress} orders currently in progress`,
        bodyHTML: `<div class="dp-section"><div class="dp-kv-grid">
          ${dpKV('In Progress', metrics.orders.inProgress)}
          ${dpKV('Pending', metrics.orders.pending)}
          ${dpKV('Completed Today', metrics.orders.completed || 0)}
          ${dpKV('On-Time Rate', metrics.onTimeDeliveryRate + '%')}
        </div></div>`
      },
      pending: {
        title: 'Pending Production Orders',
        subtitle: `${metrics.orders.pending} orders queued`,
        bodyHTML: `<div class="dp-section"><div class="dp-kv-grid">
          ${dpKV('Pending', metrics.orders.pending)}
          ${dpKV('In Progress', metrics.orders.inProgress)}
          ${dpKV('Machine Utilization', metrics.machineUtilization + '%')}
          ${dpKV('Active Machines', running.length)}
        </div></div>`
      },
      utilization: {
        title: 'Machine Utilization',
        subtitle: `Average ${metrics.machineUtilization} % across ${machines.length} machines`,
        bodyHTML: `
        <div class="dp-section">
        <div class="dp-section-title">By Machine</div>
            ${machines.length ? machines.sort((a, b) => (b.utilization || 0) - (a.utilization || 0)).map(m =>
          dpBar(m.name, m.utilization || 0, maxUtil, m.status === 'running' ? '#16a34a' : m.status === 'maintenance' ? '#dc2626' : '#94a3b8', v => v + '%')).join('') : '<div class="dp-empty">No machines registered. Go to the Machines tab to add one.</div>'
          }
          </div>
          <div class="dp-section">
            <div class="dp-section-title">Status Breakdown</div>
            <div class="dp-kv-grid">
              ${dpKV('Running', running.length + ' machines')}
              ${dpKV('Idle', idle.length + ' machines')}
              ${dpKV('Maintenance', maintenance.length + ' machines')}
              ${dpKV('Total', machines.length + ' machines')}
            </div>
          </div>`
      },
      delivery: {
        title: 'On-Time Delivery Rate',
        subtitle: `${metrics.onTimeDeliveryRate} % of orders are completed on schedule`,
        bodyHTML: `<div class="dp-section">
        <div class="dp-section-title">Performance</div>
          ${dpBar('On-Time Rate', metrics.onTimeDeliveryRate, 100, metrics.onTimeDeliveryRate >= 80 ? '#16a34a' : '#f59e0b', v => v + '%')}
          <div class="dp-kv-grid" style="margin-top:1rem">
            ${dpKV('In Progress', metrics.orders.inProgress)}
            ${dpKV('Pending', metrics.orders.pending)}
          </div>
        </div>`
      }
    };
    if (panels[card]) showDetailPanel(panels[card]);
  }

  async renderMachines(container) {
    const machines = await this.module.getMachines();

    container.innerHTML = `
      <div class="action-bar">
        <h2>Machines</h2>
        <button id="add-machine-btn" class="btn btn-primary"><i class="ph ph-plus"></i> Add Machine</button>
      </div>
      
      <div class="machine-grid">
        ${machines.map(m => `
          <div class="card machine-card ${m.status}">
            <div class="machine-header">
              <h3>${m.name}</h3>
              <span class="badge ${m.status}">${m.status}</span>
            </div>
            <p>${m.type}</p>
            <div class="progress-bar">
              <div class="fill" style="width: ${m.utilization}%"></div>
            </div>
            <p><small>${m.utilization}% Utilization</small></p>
            <div class="iot-controls" style="margin-top: 1rem; display: flex; gap: 0.5rem;">
              <button class="btn btn-sm btn-outline-success sim-start-btn" data-id="${m.id}" title="Simulate Sensor ON"><i class="ph ph-power"></i> Sensor ON</button>
              <button class="btn btn-sm btn-outline-danger sim-stop-btn" data-id="${m.id}" title="Simulate Sensor OFF"><i class="ph ph-power"></i> Sensor OFF</button>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Add Machine Modal (Simplistic) -->
      <!-- Add Machine Modal -->
      <dialog id="add-machine-modal">
        <form method="dialog">
          <h3>Add New Machine</h3>
          <input type="text" id="machine-name" name="name" placeholder="Machine Name" required />
          <input type="text" id="machine-type" name="type" placeholder="Type (e.g., CNC)" required />
          <div style="display: flex; gap: 1rem; margin-top: 1rem;">
            <button type="button" class="btn btn-secondary cancel-btn" style="flex: 1;">Cancel</button>
            <button type="submit" class="btn btn-primary save-btn" style="flex: 1;">Save</button>
          </div>
        </form>
      </dialog>
    `;

    // Handlers
    const modal = container.querySelector('#add-machine-modal');
    const openBtn = container.querySelector('#add-machine-btn');
    const cancelBtn = modal.querySelector('.cancel-btn');
    const saveBtn = modal.querySelector('.save-btn');

    // IoT Simulator bindings
    container.querySelectorAll('.sim-start-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const btnEl = e.currentTarget;
        const originalHtml = btnEl.innerHTML;
        btnEl.innerHTML = '<i class="ph ph-spinner ph-spin"></i>';
        const sensor = this.iotService.attachSimulatedSensor(btnEl.dataset.id);
        await sensor.triggerOn();
        btnEl.innerHTML = originalHtml;
        await this.loadView('machines');
      });
    });

    container.querySelectorAll('.sim-stop-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const btnEl = e.currentTarget;
        const originalHtml = btnEl.innerHTML;
        btnEl.innerHTML = '<i class="ph ph-spinner ph-spin"></i>';
        const sensor = this.iotService.attachSimulatedSensor(btnEl.dataset.id);
        // Prompt for simulated output to pass down into the system
        const produced = prompt('Simulated completion: Enter units produced', '100');
        await sensor.triggerOff(produced ? parseInt(produced, 10) : 0);
        btnEl.innerHTML = originalHtml;
        await this.loadView('machines');
      });
    });

    openBtn.addEventListener('click', () => modal.showModal());
    cancelBtn.addEventListener('click', () => modal.close());

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.close();
    });

    // Close on Escape key
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') modal.close();
    });

    modal.querySelector('form').addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = modal.querySelector('#machine-name').value;
      const type = modal.querySelector('#machine-type').value;

      if (name && type) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        try {
          await this.module.updateMachine({ name, type, status: 'operational', utilization: 0 });
          modal.close();
          await this.loadView('machines'); // Refresh
        } catch (err) {
          console.error('Failed to save machine:', err);
          alert('Failed to save machine');
          saveBtn.disabled = false;
          saveBtn.textContent = 'Save';
        }
      }
    });
  }

  async renderOrders(container) {
    const orders = await this.module.getProductionOrders();

    container.innerHTML = `
      <div class="action-bar">
        <h2>Production Orders</h2>
        <button id="add-order-btn" class="btn btn-primary"><i class="ph ph-plus"></i> New Order</button>
      </div>
      
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Product</th>
              <th>Quantity</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Progress</th>
            </tr>
          </thead>
          <tbody>
            ${orders.map(o => `
              <tr>
                <td>${o.orderNumber}</td>
                <td>${o.product}</td>
                <td>${o.quantity} ${o.unit}</td>
                <td>${new Date(o.dueDate).toLocaleDateString()}</td>
                <td><span class="badge ${o.status}">${o.status}</span></td>
                <td>${Math.round(o.progress)}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      <dialog id="add-order-modal">
         <form method="dialog">
          <h3>New Production Order</h3>
          <input type="text" name="product" placeholder="Product Name" required />
          <input type="number" name="quantity" placeholder="Quantity" required />
          <input type="date" name="dueDate" required />
          <button value="cancel">Cancel</button>
          <button value="save" class="btn btn-primary">Create</button>
        </form>
      </dialog>
    `;

    container.querySelector('#add-order-btn').addEventListener('click', () => {
      const modal = container.querySelector('#add-order-modal');
      modal.showModal();

      // Close on backdrop click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.close();
      });

      // Close on Escape key
      modal.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') modal.close();
      });

      modal.querySelector('button[value="save"]').addEventListener('click', async () => {
        const product = modal.querySelector('input[name="product"]').value;
        const quantity = Number(modal.querySelector('input[name="quantity"]').value);
        const dueDate = new Date(modal.querySelector('input[name="dueDate"]').value).getTime();

        if (product && quantity && dueDate) {
          await this.module.createProductionOrder({ product, quantity, unit: 'units', dueDate, priority: 5 });
          await this.loadView('orders');
        }
      }, { once: true });
    });
  }
  async renderShifts(container) {
    const shifts = await this.module.getShifts();
    const machines = await this.module.getMachines();
    const workers = await this.module.getWorkers();

    container.innerHTML = `
      <div class="action-bar">
        <h2>Shift Schedule</h2>
        <div style="display: flex; gap: 0.5rem;">
          <button id="optimize-btn" class="btn btn-secondary"><i class="ph-duotone ph-magic-wand"></i> Optimize Schedule</button>
          <button id="add-shift-btn" class="btn btn-primary"><i class="ph ph-plus"></i> Schedule Shift</button>
        </div>
      </div>
      
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Machine</th>
              <th>Worker</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${shifts.map(s => `
              <tr>
                <td>${s.date}</td>
                <td>${new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(s.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                <td>${s.machineName}</td>
                <td>${s.workerName}</td>
                <td><span class="badge ${s.status}">${s.status}</span></td>
                <td>
                  ${s.status === 'scheduled' ? `<button class="btn-sm btn-secondary start-shift-btn" data-id="${s.id}">Start</button>` : ''}
                  ${s.status === 'in_progress' ? `<button class="btn-sm btn-primary complete-shift-btn" data-id="${s.id}">Complete</button>` : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      <dialog id="add-shift-modal">
        <form method="dialog">
          <h3>Schedule New Shift</h3>
          <label>Date</label>
          <input type="date" name="date" required />
          
          <label>Start Time</label>
          <input type="time" name="startTime" required />
          
          <label>Duration (Hours)</label>
          <input type="number" name="duration" value="8" min="1" max="12" required />
          
          <label>Machine</label>
          <select name="machineId" required>
            <option value="">Select Machine</option>
            ${machines.map(m => `<option value="${m.id}">${m.name} (${m.status})</option>`).join('')}
          </select>
          
          <label>Worker</label>
          <select name="workerId" required>
            <option value="">Select Worker</option>
            ${workers.map(w => `<option value="${w.id}">${w.name} (${w.availability})</option>`).join('')}
          </select>
          
          <div style="display: flex; gap: 1rem; margin-top: 1rem;">
            <button value="cancel" style="flex: 1;">Cancel</button>
            <button value="save" class="btn btn-primary" style="flex: 1;">Schedule</button>
          </div>
        </form>
      </dialog>
    `;

    // Add Shift Handler
    // Optimize Handler
    container.querySelector('#optimize-btn').addEventListener('click', async () => {
      const btn = container.querySelector('#optimize-btn');
      btn.disabled = true;
      btn.textContent = 'Optimizing...';

      try {
        const result = await this.module.optimizeSchedule();

        if (!result || result.schedule.length === 0) {
          alert('No optimization possible. ' + (result?.insights?.message || 'Check orders/resources.'));
        } else {
          const confirmed = confirm(
            `AI generated ${result.schedule.length} shifts.\n` +
            `Blocked orders: ${result.insights.blocked}\n\n` +
            `Apply this schedule?`
          );

          if (confirmed) {
            await this.module.applySchedule(result.schedule);
            await this.loadView('shifts');
          }
        }
      } catch (err) {
        console.error('Optimization failed:', err);
        alert('Optimization failed: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="ph-duotone ph-magic-wand"></i> Optimize Schedule';
      }
    });

    // Add Shift Handler
    const modal = container.querySelector('#add-shift-modal');
    const openBtn = container.querySelector('#add-shift-btn');

    // Create custom buttons for better control
    const form = modal.querySelector('form');
    // Remove existing buttons from innerHTML if they were hardcoded, or just replace the inner content 
    // But since we are replacing the logic, let's just use the robust listener method

    // Actually, let's fix the modal HTML in previous steps or just override the listener
    // The previous HTML has <button value="save">

    openBtn.addEventListener('click', () => modal.showModal());

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.close();
    });

    // Close on Escape key
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') modal.close();
    });

    modal.querySelector('button[value="save"]').addEventListener('click', async (e) => {
      e.preventDefault(); // Critical for async dialogs

      const date = modal.querySelector('input[name="date"]').value;
      const time = modal.querySelector('input[name="startTime"]').value;
      const duration = Number(modal.querySelector('input[name="duration"]').value);
      const machineId = modal.querySelector('select[name="machineId"]').value;
      const workerId = modal.querySelector('select[name="workerId"]').value;

      if (date && time && machineId && workerId) {
        e.target.textContent = 'Saving...';
        e.target.disabled = true;

        try {
          const startTime = new Date(`${date}T${time}`).getTime();
          await this.module.createShift({
            date,
            startTime,
            endTime: startTime + (duration * 3600000),
            plannedHours: duration,
            machineId: Number(machineId),
            workerId: Number(workerId),
            notes: 'Manual schedule'
          });

          modal.close();
          await this.loadView('shifts');
        } catch (err) {
          console.error('Failed to save shift:', err);
          alert('Failed to save shift');
          e.target.textContent = 'Schedule';
          e.target.disabled = false;
        }
      }
    });

    // Start/Complete Handlers
    container.querySelectorAll('.start-shift-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        await this.module.startShift(Number(e.target.dataset.id));
        await this.loadView('shifts');
      });
    });

    container.querySelectorAll('.complete-shift-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        // Determine output (mock prompt for now)
        const output = prompt('Enter production output quantity:', '0');
        if (output !== null) {
          await this.module.completeShift(Number(e.target.dataset.id), Number(output));
          await this.loadView('shifts');
        }
      });
    });
  }


  async renderWorkers(container) {
    const workers = await this.module.getWorkers();

    container.innerHTML = `
      <div class="action-bar">
        <h2>Workers</h2>
        <button id="add-worker-btn" class="btn btn-primary"><i class="ph ph-plus"></i> Add Worker</button>
      </div>
      
      <div class="machine-grid">
        ${workers.map(w => `
          <div class="card machine-card ${w.availability === 'available' ? 'operational' : 'maintenance'}">
            <div class="machine-header">
              <h3>${w.name}</h3>
              <span class="badge ${w.availability === 'available' ? 'operational' : 'warning'}">${w.availability}</span>
            </div>
            <p>Skills: ${w.skills.join(', ') || 'General'}</p>
            <p><small>Hourly Rate: $${w.hourlyRate || '0'}/hr</small></p>
          </div>
        `).join('')}
      </div>

      <dialog id="add-worker-modal">
        <form method="dialog">
          <h3>Add New Worker</h3>
          <input type="text" id="worker-name" name="name" placeholder="Worker Name" required />
          <input type="text" id="worker-skills" name="skills" placeholder="Skills (comma separated)" />
          <input type="number" id="worker-rate" name="hourlyRate" placeholder="Hourly Rate ($)" required />
          
          <div style="display: flex; gap: 1rem; margin-top: 1rem;">
            <button type="button" class="btn btn-secondary cancel-btn" style="flex: 1;">Cancel</button>
            <button type="submit" class="btn btn-primary save-btn" style="flex: 1;">Save</button>
          </div>
        </form>
      </dialog>
    `;

    const modal = container.querySelector('#add-worker-modal');
    const openBtn = container.querySelector('#add-worker-btn');
    const cancelBtn = modal.querySelector('.cancel-btn');
    const saveBtn = modal.querySelector('.save-btn');

    openBtn.addEventListener('click', () => modal.showModal());
    cancelBtn.addEventListener('click', () => modal.close());

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.close();
    });

    // Close on Escape key
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') modal.close();
    });

    modal.querySelector('form').addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = modal.querySelector('#worker-name').value;
      const skills = modal.querySelector('#worker-skills').value.split(',').map(s => s.trim()).filter(Boolean);
      const hourlyRate = Number(modal.querySelector('#worker-rate').value);

      if (name && hourlyRate) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        try {
          await this.module.updateWorker({
            name,
            skills,
            hourlyRate,
            availability: 'available',
            performance: 100
          });
          modal.close();
          await this.loadView('workers');
        } catch (err) {
          console.error('Failed to save worker:', err);
          alert('Failed to save worker');
          saveBtn.disabled = false;
          saveBtn.textContent = 'Save';
        }
      }
    });
  }
  injectStyles() {
    if (document.getElementById('smartshift-styles')) return;

    const style = document.createElement('style');
    style.id = 'smartshift-styles';
    style.textContent = `
        /* Machine Card Styles */
        .machine-card {
            border-left: 4px solid var(--border-color);
            transition: transform 0.2s;
        }

        .machine-card:hover {
            transform: translateY(-2px);
        }

        .machine-card.operational { border-left-color: #10b981; }
        .machine-card.maintenance { border-left-color: #f59e0b; }
        .machine-card.offline { border-left-color: #ef4444; }

        .machine-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.5rem;
        }

        .progress-bar {
            height: 6px;
            background: var(--bg-secondary);
            border-radius: 3px;
            overflow: hidden;
            margin: 0.5rem 0;
        }

        .progress-bar .fill {
            height: 100%;
            background: #6366f1;
        }

        /* Insight List */
        .insight-list {
            list-style: none;
            padding: 0;
        }

        .insight-item {
            padding: 1rem;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
        }

        .insight-item:last-child {
            border-bottom: none;
        }

        .insight-item.warning { border-left: 3px solid #f59e0b; background: rgba(245, 158, 11, 0.05); }
        .insight-item.efficiency { border-left: 3px solid #10b981; background: rgba(16, 185, 129, 0.05); }

        /* Dialogs */
        dialog {
            background: var(--bg-primary);
            color: var(--text-primary);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 2rem;
            max-width: 500px;
            width: 90%;
        }

        dialog::backdrop {
            background: rgba(0, 0, 0, 0.5);
        }

        dialog input, dialog select {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid var(--border-color);
            border-radius: 6px;
            margin-bottom: 1rem;
            background: var(--bg-secondary);
            color: var(--text-primary);
        }

        dialog h3 {
            margin-top: 0;
            margin-bottom: 1.5rem;
        }

        /* Tables */
        .smart-shift-layout table {
            background: transparent !important;
            width: 100%;
            border-collapse: collapse;
        }

        .smart-shift-layout tr {
            background: transparent;
            color: var(--text-primary);
            border-bottom: 1px solid var(--border-color);
        }

        .smart-shift-layout tr:hover {
            background: var(--bg-secondary) !important;
        }

        .smart-shift-layout td, 
        .smart-shift-layout th {
            padding: 1rem;
            text-align: left;
        }
    `;
    document.head.appendChild(style);
  }
}

export default SmartShiftUI;
