// static/js/core/ui_notifications.js
// Sistema de notificaciones no intrusivas tipo Toast y respuesta haptica

class NotificationManager {
  constructor() {
    this.container = null;
    this.init();
  }

  init() {
    let el = document.getElementById('toast-container');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast-container';
      el.className = 'toast-container';
      document.body.appendChild(el);
    }
    this.container = el;
  }

  triggerHaptic(type = 'light') {
    // Si la API del navegador soporta vibracion
    if ('vibrate' in navigator) {
      if (type === 'light') navigator.vibrate(15);
      else if (type === 'medium') navigator.vibrate([25, 10, 25]);
      else if (type === 'success') navigator.vibrate([40, 30, 60]);
    }
  }

  show({ message, type = 'success', icon = 'fa-circle-check', duration = 3500 }) {
    this.triggerHaptic(type === 'success' ? 'success' : 'light');

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <i class="fa-solid ${icon}"></i>
      <span>${message}</span>
    `;

    this.container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  success(message, icon = 'fa-circle-check') {
    this.show({ message, type: 'success', icon });
  }

  warning(message, icon = 'fa-triangle-exclamation') {
    this.show({ message, type: 'warning', icon });
  }

  info(message, icon = 'fa-sparkles') {
    this.show({ message, type: 'info', icon });
  }
}

export const notifications = new NotificationManager();
