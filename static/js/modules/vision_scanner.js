// static/js/modules/vision_scanner.js
// Doble modo de escaneo visual con IA Real (Google Gemini 1.5 Flash Vision / WebRTC / Foto Nativa)
// Cumple con el estándar Rezcart: FontAwesome 6, Cero Emojis, Layered Elevation y Feedback Háptico

import { state } from '../core/state.js';
import { notifications } from '../core/ui_notifications.js';
import { dataService } from '../core/data_service.js';
import { classifyItemLocal } from '../core/formatters.js';

let activeCameraStream = null;
let lastAuditResult = null;
let purchaseCapturedBlob = null;
let auditCapturedBlob = null;

export function initVisionScannerModule() {
  bindPurchasePhotoEvents();
  bindAuditPhotoEvents();
  bindGeminiConfigEvents();
  updateGeminiStatusBadge();
}

// --------------------------------------------------------------------------
// GESTOR DE CÁMARA EN VIVO (WEBRTC / GETUSERMEDIA)
// --------------------------------------------------------------------------
async function startLiveCamera(videoEl, placeholderEl, imgPreviewEl) {
  if (imgPreviewEl) {
    imgPreviewEl.style.display = 'none';
  }

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

    console.log('[Rezcart Cámara] Transmisión de cámara trasera iniciada con éxito.');
    return true;
  } catch (err) {
    console.warn('[Rezcart Cámara] Permiso de cámara no concedido:', err);
    if (placeholderEl) {
      placeholderEl.style.display = 'block';
    }
    if (videoEl) {
      videoEl.style.display = 'none';
    }
    return false;
  }
}

