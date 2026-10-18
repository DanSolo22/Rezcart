// static/js/app.js
// Punto de entrada principal y enrutador de vistas de la maqueta Rezcart

import { state } from './core/state.js';
import { initCartsModule, renderCartChips, renderCartItems } from './modules/carts.js';
import { initPantryModule, renderPantryItems, renderCheckinWidget } from './modules/pantry.js';
import { initVisionScannerModule } from './modules/vision_scanner.js';
import { initRecipesModule, renderRecipes } from './modules/recipes.js';
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

  // Re-render reactivo cuando el estado cambie
  state.subscribe(() => {
    renderCartChips();
    renderCartItems();
    renderPantryItems();
    renderCheckinWidget();
    renderRecipes();
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
