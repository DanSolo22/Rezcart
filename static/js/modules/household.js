// static/js/modules/household.js
// Gestion de perfiles dieteticos, alergias y preferencias del hogar

import { state } from '../core/state.js';
import { notifications } from '../core/ui_notifications.js';

export function initHouseholdModule() {
  renderDietaryTags();
}

export function renderDietaryTags() {
  const container = document.getElementById('dietary-pills-container');
  if (!container) return;

  const diets = [
    { key: 'sin_gluten', label: 'Sin Gluten (Celíaco)', icon: 'fa-wheat-awn-circle-exclamation' },
    { key: 'sin_lactosa', label: 'Sin Lactosa', icon: 'fa-cow' },
    { key: 'vegano', label: '100% Vegano', icon: 'fa-seedling' },
    { key: 'vegetariano', label: 'Vegetariano', icon: 'fa-leaf' },
    { key: 'keto', label: 'Keto / Low Carb', icon: 'fa-fire' }
  ];

  container.innerHTML = diets.map(d => {
    const isChecked = state.dietaryFilters.includes(d.key);
    return `
      <div class="card" style="padding: 0.85rem 1rem; display: flex; align-items: center; justify-content: space-between; cursor: pointer; border-color: ${isChecked ? 'var(--color-culinary)' : 'var(--border-subtle)'}; background: ${isChecked ? 'var(--bg-culinary-pill)' : 'var(--bg-card)'};" data-diet="${d.key}">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <i class="fa-solid ${d.icon}" style="font-size: 1.1rem; color: ${isChecked ? 'var(--color-culinary)' : 'var(--text-muted)'};"></i>
          <div>
            <strong style="font-size: 0.95rem; color: var(--text-main);">${d.label}</strong>
            <p style="font-size: 0.75rem; color: var(--text-muted);">Filtrar recetas e ingredientes incompatibles</p>
          </div>
        </div>
        <div class="item-checkbox" style="${isChecked ? 'background:var(--color-culinary); border-color:var(--color-culinary); color:#ffffff;' : ''}">
          <i class="fa-solid fa-check" style="font-size: 0.75rem;"></i>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('[data-diet]').forEach(el => {
    el.addEventListener('click', () => {
      const dietKey = el.dataset.diet;
      state.toggleDietaryRestriction(dietKey);
      const isNow = state.dietaryFilters.includes(dietKey);
      notifications.info(`Filtro dietético ${isNow ? 'activado' : 'desactivado'}`);
      renderDietaryTags();
    });
  });
}