function stopLiveCamera(videoEl, placeholderEl, imgPreviewEl) {
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

  if (imgPreviewEl) {
    imgPreviewEl.style.display = 'none';
    imgPreviewEl.src = '';
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
// CONFIGURACIÓN DE GOOGLE GEMINI AI
// --------------------------------------------------------------------------
export function openGeminiConfigModal() {
  const modal = document.getElementById('modal-gemini-config');
  const inputKey = document.getElementById('input-gemini-api-key');
  const statusMsg = document.getElementById('gemini-key-status-msg');
  if (!modal) return;

  const currentKey = dataService.getGeminiApiKey();
  if (inputKey) {
    inputKey.value = currentKey;
  }

  if (statusMsg) {
    if (currentKey) {
      statusMsg.style.display = 'block';
      statusMsg.style.background = 'var(--bg-culinary-pill)';
      statusMsg.style.color = 'var(--color-culinary-dark)';
      statusMsg.innerHTML = '<i class="fa-solid fa-circle-check"></i> Clave configurada. La detección visual con Gemini 1.5 Flash está activa.';
    } else {
      statusMsg.style.display = 'block';
      statusMsg.style.background = 'var(--bg-warning-pill)';
      statusMsg.style.color = 'var(--color-warning-dark)';
      statusMsg.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> No hay clave configurada. Introduce una clave de Google AI Studio para activar la IA Real.';
    }
  }

  modal.classList.add('active');
}

export function updateGeminiStatusBadge() {
  const badgeText = document.getElementById('gemini-status-text');
  const btnConfig = document.getElementById('btn-open-gemini-config');
  if (!badgeText || !btnConfig) return;

  const hasKey = dataService.hasGeminiApiKey();
  if (hasKey) {
    badgeText.textContent = 'IA Conectada';
    btnConfig.classList.remove('btn-secondary');
    btnConfig.classList.add('btn-ai');
    btnConfig.innerHTML = '<i class="fa-solid fa-sparkles"></i> <span>Gemini Activo</span>';
  } else {
    badgeText.textContent = 'IA Real';
    btnConfig.classList.remove('btn-ai');
    btnConfig.classList.add('btn-secondary');
    btnConfig.innerHTML = '<i class="fa-solid fa-key" style="color: var(--color-warning);"></i> <span>Activar IA Real</span>';
  }
}

function bindGeminiConfigEvents() {
  const btnOpen = document.getElementById('btn-open-gemini-config');
  const modal = document.getElementById('modal-gemini-config');
  if (!modal) return;

  const btnClose = modal.querySelectorAll('[data-action="close"]');
  const btnSave = document.getElementById('btn-save-gemini-key');
  const btnClear = document.getElementById('btn-clear-gemini-key');
  const inputKey = document.getElementById('input-gemini-api-key');
  const btnToggleVis = document.getElementById('btn-toggle-gemini-key-visibility');
  const iconToggle = document.getElementById('icon-toggle-gemini-key');

  btnOpen?.addEventListener('click', openGeminiConfigModal);

  btnClose.forEach(b => b.addEventListener('click', () => {
    modal.classList.remove('active');
  }));

  btnToggleVis?.addEventListener('click', () => {
    if (inputKey.type === 'password') {
      inputKey.type = 'text';
      iconToggle.className = 'fa-solid fa-eye-slash';
    } else {
      inputKey.type = 'password';
      iconToggle.className = 'fa-solid fa-eye';
    }
  });

  btnSave?.addEventListener('click', () => {
    const key = (inputKey.value || '').trim();
    if (!key) {
      notifications.warning('Introduce una clave API válida de Google Gemini.');
      return;
    }
    dataService.setGeminiApiKey(key);
    updateGeminiStatusBadge();
    modal.classList.remove('active');
    notifications.success('¡Clave de Google Gemini guardada! Visión real activada.');
  });

  btnClear?.addEventListener('click', () => {
    dataService.setGeminiApiKey('');
    if (inputKey) inputKey.value = '';
    updateGeminiStatusBadge();
    modal.classList.remove('active');
    notifications.info('Clave de Gemini eliminada.');
  });
}

// --------------------------------------------------------------------------
// MODO 1: FOTO NUEVA COMPRA (Encimera / Mesa) - RECONOCIMIENTO REAL
// --------------------------------------------------------------------------
function bindPurchasePhotoEvents() {
  const btnOpen = document.getElementById('btn-open-photo-purchase');
  const modal = document.getElementById('modal-photo-purchase');
  if (!modal) return;

  const btnClose = modal.querySelectorAll('[data-action="close"]');
  const btnSnap = document.getElementById('btn-snap-purchase-photo');
  const previewBox = document.getElementById('purchase-camera-preview');
  const videoEl = document.getElementById('purchase-video');
  const imgPreviewEl = document.getElementById('purchase-img-preview');
  const placeholderEl = document.getElementById('purchase-placeholder');
  const detectedContainer = document.getElementById('purchase-detected-container');
  const checklist = document.getElementById('purchase-detected-checklist');
  const btnSave = document.getElementById('btn-confirm-save-purchase-photo');

  const fileInput = document.getElementById('purchase-file-input');
  const btnUploadTrigger = document.getElementById('btn-upload-purchase-trigger');

  const closeModal = () => {
    modal.classList.remove('active');
    stopLiveCamera(videoEl, placeholderEl, imgPreviewEl);
    detectedContainer.style.display = 'none';
    btnSave.style.display = 'none';
    purchaseCapturedBlob = null;
    const oldOverlays = previewBox.querySelectorAll('.detection-box');
    oldOverlays.forEach(o => o.remove());
  };

  btnOpen?.addEventListener('click', async () => {
    modal.classList.add('active');
    purchaseCapturedBlob = null;
    const cameraActive = await startLiveCamera(videoEl, placeholderEl, imgPreviewEl);
    if (!cameraActive) {
      notifications.info('Puedes usar tu cámara en vivo o el botón de subir foto para escanear.');
    }
  });

  btnClose.forEach(b => b.addEventListener('click', closeModal));

  // Trigger para subir archivo o tomar foto con la app de cámara nativa
  btnUploadTrigger?.addEventListener('click', () => {
    fileInput?.click();
  });

  fileInput?.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    purchaseCapturedBlob = file;
    // Mostrar preview
    if (imgPreviewEl) {
      imgPreviewEl.src = URL.createObjectURL(file);
      imgPreviewEl.style.display = 'block';
    }
    if (videoEl) videoEl.style.display = 'none';
    if (placeholderEl) placeholderEl.style.display = 'none';

    // Disparar reconocimiento automáticamente
    executePurchaseScan();
  });

  btnSnap?.addEventListener('click', async () => {
    // Si la cámara en vivo está corriendo, capturar fotograma
    if (videoEl && videoEl.srcObject) {
      const blob = await captureVideoFrame(videoEl);
      if (blob) {
        purchaseCapturedBlob = blob;
        if (imgPreviewEl) {
          imgPreviewEl.src = URL.createObjectURL(blob);
          imgPreviewEl.style.display = 'block';
        }
        videoEl.style.display = 'none';
      }
    }

    executePurchaseScan();
  });

  async function executePurchaseScan() {
    // Verificar si hay clave API
    if (!dataService.hasGeminiApiKey()) {
      notifications.warning('Configura tu clave de Gemini API para activar la detección real.');
      openGeminiConfigModal();
      return;
    }

    if (!purchaseCapturedBlob && (!videoEl || !videoEl.srcObject)) {
      notifications.warning('Por favor, enfoca con la cámara o sube una fotografía de tus alimentos.');
      return;
    }

    let blobToProcess = purchaseCapturedBlob;
    if (!blobToProcess && videoEl && videoEl.srcObject) {
      blobToProcess = await captureVideoFrame(videoEl);
    }

    if (!blobToProcess) {
      notifications.warning('No se pudo capturar la imagen. Inténtalo de nuevo o sube una foto.');
      return;
    }

    btnSnap.disabled = true;
    btnSnap.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Reconociendo alimentos reales con Gemini...`;

    try {
      const compressed = await dataService.compressImage(blobToProcess, 1200, 0.85);
      const detectedItems = await dataService.processVisionScan(compressed, 'countertop_bulk');

      // Limpiar superposiciones previas
      const oldOverlays = previewBox.querySelectorAll('.detection-box');
      oldOverlays.forEach(o => o.remove());

      // Si no detectó alimentos
      if (!Array.isArray(detectedItems) || detectedItems.length === 0) {
        checklist.innerHTML = `
          <div style="padding: 1rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
            <i class="fa-solid fa-circle-question" style="font-size: 1.5rem; margin-bottom: 0.4rem; color: var(--color-warning);"></i>
            <p>No se reconocieron alimentos claros en esta foto. Prueba a enfocar más cerca o con mejor luz.</p>
          </div>
        `;
        detectedContainer.style.display = 'block';
        btnSave.style.display = 'none';
        btnSnap.disabled = false;
        btnSnap.innerHTML = `<i class="fa-solid fa-camera"></i> Disparar de Nuevo`;
        notifications.info('Análisis completado: no se identificaron alimentos en la imagen.');
        return;
      }

      // Generar cajas visuales dinámicas sobre la imagen con los alimentos REALES detectados
      const positions = [
        { top: '18%', left: '12%' },
        { top: '22%', left: '56%' },
        { top: '58%', left: '16%' },
        { top: '64%', left: '54%' },
        { top: '42%', left: '36%' },
        { top: '10%', left: '40%' }
      ];

      detectedItems.slice(0, 6).forEach((item, idx) => {
        const pos = positions[idx % positions.length];
        const overlay = document.createElement('div');
        overlay.className = 'detection-box';
        overlay.style.top = pos.top;
        overlay.style.left = pos.left;
        const confidencePct = Math.round((item.confidence || 0.95) * 100);
        overlay.innerHTML = `<i class="fa-solid fa-tag"></i> ${item.name} (${confidencePct}%)`;
        previewBox.appendChild(overlay);
      });

      // Renderizar checklist de alimentos detectados
      checklist.innerHTML = detectedItems.map((item, idx) => {
        const meta = classifyItemLocal(item.name);
        return `
          <label class="card" style="padding: 0.5rem 0.75rem; display: flex; align-items: center; justify-content: space-between; cursor: pointer; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm);">
            <div style="display: flex; align-items: center; gap: 0.6rem;">
              <input type="checkbox" checked data-idx="${idx}" data-name="${item.name}" style="width: 17px; height: 17px; accent-color: var(--color-culinary); cursor: pointer;">
              <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-main);">${item.name}</span>
            </div>
            <span class="pill pill-culinary" style="font-size: 0.7rem;">
              <i class="fa-solid ${meta.icon}"></i> ${meta.label}
            </span>
          </label>
        `;
      }).join('');

      detectedContainer.style.display = 'block';
      btnSave.style.display = 'inline-flex';
      btnSnap.disabled = false;
      btnSnap.innerHTML = `<i class="fa-solid fa-camera"></i> Disparar de Nuevo`;
      notifications.success(`¡Gemini detectó ${detectedItems.length} alimentos reales en tu foto!`);
    } catch (err) {
      console.error('[Rezcart Vision] Error durante el escaneo:', err);
      btnSnap.disabled = false;
      btnSnap.innerHTML = `<i class="fa-solid fa-camera"></i> Disparar y Detectar`;

      if (err.code === 'NO_API_KEY') {
        notifications.warning('Configura tu clave de Gemini API para activar la visión real.');
        openGeminiConfigModal();
      } else {
        notifications.error('Error de IA Gemini: ' + (err.message || 'Fallo de red o cuota excedida'));
      }
    }
  }

  btnSave?.addEventListener('click', () => {
    const checkedBoxes = checklist.querySelectorAll('input[type="checkbox"]:checked');
    let addedCount = 0;
    const namesToAdd = [];

    checkedBoxes.forEach(cb => {
      namesToAdd.push(cb.dataset.name);
      addedCount++;
    });

    if (namesToAdd.length > 0) {
      state.applyVisionReconciliation(namesToAdd, [], []);
      notifications.success(`¡${addedCount} alimentos reales guardados en tu despensa!`);
    }

    closeModal();
  });
}

// --------------------------------------------------------------------------
// MODO 2: AUDITORÍA DE ZONA (Nevera, Despensa seca, Frutero) - RECONOCIMIENTO REAL
// --------------------------------------------------------------------------
function bindAuditPhotoEvents() {
  const btnOpen = document.getElementById('btn-open-photo-audit');
  const modal = document.getElementById('modal-photo-audit');
  if (!modal) return;

  const btnClose = modal.querySelectorAll('[data-action="close"]');
  const btnSnap = document.getElementById('btn-snap-audit-photo');
  const previewBox = document.getElementById('audit-camera-preview');
  const videoEl = document.getElementById('audit-video');
  const imgPreviewEl = document.getElementById('audit-img-preview');
  const placeholderEl = document.getElementById('audit-placeholder');
  const resultsContainer = document.getElementById('audit-results-container');
  const btnApply = document.getElementById('btn-apply-audit-recon');
  const zoneSelect = document.getElementById('audit-zone-select');

  const fileInput = document.getElementById('audit-file-input');
  const btnUploadTrigger = document.getElementById('btn-upload-audit-trigger');

  const closeModal = () => {
    modal.classList.remove('active');
    stopLiveCamera(videoEl, placeholderEl, imgPreviewEl);
    resultsContainer.style.display = 'none';
    btnApply.style.display = 'none';
    auditCapturedBlob = null;
    lastAuditResult = null;
    const oldOverlays = previewBox.querySelectorAll('.detection-box');
    oldOverlays.forEach(o => o.remove());
  };

  btnOpen?.addEventListener('click', async () => {
    modal.classList.add('active');
    auditCapturedBlob = null;
    const cameraActive = await startLiveCamera(videoEl, placeholderEl, imgPreviewEl);
    if (!cameraActive) {
      notifications.info('Puedes usar tu cámara en vivo o el botón de subir foto para auditar.');
    }
  });

  btnClose.forEach(b => b.addEventListener('click', closeModal));

  btnUploadTrigger?.addEventListener('click', () => {
    fileInput?.click();
  });

  fileInput?.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    auditCapturedBlob = file;
    if (imgPreviewEl) {
      imgPreviewEl.src = URL.createObjectURL(file);
      imgPreviewEl.style.display = 'block';
    }
    if (videoEl) videoEl.style.display = 'none';
    if (placeholderEl) placeholderEl.style.display = 'none';

    executeAuditScan();
  });

  btnSnap?.addEventListener('click', async () => {
    if (videoEl && videoEl.srcObject) {
      const blob = await captureVideoFrame(videoEl);
      if (blob) {
        auditCapturedBlob = blob;
        if (imgPreviewEl) {
          imgPreviewEl.src = URL.createObjectURL(blob);
          imgPreviewEl.style.display = 'block';
        }
        videoEl.style.display = 'none';
      }
    }

    executeAuditScan();
  });

  async function executeAuditScan() {
    if (!dataService.hasGeminiApiKey()) {
      notifications.warning('Configura tu clave de Gemini API para activar la auditoría real.');
      openGeminiConfigModal();
      return;
    }

    const zoneName = zoneSelect.options[zoneSelect.selectedIndex].text;

    let blobToProcess = auditCapturedBlob;
    if (!blobToProcess && videoEl && videoEl.srcObject) {
      blobToProcess = await captureVideoFrame(videoEl);
    }

    if (!blobToProcess) {
      notifications.warning('Por favor, enfoca las baldas con la cámara o sube una fotografía.');
      return;
    }

    btnSnap.disabled = true;
    btnSnap.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Auditando baldas de ${zoneName} con Gemini...`;

    try {
      const compressed = await dataService.compressImage(blobToProcess, 1200, 0.85);
      const pantryNames = state.pantry.map(p => p.name);

      const recon = await dataService.processVisionScan(compressed, 'zone_audit', zoneName, { pantryNames });
      lastAuditResult = recon;

      // Limpiar superposiciones previas
      const oldOverlays = previewBox.querySelectorAll('.detection-box');
      oldOverlays.forEach(o => o.remove());

      // Etiquetas visuales para confirmados y nuevos
      const confirmedList = recon.confirmed || [];
      const newItemsList = recon.newItems || [];
      const missingList = recon.missing || [];

      confirmedList.slice(0, 3).forEach((name, i) => {
        const overlay = document.createElement('div');
        overlay.className = 'detection-box';
        overlay.style.top = `${25 + i * 20}%`;
        overlay.style.left = `${15 + i * 20}%`;
        overlay.style.borderColor = 'var(--color-culinary)';
        overlay.innerHTML = `<i class="fa-solid fa-check"></i> ${name}`;
        previewBox.appendChild(overlay);
      });

      newItemsList.slice(0, 2).forEach((name, i) => {
        const overlay = document.createElement('div');
        overlay.className = 'detection-box';
        overlay.style.top = `${30 + i * 25}%`;
        overlay.style.left = `${55 + i * 15}%`;
        overlay.style.borderColor = 'var(--color-ai)';
        overlay.innerHTML = `<i class="fa-solid fa-plus"></i> ${name}`;
        previewBox.appendChild(overlay);
      });

      // Renderizar 3 Columnas Dinámicas
      const colNew = document.getElementById('audit-col-new');
      const colConfirmed = document.getElementById('audit-col-confirmed');
      const colMissing = document.getElementById('audit-col-missing');

      if (colNew) {
        colNew.innerHTML = newItemsList.length > 0
          ? newItemsList.map(item => `
              <div class="recon-item-card" style="font-size:0.75rem; display:flex; justify-content:space-between; align-items:center; padding:0.4rem; background:var(--bg-card); border-radius:var(--radius-sm); margin-bottom:0.35rem; border:1px solid var(--border-subtle);">
                <span style="font-weight:600;">${item}</span>
                <span class="pill pill-ai" style="font-size:0.65rem;"><i class="fa-solid fa-plus"></i> Nuevo</span>
              </div>
            `).join('')
          : '<p style="font-size:0.75rem; color:var(--text-muted); padding:0.5rem;">Ningún producto nuevo.</p>';
      }

      if (colConfirmed) {
        colConfirmed.innerHTML = confirmedList.length > 0
          ? confirmedList.map(item => `
              <div class="recon-item-card" style="font-size:0.75rem; display:flex; justify-content:space-between; align-items:center; padding:0.4rem; background:var(--bg-card); border-radius:var(--radius-sm); margin-bottom:0.35rem; border:1px solid var(--border-subtle);">
                <span style="font-weight:600;">${item}</span>
                <span class="pill pill-culinary" style="font-size:0.65rem;"><i class="fa-solid fa-check"></i> Presente</span>
              </div>
            `).join('')
          : '<p style="font-size:0.75rem; color:var(--text-muted); padding:0.5rem;">Sin coincidencias.</p>';
      }

      if (colMissing) {
        colMissing.innerHTML = missingList.length > 0
          ? missingList.map(item => `
              <div class="recon-item-card" style="font-size:0.75rem; display:flex; justify-content:space-between; align-items:center; padding:0.4rem; background:var(--bg-card); border-radius:var(--radius-sm); margin-bottom:0.35rem; border-left:3px solid var(--color-warning);">
                <span style="font-weight:600;">${item}</span>
                <span class="pill pill-warning" style="font-size:0.65rem;"><i class="fa-solid fa-triangle-exclamation"></i> No visible</span>
              </div>
            `).join('')
          : '<p style="font-size:0.75rem; color:var(--text-muted); padding:0.5rem;">Todo en orden.</p>';
      }

      resultsContainer.style.display = 'block';
      btnApply.style.display = 'inline-flex';
      btnSnap.disabled = false;
      btnSnap.innerHTML = `<i class="fa-solid fa-camera"></i> Volver a Auditar`;
      notifications.success(`¡Auditoría de ${zoneName} con Gemini completada!`);
    } catch (err) {
      console.error('[Rezcart Audit] Error en auditoría:', err);
      btnSnap.disabled = false;
      btnSnap.innerHTML = `<i class="fa-solid fa-camera"></i> Disparar y Auditar`;

      if (err.code === 'NO_API_KEY') {
        notifications.warning('Configura tu clave de Gemini API para activar la auditoría real.');
        openGeminiConfigModal();
      } else {
        notifications.error('Error en auditoría IA: ' + (err.message || 'Fallo de red'));
      }
    }
  }

  btnApply?.addEventListener('click', () => {
    if (!lastAuditResult) {
      closeModal();
      return;
    }

    const newItems = lastAuditResult.newItems || [];
    const confirmedNames = (lastAuditResult.confirmed || []).map(s => s.toLowerCase());
    const missingNames = (lastAuditResult.missing || []).map(s => s.toLowerCase());

    const confirmedIds = state.pantry
      .filter(p => confirmedNames.some(c => p.name.toLowerCase().includes(c) || c.includes(p.name.toLowerCase())))
      .map(p => p.id);

    const missingIds = state.pantry
      .filter(p => missingNames.some(m => p.name.toLowerCase().includes(m) || m.includes(p.name.toLowerCase())))
      .map(p => p.id);

    state.applyVisionReconciliation(newItems, confirmedIds, missingIds);
    closeModal();
    notifications.success('¡Despensa actualizada tras la auditoría visual con Gemini!');
  });
}
