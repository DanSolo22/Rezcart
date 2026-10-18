// static/js/modules/vision_scanner.js
// Doble modo de escaneo visual: 1. Nueva Compra en Encimera / 2. Auditoría de Zona

import { state } from '../core/state.js';
import { notifications } from '../core/ui_notifications.js';

export function initVisionScannerModule() {
  bindPurchasePhotoEvents();
  bindAuditPhotoEvents();
}

// --------------------------------------------------------------------------
// MODO 1: FOTO NUEVA COMPRA (Encimera / Mesa)
// --------------------------------------------------------------------------
function bindPurchasePhotoEvents() {
  const btnOpen = document.getElementById('btn-open-photo-purchase');
  const modal = document.getElementById('modal-photo-purchase');
  if (!modal) return;

  const btnClose = modal.querySelectorAll('[data-action="close"]');
  const btnSnap = document.getElementById('btn-snap-purchase-photo');
  const previewBox = document.getElementById('purchase-camera-preview');
  const detectedContainer = document.getElementById('purchase-detected-container');
  const checklist = document.getElementById('purchase-detected-checklist');
  const btnSave = document.getElementById('btn-confirm-save-purchase-photo');

  const closeModal = () => {
    modal.classList.remove('active');
    detectedContainer.style.display = 'none';
    btnSave.style.display = 'none';
    previewBox.innerHTML = `
      <div class="camera-grid-overlay"><div></div><div></div><div></div><div></div></div>
      <div style="text-align: center; color: #94a3b8;">
        <i class="fa-solid fa-camera" style="font-size: 2.2rem; margin-bottom: 0.4rem; color: #475569;"></i>
        <p style="font-size: 0.8rem;">Enfoca tu compra desembalada sobre la mesa</p>
      </div>
    `;
  };

  btnOpen?.addEventListener('click', () => modal.classList.add('active'));
  btnClose.forEach(b => b.addEventListener('click', closeModal));

  btnSnap?.addEventListener('click', () => {
    previewBox.innerHTML = `
      <div style="text-align: center; color: #ffffff;">
        <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.8rem; color: var(--color-ai); margin-bottom: 0.5rem;"></i>
        <h4 style="font-size: 0.95rem;">Escaneando compra con Gemini 1.5 Flash Vision...</h4>
        <p style="font-size: 0.75rem; color: #94a3b8;">Separando alimentos culinarios de otros productos</p>
      </div>
    `;

    setTimeout(() => {
      // Detección simulada en la imagen
      previewBox.innerHTML = `
        <div class="camera-grid-overlay"><div></div><div></div><div></div><div></div></div>
        <div class="detection-box" style="top: 20%; left: 15%;"><i class="fa-solid fa-tag"></i> Aguacates (x2)</div>
        <div class="detection-box" style="top: 25%; left: 60%; border-color:#38bdf8;"><i class="fa-solid fa-tag"></i> Leche fresca</div>
        <div class="detection-box" style="top: 60%; left: 20%; border-color:#4ade80;"><i class="fa-solid fa-tag"></i> Pechuga de pollo</div>
        <div class="detection-box" style="top: 55%; left: 65%; border-color:#f59e0b;"><i class="fa-solid fa-tag"></i> Plátanos</div>
      `;

      const detected = [
        { name: 'Aguacates maduros (pack 2)', category: 'fruits' },
        { name: 'Leche entera fresca', category: 'dairy' },
        { name: 'Pechuga de pollo fileteada', category: 'meat' },
        { name: 'Plátanos de Canarias', category: 'fruits' },
        { name: 'Mantequilla con sal', category: 'dairy' }
      ];

      checklist.innerHTML = detected.map((item, idx) => `
        <label class="card" style="padding: 0.5rem 0.75rem; display: flex; align-items: center; justify-content: space-between; cursor: pointer; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm);">
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <input type="checkbox" checked data-idx="${idx}" data-name="${item.name}" style="width: 17px; height: 17px; accent-color: var(--color-culinary); cursor: pointer;">
            <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-main);">${item.name}</span>
          </div>
          <span class="pill pill-culinary" style="font-size: 0.7rem;">Culinario</span>
        </label>
      `).join('');

      detectedContainer.style.display = 'block';
      btnSave.style.display = 'inline-flex';
      notifications.info('¡Compra escaneada! 5 alimentos detectados para revisar.');
    }, 800);
  });

  btnSave?.addEventListener('click', () => {
    const checkedBoxes = checklist.querySelectorAll('input[type="checkbox"]:checked');
    let addedCount = 0;
    checkedBoxes.forEach(cb => {
      const name = cb.dataset.name;
      state.applyVisionReconciliation([name], [], []);
      addedCount++;
    });

    closeModal();
    notifications.success(`¡${addedCount} alimentos de tu compra guardados en la despensa!`);
  });
}

