// static/js/app.js
// Punto de entrada principal y enrutador de vistas de la maqueta Rezcart

import { state } from './core/state.js';
import { calculateFreshness } from './core/formatters.js';
import { initCartsModule, renderCartChips, renderCartItems } from './modules/carts.js';
import { initPantryModule, renderPantryItems, renderCheckinWidget } from './modules/pantry.js';
import { initVisionScannerModule } from './modules/vision_scanner.js';
import { initRecipesModule, renderRecipes, openChefAiModal } from './modules/recipes.js';
import { initHouseholdModule, renderDietaryTags } from './modules/household.js';

document.addEventListener('DOMContentLoaded', () => {
  // Inicializar modulos
  initCartsModule();
  initPantryModule();
  initVisionScannerModule();
  initRecipesModule();
  initHouseholdModule();

  // Enrutar pestañas
  bindNavigation();

  // Inicializar componente distintivo: Pulso de Cocina
  updateKitchenVitalityBar();
  bindVitalityActions();

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

  // 2. Recetas 100% cocinables al vuelo
  const pantryNames = state.pantry.map(p => p.name.toLowerCase());
  let readyRecipes = 0;
  state.recipes.forEach(r => {
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
}

function bindVitalityActions() {
  const btnSuggest = document.getElementById('btn-vitality-suggest');
  if (btnSuggest) {
    btnSuggest.addEventListener('click', () => {
      openChefAiModal();
    });
  }
}

