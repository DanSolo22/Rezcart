// static/js/modules/carts.js
// Gestion de carritos multiples, clasificacion comida vs no-comida y checkout guiado

import { state } from '../core/state.js';
import { CATEGORY_METADATA } from '../core/formatters.js';
import { notifications } from '../core/ui_notifications.js';

export function initCartsModule() {
  renderCartChips();
  renderCartItems();
  bindCartEvents();
}

export function renderCartChips() {
  const container = document.getElementById('cart-chips-container');
  if (!container) return;

  const activeCart = state.getActiveCart();

  container.innerHTML = state.carts.map(cart => {
    const isActive = cart.id === activeCart.id;
    const pendingCount = cart.items.filter(i => !i.bought).length;
    let icon = 'fa-basket-shopping';
    if (cart.type === 'non_food') icon = 'fa-wrench';
    if (cart.type === 'grocery') icon = 'fa-carrot';

    return `
      <div class="cart-chip ${isActive ? 'active' : ''}" data-cart-id="${cart.id}">
        <i class="fa-solid ${icon}"></i>
        <span>${cart.name}</span>
        <span class="cart-count">${pendingCount}</span>
      </div>
    `;
  }).join('');

  // Boton para anadir nuevo carrito
  container.innerHTML += `
    <button class="btn btn-secondary btn-sm" id="btn-open-new-cart-modal" style="border-radius: var(--radius-pill); white-space: nowrap;">
      <i class="fa-solid fa-plus"></i>
      <span>Nuevo Carrito</span>
    </button>
  `;

  // Listener para chips
  container.querySelectorAll('.cart-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const cartId = chip.dataset.cartId;
      state.setActiveCart(cartId);
    });
  });

  const btnNewCart = document.getElementById('btn-open-new-cart-modal');
  if (btnNewCart) {
    btnNewCart.addEventListener('click', openNewCartModal);
  }
}

export function renderCartItems() {
  const container = document.getElementById('cart-items-container');
  const banner = document.getElementById('checkout-banner');
  if (!container) return;

  const activeCart = state.getActiveCart();
  const totalItems = activeCart.items.length;
  const boughtItems = activeCart.items.filter(i => i.bought);
  const pendingItems = activeCart.items.filter(i => !i.bought);

  // Actualizar banner de checkout
  if (banner) {
    const culinaryBought = boughtItems.filter(i => i.isCulinary).length;
    document.getElementById('stat-total-bought').textContent = `${boughtItems.length} / ${totalItems}`;
    document.getElementById('stat-culinary-count').textContent = culinaryBought;

    const btnCheckout = document.getElementById('btn-open-checkout');
    if (btnCheckout) {
      btnCheckout.disabled = boughtItems.length === 0;
      if (boughtItems.length === 0) {
        btnCheckout.style.opacity = '0.5';
        btnCheckout.style.cursor = 'not-allowed';
      } else {
        btnCheckout.style.opacity = '1';
        btnCheckout.style.cursor = 'pointer';
      }
    }
  }

  if (totalItems === 0) {
    container.innerHTML = `
      <div class="card" style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted);">
        <i class="fa-solid fa-basket-shopping" style="font-size: 2.5rem; margin-bottom: 0.75rem; color: var(--border-hover);"></i>
        <h3 style="font-size: 1.1rem; color: var(--text-main); margin-bottom: 0.3rem;">Tu carrito está vacío</h3>
        <p style="font-size: 0.85rem;">Escribe arriba o pega una lista de WhatsApp para empezar a tachar.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = activeCart.items.map(item => {
    const meta = CATEGORY_METADATA[item.category] || CATEGORY_METADATA.general;
    const isCulinary = item.isCulinary;
    const pillClass = isCulinary ? 'pill-culinary' : 'pill-non-food';
    const pillText = isCulinary ? 'Cocina' : 'Hogar / Bazar';

    return `
      <div class="cart-item-row ${item.bought ? 'bought' : ''}" data-item-id="${item.id}">
        <div class="item-left">
          <div class="item-checkbox" data-action="toggle">
            <i class="fa-solid fa-check" style="font-size: 0.75rem;"></i>
          </div>
          <div class="item-info">
            <span class="item-name">${item.name}</span>
            <div class="item-meta">
              <span class="pill ${pillClass}">
                <i class="fa-solid ${meta.icon}"></i>
                ${pillText}
              </span>
              <span>${meta.label}</span>
            </div>
          </div>
        </div>
        <div class="item-right">
          <button class="btn btn-secondary btn-icon" data-action="delete" title="Eliminar del carrito" style="color: var(--text-muted);">
            <i class="fa-solid fa-trash-can" style="font-size: 0.85rem;"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Eventos de filas
  container.querySelectorAll('.cart-item-row').forEach(row => {
    const itemId = row.dataset.itemId;
    
    // Toggle check
    row.querySelector('[data-action="toggle"]').addEventListener('click', (e) => {
      e.stopPropagation();
      state.toggleItemBought(itemId);
    });

    // Delete
    row.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
      e.stopPropagation();
      state.removeItemFromCart(itemId);
      notifications.info('Artículo eliminado');
    });
  });
}

