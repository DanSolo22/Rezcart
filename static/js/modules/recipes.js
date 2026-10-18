// static/js/modules/recipes.js
// Motor de recomendacion de recetas segun despensa real y asistente Chef IA

import { state } from '../core/state.js';
import { notifications } from '../core/ui_notifications.js';

let recipeFilter = 'all'; // 'all', 'ready', 'almost'

export function initRecipesModule() {
  renderRecipeFilterButtons();
  renderRecipes();
  bindRecipeEvents();
}

export function renderRecipeFilterButtons() {
  const container = document.getElementById('recipe-filter-buttons');
  if (!container) return;

  const filters = [
    { key: 'all', label: 'Todas las Recetas', icon: 'fa-book-open' },
    { key: 'ready', label: '100% Cocinables (Tienes Todo)', icon: 'fa-circle-check', color: 'var(--color-culinary)' },
    { key: 'almost', label: 'Casi Listas (Falta 1)', icon: 'fa-wand-magic-sparkles', color: 'var(--color-warning)' }
  ];

  container.innerHTML = filters.map(f => {
    const isActive = recipeFilter === f.key;
    return `
      <button class="pill ${isActive ? 'pill-culinary' : ''}" style="cursor: pointer; border: 1px solid var(--border-subtle); background: ${isActive ? 'var(--bg-culinary-pill)' : 'var(--bg-card)'};" data-filter="${f.key}">
        <i class="fa-solid ${f.icon}" style="${f.color ? `color:${f.color};` : ''}"></i>
        ${f.label}
      </button>
    `;
  }).join('');

  container.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      recipeFilter = btn.dataset.filter;
      renderRecipeFilterButtons();
      renderRecipes();
    });
  });
}

