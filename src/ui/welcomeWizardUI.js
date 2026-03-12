class WelcomeWizardUI {
  constructor() {
    this.currentStep = 1;
    this.totalSteps = 3;
    this.onComplete = null;
  }

  show(onCompleteCallback) {
    this.onComplete = onCompleteCallback;
    this.currentStep = 1;

    // Remove any existing wizard
    const existing = document.getElementById('welcome-wizard-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'welcome-wizard-overlay';
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0', background: 'rgba(8, 13, 23, 0.85)',
      backdropFilter: 'blur(8px)', zIndex: '10000', display: 'flex',
      alignItems: 'center', justifyContent: 'center', opacity: '0',
      transition: 'opacity 0.3s ease'
    });

    overlay.innerHTML = `
      <style>
        .ww-modal {
          background: #0f172a; border: 1px solid rgba(255,255,255,0.1);
          border-radius: 20px; box-shadow: 0 25px 50px rgba(0,0,0,0.5);
          width: 90%; max-width: 540px; overflow: hidden;
          transform: translateY(20px) scale(0.95); transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          display: flex; flex-direction: column;
        }
        .ww-modal.visible { transform: translateY(0) scale(1); }
        .ww-header { padding: 2.5rem 2.5rem 1.5rem; text-align: center; }
        .ww-icon { 
          width: 64px; height: 64px; margin: 0 auto 1.5rem; border-radius: 16px; 
          background: rgba(37,99,235,0.1); color: #3b82f6; 
          display: flex; align-items: center; justify-content: center; font-size: 2rem;
        }
        .ww-title { font-size: 1.5rem; font-weight: 800; color: #f8fafc; margin-bottom: 0.5rem; letter-spacing: -0.02em; }
        .ww-desc { font-size: 0.95rem; color: #94a3b8; line-height: 1.6; }
        .ww-body { padding: 0 2.5rem 2.5rem; }
        .ww-progress { display: flex; gap: 0.5rem; justify-content: center; margin-bottom: 2.5rem; }
        .ww-dot { width: 40px; height: 4px; border-radius: 4px; background: rgba(255,255,255,0.1); transition: background 0.3s; }
        .ww-dot.active { background: #3b82f6; }
        .ww-actions { display: flex; gap: 1rem; }
        .ww-btn { 
          flex: 1; padding: 0.875rem; border-radius: 10px; font-weight: 600; font-size: 0.95rem; 
          cursor: pointer; transition: all 0.2s; border: none;
        }
        .ww-btn-primary { background: #2563eb; color: white; }
        .ww-btn-primary:hover { background: #1d4ed8; }
        .ww-btn-secondary { background: rgba(255,255,255,0.05); color: #e2e8f0; border: 1px solid rgba(255,255,255,0.1); }
        .ww-btn-secondary:hover { background: rgba(255,255,255,0.1); }
        .ww-skip { text-align: center; margin-top: 1.5rem; }
        .ww-skip button { background: none; border: none; color: #64748b; font-size: 0.85rem; cursor: pointer; }
        .ww-skip button:hover { color: #94a3b8; text-decoration: underline; }
      </style>
      <div class="ww-modal" id="ww-modal">
        <div class="ww-header">
          <div class="ww-icon" id="ww-icon"><i class="ph-duotone ph-hand-waving"></i></div>
          <h2 class="ww-title" id="ww-title">Welcome to Industrial ERP</h2>
          <p class="ww-desc" id="ww-desc">Let's get your workspace set up so you can start operating immediately. This takes less than a minute.</p>
        </div>
        <div class="ww-body">
          <div class="ww-progress" id="ww-progress">
            <div class="ww-dot active"></div><div class="ww-dot"></div><div class="ww-dot"></div>
          </div>
          <div class="ww-actions">
            <button class="ww-btn ww-btn-secondary" id="ww-back" style="display:none;">Back</button>
            <button class="ww-btn ww-btn-primary" id="ww-next">Let's go <i class="ph-bold ph-arrow-right"></i></button>
          </div>
          <div class="ww-skip"><button id="ww-skip">Skip for now</button></div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Trigger entrance animation
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      document.getElementById('ww-modal').classList.add('visible');
    });

    this.attachHandlers(overlay);
  }

  getContentForStep(step) {
    const content = [
      {
        icon: '<i class="ph-duotone ph-hand-waving"></i>',
        title: 'Welcome to Industrial ERP',
        desc: 'Let\'s get your workspace set up so you can start operating immediately. This takes less than a minute.',
        nextText: 'Let\'s go <i class="ph-bold ph-arrow-right"></i>'
      },
      {
        icon: '<i class="ph-duotone ph-archive-box"></i>',
        title: 'Load your first product',
        desc: 'Head over to PoolStock Inventory. You can add items manually or bulk import them from an Excel file within settings.',
        nextText: 'Next'
      },
      {
        icon: '<i class="ph-duotone ph-shopping-cart"></i>',
        title: 'Ready to sell',
        desc: 'Your Point of Sale syncs perfectly with your inventory. Make a sale, and PocketBooks will automatically log the revenue.',
        nextText: 'Start Operating'
      }
    ];
    return content[step - 1];
  }

  updateUI(overlay) {
    const data = this.getContentForStep(this.currentStep);
    overlay.querySelector('#ww-icon').innerHTML = data.icon;
    overlay.querySelector('#ww-title').innerHTML = data.title;
    overlay.querySelector('#ww-desc').innerHTML = data.desc;
    overlay.querySelector('#ww-next').innerHTML = data.nextText;

    const backBtn = overlay.querySelector('#ww-back');
    backBtn.style.display = this.currentStep === 1 ? 'none' : 'block';

    const dots = overlay.querySelectorAll('.ww-dot');
    dots.forEach((dot, index) => {
      dot.classList.toggle('active', index < this.currentStep);
    });
  }

  attachHandlers(overlay) {
    const nextBtn = overlay.querySelector('#ww-next');
    const backBtn = overlay.querySelector('#ww-back');
    const skipBtn = overlay.querySelector('#ww-skip');

    const finish = () => {
      localStorage.setItem('erp_onboarding_complete', 'true');
      overlay.style.opacity = '0';
      document.getElementById('ww-modal').classList.remove('visible');
      setTimeout(() => {
        overlay.remove();
        if (this.onComplete) this.onComplete();
      }, 300);
    };

    nextBtn.addEventListener('click', () => {
      if (this.currentStep < this.totalSteps) {
        this.currentStep++;
        this.updateUI(overlay);
      } else {
        finish();
      }
    });

    backBtn.addEventListener('click', () => {
      if (this.currentStep > 1) {
        this.currentStep--;
        this.updateUI(overlay);
      }
    });

    skipBtn.addEventListener('click', finish);
  }
}

export default new WelcomeWizardUI();
