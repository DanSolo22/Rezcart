// static/js/modules/pantry.js
// Gestion de despensa virtual con frescura implicita automatica y check-in rapido

import { state } from '../core/state.js';
import { CATEGORY_METADATA, calculateFreshness } from '../core/formatters.js';
import { notifications } from '../core/ui_notifications.js';

let activeCategoryFilter = 'all';

export function initPantryModule() {
  renderPantryFilters();
  renderPantryItems();
  renderCheckinWidget();
}

export function renderPantryFilters() {
  const container = document.getElementById('pantry-filter-pills');
  if (!container) return;

  const categories = [
    { key: 'all', label: 'Todos', icon: 'fa-layer-group' },
    { key: 'meat', label: 'Carnes', icon: 'fa-drumstick-bite' },
    { key: 'vegetables', label: 'Verduras', icon: 'fa-carrot' },
    { key: 'dairy', label: 'Lácteos', icon: 'fa-cheese' },
    { key: 'eggs', label: 'Huevos', icon: 'fa-egg' },
    { key: 'dry_goods', label: 'Despensa Seca', icon: 'fa-bowl-rice' }
  ];

  container.innerHTML = categories.map(cat => {
    const isActive = activeCategoryFilter === cat.key;
    return `
      <button class="pill ${isActive ? 'pill-culinary' : ''}" style="cursor: pointer; border: 1px solid var(--border-subtle); background: ${isActive ? 'var(--bg-culinary-pill)' : 'var(--bg-card)'};" data-cat="${cat.key}">
        <i class="fa-solid ${cat.icon}"></i>
        ${cat.label}
      </button>
    `;
  }).join('');

  container.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      activeCategoryFilter = btn.dataset.cat;
      renderPantryFilters();
      renderPantryItems();
    });
  });
}

export function renderCheckinWidget() {
  const container = document.getElementById('pantry-checkin-container');
  if (!container) return;

  // Buscar alimentos que requieran confirmacion (estado warning)
  const staleItems = state.pantry.filter(p => {
    const f = calculateFreshness(p.category, p.daysAgo);
    return f.status === 'warning';
  });

  if (staleItems.length === 0) {
    container.innerHTML = '';
    return;
  }

  const currentCheckItem = staleItems[0];
  const otherItems = staleItems.slice(1);

  container.innerHTML = `
    <!-- Bandeja de Consumo Prioritario (Próximas 48h) -->
    <div class="priority-pantry-card">
      <div class="priority-pantry-left">
        <div class="priority-icon-box">
          <i class="fa-solid fa-hourglass-half"></i>
        </div>
        <div>
          <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--color-warning-dark); display: flex; align-items: center; gap: 0.4rem;">
            <span>Consumo Prioritario Recomendado (Próximas 48h)</span>
            <span class="pill pill-warning" style="font-size:0.7rem; padding:0.15rem 0.5rem;">${staleItems.length} alimentos</span>
          </h4>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.15rem;">
            Alcanzando su límite de frescura óptima. Cocínalos hoy para evitar desperdicio:
          </p>
          <div class="priority-pantry-items">
            <span class="priority-item-chip">
              <i class="fa-solid fa-circle-exclamation"></i>
              <strong>${currentCheckItem.name}</strong> (${currentCheckItem.daysAgo} días)
            </span>
            ${otherItems.map(it => `
              <span class="priority-item-chip">
                <i class="fa-solid fa-circle-exclamation"></i>
                ${it.name} (${it.daysAgo} días)
              </span>
            `).join('')}
          </div>
        </div>
      </div>
      <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
        <button class="btn btn-secondary btn-sm" id="btn-checkin-confirm" title="Confirmar que sigue en buen estado">
          <i class="fa-solid fa-check" style="color: var(--color-culinary);"></i>
          <span>${currentCheckItem.name}: Sigue fresco</span>
        </button>
        <button class="btn btn-danger btn-sm" id="btn-checkin-depleted" title="Marcar gastado y devolver a lista de compra">
          <i class="fa-solid fa-basket-shopping"></i>
          <span>Se gastó -> Al Carrito</span>
        </button>
      </div>
    </div>
  `;

  document.getElementById('btn-checkin-confirm')?.addEventListener('click', () => {
    state.verifyFreshnessPantryItem(currentCheckItem.id);
    notifications.success(`"${currentCheckItem.name}" verificado como fresco`);
    renderCheckinWidget();
    renderPantryItems();
  });

  document.getElementById('btn-checkin-depleted')?.addEventListener('click', () => {
    state.depletePantryItem(currentCheckItem.id, true);
    notifications.info(`"${currentCheckItem.name}" marcado como gastado y añadido al carrito`);
    renderCheckinWidget();
    renderPantryItems();
  });
}

