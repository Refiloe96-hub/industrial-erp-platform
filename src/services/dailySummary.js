/**
 * Daily Business Summary Notifications
 * Fires a Web Notification at the configured time (default 17:00)
 * summarising today's revenue, sales count, and low-stock alerts.
 */

import db from '../db/index.js';

const STORAGE_KEY_ENABLED   = 'erp_daily_summary_enabled';
const STORAGE_KEY_LAST_DATE = 'erp_daily_summary_last_date';
const STORAGE_KEY_HOUR      = 'erp_daily_summary_hour';

export const DailySummary = {

  isEnabled() {
    return localStorage.getItem(STORAGE_KEY_ENABLED) === 'true';
  },

  setEnabled(val) {
    localStorage.setItem(STORAGE_KEY_ENABLED, val ? 'true' : 'false');
  },

  getHour() {
    return parseInt(localStorage.getItem(STORAGE_KEY_HOUR) || '17', 10);
  },

  setHour(h) {
    localStorage.setItem(STORAGE_KEY_HOUR, String(h));
  },

  async requestPermission() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const result = await Notification.requestPermission();
    return result === 'granted';
  },

  hasPermission() {
    return typeof Notification !== 'undefined' && Notification.permission === 'granted';
  },

  async buildSummary(businessName) {
    const dayStart = new Date().setHours(0, 0, 0, 0);
    const now      = Date.now();

    let revenue = 0, salesCount = 0, lowStock = 0;

    try {
      const txs = await db.getAll('transactions');
      const todaySales = txs.filter(t =>
        t.date >= dayStart && t.date <= now && t.type === 'income'
      );
      revenue    = todaySales.reduce((s, t) => s + (t.amount || 0), 0);
      salesCount = todaySales.length;
    } catch {}

    try {
      const items = await db.getAll('inventory');
      lowStock = items.filter(i => (i.quantity ?? 0) <= (i.reorderLevel ?? 5)).length;
    } catch {}

    const day = new Date().toLocaleDateString('en-ZA', { weekday: 'long' });

    return {
      title: `${businessName} — ${day} Summary`,
      body: [
        `Revenue: R ${revenue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
        `${salesCount} sale${salesCount !== 1 ? 's' : ''}`,
        lowStock > 0 ? `${lowStock} low-stock item${lowStock !== 1 ? 's' : ''}` : null,
      ].filter(Boolean).join('  ·  '),
    };
  },

  async fire(businessName) {
    if (!this.hasPermission()) return;
    const today = new Date().toDateString();
    if (localStorage.getItem(STORAGE_KEY_LAST_DATE) === today) return; // already sent today

    const { title, body } = await this.buildSummary(businessName);

    new Notification(title, {
      body,
      icon: '/icons/icon.svg',
      badge: '/icons/icon.svg',
      tag: 'erp-daily-summary',   // replaces any previous notification
    });

    localStorage.setItem(STORAGE_KEY_LAST_DATE, today);
  },

  /**
   * Call once after login. Schedules a notification at the configured hour.
   * If the hour has already passed today and we haven't notified yet, fires immediately.
   */
  async init(businessName) {
    if (!this.isEnabled()) return;
    if (!this.hasPermission()) return;

    const now   = new Date();
    const hour  = this.getHour();
    const today = new Date().toDateString();
    const lastDate = localStorage.getItem(STORAGE_KEY_LAST_DATE);

    if (now.getHours() >= hour && lastDate !== today) {
      // Past the target hour and haven't fired yet today — fire now
      await this.fire(businessName);
      return;
    }

    // Schedule for later today
    const fireAt = new Date();
    fireAt.setHours(hour, 0, 0, 0);
    const msUntilFire = fireAt.getTime() - now.getTime();

    if (msUntilFire > 0) {
      setTimeout(() => this.fire(businessName), msUntilFire);
    }
  },
};

export default DailySummary;
