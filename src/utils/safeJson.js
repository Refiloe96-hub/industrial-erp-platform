export const safeParseJSON = (str, fallback = null) => {
  if (str == null) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
};

export const getSession = () => safeParseJSON(localStorage.getItem('erp_session'));

const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ESC_MAP[c]);

const CURRENCY_SYMBOLS = { ZAR: 'R ', KES: 'KSh ', NGN: '₦', USD: '$', EUR: '€ ' };
/** Synchronous currency symbol from localStorage cache. Falls back to 'R '. */
export const sym = () => CURRENCY_SYMBOLS[localStorage.getItem('erp_currency') || 'ZAR'] || 'R ';