export function renderPantryItems() {
  const container = document.getElementById('pantry-items-grid');
  if (!container) return;

  let items = state.pantry;
  if (activeCategoryFilter !== 'all') {
    items = items.filter(i => i.category === activeCategoryFilter);
  }

  // Actualizar contador en cabecera
  const countEl = document.getElementById('pantry-total-count');
  if (countEl) countEl.textContent = state.pantry.length;

  if (items.length === 0) {
    container.innerHTML = `
      <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 2.5rem 1rem; color: var(--text-muted);">
        <i class="fa-solid fa-box-open" style="font-size: 2.5rem; margin-bottom: 0.75rem; color: var(--border-hover);"></i>
        <h3 style="font-size: 1.1rem; color: var(--text-main); margin-bottom: 0.3rem;">No hay alimentos en esta categoría</h3>
        <p style="font-size: 0.85rem;">Finaliza compras en el carrito o escanea tu nevera con foto para surtir tu despensa.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = items.map(item => {
    const meta = CATEGORY_METADATA[item.category] || CATEGORY_METADATA.general;
    const freshness = calculateFreshness(item.category, item.daysAgo);

    let gaugeHtml = '';
    if (freshness.status === 'fresh') {
      gaugeHtml = `
        <span class="freshness-meter-segments" title="Frescura óptima (${item.daysAgo} días)">
          <span class="meter-seg seg-green"></span>
          <span class="meter-seg seg-green"></span>
          <span class="meter-seg seg-green"></span>
        </span>
      `;
    } else if (freshness.status === 'warning') {
      gaugeHtml = `
        <span class="freshness-meter-segments" title="Consumir pronto (${item.daysAgo} días)">
          <span class="meter-seg seg-green"></span>
          <span class="meter-seg seg-orange"></span>
          <span class="meter-seg"></span>
        </span>
      `;
    } else {
      gaugeHtml = `
        <span class="freshness-meter-segments" title="Agotado o caducado">
          <span class="meter-seg seg-red"></span>
          <span class="meter-seg"></span>
          <span class="meter-seg"></span>
        </span>
      `;
    }

    return `
      <div class="pantry-card" data-pantry-id="${item.id}" style="${freshness.status === 'warning' ? 'border-color: var(--border-warning);' : ''}">
        <div class="pantry-card-top">
          <div>
            <h4 class="pantry-item-title">${item.name}</h4>
            <div class="pantry-freshness-info">
              ${gaugeHtml}
              <span class="freshness-indicator ${freshness.indicatorClass}"></span>
              <span>${freshness.label}</span>
            </div>
          </div>
          <span class="pill ${freshness.badgeClass}">
            <i class="fa-solid ${meta.icon}"></i>
            ${meta.label}
          </span>
        </div>

        <div class="pantry-card-actions">
          <button class="btn btn-secondary btn-sm" data-action="verify-fresh" title="Confirmar frescura">
            <i class="fa-solid fa-rotate" style="color: var(--color-culinary);"></i>
            <span>Verificado</span>
          </button>
          <button class="btn btn-danger btn-sm" data-action="deplete" title="Marcar como consumido y devolver a la lista">
            <i class="fa-solid fa-arrow-rotate-left"></i>
            <span>Gastado <i class="fa-solid fa-arrow-right" style="font-size:0.7rem; margin:0 2px;"></i> Carrito</span>
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Eventos de botones
  container.querySelectorAll('.pantry-card').forEach(card => {
    const itemId = card.dataset.pantryId;

    card.querySelector('[data-action="verify-fresh"]').addEventListener('click', () => {
      state.verifyFreshnessPantryItem(itemId);
      notifications.success('Frescura confirmada para hoy');
      renderPantryItems();
      renderCheckinWidget();
    });

    card.querySelector('[data-action="deplete"]').addEventListener('click', () => {
      state.depletePantryItem(itemId, true);
      notifications.info('Alimento gastado y devuelto al carrito');
      renderPantryItems();
      renderCheckinWidget();
    });
  });
}
