
import PocketWallet from '../modules/PocketWallet.js';

class PocketWalletUI {
    constructor(container, pocketBooks) {
        this.container = container;
        this.module = new PocketWallet(pocketBooks);
        this.currentView = 'dashboard';
    }

    async render() {
        await this.loadView(this.currentView);
    }

    async loadView(view, data = null) {
        this.currentView = view;
        this.container.innerHTML = '<div class="loading">Loading PocketWallet...</div>';

        try {
            // Ensure wallet exists for current user
            const currentUser = JSON.parse(localStorage.getItem('erp_session'));
            const userId = currentUser ? currentUser.id : 'anonymous';

            let wallet = await this.module.getWalletByBusiness(userId);
            if (!wallet) {
                wallet = await this.module.createWallet({
                    businessId: userId,
                    businessName: 'My Business',
                    currency: 'ZAR'
                });
            }

            switch (view) {
                case 'dashboard':
                    await this.renderDashboard(wallet);
                    break;
                case 'send-money':
                    this.renderSendMoney(wallet);
                    break;
                default:
                    await this.renderDashboard(wallet);
            }
        } catch (err) {
            console.error('Error loading view:', err);
            this.container.innerHTML = `<p class="error">Error: ${err.message}</p>`;
        }
    }

    async renderDashboard(wallet) {
        const history = await this.module.getTransactionHistory(wallet.id);
        const recentTx = history.sort((a, b) => b.date - a.date).slice(0, 5);

        this.container.innerHTML = `
      <div class="pocketwallet-dashboard">
        <header class="module-header">
          <h1><i class="ph-duotone ph-credit-card"></i> PocketWallet</h1>
          <p>Secure B2B Payments</p>
        </header>

        <div class="wallet-card">
            <div class="balance-section">
                <span class="label">Current Balance</span>
                <h2 class="balance">R ${wallet.balance.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</h2>
                <div class="wallet-id">Acc: ${wallet.accountNumber}</div>
            </div>
            <div class="actions">
                <button id="send-money-btn" class="btn btn-light"><i class="ph-duotone ph-paper-plane-right"></i> Send Money</button>
                <button id="add-funds-btn" class="btn btn-outline-light"><i class="ph-duotone ph-plus-circle"></i> Add Funds</button>
            </div>
        </div>

        <section class="transaction-history mt-4">
            <h3>Recent Transactions</h3>
            <div class="tx-list">
                ${recentTx.length === 0 ? '<p>No transactions yet.</p>' :
                recentTx.map(tx => `
                        <div class="tx-item">
                            <div class="tx-icon ${tx.type}">${tx.type === 'credit' ? '<i class="ph ph-arrow-down-left"></i>' : '<i class="ph ph-arrow-up-right"></i>'}</div>
                            <div class="tx-details">
                                <span class="tx-desc">${tx.description}</span>
                                <span class="tx-date">${new Date(tx.date).toLocaleDateString()}</span>
                            </div>
                            <div class="tx-amount ${tx.type}">
                                ${tx.type === 'credit' ? '+' : '-'} R ${tx.amount.toLocaleString()}
                            </div>
                        </div>
                    `).join('')}
            </div>
        </section>
      </div>
    `;

        this.container.querySelector('#send-money-btn').addEventListener('click', () => {
            this.loadView('send-money');
        });

        this.container.querySelector('#add-funds-btn').addEventListener('click', async () => {
            const amount = prompt("Enter amount to deposit (Simulator):");
            if (amount) {
                await this.module.deposit({
                    walletId: wallet.id,
                    amount: parseFloat(amount),
                    description: 'Manual Deposit'
                });
                this.loadView('dashboard');
            }
        });

        this.injectStyles();
    }

    renderSendMoney(wallet) {
        this.container.innerHTML = `
      <div class="form-container">
        <h2>Send Money</h2>
        <form id="send-money-form">
          <div class="form-group">
            <label>Recipient Wallet ID / Account Number</label>
            <input type="text" name="toWallet" required placeholder="e.g. ERP172...">
          </div>
          
          <div class="form-group">
            <label>Amount (R)</label>
            <input type="number" name="amount" required min="1" max="${wallet.balance}">
            <small>Available: R ${wallet.balance.toLocaleString()}</small>
          </div>

          <div class="form-group">
            <label>Reference</label>
            <input type="text" name="description" required placeholder="e.g. Invoice #102">
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-secondary" id="cancel-btn">Cancel</button>
            <button type="submit" class="btn btn-primary">Send Payment</button>
          </div>
        </form>
      </div>
    `;

        this.container.querySelector('#cancel-btn').addEventListener('click', () => {
            this.loadView('dashboard');
        });

        this.container.querySelector('#send-money-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const toWallet = formData.get('toWallet');

            // Allow sending to self for demo purposes if needed, logic should ideally prevent this
            if (toWallet === wallet.id.toString()) {
                alert("Cannot send money to yourself.");
                return;
            }

            try {
                await this.module.processPayment({
                    type: 'b2b',
                    fromWallet: wallet.id,
                    toWallet: parseInt(toWallet) || toWallet, // Handle if ID is int or string
                    amount: parseFloat(formData.get('amount')),
                    description: formData.get('description'),
                    initiatedBy: wallet.businessId
                });
                alert('Payment Successful!');
                await this.loadView('dashboard');
            } catch (err) {
                alert('Payment Failed: ' + err.message);
            }
        });
    }

    injectStyles() {
        if (document.getElementById('pocketwallet-styles')) return;

        const style = document.createElement('style');
        style.id = 'pocketwallet-styles';
        style.textContent = `
        .wallet-card {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 10px 25px -5px rgba(16, 185, 129, 0.4);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .balance-section .label { opacity: 0.8; font-size: 0.9rem; }
        .balance-section .balance { font-size: 2.5rem; margin: 0.5rem 0; }
        .balance-section .wallet-id { font-family: monospace; background: rgba(0,0,0,0.2); padding: 0.25rem 0.5rem; border-radius: 4px; display: inline-block; }

        .actions { display: flex; gap: 1rem; }
        .btn-light { background: white; color: #059669; border: none; }
        .btn-outline-light { background: transparent; border: 1px solid white; color: white; }

        .tx-list { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .tx-item { display: flex; align-items: center; padding: 1rem; border-bottom: 1px solid #f3f4f6; }
        .tx-icon { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 1rem; }
        .tx-icon.credit { background: #d1fae5; color: #065f46; }
        .tx-icon.debit { background: #fee2e2; color: #991b1b; }
        .tx-details { flex: 1; }
        .tx-desc { display: block; font-weight: 500; }
        .tx-date { font-size: 0.8rem; color: #6b7280; }
        .tx-amount { font-weight: 600; }
        .tx-amount.credit { color: #059669; }
        .tx-amount.debit { color: #dc2626; }
      `;
        document.head.appendChild(style);
    }
}

export default PocketWalletUI;