export function renderRecipes() {
  const container = document.getElementById('recipes-grid-container');
  if (!container) return;

  // Ingredientes en despensa normalizados a minusculas
  const pantryNames = state.pantry.map(p => p.name.toLowerCase());

  // Evaluar compatibilidad de cada receta
  const processed = state.recipes.map(recipe => {
    const totalIngredients = recipe.ingredients.length;
    let availableCount = 0;
    const ingredientsStatus = recipe.ingredients.map(ing => {
      const cleanIng = ing.toLowerCase();
      // Ver si algun item de la despensa coincide
      const has = pantryNames.some(p => p.includes(cleanIng) || cleanIng.includes(p.split(' ')[0]));
      if (has) availableCount++;
      return { name: ing, have: has };
    });

    const is100 = availableCount === totalIngredients;
    const isAlmost = availableCount === totalIngredients - 1;
    const missing = ingredientsStatus.filter(i => !i.have).map(i => i.name);

    return {
      ...recipe,
      availableCount,
      totalIngredients,
      is100,
      isAlmost,
      missing,
      ingredientsStatus
    };
  });

  // Filtrar por restricciones dieteticas si las hay
  let filtered = processed;
  if (state.dietaryFilters.length > 0) {
    filtered = filtered.filter(r => {
      // Debe cumplir todas las restricciones seleccionadas
      return state.dietaryFilters.every(diet => r.dietary.includes(diet));
    });
  }

  // Filtrar por pestañas (100% vs Casi listas)
  if (recipeFilter === 'ready') {
    filtered = filtered.filter(r => r.is100);
  } else if (recipeFilter === 'almost') {
    filtered = filtered.filter(r => r.isAlmost);
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 2.5rem 1rem; color: var(--text-muted);">
        <i class="fa-solid fa-utensils" style="font-size: 2.5rem; margin-bottom: 0.75rem; color: var(--border-hover);"></i>
        <h3 style="font-size: 1.1rem; color: var(--text-main); margin-bottom: 0.3rem;">No hay recetas que coincidan con los filtros</h3>
        <p style="font-size: 0.85rem;">Prueba a quitar restricciones dietéticas o pulsa el botón "Chef IA" para inventar un plato con lo que tengas.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(r => {
    let statusBadge = '';
    if (r.is100) {
      statusBadge = `<span class="pill pill-culinary"><i class="fa-solid fa-circle-check"></i> 100% Cocinable</span>`;
    } else if (r.isAlmost) {
      statusBadge = `<span class="pill pill-warning"><i class="fa-solid fa-triangle-exclamation"></i> Falta 1 ingrediente</span>`;
    } else {
      statusBadge = `<span class="pill pill-depleted"><i class="fa-solid fa-xmark"></i> Faltan ${r.totalIngredients - r.availableCount}</span>`;
    }

    return `
      <div class="recipe-card" data-recipe-id="${r.id}">
        <div class="recipe-header">
          <h3 class="recipe-title">${r.title}</h3>
          ${statusBadge}
        </div>

        <div class="recipe-body">
          <p style="font-size: 0.85rem; color: var(--text-muted);">${r.description}</p>
          
          <div class="recipe-meta-row">
            <span><i class="fa-regular fa-clock"></i> ${r.time}</span>
            <span><i class="fa-solid fa-gauge-simple"></i> ${r.difficulty}</span>
            ${r.dietary.map(d => `<span class="pill pill-culinary" style="font-size:0.7rem; padding:0.15rem 0.5rem;">${d.replace('_', ' ')}</span>`).join('')}
          </div>

          <div class="recipe-ingredients-preview">
            <strong style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 0.35rem;">Ingredientes:</strong>
            ${r.ingredientsStatus.map(ing => `
              <span class="ingredient-tag ${ing.have ? 'tag-have' : 'tag-missing'}">
                <i class="fa-solid ${ing.have ? 'fa-check' : 'fa-xmark'}"></i>
                ${ing.name}
              </span>
            `).join('')}
          </div>

          ${r.missingFallback ? `
            <div style="background: var(--bg-ai-pill); border: 1px solid var(--border-ai); border-radius: var(--radius-sm); padding: 0.5rem 0.75rem; font-size: 0.75rem; color: var(--color-ai-dark);">
              <i class="fa-solid fa-sparkles"></i> <strong>Sustitución IA:</strong> ${r.missingFallback}
            </div>
          ` : ''}
        </div>

        <div class="recipe-footer">
          <button class="btn btn-secondary btn-sm" data-action="view-steps">
            <i class="fa-solid fa-list-check"></i>
            <span>Ver Pasos</span>
          </button>
          ${!r.is100 ? `
            <button class="btn btn-primary btn-sm" data-action="add-missing" data-missing="${r.missing.join(', ')}">
              <i class="fa-solid fa-cart-plus"></i>
              <span>Añadir faltante al carrito</span>
            </button>
          ` : `
            <button class="btn btn-primary btn-sm" data-action="cook-now">
              <i class="fa-solid fa-fire-burner"></i>
              <span>¡Cocinar ahora!</span>
            </button>
          `}
        </div>
      </div>
    `;
  }).join('');

  // Eventos de botones de receta
  container.querySelectorAll('.recipe-card').forEach(card => {
    const btnAddMissing = card.querySelector('[data-action="add-missing"]');
    if (btnAddMissing) {
      btnAddMissing.addEventListener('click', () => {
        const missing = btnAddMissing.dataset.missing;
        state.addItemToCart(missing);
        notifications.success(`Añadido al carrito: "${missing}"`);
      });
    }

    const btnCook = card.querySelector('[data-action="cook-now"]');
    if (btnCook) {
      btnCook.addEventListener('click', () => {
        notifications.success('¡Buen provecho! Receta lista para cocinar.');
      });
    }

    const btnSteps = card.querySelector('[data-action="view-steps"]');
    if (btnSteps) {
      btnSteps.addEventListener('click', () => {
        notifications.info('Pasos de receta detallados en la maqueta.');
      });
    }
  });
}

function bindRecipeEvents() {
  const btnChefAi = document.getElementById('btn-open-chef-ai-modal');
  if (btnChefAi) {
    btnChefAi.addEventListener('click', openChefAiModal);
  }
}

// Modal Chef IA Improvisador
function openChefAiModal() {
  const modal = document.getElementById('modal-chef-ai');
  if (!modal) return;
  modal.classList.add('active');

  const btnClose = modal.querySelector('[data-action="close"]');
  const btnGenerate = document.getElementById('btn-generate-ai-recipe');
  const resultsDiv = document.getElementById('chef-ai-results');

  const closeModal = () => modal.classList.remove('active');
  btnClose.onclick = closeModal;

  btnGenerate.onclick = () => {
    btnGenerate.disabled = true;
    btnGenerate.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Analizando despensa...`;

    setTimeout(() => {
      btnGenerate.disabled = false;
      btnGenerate.innerHTML = `<i class="fa-solid fa-sparkles"></i> Proponer Nueva Receta`;

      // Simular propuesta a medida
      resultsDiv.innerHTML = `
        <div class="card" style="border: 1px solid var(--border-ai); background: #fafafa;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
            <h4 style="color:var(--color-ai-dark); font-size:1.05rem;"><i class="fa-solid fa-sparkles"></i> Salteado Rápido "Rescate de Despensa"</h4>
            <span class="pill pill-culinary">18 min</span>
          </div>
          <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.6rem;">
            Hemos aprovechado tu <strong>pechuga de pollo</strong> y las <strong>espinacas</strong> (que llevan varios días en la nevera) combinándolas con tus <strong>huevos camperos</strong> y un toque de parmesano crujiente.
          </p>
          <div style="font-size:0.8rem; background:var(--bg-card); padding:0.6rem; border-radius:var(--radius-sm); border:1px solid var(--border-subtle);">
            <strong>Consejo de sustitución:</strong> Si no quieres usar pollo, sustitúyelo por dados de tofu o champiñones salteados con el mismo tiempo de cocción.
          </div>
        </div>
      `;
      notifications.info('¡Chef IA ha ideado un plato para gastar tus alimentos frescos!');
    }, 700);
  };
}
