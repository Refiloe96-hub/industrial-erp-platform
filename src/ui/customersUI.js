import Customers from '../modules/Customers.js';
import db from '../db/index.js';
import { sym } from '../utils/safeJson.js';

class CustomersUI {
  constructor() {
    this.customers = [];
  }

  async render(container) {
    this.customers = await Customers.getAllCustomers();

    container.innerHTML = `
      <div class="customers-container">
        <div class="page-header">
          <h2 style="margin:0;font-size:1.125rem;font-weight:700;letter-spacing:-0.01em;">Customers</h2>
          <button class="btn btn-primary" id="btn-add-customer"><i class="ph ph-plus"></i> New Customer</button>
        </div>

        <div class="search-bar" style="margin-bottom:1rem;">
          <input type="text" id="customer-search" placeholder="Search by name or phone...">
        </div>

        <div class="customers-grid" id="customers-list">
          ${this.renderCustomerParams(this.customers)}
        </div>
      </div>
      
      <!-- Add/Edit Modal -->
      <div id="customer-modal" class="modal">
        <div class="modal-content">
          <div class="modal-header">
            <h2 id="modal-title">Add Customer</h2>
            <button class="btn-icon close-modal"><i class="ph-bold ph-x"></i></button>
          </div>
          <div class="modal-body">
            <form id="customer-form">
              <input type="hidden" id="cust-id">
              <div class="form-group">
                <label>Name</label>
                <input type="text" id="cust-name" required placeholder="John Doe">
              </div>
              <div class="form-group">
                <label>Phone</label>
                <input type="tel" id="cust-phone" placeholder="072 123 4567">
              </div>
              <div class="form-group">
                <label>Email (Optional)</label>
                <input type="email" id="cust-email" placeholder="john@example.com">
              </div>
              <div class="form-group">
                <label>Notes</label>
                <textarea id="cust-notes" rows="3" style="width:100%;border:1px solid var(--border);border-radius:6px;padding:0.5rem 0.75rem;background:rgba(255,255,255,0.04);color:var(--text-primary);font-family:inherit;font-size:0.875rem;resize:vertical;"></textarea>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary close-modal-btn">Cancel</button>
            <button type="submit" form="customer-form" class="btn btn-primary">Save Customer</button>
          </div>
        </div>
      </div>

      ${this.renderStyles()}
    `;

    this.attachHandlers(container);
  }

  renderCustomerParams(customers) {
    if (customers.length === 0) {
      return `<div style="grid-column:1/-1;text-align:center;padding:3rem 1rem;color:var(--text-muted);">
        <i class="ph-duotone ph-users" style="font-size:2.5rem;display:block;margin-bottom:0.75rem;opacity:0.4;"></i>
        <p style="font-size:0.9375rem;font-weight:600;color:var(--text-secondary);margin:0 0 0.375rem;">No customers yet</p>
        <p style="font-size:0.8125rem;margin:0;">Click "New Customer" to add your first one.</p>
      </div>`;
    }

    return customers.map(c => `
      <div class="customer-card">
        <div class="card-header">
          <h3>${c.name}</h3>
          <span class="loyalty-badge"><i class="ph-fill ph-star"></i> ${c.loyaltyPoints || 0}</span>
        </div>
        <div class="card-body">
          <p><i class="ph-duotone ph-phone"></i> ${c.phone || 'No phone'}</p>
          <p><i class="ph-duotone ph-currency-dollar"></i> Total Spent: ${sym()}${(c.totalSpent || 0).toLocaleString()}</p>
          ${(c.creditBalance || 0) > 0 ? `
          <div style="margin-top:0.5rem;padding:0.5rem 0.625rem;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:6px;display:flex;align-items:center;justify-content:space-between;">
            <span style="font-size:0.8125rem;color:#f87171;font-weight:600;">Owes ${sym()}${(c.creditBalance||0).toFixed(2)}${c.creditIssuedAt ? ` · ${Math.floor((Date.now()-c.creditIssuedAt)/(864e5))}d old` : ''}</span>
            <button class="btn-record-payment btn btn-secondary" data-id="${c.id}" data-balance="${c.creditBalance||0}" data-name="${c.name}" style="font-size:0.7rem;padding:0.2rem 0.5rem;color:#34d399;border-color:rgba(16,185,129,0.3);">Record Payment</button>
          </div>` : ''}
          <p style="font-size:0.75rem;color:var(--text-muted);margin:0.375rem 0 0;">Last visited: ${new Date(c.lastVisit).toLocaleDateString()}</p>
          <div style="display:flex;gap:0.5rem;margin-top:0.5rem;">
            <button class="btn btn-secondary btn-history" data-id="${c.id}" data-name="${c.name}" style="font-size:0.75rem;padding:0.3rem 0.75rem;flex:1;">
              <i class="ph ph-clock-clockwise"></i> History
            </button>
            <button class="btn btn-secondary btn-edit" data-id="${c.id}" style="font-size:0.75rem;padding:0.3rem 0.75rem;">Edit</button>
          </div>
        </div>
      </div>
    `).join('');
  }

