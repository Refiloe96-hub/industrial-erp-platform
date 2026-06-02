// Notification panel — extracted from main.js
import notificationService from '../services/notifications.js';

export async function initNotifications(app) {
    try {
      await notificationService.init();
      app.updateNotificationBadge();
      app.renderNotificationList();

      // Bell button toggle
      document.getElementById('notification-btn')?.addEventListener('click', () => {
        const panel = document.getElementById('notification-panel');
        if (panel) {
          panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
          // Mark visible notifications as read
          if (panel.style.display === 'block') {
            app.renderNotificationList();
          }
        }
      });

      // Mark all as read
      document.getElementById('mark-all-read')?.addEventListener('click', () => {
        notificationService.markAllAsRead();
        app.updateNotificationBadge();
        app.renderNotificationList();
      });

      // Close panel when clicking outside
      document.addEventListener('click', (e) => {
        const panel = document.getElementById('notification-panel');
        const btn = document.getElementById('notification-btn');
        if (panel && !panel.contains(e.target) && !btn.contains(e.target)) {
          panel.style.display = 'none';
        }
      });

    } catch (err) {
      console.warn('Failed to init notifications:', err);
    }
  }

export function updateNotificationBadge(app) {
    const badge = document.getElementById('notification-badge');
    if (badge) {
      const count = notificationService.getUnreadCount();
      badge.textContent = count > 9 ? '9+' : count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    }
  }

export function renderNotificationList(app) {
    const list = document.getElementById('notification-list');
    if (!list) return;

    const notifications = notificationService.getAll();

    if (notifications.length === 0) {
      list.innerHTML = '<p class="empty-notifications">No alerts.</p>';
      return;
    }

    list.innerHTML = notifications.map(n => `
      <div class="notification-item ${n.type} ${n.read ? 'read' : 'unread'}" data-id="${n.id}">
        <div class="notification-icon">${app.getNotificationIcon(n.type)}</div>
        <div class="notification-content">
          <strong>${n.title}</strong>
          <p>${n.message}</p>
          ${n.details ? `<ul class="notification-details">${n.details.slice(0, 3).map(d => `<li>${d}</li>`).join('')}</ul>` : ''}
        </div>
        ${n.action ? `<button class="btn btn-sm btn-primary notification-action" data-module="${n.action.module}">${n.action.label}</button>` : ''}
      </div>
    `).join('');

    // Add action button handlers
    list.querySelectorAll('.notification-action').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const module = e.target.dataset.module;
        document.getElementById('notification-panel').style.display = 'none';
        app.navigateTo(module);
      });
    });

    // Mark as read on click
    list.querySelectorAll('.notification-item').forEach(item => {
      item.addEventListener('click', () => {
        notificationService.markAsRead(item.dataset.id);
        item.classList.add('read');
        item.classList.remove('unread');
        app.updateNotificationBadge();
      });
    });
  }

export function getNotificationIcon(type) {
    const icons = {
      critical: '<i class="ph-fill ph-warning-circle" style="color: var(--danger)"></i>',
      warning: '<i class="ph-fill ph-warning" style="color: var(--warning)"></i>',
      info: '<i class="ph-fill ph-info" style="color: var(--primary)"></i>',
      success: '<i class="ph-fill ph-check-circle" style="color: var(--success)"></i>'
    };
    return icons[type] || '<i class="ph-fill ph-bell"></i>';
  }