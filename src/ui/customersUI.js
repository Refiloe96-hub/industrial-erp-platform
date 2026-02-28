import Customers from '../modules/Customers.js';

class CustomersUI {
  constructor() {
    this.customers = [];
  }

  async render(container) {
    this.customers = await Customers.getAllCustomers();

    container.innerHTML = `
      <div class="customers-container">
        <div class="page-header">
          <h2><i class="ph-duotone ph-users"></i> Customers</h2>
          <button class="btn btn-primary" id="btn-add-customer"><i class="ph ph-plus"></i> New Customer</button>
        </div>

        <div class="search-bar mb-4">
          <input type="text" id="customer-search" placeholder="Search by name or phone..." class="form-control">
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
                <textarea id="cust-notes" rows="3" class="form-control" style="width: 100%; border: 1px solid #d1d5db; border-radius: 6px; padding: 0.75rem;"></textarea>
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
      return `<p class="text-center text-muted col-span-full">No customers found. Add your first one!</p>`;
    }

    return customers.map(c => `
      <div class="customer-card">
        <div class="card-header">
          <h3>${c.name}</h3>
          <span class="loyalty-badge"><i class="ph-fill ph-star"></i> ${c.loyaltyPoints || 0}</span>
        </div>
        <div class="card-body">
          <p><i class="ph-duotone ph-phone"></i> ${c.phone || 'No phone'}</p>
          <p><i class="ph-duotone ph-currency-dollar"></i> Total Spent: R ${(c.totalSpent || 0).toLocaleString()}</p>
          <p class="text-sm text-muted">Last visited: ${new Date(c.lastVisit).toLocaleDateString()}</p>
          <button class="btn btn-sm btn-outline-primary mt-2 btn-edit" data-id="${c.id}">Edit</button>
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
            margin-bottom: 2rem;
        }
        .page-header h2 {
            color: var(--text-primary);
        }
        .customers-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 1.5rem;
        }
        .customer-card {
            background: var(--bg-primary);
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: var(--shadow-sm);
            border: 1px solid var(--border-color);
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .customer-card:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-md);
        }
        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
        }
        .card-header h3 { 
            margin: 0; 
            font-size: 1.1rem; 
            color: var(--text-primary);
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
            border: 1px solid var(--border-color);
            border-radius: 6px;
            background: var(--bg-secondary);
            color: var(--text-primary);
        }
        .form-control:focus {
            outline: none;
            border-color: #6366f1;
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
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
           border: 1px solid var(--border-color);
           border-radius: 12px;
           box-shadow: var(--shadow-lg);
           color: var(--text-primary);
        }

        .modal-header {
            padding: 1.5rem;
            border-bottom: 1px solid var(--border-color);
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
            border-top: 1px solid var(--border-color);
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
      </style>
    `;
  }
}

export default new CustomersUI();
