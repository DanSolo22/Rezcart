// static/js/app.js
// Punto de entrada principal y enrutador de vistas de la maqueta Rezcart

import { state } from './core/state.js';
import { dataService } from './core/data_service.js';
import { calculateFreshness } from './core/formatters.js';
import { initCartsModule, renderCartChips, renderCartItems } from './modules/carts.js';
import { initPantryModule, renderPantryItems, renderCheckinWidget } from './modules/pantry.js';
import { initVisionScannerModule } from './modules/vision_scanner.js';
import { initRecipesModule, renderRecipes, openChefAiModal, openDietProfileModal } from './modules/recipes.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Inicializar persistencia dual IndexedDB / LocalStorage
  await state.init();

  // Inicializar módulos principales (3 vistas clave)
  initCartsModule();
  initPantryModule();
  initVisionScannerModule();
  initRecipesModule();

  // Enrutar pestañas
  bindNavigation();

  // Inicializar componente distintivo: Pulso de Cocina
  updateKitchenVitalityBar();
  bindVitalityActions();

  // Indicador de estado de sincronización dual
  bindSyncStatusIndicator();

  // Re-render reactivo cuando el estado cambie
  state.subscribe(() => {
    renderCartChips();
    renderCartItems();
    renderPantryItems();
    renderCheckinWidget();
    renderRecipes();
    updateKitchenVitalityBar();
  });
});

function bindNavigation() {
  const topTabs = document.querySelectorAll('.tab-btn');
  const bottomNavBtns = document.querySelectorAll('.mobile-nav-btn');
  const views = document.querySelectorAll('.view-section');

  function switchTab(viewId) {
    views.forEach(v => {
      v.classList.remove('active');
      if (v.id === `view-${viewId}`) {
        v.classList.add('active');
      }
    });

    topTabs.forEach(t => {
      t.classList.toggle('active', t.dataset.view === viewId);
    });

    bottomNavBtns.forEach(b => {
      b.classList.toggle('active', b.dataset.view === viewId);
    });

    state.currentView = viewId;
  }

  topTabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.view));
  });

  bottomNavBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.view));
  });
}

// ==========================================================================
// Componente Característico: Pulso de Cocina (Kitchen Vitality Strip)
// ==========================================================================
function updateKitchenVitalityBar() {
  const freshnessPctEl = document.getElementById('vitality-freshness-pct');
  const freshnessSubEl = document.getElementById('vitality-freshness-sub');
  const recipesValEl = document.getElementById('vitality-recipes-val');
  const cartValEl = document.getElementById('vitality-cart-val');
  const cartSubEl = document.getElementById('vitality-cart-sub');
  const miniGaugeEl = document.querySelector('.freshness-mini-gauge');
  const dietValEl = document.getElementById('vitality-diet-val');
  const dietSubEl = document.getElementById('vitality-diet-sub');
  const dietIconEl = document.getElementById('vitality-diet-icon');

  if (!freshnessPctEl) return;

  // 1. Frescura de Despensa
  const totalPantry = state.pantry.length;
  let optimalCount = 0;
  let warningCount = 0;

  state.pantry.forEach(item => {
    const f = calculateFreshness(item.category, item.daysAgo);
    if (f.status === 'fresh') optimalCount++;
    else if (f.status === 'warning') warningCount++;
  });

  const pct = totalPantry > 0 ? Math.round((optimalCount / totalPantry) * 100) : 100;
  freshnessPctEl.textContent = `${pct}%`;
  if (freshnessSubEl) {
    freshnessSubEl.textContent = `${optimalCount} óptimos · ${warningCount} a revisar`;
  }

  if (miniGaugeEl) {
    let gaugeSpans = '';
    for (let i = 0; i < optimalCount; i++) gaugeSpans += '<span class="seg-green"></span>';
    for (let i = 0; i < warningCount; i++) gaugeSpans += '<span class="seg-orange"></span>';
    miniGaugeEl.innerHTML = gaugeSpans;
  }

  // 2. Recetas 100% cocinables al vuelo (respetando base dietética)
  const currentBase = state.dietaryProfile.base;
  const baseAllowedRecipes = state.recipes.filter(r => !r.bases || r.bases.includes(currentBase));
  const pantryNames = state.pantry.map(p => p.name.toLowerCase());
  let readyRecipes = 0;

  baseAllowedRecipes.forEach(r => {
    const isAll = r.ingredients.every(ing => {
      const clean = ing.toLowerCase();
      return pantryNames.some(p => p.includes(clean) || clean.includes(p.split(' ')[0]));
    });
    if (isAll) readyRecipes++;
  });
  if (recipesValEl) recipesValEl.textContent = `${readyRecipes} recetas`;

  // 3. Cesta Activa
  const activeCart = state.getActiveCart();
  if (cartValEl) cartValEl.textContent = activeCart.name;
  if (cartSubEl) {
    const pending = activeCart.items.filter(i => !i.bought).length;
    cartSubEl.textContent = `${pending} productos pendientes`;
  }

  // 4. Perfil Dietético Activo
  const dietInfo = state.getDietaryInfo();
  if (dietValEl) dietValEl.textContent = dietInfo.baseLabel;
  if (dietSubEl) {
    dietSubEl.textContent = dietInfo.restrictionsLabels.length > 0
      ? dietInfo.restrictionsLabels.join(', ')
      : 'Sin alérgenos';
  }
  if (dietIconEl) {
    dietIconEl.className = `fa-solid ${dietInfo.baseIcon}`;
  }
}

function bindVitalityActions() {
  const btnSuggest = document.getElementById('btn-vitality-suggest');
  if (btnSuggest) {
    btnSuggest.addEventListener('click', () => {
      openChefAiModal();
    });
  }

  const dietChip = document.getElementById('vitality-diet-chip');
  if (dietChip) {
    dietChip.addEventListener('click', () => {
      openDietProfileModal();
    });
  }
}

function bindSyncStatusIndicator() {
  const badgeEl = document.getElementById('sync-badge-pill');
  const iconEl = document.getElementById('sync-badge-icon');
  const textEl = document.getElementById('sync-badge-text');

  if (!badgeEl || !iconEl || !textEl) return;

  function updateBadge(info) {
    badgeEl.className = 'sync-badge-pill';
    if (!info.isOnline) {
      badgeEl.classList.add('offline');
      iconEl.className = 'fa-solid fa-cloud-arrow-up';
      textEl.textContent = info.outboxCount > 0 ? `Modo Súper (${info.outboxCount} en cola)` : 'Modo Súper Offline';
    } else if (info.outboxCount > 0) {
      badgeEl.classList.add('syncing');
      iconEl.className = 'fa-solid fa-arrows-rotate fa-spin';
      textEl.textContent = `Sincronizando (${info.outboxCount})...`;
    } else {
      badgeEl.classList.add('synced');
      iconEl.className = 'fa-solid fa-cloud';
      textEl.textContent = 'IndexedDB Activo';
    }
  }

  dataService.onSyncStateChange(updateBadge);
  updateBadge({ isOnline: dataService.isOnline, outboxCount: dataService.getPendingOutboxCountSync() });
}