// --------------------------------------------------------------------------
// MODO 2: AUDITORÍA DE ZONA (Nevera, Despensa seca, Frutero)
// --------------------------------------------------------------------------
function bindAuditPhotoEvents() {
  const btnOpen = document.getElementById('btn-open-photo-audit');
  const modal = document.getElementById('modal-photo-audit');
  if (!modal) return;

  const btnClose = modal.querySelectorAll('[data-action="close"]');
  const btnSnap = document.getElementById('btn-snap-audit-photo');
  const previewBox = document.getElementById('audit-camera-preview');
  const resultsContainer = document.getElementById('audit-results-container');
  const btnApply = document.getElementById('btn-apply-audit-recon');
  const zoneSelect = document.getElementById('audit-zone-select');

  const closeModal = () => {
    modal.classList.remove('active');
    resultsContainer.style.display = 'none';
    btnApply.style.display = 'none';
    previewBox.innerHTML = `
      <div class="camera-grid-overlay"><div></div><div></div><div></div><div></div></div>
      <div style="text-align: center; color: #94a3b8;">
        <i class="fa-solid fa-camera" style="font-size: 2.2rem; margin-bottom: 0.4rem; color: #475569;"></i>
        <p style="font-size: 0.8rem;">Enfoca las baldas de tu zona seleccionada</p>
      </div>
    `;
  };

  btnOpen?.addEventListener('click', () => modal.classList.add('active'));
  btnClose.forEach(b => b.addEventListener('click', closeModal));

  btnSnap?.addEventListener('click', () => {
    const zoneName = zoneSelect.options[zoneSelect.selectedIndex].text;

    previewBox.innerHTML = `
      <div style="text-align: center; color: #ffffff;">
        <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.8rem; color: var(--color-warning); margin-bottom: 0.5rem;"></i>
        <h4 style="font-size: 0.95rem;">Auditando ${zoneName}...</h4>
        <p style="font-size: 0.75rem; color: #94a3b8;">Comparando existencias reales con la despensa</p>
      </div>
    `;

    setTimeout(() => {
      previewBox.innerHTML = `
        <div class="camera-grid-overlay"><div></div><div></div><div></div><div></div></div>
        <div class="detection-box" style="top: 30%; left: 20%;"><i class="fa-solid fa-check"></i> Huevos camperos</div>
        <div class="detection-box" style="top: 35%; left: 60%; border-color:#38bdf8;"><i class="fa-solid fa-check"></i> Aceite oliva</div>
        <div class="detection-box" style="top: 65%; left: 40%; border-color:#f59e0b;"><i class="fa-solid fa-plus"></i> Queso gouda</div>
      `;

      // Renderizar 3 columnas
      document.getElementById('audit-col-new').innerHTML = `
        <div class="recon-item-card" style="font-size:0.75rem;">
          <span>Queso gouda cuña</span>
          <span class="pill pill-ai">+ Añadir</span>
        </div>
      `;

      document.getElementById('audit-col-confirmed').innerHTML = `
        <div class="recon-item-card" style="font-size:0.75rem;">
          <span>Huevos camperos</span>
          <span class="pill pill-culinary">Confirmado</span>
        </div>
        <div class="recon-item-card" style="font-size:0.75rem;">
          <span>Aceite de oliva</span>
          <span class="pill pill-culinary">Confirmado</span>
        </div>
      `;

      document.getElementById('audit-col-missing').innerHTML = `
        <div class="recon-item-card" style="font-size:0.75rem; border-left:3px solid var(--color-warning);">
          <span>Espinacas frescas</span>
          <span class="pill pill-warning">Gastado</span>
        </div>
      `;

      resultsContainer.style.display = 'block';
      btnApply.style.display = 'inline-flex';
      notifications.info(`¡Auditoría de ${zoneName} completada!`);
    }, 800);
  });

  btnApply?.addEventListener('click', () => {
    const newItems = ['Queso gouda cuña'];
    const confirmedIds = state.pantry.filter(p => p.name.includes('Huevos') || p.name.includes('Aceite')).map(p => p.id);
    const missingIds = state.pantry.filter(p => p.name.includes('Espinacas')).map(p => p.id);

    state.applyVisionReconciliation(newItems, confirmedIds, missingIds);
    closeModal();
    notifications.success('¡Despensa actualizada tras la auditoría visual!');
  });
}
