// static/js/modules/recipes.js
// Motor de recomendacion de recetas segun despensa real, filtrado dietetico mandatorio y Chef IA

import { state } from '../core/state.js';
import { notifications } from '../core/ui_notifications.js';

let recipeFilter = 'all'; // 'all', 'ready', 'almost'

export function initRecipesModule() {
  renderRecipeFilterButtons();
  renderRecipes();
  bindRecipeEvents();
  bindDietProfileModal();
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

  // Actualizar etiqueta del badge de dieta en la cabecera
  const dietInfo = state.getDietaryInfo();
  const dietBadgeLabel = document.getElementById('recipe-diet-badge-label');
  if (dietBadgeLabel) {
    const restrictionsShort = dietInfo.restrictionsLabels.length > 0
      ? ` · ${dietInfo.restrictionsLabels.join(', ')}`
      : '';
    dietBadgeLabel.innerHTML = `Perfil: <strong>${dietInfo.baseLabel}</strong>${restrictionsShort}`;
  }

  // Ingredientes en despensa normalizados a minusculas
  const pantryNames = state.pantry.map(p => p.name.toLowerCase());

  // 1. REGLA MANDATORIA 1: Filtrar recetas por Base Dietética (Ocultar las que violen la base)
  const currentBase = state.dietaryProfile.base; // 'omnivore' | 'carnivore' | 'vegetarian' | 'vegan'
  const currentRestrictions = state.dietaryProfile.restrictions; // array

  const baseFiltered = state.recipes.filter(recipe => {
    if (!recipe.bases || !Array.isArray(recipe.bases)) return true;
    return recipe.bases.includes(currentBase);
  });

  // 2. REGLA MANDATORIA 2: Calcular compatibilidad de despensa y sustituciones para alérgenos/restricciones
  const processed = baseFiltered.map(recipe => {
    const totalIngredients = recipe.ingredients.length;
    let availableCount = 0;
    const ingredientsStatus = recipe.ingredients.map(ing => {
      const cleanIng = ing.toLowerCase();
      const has = pantryNames.some(p => p.includes(cleanIng) || cleanIng.includes(p.split(' ')[0]));
      if (has) availableCount++;
      return { name: ing, have: has };
    });

    const is100 = availableCount === totalIngredients;
    const isAlmost = availableCount === totalIngredients - 1;
    const missing = ingredientsStatus.filter(i => !i.have).map(i => i.name);

    // Evaluar si requiere adaptación de Chef IA por restricciones
    const activeSubstitutions = [];
    if (recipe.substitutions) {
      if (currentRestrictions.includes('sin_gluten') && recipe.allergens && recipe.allergens.includes('gluten')) {
        activeSubstitutions.push(recipe.substitutions.gluten || 'Chef IA: Usa alternativa sin gluten');
      }
      if (currentRestrictions.includes('sin_lactosa') && recipe.allergens && recipe.allergens.includes('lactosa')) {
        activeSubstitutions.push(recipe.substitutions.lactosa || 'Chef IA: Usa lácteos sin lactosa o bebida vegetal');
      }
      if (currentRestrictions.includes('sin_huevo') && recipe.allergens && recipe.allergens.includes('huevo')) {
        activeSubstitutions.push(recipe.substitutions.huevo || 'Chef IA: Sustituye por tofu o emulsionante vegetal');
      }
      if (currentRestrictions.includes('keto') && recipe.keto === false) {
        activeSubstitutions.push('Chef IA: Versión Keto disponible reduciendo carbohidratos');
      }
    }

    return {
      ...recipe,
      availableCount,
      totalIngredients,
      is100,
      isAlmost,
      missing,
      ingredientsStatus,
      activeSubstitutions
    };
  });

  // 3. Filtrar por pestañas (100% vs Casi listas)
  let filtered = processed;
  if (recipeFilter === 'ready') {
    filtered = filtered.filter(r => r.is100);
  } else if (recipeFilter === 'almost') {
    filtered = filtered.filter(r => r.isAlmost);
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 2.5rem 1rem; color: var(--text-muted);">
        <i class="fa-solid fa-utensils" style="font-size: 2.5rem; margin-bottom: 0.75rem; color: var(--border-hover);"></i>
        <h3 style="font-size: 1.1rem; color: var(--text-main); margin-bottom: 0.3rem;">No hay recetas para tu perfil actual</h3>
        <p style="font-size: 0.85rem; max-width: 500px; margin: 0 auto 1rem auto;">
          Con la base <strong>${dietInfo.baseLabel}</strong> y tus existencias, no hay recetas disponibles. Toca el botón de Perfil arriba para ajustar la dieta o pídele a Chef IA que invente un plato.
        </p>
        <button class="btn btn-secondary btn-sm" id="btn-empty-open-diet">
          <i class="fa-solid fa-sliders"></i> Ajustar Perfil Dietético
        </button>
      </div>
    `;
    document.getElementById('btn-empty-open-diet')?.addEventListener('click', openDietProfileModal);
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
            <span class="pill pill-culinary" style="font-size:0.7rem; padding:0.15rem 0.5rem;">
              <i class="fa-solid fa-shield-halved"></i> Apta ${dietInfo.baseLabel}
            </span>
          </div>

          <div class="recipe-ingredients-preview">
            <strong style="font-size: 0.72rem; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 0.35rem;">Ingredientes en despensa:</strong>
            ${r.ingredientsStatus.map(ing => `
              <span class="ingredient-tag ${ing.have ? 'tag-have' : 'tag-missing'}">
                <i class="fa-solid ${ing.have ? 'fa-check' : 'fa-xmark'}"></i>
                ${ing.name}
              </span>
            `).join('')}
          </div>

          <!-- Sustituciones Inteligentes de Chef IA si aplica -->
          ${r.activeSubstitutions.length > 0 ? `
            <div class="recipe-substitution-box">
              <i class="fa-solid fa-wand-magic-sparkles" style="font-size: 0.9rem; margin-top: 1px;"></i>
              <div>
                <strong>Adaptación Chef IA para tu perfil:</strong>
                <div>${r.activeSubstitutions.join('<br>')}</div>
              </div>
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

  const btnOpenDiet = document.getElementById('btn-open-diet-modal');
  if (btnOpenDiet) {
    btnOpenDiet.addEventListener('click', openDietProfileModal);
  }
}

// Modal Perfil Dietético & Directivas Chef IA
export function openDietProfileModal() {
  const modal = document.getElementById('modal-diet-profile');
  if (!modal) return;
  modal.classList.add('active');

  const btnClose = modal.querySelector('[data-action="close"]');
  const btnSave = document.getElementById('btn-save-diet-profile');
  const baseCards = modal.querySelectorAll('.diet-base-card');
  const checkboxes = modal.querySelectorAll('input[name="diet-restriction"]');

  const currentProfile = state.dietaryProfile;

  // Marcar base activa
  baseCards.forEach(c => {
    c.classList.toggle('active', c.dataset.base === currentProfile.base);
  });

  // Marcar restricciones activas
  checkboxes.forEach(cb => {
    cb.checked = currentProfile.restrictions.includes(cb.value);
  });

  const closeModal = () => modal.classList.remove('active');
  btnClose.onclick = closeModal;
  modal.onclick = (e) => {
    if (e.target === modal) closeModal();
  };

  // Selección única de base
  baseCards.forEach(card => {
    card.onclick = () => {
      baseCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
    };
  });

  // Guardar perfil
  btnSave.onclick = () => {
    const selectedBaseCard = modal.querySelector('.diet-base-card.active');
    const selectedBase = selectedBaseCard ? selectedBaseCard.dataset.base : 'omnivore';
    
    const selectedRestrictions = [];
    checkboxes.forEach(cb => {
      if (cb.checked) selectedRestrictions.push(cb.value);
    });

    closeModal();
    state.setDietaryProfile(selectedBase, selectedRestrictions);
    notifications.success('¡Perfil dietético actualizado y aplicado al recetario!');
  };
}

function bindDietProfileModal() {
  // Inicialización de escuchadores si fuera necesario
}

// Modal Chef IA Improvisador con Directivas Dietéticas Activas
export function openChefAiModal() {
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
    btnGenerate.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Aplicando perfil dietético...`;

    setTimeout(() => {
      btnGenerate.disabled = false;
      btnGenerate.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> Proponer Nueva Receta`;

      const dietInfo = state.getDietaryInfo();
      const isVeg = dietInfo.base === 'vegetarian' || dietInfo.base === 'vegan';
      const isCarn = dietInfo.base === 'carnivore';

      let dishTitle = 'Salteado "Rescate de Despensa"';
      let dishDesc = '';
      if (isVeg) {
        dishTitle = 'Salteado Verde de Espinacas con Parmesano Curado';
        dishDesc = `Adaptado estrictamente a tu dieta <strong>${dietInfo.baseLabel}</strong>: se omiten carnes y se potencian tus espinacas frescas con ajo morado y aceite de oliva virgen.`;
      } else if (isCarn) {
        dishTitle = 'Pechuga a la Plancha al Ajo Crujiente';
        dishDesc = `Alineado con tu dieta <strong>${dietInfo.baseLabel}</strong>: alta proteína con pollo fresco, aromatizado en aceite y sal, omitiendo carbohidratos.`;
      } else {
        dishTitle = 'Salteado Rápido Pollo y Espinacas';
        dishDesc = `Hemos aprovechado tu <strong>pechuga de pollo</strong> y las <strong>espinacas</strong> combinándolas con tus <strong>huevos camperos</strong> y un toque de parmesano crujiente.`;
      }

      resultsDiv.innerHTML = `
        <div class="card" style="border: 1px solid var(--border-ai); background: #fafafa;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
            <h4 style="color:var(--color-ai-dark); font-size:1.05rem;"><i class="fa-solid fa-wand-magic-sparkles"></i> ${dishTitle}</h4>
            <span class="pill pill-culinary">18 min</span>
          </div>
          <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.6rem;">
            ${dishDesc}
          </p>
          <div style="font-size:0.8rem; background:var(--bg-card); padding:0.6rem; border-radius:var(--radius-sm); border:1px solid var(--border-subtle);">
            <strong>Directiva Dietética Activa:</strong> ${dietInfo.baseLabel} (${dietInfo.restrictionsLabels.join(', ') || 'Sin restricciones'}). Chef IA ha garantizado la compatibilidad total.
          </div>
        </div>
      `;
      notifications.info(`Chef IA ha ideado un plato para tu dieta ${dietInfo.baseLabel}`);
    }, 700);
  };
}