  attachHandlers(container) {
    const modal = container.querySelector('#customer-modal');
    const form = container.querySelector('#customer-form');
    const list = container.querySelector('#customers-list');

    // Search
    container.querySelector('#customer-search').addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      const filtered = this.customers.filter(c =>
        c.name.toLowerCase().includes(query) ||
        (c.phone && c.phone.includes(query))
      );
      list.innerHTML = this.renderCustomerParams(filtered);
      this.attachEditHandlers(list); // Re-attach for new elements
    });

    // Add Button
    container.querySelector('#btn-add-customer').addEventListener('click', () => {
      form.reset();
      container.querySelector('#cust-id').value = '';
      container.querySelector('#modal-title').textContent = 'Add Customer';
      modal.style.display = 'block';
    });

    // Close Modal (X button)
    container.querySelector('.close-modal').addEventListener('click', () => {
      modal.style.display = 'none';
    });

    // Close Modal (Cancel button)
    container.querySelector('.close-modal-btn')?.addEventListener('click', () => {
      modal.style.display = 'none';
    });

    window.onclick = (event) => {
      if (event.target === modal) {
        modal.style.display = 'none';
      }
    };

    // Form Submit
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = container.querySelector('#cust-id').value;
      const data = {
        name: container.querySelector('#cust-name').value,
        phone: container.querySelector('#cust-phone').value,
        email: container.querySelector('#cust-email').value,
        notes: container.querySelector('#cust-notes').value
      };

      try {
        if (id) {
          await Customers.updateCustomer(parseInt(id), data);
        } else {
          await Customers.addCustomer(data);
        }

        modal.style.display = 'none';
        this.render(container); // Refresh list
      } catch (err) {
        console.error(err);
        alert('Error saving customer');
      }
    });

    this.attachEditHandlers(list);
  }

  attachEditHandlers(container) {
    // Customer purchase history
    container.querySelectorAll('.btn-history').forEach(btn => {
      btn.addEventListener('click', () => {
        const customerId = parseInt(btn.dataset.id);
        const customerName = btn.dataset.name;
        this.showCustomerHistory(customerId, customerName);
      });
    });

    // Record partial or full payment against a customer's credit balance
    container.querySelectorAll('.btn-record-payment').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.dataset.id);
        const balance = parseFloat(btn.dataset.balance);
        const name = btn.dataset.name;

        // Proper modal instead of prompt()
        const amount = await new Promise((resolve) => {
          const dlg = document.createElement('dialog');
          dlg.style.cssText = 'border:none;padding:0;background:var(--bg-primary);border:1px solid var(--border);border-radius:10px;box-shadow:0 24px 48px rgba(0,0,0,0.5);width:min(340px,96vw);color:var(--text-primary);';
          dlg.innerHTML = `
            <div style="padding:1rem 1.25rem;border-bottom:1px solid var(--border);">
              <h3 style="margin:0;font-size:1rem;font-weight:700;">Record Payment</h3>
              <p style="margin:0.25rem 0 0;font-size:0.8125rem;color:var(--text-muted);">${name} owes <strong style="color:#f87171;">${sym()}${balance.toFixed(2)}</strong></p>
            </div>
            <div style="padding:1.25rem;display:flex;flex-direction:column;gap:0.75rem;">
              <div>
                <label style="font-size:0.75rem;font-weight:500;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);display:block;margin-bottom:0.25rem;">Amount Received (${sym()})</label>
                <input id="pay-amount-input" type="number" min="0.01" max="${balance}" step="0.01" value="${balance.toFixed(2)}"
                  style="width:100%;box-sizing:border-box;font-size:1.25rem;font-weight:700;text-align:center;padding:0.5rem;border:1px solid var(--border);border-radius:8px;background:rgba(255,255,255,0.04);color:var(--text-primary);">
              </div>
              <div style="display:flex;gap:0.5rem;">
                <button id="pay-cancel" class="btn btn-secondary" style="flex:1;">Cancel</button>
                <button id="pay-confirm" class="btn btn-primary" style="flex:1;">Confirm Payment</button>
              </div>
            </div>
          `;
          document.body.appendChild(dlg);
          dlg.showModal();
          dlg.querySelector('#pay-cancel').onclick = () => { dlg.close(); dlg.remove(); resolve(null); };
          dlg.querySelector('#pay-confirm').onclick = () => {
            const v = parseFloat(dlg.querySelector('#pay-amount-input').value);
            dlg.close(); dlg.remove();
            resolve(v > 0 ? v : null);
          };
          // Pre-select input value for quick editing
          setTimeout(() => dlg.querySelector('#pay-amount-input')?.select(), 50);
        });
        if (!amount || amount <= 0) return;
        try {
          const customer = await Customers.getCustomer(id);
          if (!customer) return;
          const newBalance = Math.max(0, (customer.creditBalance || 0) - amount);
          await Customers.updateCustomer(id, {
            creditBalance: newBalance,
            creditIssuedAt: newBalance === 0 ? null : customer.creditIssuedAt,
          });
          // Also record it as income in PocketBooks if available
          try {
            const db = (await import('../db/index.js')).default;
            await db.add('transactions', {
              id: `pay_${Date.now()}`,
              type: 'income',
              amount,
              description: `Credit payment — ${name}`,
              category: 'Credit Recovery',
              date: Date.now(),
              paymentMethod: 'cash',
            });
          } catch {}
          // Refresh
          this.customers = await Customers.getAllCustomers();
          container.innerHTML = this.renderCustomerParams(this.customers);
          this.attachEditHandlers(container);
        } catch (err) { alert('Failed to record payment: ' + err.message); }
      });
    });

    container.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = parseInt(e.target.dataset.id);
        const customer = this.customers.find(c => c.id === id);
        if (customer) {
          document.querySelector('#cust-id').value = customer.id;
          document.querySelector('#cust-name').value = customer.name;
          document.querySelector('#cust-phone').value = customer.phone;
          document.querySelector('#cust-email').value = customer.email;
          document.querySelector('#cust-notes').value = customer.notes;
          document.querySelector('#modal-title').textContent = 'Edit Customer';
          document.querySelector('#customer-modal').style.display = 'block';
        }
      });
    });
  }

  renderStyles() {
    return `
      <style>
        .customers-container {
          padding: 1rem;
        }
        .page-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.25rem;
        }
        .customers-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 1.5rem;
        }
        .customer-card {
            background: var(--bg-primary);
            border-radius: 8px;
            border: 1px solid var(--border);
            overflow: hidden;
            transition: border-color 0.15s;
        }
        .customer-card:hover { border-color: var(--border-strong); }
        .customer-card .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.875rem 1.25rem;
            border-bottom: 1px solid var(--border);
        }
        .customer-card .card-header h3 {
            margin: 0;
            font-size: 0.9375rem;
            font-weight: 600;
            color: var(--text-primary);
        }
        .customer-card .card-body {
            padding: 1rem 1.25rem;
        }
        .card-body p {
            color: var(--text-secondary);
            margin: 0.5rem 0;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .loyalty-badge {
            background: rgba(245, 158, 11, 0.1);
            color: #f59e0b;
            padding: 0.25rem 0.75rem;
            border-radius: 999px;
            font-size: 0.75rem;
            font-weight: 600;
            border: 1px solid rgba(245, 158, 11, 0.2);
        }
        .form-control {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid var(--border);
            border-radius: 6px;
            background: var(--bg-secondary);
            color: var(--text-primary);
        }
        .form-control:focus {
            outline: none;
            border-color: #2563eb;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
        
        /* Modal Styles */
        #customer-modal {
           display: none;
           position: fixed;
           inset: 0;
           z-index: 1000;
           overflow: auto;
           background-color: rgba(0,0,0,0.5);
           backdrop-filter: blur(4px);
           align-items: center;
           justify-content: center;
        }

        #customer-modal .modal-content {
           margin: 5% auto;
           width: 90%;
           max-width: 500px;
           background: var(--bg-primary);
           border: 1px solid var(--border);
           border-radius: 12px;
           box-shadow: var(--shadow-lg);
           color: var(--text-primary);
        }

        .modal-header {
            padding: 1.5rem;
            border-bottom: 1px solid var(--border);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .modal-header h2 {
            margin: 0;
            font-size: 1.25rem;
            color: var(--text-primary);
        }

        .modal-body {
            padding: 1.5rem;
        }

        .modal-footer {
            padding: 1rem 1.5rem;
            border-top: 1px solid var(--border);
            background: var(--bg-secondary);
            border-radius: 0 0 12px 12px;
            display: flex;
            justify-content: flex-end;
            gap: 1rem;
        }

        .form-group {
            margin-bottom: 1rem;
        }

        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            color: var(--text-secondary);
            font-weight: 500;
            font-size: 0.875rem;
        }

        .btn-icon.close-modal {
            background: transparent;
            border: none;
            color: var(--text-secondary);
            cursor: pointer;
            padding: 0.5rem;
            border-radius: 6px;
            font-size: 1.25rem;
        }

        .btn-icon.close-modal:hover {
            background: var(--bg-secondary);
            color: var(--text-primary);
        }

        /* Also remove backdrop-filter from modal overlay */
        #customer-modal { backdrop-filter: none !important; }
      </style>
    `;
  }
}

  async showCustomerHistory(customerId, customerName) {
    // Pull all sales transactions for this customer
    let txs = [];
    try {
      const all = await db.getAll('transactions');
      txs = all
        .filter(t => t.customerId == customerId && t.type === 'income')
        .sort((a, b) => (b.date || b.createdAt || 0) - (a.date || a.createdAt || 0));
    } catch {}

    const { showDetailPanel, dpKV } = await import('./panelHelper.js');

    const totalSpent = txs.reduce((s, t) => s + (t.amount || 0), 0);
    const visitCount = txs.length;

    const txRows = txs.length === 0
      ? `<p style="color:var(--text-muted);font-size:0.875rem;text-align:center;padding:1rem 0;">No purchase history yet.</p>`
      : txs.slice(0, 50).map(t => {
          const date = new Date(t.date || t.createdAt || 0).toLocaleDateString('en-ZA');
          const items = (t.items || []).map(i => `${i.name || i.sku} ×${i.quantity}`).join(', ');
          const badge = { cash:'#10b981', card:'#2563eb', mobile:'#f59e0b', credit:'#f87171' }[t.paymentMethod] || '#6b7280';
          return `
            <div style="padding:0.75rem 0;border-bottom:1px solid var(--border);">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.5rem;margin-bottom:0.25rem;">
                <span style="font-size:0.875rem;font-weight:600;color:var(--text-primary);">${sym()}${(t.amount||0).toFixed(2)}</span>
                <div style="display:flex;gap:0.375rem;align-items:center;">
                  <span style="font-size:0.6875rem;padding:0.1rem 0.4rem;border-radius:4px;background:${badge}22;color:${badge};font-weight:600;text-transform:capitalize;">${t.paymentMethod||'cash'}</span>
                  <span style="font-size:0.75rem;color:var(--text-muted);">${date}</span>
                </div>
              </div>
              ${items ? `<p style="margin:0;font-size:0.75rem;color:var(--text-secondary);">${items}</p>` : ''}
              ${t.cashierName ? `<p style="margin:0.125rem 0 0;font-size:0.6875rem;color:var(--text-muted);">Cashier: ${t.cashierName}</p>` : ''}
            </div>
          `;
        }).join('');

    const summaryHTML = `
      <div class="dp-section">
        <div class="dp-kv-grid" style="margin-bottom:1.25rem;">
          ${dpKV('Total Spent', `${sym()}${totalSpent.toFixed(2)}`)}
          ${dpKV('Visits', visitCount)}
          ${dpKV('Avg per Visit', visitCount > 0 ? `${sym()}${(totalSpent / visitCount).toFixed(2)}` : '—')}
          ${dpKV('Last Visit', txs[0] ? new Date(txs[0].date || txs[0].createdAt).toLocaleDateString('en-ZA') : '—')}
        </div>
        <div class="dp-section-title">Purchase History${txs.length > 50 ? ' (last 50)' : ''}</div>
        ${txRows}
      </div>
    `;

    showDetailPanel({
      title: customerName,
      subtitle: `${visitCount} visit${visitCount !== 1 ? 's' : ''} · ${sym()}${totalSpent.toLocaleString()} spent`,
      bodyHTML: summaryHTML,
    });
  }
}

export default new CustomersUI();