function bindCartEvents() {
  const inputQuick = document.getElementById('input-quick-add');
  const btnQuickAdd = document.getElementById('btn-quick-add');
  const btnOpenPaste = document.getElementById('btn-open-paste-modal');
  const btnCheckout = document.getElementById('btn-open-checkout');

  if (inputQuick && btnQuickAdd) {
    const handleAdd = () => {
      const val = inputQuick.value.trim();
      if (!val) return;
      state.addItemToCart(val);
      inputQuick.value = '';
      notifications.success(`Añadido: "${val}"`);
    };

    btnQuickAdd.addEventListener('click', handleAdd);
    inputQuick.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleAdd();
    });
  }

  if (btnOpenPaste) {
    btnOpenPaste.addEventListener('click', openPasteModal);
  }

  if (btnCheckout) {
    btnCheckout.addEventListener('click', openCheckoutModal);
  }
}

// Modal para Crear Nuevo Carrito
function openNewCartModal() {
  const modal = document.getElementById('modal-new-cart');
  if (!modal) return;
  modal.classList.add('active');

  const btnClose = modal.querySelector('[data-action="close"]');
  const btnSave = document.getElementById('btn-save-new-cart');
  const inputName = document.getElementById('new-cart-name');
  const selectType = document.getElementById('new-cart-type');

  const closeModal = () => modal.classList.remove('active');
  btnClose.onclick = closeModal;

  btnSave.onclick = () => {
    const name = inputName.value.trim();
    if (!name) return;
    state.createCart(name, selectType.value);
    inputName.value = '';
    closeModal();
    notifications.success(`Carrito "${name}" creado`);
  };
}

// Modal Pegar Lista de WhatsApp
function openPasteModal() {
  const modal = document.getElementById('modal-paste-list');
  if (!modal) return;
  modal.classList.add('active');

  const btnClose = modal.querySelector('[data-action="close"]');
  const btnParse = document.getElementById('btn-parse-paste');
  const textarea = document.getElementById('paste-text-input');

  const closeModal = () => modal.classList.remove('active');
  btnClose.onclick = closeModal;

  btnParse.onclick = () => {
    const text = textarea.value.trim();
    if (!text) return;

    // Procesar lineas o comas
    const lines = text.split(/[\n,]+/).map(l => l.replace(/^[-*•\d.)\s]+/, '').trim()).filter(l => l.length > 1);
    lines.forEach(item => {
      state.addItemToCart(item);
    });

    textarea.value = '';
    closeModal();
    notifications.success(`¡${lines.length} productos añadidos y clasificados!`);
  };
}

// Modal Guiado de "Finalizar Compra"
function openCheckoutModal() {
  const modal = document.getElementById('modal-checkout');
  if (!modal) return;
  modal.classList.add('active');

  const activeCart = state.getActiveCart();
  const boughtCulinary = activeCart.items.filter(i => i.bought && i.isCulinary);
  const boughtNonFood = activeCart.items.filter(i => i.bought && !i.isCulinary);
  const pendingItems = activeCart.items.filter(i => !i.bought);

  // Renderizar 3 bloques explicativos
  const elCulinary = document.getElementById('checkout-list-culinary');
  const elNonFood = document.getElementById('checkout-list-nonfood');
  const elPending = document.getElementById('checkout-list-pending');

  elCulinary.innerHTML = boughtCulinary.length === 0 ? '<p style="font-size:0.8rem; color:var(--text-muted);">Ningún alimento culinario comprado.</p>' :
    boughtCulinary.map(i => `<div style="font-size:0.85rem; padding:0.25rem 0;"><i class="fa-solid fa-circle-check" style="color:var(--color-culinary); margin-right:0.4rem;"></i>${i.name}</div>`).join('');

  elNonFood.innerHTML = boughtNonFood.length === 0 ? '<p style="font-size:0.8rem; color:var(--text-muted);">Ningún producto de hogar/bazar comprado.</p>' :
    boughtNonFood.map(i => `<div style="font-size:0.85rem; padding:0.25rem 0;"><i class="fa-solid fa-box-archive" style="color:var(--color-non-food); margin-right:0.4rem;"></i>${i.name}</div>`).join('');

  elPending.innerHTML = pendingItems.length === 0 ? '<p style="font-size:0.8rem; color:var(--text-muted);">¡Compraste todo lo de la lista!</p>' :
    pendingItems.map(i => `<div style="font-size:0.85rem; padding:0.25rem 0; color:var(--text-muted);"><i class="fa-regular fa-clock" style="margin-right:0.4rem;"></i>${i.name} (se queda en la lista)</div>`).join('');

  const btnClose = modal.querySelector('[data-action="close"]');
  const btnConfirm = document.getElementById('btn-confirm-checkout-transfer');

  const closeModal = () => modal.classList.remove('active');
  btnClose.onclick = closeModal;

  btnConfirm.onclick = () => {
    const res = state.confirmPurchaseCheckout(activeCart.id);
    closeModal();
    notifications.success(`¡Compra finalizada! ${res.culinaryAdded} alimentos transferidos a tu Despensa virtual.`);
  };
}
