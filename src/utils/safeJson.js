export const safeParseJSON = (str, fallback = null) => {
  if (str == null) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
};

export const getSession = () => safeParseJSON(localStorage.getItem('erp_session'));

const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ESC_MAP[c]);
