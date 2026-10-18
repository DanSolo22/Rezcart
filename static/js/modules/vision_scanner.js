// static/js/modules/vision_scanner.js
// Doble modo de escaneo visual con soporte de Cámara Real en Vivo (WebRTC / getUserMedia) y fallback inteligente

import { state } from '../core/state.js';
import { notifications } from '../core/ui_notifications.js';
import { dataService } from '../core/data_service.js';

let activeCameraStream = null;

export function initVisionScannerModule() {
  bindPurchasePhotoEvents();
  bindAuditPhotoEvents();
}

// --------------------------------------------------------------------------
// GESTOR DE CÁMARA EN VIVO (WEBRTC / GETUSERMEDIA)
// --------------------------------------------------------------------------
async function startLiveCamera(videoEl, placeholderEl) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.warn('[Rezcart Cámara] getUserMedia no está disponible en este contexto. Requiere HTTPS.');
    if (placeholderEl) {
      placeholderEl.style.display = 'block';
    }
    return false;
  }

  try {
    // Solicitar cámara trasera (environment) para móvil
    activeCameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    });

    if (videoEl) {
      videoEl.srcObject = activeCameraStream;
      videoEl.style.display = 'block';
      await videoEl.play().catch(e => console.log('Autoplay play', e));
    }

    if (placeholderEl) {
      placeholderEl.style.display = 'none';
    }

    console.log('[Rezcart Cámara] Transmisión en vivo iniciada con éxito.');
    return true;
  } catch (err) {
    console.warn('[Rezcart Cámara] Permiso de cámara denegado o no disponible:', err);
    if (placeholderEl) {
      placeholderEl.style.display = 'block';
    }
    if (videoEl) {
      videoEl.style.display = 'none';
    }
    return false;
  }
}

function stopLiveCamera(videoEl, placeholderEl) {
  if (activeCameraStream) {
    activeCameraStream.getTracks().forEach(track => {
      track.stop();
      console.log('[Rezcart Cámara] Pista de cámara detenida.');
    });
    activeCameraStream = null;
  }

  if (videoEl) {
    videoEl.srcObject = null;
    videoEl.style.display = 'none';
  }

  if (placeholderEl) {
    placeholderEl.style.display = 'block';
  }
}

