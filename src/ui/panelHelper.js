/**
 * Shared detail panel helper used by all modules.
 * Opens a slide-in drawer from the right with the given content.
 */
export function showDetailPanel({ title, subtitle = '', bodyHTML, footerHTML = '' }) {
  // Clean up any existing panels
  document.querySelector('.dp-overlay')?.remove();
  document.querySelector('.dp-panel')?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'dp-overlay';
  overlay.style.cssText =
    'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:1200;backdrop-filter:blur(8px);';

  const panel = document.createElement('div');
  panel.className = 'dp-panel';
  panel.style.cssText =
    'position:fixed;top:0;right:0;height:100%;width:min(440px,100vw);' +
    'background:#0f172a;z-index:1201;display:flex;flex-direction:column;' +
    'box-shadow:-4px 0 32px rgba(0,0,0,0.5);overflow:hidden;animation:dpSlideIn 0.22s ease;border-left:1px solid rgba(255,255,255,0.08);';

  panel.innerHTML = `
    <style>
      @keyframes dpSlideIn { from { transform:translateX(100%) } to { transform:translateX(0) } }
      .dp-header { padding:1.25rem 1.5rem; border-bottom:1px solid var(--border,#e5e7eb); display:flex; align-items:flex-start; justify-content:space-between; gap:1rem; }
      .dp-header-text { flex:1; min-width:0; }
      .dp-title { font-size:1rem; font-weight:700; color:var(--text-primary,#111); margin:0 0 0.15rem; }
      .dp-subtitle { font-size:0.78rem; color:var(--text-secondary,#6b7280); }
      .dp-close { background:none; border:none; cursor:pointer; color:var(--text-secondary,#6b7280); font-size:1.2rem; line-height:1; padding:0.25rem; flex-shrink:0; }
      .dp-close:hover { color:var(--text-primary,#111); }
      .dp-body { flex:1; overflow-y:auto; padding:1.5rem; }
      .dp-footer { padding:1rem 1.5rem; border-top:1px solid var(--border,#e5e7eb); display:flex; gap:0.75rem; }

      /* Reusable inner components */
      .dp-section { margin-bottom:1.5rem; }
      .dp-section-title { font-size:0.68rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--text-secondary,#9ca3af); margin-bottom:0.75rem; }
      .dp-kv-grid { display:grid; grid-template-columns:1fr 1fr; gap:0.65rem; }
      .dp-kv { background:rgba(255,255,255,0.05); border-radius:8px; padding:0.75rem 1rem; border: 1px solid rgba(255,255,255,0.07); }
      .dp-kv .k { font-size:0.68rem; font-weight:600; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-secondary,#9ca3af); margin-bottom:0.2rem; }
      .dp-kv .v { font-size:0.95rem; font-weight:600; color:var(--text-primary,#f1f5f9); }
      .dp-kv.full { grid-column:1/-1; }
      .dp-bar-row { display:flex; align-items:center; gap:0.75rem; margin-bottom:0.6rem; }
      .dp-bar-label { font-size:0.78rem; color:var(--text-secondary,#94a3b8); flex:0 0 130px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .dp-bar-track { flex:1; height:8px; background:rgba(255,255,255,0.08); border-radius:999px; overflow:hidden; }
      .dp-bar-fill { height:100%; border-radius:999px; transition:width 0.5s ease; }
      .dp-bar-val { font-size:0.78rem; font-weight:600; color:var(--text-primary,#f1f5f9); flex:0 0 52px; text-align:right; }
      .dp-list { list-style:none; padding:0; margin:0; }
      .dp-list li { display:flex; align-items:center; justify-content:space-between; padding:0.6rem 0; border-bottom:1px solid rgba(255,255,255,0.06); font-size:0.875rem; color:var(--text-primary,#f1f5f9); }
      .dp-list li:last-child { border-bottom:none; }
      .dp-list .dp-badge { padding:0.15rem 0.5rem; border-radius:999px; font-size:0.7rem; font-weight:600; }
      .dp-empty { text-align:center; padding:2rem 1rem; color:var(--text-secondary,#9ca3af); font-size:0.875rem; }
      .dp-nav-btn { width:100%; padding:0.65rem; border:1px solid var(--accent-primary,#f97316); background:transparent; border-radius:8px; cursor:pointer; font-size:0.875rem; color:var(--accent-primary,#f97316); font-weight:600; }
      .dp-nav-btn:hover { background:var(--accent-primary,#f97316); color:#fff; }
    </style>
    <div class="dp-header">
      <div class="dp-header-text">
        <div class="dp-title">${title}</div>
        ${subtitle ? `<div class="dp-subtitle">${subtitle}</div>` : ''}
      </div>
      <button class="dp-close" id="dp-close-btn">✕</button>
    </div>
    <div class="dp-body">${bodyHTML}</div>
    ${footerHTML ? `<div class="dp-footer">${footerHTML}</div>` : ''}
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(panel);

  const close = () => {
    panel.remove();
    overlay.remove();
  };

  panel.querySelector('#dp-close-btn').addEventListener('click', close);
  overlay.addEventListener('click', close);

  return { panel, overlay, close };
}

/** Make a horizontal bar row */
export function dpBar(label, value, max, color = '#f97316', fmt = v => v) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return `
    <div class="dp-bar-row">
      <span class="dp-bar-label" title="${label}">${label}</span>
      <div class="dp-bar-track"><div class="dp-bar-fill" style="width:${pct}%;background:${color};"></div></div>
      <span class="dp-bar-val">${fmt(value)}</span>
    </div>`;
}

/** Make a key-value tile */
export function dpKV(label, value, full = false) {
  return `<div class="dp-kv${full ? ' full' : ''}"><div class="k">${label}</div><div class="v">${value}</div></div>`;
}