function captureVideoFrame(videoEl) {
  if (!videoEl || videoEl.videoWidth === 0) return null;

  const canvas = document.createElement('canvas');
  canvas.width = videoEl.videoWidth;
  canvas.height = videoEl.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85);
  });
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
  const videoEl = document.getElementById('purchase-video');
  const placeholderEl = document.getElementById('purchase-placeholder');
  const detectedContainer = document.getElementById('purchase-detected-container');
  const checklist = document.getElementById('purchase-detected-checklist');
  const btnSave = document.getElementById('btn-confirm-save-purchase-photo');

  const closeModal = () => {
    modal.classList.remove('active');
    stopLiveCamera(videoEl, placeholderEl);
    detectedContainer.style.display = 'none';
    btnSave.style.display = 'none';
    const oldOverlays = previewBox.querySelectorAll('.detection-box');
    oldOverlays.forEach(o => o.remove());
  };

  btnOpen?.addEventListener('click', async () => {
    modal.classList.add('active');
    const cameraActive = await startLiveCamera(videoEl, placeholderEl);
    if (!cameraActive) {
      notifications.info('Cámara simulada activa. En HTTPS puedes usar tu cámara física.');
    }
  });

  btnClose.forEach(b => b.addEventListener('click', closeModal));

  btnSnap?.addEventListener('click', async () => {
    // Capturar fotograma real si la cámara está activa
    let capturedBlob = null;
    if (videoEl && videoEl.srcObject) {
      capturedBlob = await captureVideoFrame(videoEl);
      if (capturedBlob) {
        capturedBlob = await dataService.compressImage(capturedBlob, 1200, 0.8);
      }
    }

    btnSnap.disabled = true;
    btnSnap.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Escaneando alimentos con IA...`;

    try {
      const detectedItems = await dataService.processVisionScan(capturedBlob, 'countertop_bulk');

      // Superponer cajas de detección de alimentos sobre la imagen
      const oldOverlays = previewBox.querySelectorAll('.detection-box');
      oldOverlays.forEach(o => o.remove());

      const overlay1 = document.createElement('div');
      overlay1.className = 'detection-box';
      overlay1.style.cssText = 'top: 20%; left: 15%;';
      overlay1.innerHTML = '<i class="fa-solid fa-tag"></i> Aguacates (x2)';

      const overlay2 = document.createElement('div');
      overlay2.className = 'detection-box';
      overlay2.style.cssText = 'top: 25%; left: 55%; border-color:#38bdf8; background:rgba(56,189,248,0.3);';
      overlay2.innerHTML = '<i class="fa-solid fa-tag"></i> Leche fresca';

      const overlay3 = document.createElement('div');
      overlay3.className = 'detection-box';
      overlay3.style.cssText = 'top: 60%; left: 20%; border-color:#4ade80; background:rgba(74,222,128,0.3);';
      overlay3.innerHTML = '<i class="fa-solid fa-tag"></i> Pechuga de pollo';

      previewBox.appendChild(overlay1);
      previewBox.appendChild(overlay2);
      previewBox.appendChild(overlay3);

      checklist.innerHTML = detectedItems.map((item, idx) => `
        <label class="card" style="padding: 0.5rem 0.75rem; display: flex; align-items: center; justify-content: space-between; cursor: pointer; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm);">
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <input type="checkbox" checked data-idx="${idx}" data-name="${item.name}" style="width: 17px; height: 17px; accent-color: var(--color-culinary); cursor: pointer;">
            <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-main);">${item.name}</span>
          </div>
          <span class="pill pill-culinary" style="font-size: 0.7rem;"><i class="fa-solid fa-leaf"></i> Culinario</span>
        </label>
      `).join('');

      detectedContainer.style.display = 'block';
      btnSave.style.display = 'inline-flex';
      btnSnap.disabled = false;
      btnSnap.innerHTML = `<i class="fa-solid fa-camera"></i> Disparar de Nuevo`;
      notifications.info(`¡Compra escaneada! ${detectedItems.length} alimentos detectados.`);
    } catch (err) {
      btnSnap.disabled = false;
      btnSnap.innerHTML = `<i class="fa-solid fa-camera"></i> Disparar y Detectar Alimentos`;
      notifications.error('Error al procesar el escaneo');
    }
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
  const videoEl = document.getElementById('audit-video');
  const placeholderEl = document.getElementById('audit-placeholder');
  const resultsContainer = document.getElementById('audit-results-container');
  const btnApply = document.getElementById('btn-apply-audit-recon');
  const zoneSelect = document.getElementById('audit-zone-select');

  const closeModal = () => {
    modal.classList.remove('active');
    stopLiveCamera(videoEl, placeholderEl);
    resultsContainer.style.display = 'none';
    btnApply.style.display = 'none';
    const oldOverlays = previewBox.querySelectorAll('.detection-box');
    oldOverlays.forEach(o => o.remove());
  };

  btnOpen?.addEventListener('click', async () => {
    modal.classList.add('active');
    const cameraActive = await startLiveCamera(videoEl, placeholderEl);
    if (!cameraActive) {
      notifications.info('Cámara simulada activa. En HTTPS puedes usar tu cámara física.');
    }
  });

  btnClose.forEach(b => b.addEventListener('click', closeModal));

  btnSnap?.addEventListener('click', async () => {
    const zoneName = zoneSelect.options[zoneSelect.selectedIndex].text;

    let capturedBlob = null;
    if (videoEl && videoEl.srcObject) {
      capturedBlob = await captureVideoFrame(videoEl);
      if (capturedBlob) {
        capturedBlob = await dataService.compressImage(capturedBlob, 1200, 0.8);
      }
    }

    btnSnap.disabled = true;
    btnSnap.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Auditando baldas de ${zoneName}...`;

    try {
      const recon = await dataService.processVisionScan(capturedBlob, 'zone_audit', zoneName);

      // Superponer cajas de detección de auditoría
      const oldOverlays = previewBox.querySelectorAll('.detection-box');
      oldOverlays.forEach(o => o.remove());

      const overlay1 = document.createElement('div');
      overlay1.className = 'detection-box';
      overlay1.style.cssText = 'top: 30%; left: 20%; border-color:var(--color-culinary);';
      overlay1.innerHTML = '<i class="fa-solid fa-check"></i> Huevos camperos';

      const overlay2 = document.createElement('div');
      overlay2.className = 'detection-box';
      overlay2.style.cssText = 'top: 35%; left: 60%; border-color:#38bdf8;';
      overlay2.innerHTML = '<i class="fa-solid fa-check"></i> Aceite oliva';

      previewBox.appendChild(overlay1);
      previewBox.appendChild(overlay2);

      // Renderizar 3 columnas
      document.getElementById('audit-col-new').innerHTML = `
        <div class="recon-item-card" style="font-size:0.75rem;">
          <span>Queso gouda cuña</span>
          <span class="pill pill-ai"><i class="fa-solid fa-plus"></i> Añadir</span>
        </div>
      `;

      document.getElementById('audit-col-confirmed').innerHTML = `
        <div class="recon-item-card" style="font-size:0.75rem;">
          <span>Huevos camperos</span>
          <span class="pill pill-culinary"><i class="fa-solid fa-check"></i> Confirmado</span>
        </div>
        <div class="recon-item-card" style="font-size:0.75rem;">
          <span>Aceite de oliva</span>
          <span class="pill pill-culinary"><i class="fa-solid fa-check"></i> Confirmado</span>
        </div>
      `;

      document.getElementById('audit-col-missing').innerHTML = `
        <div class="recon-item-card" style="font-size:0.75rem; border-left:3px solid var(--color-warning);">
          <span>Espinacas frescas</span>
          <span class="pill pill-warning"><i class="fa-solid fa-triangle-exclamation"></i> Gastado</span>
        </div>
      `;

      resultsContainer.style.display = 'block';
      btnApply.style.display = 'inline-flex';
      btnSnap.disabled = false;
      btnSnap.innerHTML = `<i class="fa-solid fa-camera"></i> Volver a Auditar`;
      notifications.info(`¡Auditoría de ${zoneName} completada!`);
    } catch (err) {
      btnSnap.disabled = false;
      btnSnap.innerHTML = `<i class="fa-solid fa-camera"></i> Disparar y Auditar Existencias`;
      notifications.error('Error al procesar la auditoría visual');
    }
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
