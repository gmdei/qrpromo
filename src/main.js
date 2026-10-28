/**
 * ============================================================================
 * QR Shield Promo - Main Application Logic
 * ============================================================================
 * Manejador principal de interfaz, internacionalización (i18n), interacción
 * del simulador sandbox, integración de cámara web y emulación de validación.
 */

import esTranslations from '../locales/es.json';
import enTranslations from '../locales/en.json';
import { 
  validateToken, 
  redeemPrize, 
  resetMockDatabase, 
  normalizeToken,
  registerBatchInDatabase,
  API_CONFIG 
} from './services/mockValidatorService.js';
import confetti from 'canvas-confetti';
import QRCode from 'qrcode';
import { Html5Qrcode } from 'html5-qrcode';
import { jsPDF } from 'jspdf';

// ============================================================================
// Estado Global de la Aplicación
// ============================================================================
const state = {
  currentLang: 'es',
  activeTab: 'ui',
  isLoading: false,
  lastResult: null,
  activeWinnerData: null,
  auditLog: [],
  html5QrCodeScanner: null,
  isCameraActive: false
};

const translations = {
  es: esTranslations,
  en: enTranslations
};

/**
 * Función auxiliar para obtener valores anidados de traducción
 */
function t(path) {
  const keys = path.split('.');
  let current = translations[state.currentLang];
  for (const key of keys) {
    if (current && current[key] !== undefined) {
      current = current[key];
    } else {
      return path; // Fallback
    }
  }
  return current;
}

// ============================================================================
// Inicialización
// ============================================================================
function startApp() {
  initI18n();
  initModals();
  initBatchOperations();
  initSimulator();
  renderHeroMockupQR();
  renderPresetQRs();
  initUrlQueryHandler();
  initMobileNav();

  // Exponer utilidades para pruebas y scripts de demostración
  window.triggerValidation = triggerValidation;
  window.setLanguage = setLanguage;
  window.openClaimModal = openClaimModal;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}

// ============================================================================
// Internacionalización (i18n)
// ============================================================================
function initI18n() {
  const langEsBtn = document.getElementById('langEsBtn');
  const langEnBtn = document.getElementById('langEnBtn');

  langEsBtn?.addEventListener('click', () => setLanguage('es'));
  langEnBtn?.addEventListener('click', () => setLanguage('en'));

  // Aplicar idioma inicial
  setLanguage('es');
}

function setLanguage(lang) {
  state.currentLang = lang;
  document.documentElement.lang = lang;

  // Actualizar botones de idioma en navbar
  const langEsBtn = document.getElementById('langEsBtn');
  const langEnBtn = document.getElementById('langEnBtn');
  if (lang === 'es') {
    langEsBtn?.classList.add('active');
    langEnBtn?.classList.remove('active');
  } else {
    langEnBtn?.classList.add('active');
    langEsBtn?.classList.remove('active');
  }

  // Actualizar todos los elementos con atributo data-i18n
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const translation = t(key);
    if (typeof translation === 'string') {
      el.textContent = translation;
    }
  });

  // Renderizar secciones dinámicas
  renderHeroStats();
  renderBusinessCards();
  renderSecurityPillars();
  renderLifecycleSteps();
  renderSimulatorPresets();
  renderFooterLists();

  // Si hay un resultado activo en el simulador, refrescar su texto al nuevo idioma
  if (state.lastResult) {
    renderValidationResult(state.lastResult);
  }
}

// ============================================================================
// Renderizado de Componentes Dinámicos
// ============================================================================

function renderHeroStats() {
  const container = document.getElementById('heroStatsContainer');
  if (!container) return;

  const stats = translations[state.currentLang].hero.stats;
  container.innerHTML = stats.map(s => `
    <div class="stat-item">
      <div class="stat-value">${s.value}</div>
      <div class="stat-label">${s.label}</div>
    </div>
  `).join('');
}

function renderBusinessCards() {
  const container = document.getElementById('businessCardsGrid');
  if (!container) return;

  const cards = translations[state.currentLang].business.cards;
  const icons = {
    'smartphone': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>`,
    'shield-check': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 12 15 15 10"/></svg>`,
    'bar-chart-3': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
    'layers': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`
  };

  container.innerHTML = cards.map(c => `
    <div class="card-enterprise">
      <div>
        <div class="card-icon-box">
          ${icons[c.icon] || icons['shield-check']}
        </div>
        <h3>${c.title}</h3>
        <p>${c.desc}</p>
      </div>
      <div>
        <span class="card-metric-tag">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          ${c.metric}
        </span>
      </div>
    </div>
  `).join('');
}

function renderSecurityPillars() {
  const container = document.getElementById('securityPillarsContainer');
  if (!container) return;

  const pillars = translations[state.currentLang].security.pillars;
  container.innerHTML = pillars.map(p => `
    <div class="security-card">
      <div class="security-pillar-header">
        <span class="badge badge-cyan">${p.tag}</span>
        <span class="security-number">${p.number}</span>
      </div>
      <h3>${p.title}</h3>
      <span class="security-metaphor">"${p.metaphor}"</span>
      <p>${p.desc}</p>
    </div>
  `).join('');
}

function renderLifecycleSteps() {
  const container = document.getElementById('lifecycleStepsContainer');
  if (!container) return;

  const steps = translations[state.currentLang].security.steps;
  container.innerHTML = steps.map(s => `
    <div class="lifecycle-step">
      <div class="lifecycle-step-num">${s.step}</div>
      <h4>${s.title}</h4>
      <p>${s.desc}</p>
    </div>
  `).join('');
}

function renderSimulatorPresets() {
  const container = document.getElementById('simulatorPresetsGrid');
  if (!container) return;

  const cards = translations[state.currentLang].simulator.cards;
  const classes = {
    'winner': 'preset-card-winner',
    'tryAgain': 'preset-card-tryagain',
    'alreadyUsed': 'preset-card-used'
  };

  const badgeClasses = {
    'winner': 'badge-emerald',
    'tryAgain': 'badge-cyan',
    'alreadyUsed': 'badge-crimson'
  };

  container.innerHTML = cards.map(c => `
    <div class="preset-card ${classes[c.type]}" data-preset-token="${c.token}" id="preset-${c.token}">
      <div>
        <div class="preset-top">
          <span class="badge ${badgeClasses[c.type]}">${c.badge}</span>
          <div class="preset-qr-preview" id="qr-preview-${c.token}" title="Escanear con teléfono móvil">
            <!-- QR Canvas will render here -->
          </div>
        </div>
        <h4>${c.title}</h4>
        <p>${c.description}</p>
      </div>

      <div>
        <div class="preset-token-code">Token: ${c.token}</div>
        <button type="button" class="btn btn-secondary btn-simulate-click" data-token="${c.token}" style="width: 100%; font-size: 0.8rem; padding: 0.45rem 0.75rem;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          ${c.action}
        </button>
      </div>
    </div>
  `).join('');

  // Re-enlazar eventos a los botones de simulación
  container.querySelectorAll('.btn-simulate-click').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const token = btn.getAttribute('data-token');
      triggerValidation(token);
    });
  });

  // Permitir click en toda la tarjeta
  container.querySelectorAll('.preset-card').forEach(card => {
    card.addEventListener('click', () => {
      const token = card.getAttribute('data-preset-token');
      triggerValidation(token);
    });
  });

  // Generar los códigos QR visuales en cada tarjeta
  renderPresetQRs();
}

function renderFooterLists() {
  const solList = document.getElementById('footerSolList');
  const compList = document.getElementById('footerCompList');
  if (!solList || !compList) return;

  const sol = translations[state.currentLang].footer.col1Links;
  const comp = translations[state.currentLang].footer.col2Links;

  solList.innerHTML = sol.map(item => `<li><a href="#simulator">${item}</a></li>`).join('');
  compList.innerHTML = comp.map(item => `<li><a href="#security">${item}</a></li>`).join('');
}

// ============================================================================
// Generación de Códigos QR Dinámicos (Escaneables con smartphone real)
// ============================================================================
async function renderHeroMockupQR() {
  const target = document.getElementById('heroQrTarget');
  if (!target) return;

  try {
    const scanUrl = `${window.location.origin}${window.location.pathname}?token=SHIELD-WIN-9021`;
    const canvas = await QRCode.toCanvas(scanUrl, {
      width: 140,
      margin: 1,
      color: {
        dark: '#0B192C',
        light: '#FFFFFF'
      }
    });
    target.innerHTML = '';
    target.appendChild(canvas);
  } catch (err) {
    console.error('Error generando QR de Hero:', err);
  }
}

async function renderPresetQRs() {
  const presets = [
    { id: 'qr-preview-SHIELD-WIN-9021', token: 'SHIELD-WIN-9021' },
    { id: 'qr-preview-SHIELD-TRY-4412', token: 'SHIELD-TRY-4412' },
    { id: 'qr-preview-SHIELD-ERR-8492', token: 'SHIELD-ERR-8492' }
  ];

  for (const p of presets) {
    const el = document.getElementById(p.id);
    if (el) {
      try {
        const scanUrl = `${window.location.origin}${window.location.pathname}?token=${p.token}`;
        const canvas = await QRCode.toCanvas(scanUrl, {
          width: 58,
          margin: 1,
          color: {
            dark: '#0F172A',
            light: '#F8FAFC'
          }
        });
        el.innerHTML = '';
        el.appendChild(canvas);
      } catch (err) {
        console.error(`Error generando QR para ${p.token}:`, err);
      }
    }
  }
}

// ============================================================================
// Lógica Central del Simulador (Sandbox)
// ============================================================================
function initSimulator() {
  // Manejador del formulario de entrada manual
  const manualForm = document.getElementById('manualValidateForm');
  const manualInput = document.getElementById('manualTokenInput');
  const btnManualValidate = document.getElementById('btnManualValidate');

  const handleManualValidation = (e) => {
    if (e) e.preventDefault();
    const token = manualInput?.value.trim();
    if (token) {
      triggerValidation(token);
    }
  };

  manualForm?.addEventListener('submit', handleManualValidation);
  btnManualValidate?.addEventListener('click', handleManualValidation);

  // Manejadores de pestañas del simulador
  const tabBtns = document.querySelectorAll('.sim-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      switchSimulatorTab(tabId);
    });
  });

  // Botón copiar JSON
  const btnCopyJson = document.getElementById('btnCopyJson');
  btnCopyJson?.addEventListener('click', () => {
    if (!state.lastResult) return;
    const textToCopy = JSON.stringify(state.lastResult, null, 2);
    navigator.clipboard.writeText(textToCopy).then(() => {
      const originalText = btnCopyJson.textContent;
      btnCopyJson.textContent = state.currentLang === 'es' ? '¡Copiado!' : 'Copied!';
      setTimeout(() => {
        btnCopyJson.textContent = originalText;
      }, 2000);
    });
  });

  // Control de Cámara
  const btnToggleCamera = document.getElementById('btnToggleCamera');
  const btnCloseCamera = document.getElementById('btnCloseCamera');
  btnToggleCamera?.addEventListener('click', toggleCameraScanner);
  btnCloseCamera?.addEventListener('click', stopCameraScanner);
}

function switchSimulatorTab(tabId) {
  state.activeTab = tabId;

  // Actualizar botones
  document.querySelectorAll('.sim-tab-btn').forEach(btn => {
    if (btn.getAttribute('data-tab') === tabId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Actualizar paneles
  document.querySelectorAll('.simulator-tab-pane').forEach(pane => {
    pane.classList.remove('active');
  });

  const activePane = document.getElementById(`pane${tabId.charAt(0).toUpperCase() + tabId.slice(1)}`);
  activePane?.classList.add('active');
}

/**
 * Dispara el proceso de validación con emulación de estado de carga
 */
async function triggerValidation(rawToken) {
  if (state.isLoading) return;
  state.isLoading = true;

  // Asegurar que la pestaña de Experiencia del Usuario esté activa
  switchSimulatorTab('ui');

  const normalized = normalizeToken(rawToken);
  const inputEl = document.getElementById('manualTokenInput');
  if (inputEl) inputEl.value = normalized;

  // Resaltar visualmente la tarjeta si coincide con los presets
  document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
  const matchingPreset = document.getElementById(`preset-${normalized}`);
  if (matchingPreset) matchingPreset.classList.add('active');

  // Mostrar estado de carga en la UI (Loading Skeleton)
  renderLoadingState();

  try {
    // Llamada al servicio de validación (emula API real de 600ms)
    const result = await validateToken(normalized);
    state.lastResult = result;
    state.isLoading = false;

    // Actualizar paneles
    renderValidationResult(result);
    renderJsonInspector(result);
    recordAuditLog(result);

    // Efecto de celebración si es ganador
    if (result.payload?.verdict === 'WINNER') {
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.65 },
        colors: ['#10B981', '#38BDF8', '#F59E0B', '#3B82F6']
      });
    }
  } catch (error) {
    state.isLoading = false;
    console.error('Error en validación:', error);
  }
}

function renderLoadingState() {
  const container = document.getElementById('uiResultContainer');
  if (!container) return;

  const msg = translations[state.currentLang].simulator.result.processing;

  container.innerHTML = `
    <div class="loading-skeleton">
      <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
        <div style="width: 20px; height: 20px; border: 3px solid #0EA5E9; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
        <span style="font-size: 0.95rem; font-weight: 600; color: #0284C7;">${msg}</span>
      </div>
      <div class="skeleton-shimmer" style="height: 24px; width: 60%;"></div>
      <div class="skeleton-shimmer" style="height: 80px; width: 100%;"></div>
      <div class="skeleton-shimmer" style="height: 45px; width: 40%;"></div>
    </div>
    <style>
      @keyframes spin { 100% { transform: rotate(360deg); } }
    </style>
  `;

  // Actualizar JSON viewer provisionalmente
  const jsonPre = document.getElementById('jsonPayloadPre');
  if (jsonPre) {
    jsonPre.innerHTML = `<code>// Consultando cluster criptográfico... Validando firma digital...</code>`;
  }
}

/**
 * Renderiza la tarjeta de resultado en el tab de Experiencia de Usuario
 */
function renderValidationResult(result) {
  const container = document.getElementById('uiResultContainer');
  if (!container) return;

  const loc = translations[state.currentLang].simulator.result;
  const { payload, latencyMs, httpStatus } = result;

  // CASO 1: GANADOR (WINNER)
  if (payload.verdict === 'WINNER') {
    state.activeWinnerData = {
      token: payload.token,
      prize: payload.prize
    };

    const prizeTitle = state.currentLang === 'en' 
      ? (payload.prize?.titleEn || payload.prize?.title)
      : payload.prize?.title;

    const prizeCategory = state.currentLang === 'en'
      ? (payload.prize?.categoryEn || payload.prize?.category)
      : payload.prize?.category;

    container.innerHTML = `
      <div class="result-banner result-winner">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="width: 3rem; height: 3rem; border-radius: 50%; background: #10B981; color: #FFFFFF; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 20px rgba(16, 185, 129, 0.5);">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
            <div>
              <span class="badge badge-emerald" style="margin-bottom: 0.25rem;">HTTP ${httpStatus} • ${latencyMs}ms</span>
              <h3 style="font-size: 1.35rem; color: #065F46; margin: 0;">${loc.winnerTitle}</h3>
            </div>
          </div>
          <div class="status-indicator" style="background: rgba(16, 185, 129, 0.15); color: #047857;">
            <span class="status-dot"></span>
            <span>Blind Key Validated</span>
          </div>
        </div>

        <p style="font-size: 0.95rem; color: #064E3B; margin: 0;">${loc.winnerDesc}</p>

        <div style="background: #FFFFFF; border: 2px dashed #10B981; border-radius: 0.75rem; padding: 1.25rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div>
            <span style="font-size: 0.775rem; text-transform: uppercase; color: #059669; font-weight: 700;">${loc.prizeLabel} (${prizeCategory})</span>
            <div style="font-size: 1.15rem; font-weight: 800; color: #0F172A; margin-top: 0.2rem;">${prizeTitle}</div>
            <div style="font-size: 0.8rem; color: #64748B; margin-top: 0.25rem;">Valor Estimado: ${payload.prize?.valueEstimate} • Código Serie: <span class="font-mono">${payload.token}</span></div>
          </div>
          <button type="button" class="btn btn-emerald" id="btnClaimWinnerPrize" style="font-size: 0.95rem; padding: 0.75rem 1.5rem;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 12 15 15 10"/></svg>
            ${loc.claimBtn}
          </button>
        </div>
      </div>
    `;

    document.getElementById('btnClaimWinnerPrize')?.addEventListener('click', () => {
      openClaimModal();
    });
    return;
  }

  // CASO 2: SIN PREMIO (TRY AGAIN)
  if (payload.verdict === 'TRY_AGAIN') {
    const message = state.currentLang === 'en' ? payload.messageEn : payload.messageEs;

    container.innerHTML = `
      <div class="result-banner result-tryagain">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="width: 3rem; height: 3rem; border-radius: 50%; background: #0284C7; color: #FFFFFF; display: flex; align-items: center; justify-content: center;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
            </div>
            <div>
              <span class="badge badge-cyan" style="margin-bottom: 0.25rem;">HTTP ${httpStatus} • ${latencyMs}ms</span>
              <h3 style="font-size: 1.35rem; color: #0369A1; margin: 0;">${loc.tryTitle}</h3>
            </div>
          </div>
          <span class="badge badge-cyan">Participación Registrada</span>
        </div>

        <p style="font-size: 0.95rem; color: #0C4A6E; margin: 0;">${loc.tryDesc}</p>

        <div style="background: #FFFFFF; border: 1px solid #BAE6FD; border-radius: 0.75rem; padding: 1.25rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div>
            <div style="font-size: 0.95rem; font-weight: 600; color: #0F172A;">${message}</div>
            <div style="font-size: 0.8rem; color: #64748B; margin-top: 0.25rem;">Token Auténtico: <span class="font-mono">${payload.token}</span> • Lote: <span class="font-mono">${payload.batchId}</span></div>
          </div>
          <button type="button" class="btn btn-outline-dark" id="btnRetryDemo">
            ${loc.retryBtn}
          </button>
        </div>
      </div>
    `;

    document.getElementById('btnRetryDemo')?.addEventListener('click', () => {
      triggerValidation('SHIELD-WIN-9021');
    });
    return;
  }

  // CASO 3: CÓDIGO YA USADO / DUPLICADO (ALREADY_REDEEMED)
  if (payload.verdict === 'ALREADY_REDEEMED') {
    const meta = payload.redemptionRecord || {};
    const redeemedDate = new Date(meta.redeemedAt || Date.now()).toLocaleString();

    container.innerHTML = `
      <div class="result-banner result-used">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="width: 3rem; height: 3rem; border-radius: 50%; background: #DC2626; color: #FFFFFF; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 20px rgba(239, 68, 68, 0.4);">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <div>
              <span class="badge badge-crimson" style="margin-bottom: 0.25rem;">HTTP 409 Conflict • ${latencyMs}ms</span>
              <h3 style="font-size: 1.35rem; color: #991B1B; margin: 0;">${loc.usedTitle}</h3>
            </div>
          </div>
          <span class="badge badge-crimson">Candado Atómico Activado</span>
        </div>

        <p style="font-size: 0.95rem; color: #7F1D1D; margin: 0;">${loc.usedDesc}</p>

        <div style="background: #FFFFFF; border: 2px solid #EF4444; border-radius: 0.75rem; padding: 1.25rem;">
          <div style="font-size: 0.85rem; color: #1E293B; line-height: 1.6;">
            <div><strong>${loc.firstRedeemed}</strong> ${redeemedDate}</div>
            <div><strong>${loc.txCode}</strong> <span class="font-mono" style="color: #DC2626;">${meta.transactionId}</span></div>
            <div><strong>${loc.ipAddress}</strong> <span class="font-mono">${meta.ipAddress}</span></div>
            <div><strong>Punto / Canal:</strong> ${meta.retailOutlet}</div>
          </div>
          <div style="margin-top: 0.75rem; font-size: 0.775rem; color: #991B1B; background: rgba(239, 68, 68, 0.08); padding: 0.5rem 0.75rem; border-radius: 0.35rem;">
            🛡️ El motor de prevención de fraude bloqueó la solicitud de canje. La transacción fue asentada en el registro inmutable de auditoría.
          </div>
        </div>
      </div>
    `;
    return;
  }

  // CASO 4: NO RECONOCIDO O INVÁLIDO
  container.innerHTML = `
    <div class="result-banner" style="background: var(--slate-100); border: 2px solid var(--slate-300);">
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <div style="width: 3rem; height: 3rem; border-radius: 50%; background: #64748B; color: #FFFFFF; display: flex; align-items: center; justify-content: center;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
        </div>
        <div>
          <span class="badge" style="background: #CBD5E1; color: #334155;">HTTP ${httpStatus}</span>
          <h3 style="font-size: 1.25rem; color: var(--slate-800); margin: 0;">${loc.invalidTitle}</h3>
        </div>
      </div>
      <p style="font-size: 0.95rem; color: var(--slate-600); margin: 0;">${loc.invalidDesc}</p>
    </div>
  `;
}

/**
 * Renderiza el payload JSON en el tab de desarrollador con syntax highlighting
 */
function renderJsonInspector(result) {
  const jsonPre = document.getElementById('jsonPayloadPre');
  const statusBadge = document.getElementById('jsonHttpStatusBadge');
  const latencyMeta = document.getElementById('jsonLatencyMeta');
  const traceMeta = document.getElementById('jsonTraceMeta');

  if (statusBadge) {
    statusBadge.textContent = `HTTP ${result.httpStatus} ${result.ok ? 'OK' : 'ERR'}`;
    statusBadge.className = `badge ${result.ok ? 'badge-emerald' : 'badge-crimson'}`;
  }

  if (latencyMeta) {
    latencyMeta.textContent = `Latencia: ${result.latencyMs}ms`;
  }

  if (traceMeta) {
    traceMeta.textContent = `Trace ID: ${result.traceId || 'N/A'}`;
  }

  if (jsonPre) {
    const fullRepresentation = {
      _securityHeaders: {
        'X-Shield-Signature': result.signature,
        'X-RateLimit-Limit': 100,
        'X-RateLimit-Remaining': 98,
        'X-RateLimit-Reset': 1761652800,
        'X-Content-Type-Options': 'nosniff'
      },
      ...result.payload
    };

    const rawJson = JSON.stringify(fullRepresentation, null, 2);
    jsonPre.innerHTML = syntaxHighlightJson(rawJson);
  }
}

function syntaxHighlightJson(json) {
  json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
    let cls = 'json-number';
    if (/^"/.test(match)) {
      if (/:$/.test(match)) {
        cls = 'json-key';
      } else {
        cls = 'json-string';
      }
    } else if (/true|false/.test(match)) {
      cls = 'json-boolean';
    } else if (/null/.test(match)) {
      cls = 'json-null';
    }
    return '<span class="' + cls + '">' + match + '</span>';
  });
}

/**
 * Registra cada validación en la tabla de auditoría en vivo
 */
function recordAuditLog(result) {
  const entry = {
    id: result.traceId || Date.now().toString(),
    time: new Date().toLocaleTimeString(),
    token: result.payload?.token || 'UNKNOWN',
    status: result.payload?.verdict || 'REJECTED',
    latency: `${result.latencyMs}ms`,
    httpStatus: result.httpStatus,
    ok: result.ok
  };

  state.auditLog.unshift(entry);
  renderAuditTable();
}

function renderAuditTable() {
  const tbody = document.getElementById('auditTableBody');
  if (!tbody) return;

  if (state.auditLog.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: var(--slate-500); padding: 2.5rem;">
          ${translations[state.currentLang].simulator.auditTable.empty}
        </td>
      </tr>
    `;
    return;
  }

  const statusBadges = {
    'WINNER': '<span class="badge badge-emerald">WINNER</span>',
    'TRY_AGAIN': '<span class="badge badge-cyan">TRY_AGAIN</span>',
    'ALREADY_REDEEMED': '<span class="badge badge-crimson">ALREADY_USED</span>',
    'UNRECOGNIZED_TOKEN': '<span class="badge badge-crimson">INVALID</span>',
    'REDEEMED_SUCCESSFULLY': '<span class="badge badge-emerald">VOUCHER_ISSUED</span>'
  };

  tbody.innerHTML = state.auditLog.slice(0, 15).map(log => `
    <tr>
      <td class="font-mono" style="font-size: 0.8rem; color: #64748B;">${log.time}</td>
      <td class="font-mono" style="font-weight: 600;">${log.token}</td>
      <td>${statusBadges[log.status] || log.status}</td>
      <td class="font-mono" style="color: #0284C7;">${log.latency}</td>
      <td style="font-size: 0.8rem; color: var(--slate-600);">HTTP ${log.httpStatus} • Trace #${log.id.slice(0, 8)}</td>
    </tr>
  `).join('');
}

// ============================================================================
// Cámara Web / Smartphone Scanner Integrado
// ============================================================================
async function toggleCameraScanner() {
  if (state.isCameraActive) {
    stopCameraScanner();
  } else {
    startCameraScanner();
  }
}

async function startCameraScanner() {
  const container = document.getElementById('cameraContainer');
  const btnText = document.getElementById('cameraBtnText');
  const loc = translations[state.currentLang].simulator.manualInput;

  container?.classList.add('open');
  if (btnText) btnText.textContent = loc.stopCameraBtn;
  state.isCameraActive = true;

  try {
    if (!state.html5QrCodeScanner) {
      state.html5QrCodeScanner = new Html5Qrcode('cameraReader');
    }

    const config = { fps: 10, qrbox: { width: 220, height: 220 } };

    await state.html5QrCodeScanner.start(
      { facingMode: 'environment' },
      config,
      (decodedText) => {
        // Al detectar un código QR exitosamente:
        stopCameraScanner();
        triggerValidation(decodedText);
      },
      () => {
        // Ignorar frames sin QR
      }
    );
  } catch (err) {
    console.warn('No se pudo acceder a la cámara o permisos denegados:', err);
    alert(state.currentLang === 'es'
      ? 'No se pudo activar la cámara web/móvil (verifica los permisos del navegador). Puedes utilizar los botones de prueba o escribir el código manualmente.'
      : 'Could not activate camera (check browser permissions). You can use test preset buttons or enter codes manually.');
    stopCameraScanner();
  }
}

async function stopCameraScanner() {
  const container = document.getElementById('cameraContainer');
  const btnText = document.getElementById('cameraBtnText');
  const loc = translations[state.currentLang].simulator.manualInput;

  container?.classList.remove('open');
  if (btnText) btnText.textContent = loc.cameraBtn;
  state.isCameraActive = false;

  if (state.html5QrCodeScanner && state.html5QrCodeScanner.isScanning) {
    try {
      await state.html5QrCodeScanner.stop();
    } catch (err) {
      console.warn('Error al detener cámara:', err);
    }
  }
}

// ============================================================================
// Modales y Flujo de Canje Seguro
// ============================================================================
function initModals() {
  // Modal de Canje
  const claimModal = document.getElementById('claimModal');
  const btnCloseClaimModal = document.getElementById('btnCloseClaimModal');
  const btnCloseVoucherDone = document.getElementById('btnCloseVoucherDone');
  const claimForm = document.getElementById('claimPrizeForm');

  btnCloseClaimModal?.addEventListener('click', () => claimModal?.close());
  btnCloseVoucherDone?.addEventListener('click', () => claimModal?.close());

  // Light dismiss: cerrar al hacer clic en el backdrop
  claimModal?.addEventListener('click', (e) => {
    if (e.target === claimModal) claimModal.close();
  });

  claimForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleClaimSubmission();
  });

  // Modal de Arquitectura API
  const archModal = document.getElementById('archModal');
  const btnNavArch = document.getElementById('navArchLink');
  const btnOpenArch = document.getElementById('btnOpenArchModal');
  const btnCloseArch = document.getElementById('btnCloseArchModal');
  const btnCloseArchBottom = document.getElementById('btnCloseArchBottom');

  const openArch = (e) => {
    e.preventDefault();
    archModal?.showModal();
  };

  btnNavArch?.addEventListener('click', openArch);
  btnOpenArch?.addEventListener('click', openArch);
  btnCloseArch?.addEventListener('click', () => archModal?.close());
  btnCloseArchBottom?.addEventListener('click', () => archModal?.close());
  archModal?.addEventListener('click', (e) => {
    if (e.target === archModal) archModal.close();
  });

  // Modal de Propuesta Comercial
  const contactModal = document.getElementById('contactModal');
  const btnOpenProposal = document.getElementById('btnOpenProposalModal');
  const btnCloseContact = document.getElementById('btnCloseContactModal');
  const contactForm = document.getElementById('contactProposalForm');

  btnOpenProposal?.addEventListener('click', () => contactModal?.showModal());
  btnCloseContact?.addEventListener('click', () => contactModal?.close());
  contactModal?.addEventListener('click', (e) => {
    if (e.target === contactModal) contactModal.close();
  });

  contactForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const successMsg = document.getElementById('contactSuccessMsg');
    const submitBtn = document.getElementById('btnSubmitProposal');
    if (successMsg) successMsg.style.display = 'block';
    if (submitBtn) submitBtn.style.display = 'none';

    setTimeout(() => {
      contactModal?.close();
      if (successMsg) successMsg.style.display = 'none';
      if (submitBtn) submitBtn.style.display = 'block';
      contactForm.reset();
    }, 2500);
  });
}

function openClaimModal() {
  if (!state.activeWinnerData) {
    state.activeWinnerData = {
      token: 'SHIELD-WIN-9021',
      prize: {
        title: 'Pantalla Smart TV 65" 4K UHD Neo QLED + Barra de Sonido Dolby Atmos',
        titleEn: 'Smart TV 65" 4K UHD Neo QLED + Dolby Atmos Soundbar'
      }
    };
  }
  const modal = document.getElementById('claimModal');
  const tokenDisplay = document.getElementById('modalClaimTokenDisplay');
  const prizeDisplay = document.getElementById('modalClaimPrizeDisplay');
  const formStep = document.getElementById('claimFormStep');
  const voucherSuccess = document.getElementById('claimVoucherSuccess');

  if (tokenDisplay) tokenDisplay.textContent = state.activeWinnerData.token;
  if (prizeDisplay) {
    const p = state.activeWinnerData.prize;
    prizeDisplay.textContent = state.currentLang === 'en' ? (p?.titleEn || p?.title) : p?.title;
  }

  // Restaurar vista de formulario
  if (formStep) formStep.style.display = 'block';
  if (voucherSuccess) voucherSuccess.style.display = 'none';

  modal?.showModal();
}

async function handleClaimSubmission() {
  const fullName = document.getElementById('claimFullName')?.value;
  const idNumber = document.getElementById('claimIdNumber')?.value;
  const email = document.getElementById('claimEmail')?.value;
  const phone = document.getElementById('claimPhone')?.value;

  const winnerData = { fullName, idNumber, email, phone };
  const token = state.activeWinnerData?.token;

  const submitBtn = document.getElementById('btnSubmitClaim');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = state.currentLang === 'es' ? 'Validando con el servidor...' : 'Verifying with server...';
  }

  try {
    const response = await redeemPrize(token, winnerData);
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = translations[state.currentLang].claimModal.submitBtn;
    }

    // Mostrar Comprobante Digital emitido
    const formStep = document.getElementById('claimFormStep');
    const voucherSuccess = document.getElementById('claimVoucherSuccess');
    const codeDisplay = document.getElementById('voucherCodeDisplay');
    const nameDisplay = document.getElementById('voucherHolderName');
    const idDisplay = document.getElementById('voucherHolderId');
    const prizeDisplay = document.getElementById('voucherPrizeName');
    const hashDisplay = document.getElementById('voucherHashDisplay');

    if (formStep) formStep.style.display = 'none';
    if (voucherSuccess) voucherSuccess.style.display = 'block';

    if (codeDisplay) codeDisplay.textContent = response.payload.voucherCode;
    if (nameDisplay) nameDisplay.textContent = fullName;
    if (idDisplay) idDisplay.textContent = `Doc: ${idNumber} • Tel: ${phone}`;
    if (prizeDisplay) {
      const p = state.activeWinnerData.prize;
      prizeDisplay.textContent = state.currentLang === 'en' ? (p?.titleEn || p?.title) : p?.title;
    }
    if (hashDisplay) hashDisplay.textContent = response.payload.voucherHash;

    // Registrar en auditoría
    recordAuditLog({
      traceId: response.payload.voucherCode,
      latencyMs: response.latencyMs,
      httpStatus: 200,
      ok: true,
      payload: {
        token,
        verdict: 'REDEEMED_SUCCESSFULLY'
      }
    });

    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.5 }
    });

  } catch (err) {
    console.error('Error al redimir premio:', err);
    if (submitBtn) submitBtn.disabled = false;
  }
}

// ============================================================================
// Detección de Parámetro de URL (?token=...)
// ============================================================================
function initUrlQueryHandler() {
  const params = new URLSearchParams(window.location.search);
  const tokenParam = params.get('token');
  if (tokenParam) {
    setTimeout(() => {
      const simulatorEl = document.getElementById('simulator');
      simulatorEl?.scrollIntoView({ behavior: 'smooth' });
      triggerValidation(tokenParam);
    }, 600);
  }
}

// ============================================================================
// Menú de Navegación Móvil (Optimizado para iPhone 16 Plus y Smartphones)
// ============================================================================
function initMobileNav() {
  const menuBtn = document.getElementById('mobileMenuBtn');
  const drawer = document.getElementById('mobileNavDrawer');
  const batchModal = document.getElementById('batchModal');
  const archModal = document.getElementById('archModal');

  function toggleMenu(forceClose = false) {
    if (!menuBtn || !drawer) return;
    const shouldOpen = forceClose ? false : !drawer.classList.contains('is-open');
    if (shouldOpen) {
      drawer.classList.add('is-open');
      menuBtn.classList.add('is-active');
      menuBtn.setAttribute('aria-expanded', 'true');
      drawer.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    } else {
      drawer.classList.remove('is-open');
      menuBtn.classList.remove('is-active');
      menuBtn.setAttribute('aria-expanded', 'false');
      drawer.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  }

  menuBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  // Enlaces de navegación dentro del drawer móvil
  document.querySelectorAll('.mobile-nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      const id = link.id;
      const href = link.getAttribute('href');

      if (id === 'mobileNavBatchLink') {
        e.preventDefault();
        toggleMenu(true);
        if (window.openBatchModal) window.openBatchModal();
        else batchModal?.showModal();
        return;
      }

      if (id === 'mobileNavArchLink') {
        e.preventDefault();
        toggleMenu(true);
        archModal?.showModal();
        return;
      }

      if (href && href.startsWith('#')) {
        toggleMenu(true);
      }
    });
  });

  document.getElementById('mobileNavCtaBtn')?.addEventListener('click', () => {
    toggleMenu(true);
  });
}

// ============================================================================
// Centro de Operaciones: Generador Masivo, Excel/CSV y Personalización
// ============================================================================
let currentGeneratedBatch = [];
let activeCustomLogoUrl = null;

const logoPresets = {
  shield: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" stroke-width="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>`,
  drinks: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2.2"><path d="M8 2h8v4l-2 2v12a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V8L4 6V2h4z"/><line x1="6" y1="12" x2="14" y2="12"/></svg>`,
  retail: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
  bank: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2.2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`,
  star: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" stroke-width="2.2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`
};

function initBatchOperations() {
  const batchModal = document.getElementById('batchModal');
  const btnNavBatch = document.getElementById('navBatchLink');
  const btnCloseBatch = document.getElementById('btnCloseBatchModal');

  btnNavBatch?.addEventListener('click', (e) => {
    e.preventDefault();
    batchModal?.showModal();
    if (currentGeneratedBatch.length === 0) {
      generateBatchTokens('ANDINA', 24);
    }
  });

  window.openBatchModal = () => {
    batchModal?.showModal();
    if (currentGeneratedBatch.length === 0) {
      const brand = document.getElementById('brandNameInput')?.value.trim() || 'ANDINA';
      const prefix = brand.replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase() || 'ANDINA';
      generateBatchTokens(prefix, 24);
    }
  };

  btnCloseBatch?.addEventListener('click', () => batchModal?.close());
  batchModal?.addEventListener('click', (e) => {
    if (e.target === batchModal) batchModal.close();
  });

  // Tabs switcher: theme | csv | print
  const tabs = [
    { btn: 'btnBatchTabTheme', pane: 'batchPaneTheme' },
    { btn: 'btnBatchTabCsv', pane: 'batchPaneCsv' },
    { btn: 'btnBatchTabPrint', pane: 'batchPanePrint' }
  ];

  tabs.forEach(t => {
    document.getElementById(t.btn)?.addEventListener('click', () => {
      tabs.forEach(other => {
        document.getElementById(other.btn)?.classList.remove('active');
        const p = document.getElementById(other.pane);
        if (p) p.style.display = 'none';
      });
      document.getElementById(t.btn)?.classList.add('active');
      const targetPane = document.getElementById(t.pane);
      if (targetPane) targetPane.style.display = 'block';

      if (t.pane === 'batchPanePrint') {
        renderPrintSheet(currentGeneratedBatch);
      }
    });
  });

  // Tab 1: Theming & Logo Customization Engine
  const colorPresets = document.querySelectorAll('.color-preset-btn');
  const customColorInput = document.getElementById('brandCustomColor');
  let selectedPrimaryColor = '#0B192C';

  colorPresets.forEach(btn => {
    btn.addEventListener('click', () => {
      colorPresets.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedPrimaryColor = btn.getAttribute('data-color');
      if (customColorInput) customColorInput.value = selectedPrimaryColor;
    });
  });

  customColorInput?.addEventListener('input', (e) => {
    selectedPrimaryColor = e.target.value;
    colorPresets.forEach(b => b.classList.remove('active'));
  });

  // Logo Customizer controls
  const brandLogoFileInput = document.getElementById('brandLogoFileInput');
  const brandLogoPreviewImg = document.getElementById('currentBrandLogoImg');
  const defaultBrandLogoIcon = document.getElementById('defaultBrandLogoIcon');
  const btnRemoveLogo = document.getElementById('btnRemoveLogo');
  const brandNameInput = document.getElementById('brandNameInput');
  const batchPrefixInput = document.getElementById('batchPrefixInput');

  // Auto-sincronizar prefijo de campaña según el nombre de la empresa
  brandNameInput?.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    if (val && batchPrefixInput) {
      const autoPrefix = val.replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase();
      batchPrefixInput.value = autoPrefix || 'PROMO';
    }
  });

  // Subir archivo de logo
  brandLogoFileInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        activeCustomLogoUrl = loadEvt.target.result;
        if (brandLogoPreviewImg && defaultBrandLogoIcon) {
          brandLogoPreviewImg.src = activeCustomLogoUrl;
          brandLogoPreviewImg.style.display = 'block';
          defaultBrandLogoIcon.style.display = 'none';
        }
        if (btnRemoveLogo) btnRemoveLogo.style.display = 'inline-block';
        document.querySelectorAll('.logo-preset-btn').forEach(b => b.classList.remove('active'));
      };
      reader.readAsDataURL(file);
    }
  });

  // Preset Logos de Industria
  document.querySelectorAll('.logo-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.logo-preset-btn').forEach(b => {
        b.classList.remove('active');
        b.style.borderColor = 'var(--slate-300)';
        b.style.background = '#FFF';
        b.style.fontWeight = 'normal';
      });
      btn.classList.add('active');
      btn.style.borderColor = 'var(--cyan-500)';
      btn.style.background = 'rgba(14, 165, 233, 0.1)';
      btn.style.fontWeight = '600';

      const presetKey = btn.getAttribute('data-preset');
      if (defaultBrandLogoIcon && brandLogoPreviewImg) {
        defaultBrandLogoIcon.innerHTML = logoPresets[presetKey] || logoPresets.shield;
        defaultBrandLogoIcon.style.display = 'flex';
        brandLogoPreviewImg.style.display = 'none';
        activeCustomLogoUrl = null;
      }
      if (btnRemoveLogo) btnRemoveLogo.style.display = 'none';
    });
  });

  btnRemoveLogo?.addEventListener('click', () => {
    activeCustomLogoUrl = null;
    if (brandLogoPreviewImg && defaultBrandLogoIcon) {
      brandLogoPreviewImg.style.display = 'none';
      defaultBrandLogoIcon.style.display = 'flex';
      defaultBrandLogoIcon.innerHTML = logoPresets.shield;
    }
    btnRemoveLogo.style.display = 'none';
    if (brandLogoFileInput) brandLogoFileInput.value = '';
  });

  // Botón Aplicar Tema e Identidad de Marca
  document.getElementById('btnApplyTheme')?.addEventListener('click', () => {
    const brandName = document.getElementById('brandNameInput')?.value.trim() || 'QR Shield Promo';
    const headline = document.getElementById('headlineCustomInput')?.value.trim();

    // Actualizar nombre de marca en navbar
    const brandTitleEl = document.querySelector('.brand-text h1');
    if (brandTitleEl) brandTitleEl.textContent = brandName;

    // Actualizar logotipo en Navbar y Hero
    const navbarLogoEl = document.querySelector('.brand-logo-icon');
    if (navbarLogoEl) {
      if (activeCustomLogoUrl) {
        navbarLogoEl.innerHTML = `<img src="${activeCustomLogoUrl}" alt="${brandName}" style="width: 100%; height: 100%; object-fit: contain; border-radius: 6px;" />`;
      } else {
        const activePreset = document.querySelector('.logo-preset-btn.active')?.getAttribute('data-preset') || 'shield';
        navbarLogoEl.innerHTML = logoPresets[activePreset] || logoPresets.shield;
      }
    }

    // Actualizar color primario CSS tokens
    document.documentElement.style.setProperty('--navy-dark', selectedPrimaryColor);
    document.documentElement.style.setProperty('--navy-darkest', selectedPrimaryColor);
    document.documentElement.style.setProperty('--cyan-500', selectedPrimaryColor === '#0B192C' ? '#0EA5E9' : selectedPrimaryColor);

    // Actualizar titular en hero si fue personalizado
    if (headline) {
      const heroHighlight = document.querySelector('.hero-gradient-text');
      if (heroHighlight) heroHighlight.textContent = headline;
    }

    // Sincronizar prefijo de campaña y regenerar códigos con el nuevo nombre de la empresa
    const autoPrefix = brandName.replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase() || 'PROMO';
    const prefixInput = document.getElementById('batchPrefixInput');
    if (prefixInput) prefixInput.value = autoPrefix;

    const qty = parseInt(document.getElementById('batchQtySelect')?.value || '24', 10);
    generateBatchTokens(autoPrefix, qty);

    const successMsg = document.getElementById('themeSuccessMsg');
    if (successMsg) {
      successMsg.style.display = 'block';
      setTimeout(() => { successMsg.style.display = 'none'; }, 3000);
    }
  });

  // Tab 2: Batch Generation & CSV Download
  document.getElementById('btnGenerateBatchAction')?.addEventListener('click', () => {
    const prefix = document.getElementById('batchPrefixInput')?.value.trim() || 'ANDINA';
    const qty = parseInt(document.getElementById('batchQtySelect')?.value || '24', 10);
    generateBatchTokens(prefix, qty);
  });

  document.getElementById('btnDownloadCsvAction')?.addEventListener('click', () => {
    downloadBatchCsv();
  });

  // Tab 3: PDF Direct Download & Print Sheet Actions
  document.getElementById('btnDownloadPdfAction')?.addEventListener('click', () => {
    downloadDirectPdf();
  });

  document.getElementById('btnPrintSheetAction')?.addEventListener('click', () => {
    openCleanPrintWindow();
  });
}

function generateBatchTokens(prefix, count) {
  const brandName = document.getElementById('brandNameInput')?.value.trim() || 'Refrescos Andina';
  const cleanPrefix = (prefix || brandName.replace(/[^A-Za-z0-9]/g, '').slice(0, 8) || 'PROMO').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const tokens = [];
  const baseScanUrl = `${window.location.origin}${window.location.pathname}`;

  for (let i = 1; i <= count; i++) {
    const randomHex = Math.random().toString(36).substring(2, 7).toUpperCase();
    const token = `${cleanPrefix}-${randomHex}-${String(i).padStart(4, '0')}`;
    const scanUrl = `${baseScanUrl}?token=${token}`;
    const isWinner = (i % 5 === 0); // 1 de cada 5 es ganador
    const prizeType = isWinner ? `PREMIADO (${brandName})` : 'PARTICIPACIÓN VÁLIDA';
    const hash = `SHA256-${Math.random().toString(16).substring(2, 10).toUpperCase()}${Date.now().toString(16).toUpperCase()}`;

    tokens.push({
      id: i,
      token,
      scanUrl,
      isWinner,
      prizeType,
      hash,
      createdAt: new Date().toISOString()
    });
  }

  currentGeneratedBatch = tokens;

  // REGISTRAR INMEDIATAMENTE EN LA BASE DE DATOS DE VALIDACIÓN
  // Esto garantiza que al escanearlos la API los reconozca al 100% de inmediato.
  registerBatchInDatabase(tokens, brandName);

  renderBatchTable(tokens);
}

function renderBatchTable(tokens) {
  const tbody = document.getElementById('batchTableBody');
  if (!tbody) return;

  tbody.innerHTML = tokens.map(t => `
    <tr>
      <td class="font-mono">${t.id}</td>
      <td class="font-mono" style="font-weight: 700; color: #0284C7;">${t.token}</td>
      <td class="font-mono" style="font-size: 0.7rem; color: #64748B; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${t.scanUrl}</td>
      <td>
        <span class="badge ${t.isWinner ? 'badge-emerald' : 'badge-cyan'}" style="font-size: 0.65rem;">
          ${t.prizeType}
        </span>
      </td>
      <td class="font-mono" style="font-size: 0.65rem; color: #94A3B8;">${t.hash.slice(0, 16)}...</td>
    </tr>
  `).join('');
}

function downloadBatchCsv() {
  if (!currentGeneratedBatch || currentGeneratedBatch.length === 0) {
    const brandName = document.getElementById('brandNameInput')?.value.trim() || 'ANDINA';
    const autoPrefix = brandName.replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase() || 'ANDINA';
    generateBatchTokens(autoPrefix, 24);
  }

  const prefix = document.getElementById('batchPrefixInput')?.value.trim() || 'PROMO';
  const headers = ['ID_Serie', 'Token_Criptografico', 'URL_Escaneo_QR', 'Tipo_Asignado', 'Hash_Seguridad_SHA256', 'Fecha_Creacion_UTC'];

  const rows = currentGeneratedBatch.map(item => [
    item.id,
    item.token,
    `"${item.scanUrl}"`,
    `"${item.prizeType}"`,
    item.hash,
    item.createdAt
  ]);

  // Agregar BOM (\uFEFF) para compatibilidad total con acentos en Microsoft Excel
  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Lote_VDP_Industrial_${prefix}_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Renderiza la vista previa interactiva dentro del modal usando etiquetas <img>
 * con Data URLs para máxima nitidez y rendimiento sin bloqueos de renderizado.
 */
async function renderPrintSheet(tokens) {
  const container = document.getElementById('printSheetGrid');
  if (!container) return;

  const brandName = document.getElementById('brandNameInput')?.value.trim() || 'Refrescos Andina';

  container.innerHTML = `
    <div style="grid-column: 1 / -1; text-align: center; padding: 2.5rem; color: var(--slate-500);">
      <div style="display: inline-block; width: 28px; height: 28px; border: 3px solid rgba(14, 165, 233, 0.2); border-top-color: #0EA5E9; border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 0.75rem;"></div>
      <div style="font-size: 0.85rem; font-weight: 600; color: var(--slate-700);">Generando códigos QR de alta resolución (300 DPI)...</div>
    </div>
  `;

  try {
    const ticketPromises = tokens.map(async (t) => {
      const qrDataUrl = await QRCode.toDataURL(t.scanUrl, {
        width: 260,
        margin: 1,
        color: { dark: '#0B192C', light: '#FFFFFF' }
      });

      return `
        <div class="print-ticket-item">
          <div class="print-ticket-brand">
            ${activeCustomLogoUrl ? `<img src="${activeCustomLogoUrl}" class="print-ticket-brand-logo" alt="Logo" />` : ''}
            <span>${brandName}</span>
          </div>
          <div class="print-ticket-qr">
            <img src="${qrDataUrl}" alt="${t.token}" width="90" height="90" loading="lazy" />
          </div>
          <div class="print-ticket-brand-badge">${brandName.toUpperCase()}</div>
          <div class="print-ticket-code">${t.token}</div>
          <div class="print-ticket-scratch">Escanee para validar</div>
        </div>
      `;
    });

    const cardsHtml = await Promise.all(ticketPromises);
    container.innerHTML = cardsHtml.join('');
  } catch (err) {
    console.error('Error generando vista previa de impresión:', err);
    container.innerHTML = `<div style="grid-column: 1 / -1; color: #DC2626; text-align: center;">Error generando códigos QR: ${err.message}</div>`;
  }
}

/**
 * Genera y descarga directamente un archivo .PDF de alta fidelidad vectorial
 * con cuadrícula 3x4 (12 boletos por hoja carta), marcas de corte y encabezados corporativos.
 */
async function downloadDirectPdf() {
  if (!currentGeneratedBatch || currentGeneratedBatch.length === 0) {
    const brandName = document.getElementById('brandNameInput')?.value.trim() || 'Refrescos Andina';
    const autoPrefix = brandName.replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase() || 'ANDINA';
    const qty = parseInt(document.getElementById('batchQtySelect')?.value || '24', 10);
    generateBatchTokens(autoPrefix, qty);
  }

  const tokens = currentGeneratedBatch;
  const brandName = document.getElementById('brandNameInput')?.value.trim() || 'Refrescos Andina';
  const prefix = document.getElementById('batchPrefixInput')?.value.trim() || 'PROMO';
  const btn = document.getElementById('btnDownloadPdfAction');
  const statusMsg = document.getElementById('pdfStatusMsg');

  // Estado de carga visual en el botón
  const originalBtnHtml = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.style.opacity = '0.75';
    btn.innerHTML = `
      <div style="display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255, 255, 255, 0.3); border-top-color: #FFFFFF; border-radius: 50%; animation: spin 0.8s linear infinite; margin-right: 6px; vertical-align: middle;"></div>
      <span>${t('batchModal.btnDownloadPdfLoading')}</span>
    `;
  }
  if (statusMsg) {
    statusMsg.style.display = 'inline-block';
    statusMsg.textContent = 'Renderizando vectores QR a 300 DPI...';
  }

  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter' // 215.9 x 279.4 mm
    });

    const pageWidth = 215.9;
    const marginX = 12;
    const marginTop = 22;
    const cols = 3;
    const rows = 4;
    const ticketsPerPage = cols * rows; // 12 boletos por pliego
    const totalPages = Math.ceil(tokens.length / ticketsPerPage);

    const ticketWidth = 60; // 60 mm de ancho
    const ticketHeight = 58; // 58 mm de alto
    const gapX = (pageWidth - (marginX * 2) - (cols * ticketWidth)) / (cols - 1); // ~5.95 mm
    const gapY = 4.5; // 4.5 mm entre filas

    for (let i = 0; i < tokens.length; i++) {
      const pageIndex = Math.floor(i / ticketsPerPage);
      const ticketInPageIndex = i % ticketsPerPage;

      if (ticketInPageIndex === 0 && pageIndex > 0) {
        doc.addPage('letter', 'portrait');
      }

      // Encabezado de página
      if (ticketInPageIndex === 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(11, 25, 44);
        doc.text(`${brandName.toUpperCase()} — PLANILLA DE CÓDIGOS QR SEGUROS`, marginX, 10);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        const metaStr = `Lote: ${prefix} | Total Códigos: ${tokens.length} | Pág. ${pageIndex + 1} de ${totalPages} | Criptografía SHA-256 Anti-Fraude`;
        doc.text(metaStr, marginX, 15);

        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.3);
        doc.line(marginX, 17, pageWidth - marginX, 17);
      }

      const col = ticketInPageIndex % cols;
      const row = Math.floor(ticketInPageIndex / cols);
      const x = marginX + col * (ticketWidth + gapX);
      const y = marginTop + row * (ticketHeight + gapY);

      const token = tokens[i];

      // Borde punteado de corte perimetral
      doc.setDrawColor(180, 195, 215);
      doc.setLineWidth(0.25);
      doc.setLineDashPattern([2, 1], 0);
      doc.roundedRect(x, y, ticketWidth, ticketHeight, 1.5, 1.5, 'S');
      doc.setLineDashPattern([], 0);

      // Marca o Nombre del cliente en cabecera del boleto
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      const truncatedBrand = brandName.length > 22 ? brandName.slice(0, 20) + '...' : brandName;
      doc.text(truncatedBrand.toUpperCase(), x + ticketWidth / 2, y + 5.5, { align: 'center' });

      // Generación de QR nítido a 300 DPI
      const qrDataUrl = await QRCode.toDataURL(token.scanUrl, {
        width: 320,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: { dark: '#0B192C', light: '#FFFFFF' }
      });

      const qrSize = 31; // 31 mm
      const qrX = x + (ticketWidth - qrSize) / 2;
      const qrY = y + 7.5;
      doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

      // Nombre de la Empresa encima del código
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(2, 132, 199);
      doc.text(truncatedBrand.toUpperCase(), x + ticketWidth / 2, y + 41, { align: 'center' });

      // Caja del Código Token
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(x + 5, y + 42.5, ticketWidth - 10, 5.2, 1, 1, 'F');

      doc.setFont('courier', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(11, 25, 44);
      doc.text(token.token, x + ticketWidth / 2, y + 46.2, { align: 'center' });

      // Instrucción requerida: "Escanee para validar"
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(71, 85, 105);
      doc.text('Escanee para validar', x + ticketWidth / 2, y + 51.5, { align: 'center' });

      // Firma forense / anti-falsificación
      doc.setFont('courier', 'normal');
      doc.setFontSize(5);
      doc.setTextColor(148, 163, 184);
      doc.text(`ID #${token.id} · ${token.hash.slice(0, 14)}`, x + ticketWidth / 2, y + 55, { align: 'center' });
    }

    // Descargar archivo PDF generado
    const safeBrand = brandName.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Planilla_QRs_${safeBrand}_${prefix}_${Date.now()}.pdf`;
    doc.save(filename);

    if (statusMsg) {
      statusMsg.textContent = '¡PDF descargado con éxito!';
      setTimeout(() => {
        statusMsg.style.display = 'none';
      }, 4000);
    }
  } catch (err) {
    console.error('Error generando PDF con jsPDF:', err);
    alert('Ocurrió un error al generar el archivo PDF: ' + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.innerHTML = originalBtnHtml;
    }
  }
}

/**
 * Abre una ventana emergente limpia e independiente con formato carta exacto
 * sin interferencia de estilos de modal ni límites de scroll para impresión física.
 */
async function openCleanPrintWindow() {
  if (!currentGeneratedBatch || currentGeneratedBatch.length === 0) {
    const brandName = document.getElementById('brandNameInput')?.value.trim() || 'Refrescos Andina';
    const autoPrefix = brandName.replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase() || 'ANDINA';
    generateBatchTokens(autoPrefix, 24);
  }

  const tokens = currentGeneratedBatch;
  const brandName = document.getElementById('brandNameInput')?.value.trim() || 'Refrescos Andina';
  const prefix = document.getElementById('batchPrefixInput')?.value.trim() || 'PROMO';

  const printWindow = window.open('', '_blank', 'width=950,height=800');
  if (!printWindow) {
    window.print();
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Impresión de Códigos QR - ${brandName}</title>
      <style>
        @page {
          size: letter portrait;
          margin: 10mm;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: #FFFFFF;
          color: #0F172A;
          padding: 10mm;
        }
        .header {
          border-bottom: 2px solid #CBD5E1;
          padding-bottom: 8px;
          margin-bottom: 16px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        .header h1 {
          font-size: 14pt;
          font-weight: 800;
          color: #0B192C;
          text-transform: uppercase;
        }
        .header p {
          font-size: 8pt;
          color: #64748B;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px 10px;
        }
        .ticket {
          border: 1px dashed #94A3B8;
          border-radius: 6px;
          padding: 8px 6px;
          text-align: center;
          background: #FFFFFF;
          break-inside: avoid;
          page-break-inside: avoid;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          height: 195px;
        }
        .ticket-brand {
          font-size: 7.5pt;
          font-weight: 800;
          text-transform: uppercase;
          color: #0F172A;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .ticket-qr img {
          width: 95px;
          height: 95px;
          display: block;
          margin: 4px auto;
        }
        .ticket-brand-badge {
          font-size: 6.5pt;
          font-weight: 800;
          text-transform: uppercase;
          color: #0284C7;
          margin-bottom: 2px;
        }
        .ticket-code {
          font-family: monospace;
          font-size: 8pt;
          font-weight: bold;
          background: #F1F5F9;
          padding: 2px 6px;
          border-radius: 3px;
          color: #0B192C;
          width: 90%;
        }
        .ticket-scratch {
          font-size: 7pt;
          font-weight: bold;
          color: #475569;
          border-top: 1px dotted #CBD5E1;
          padding-top: 3px;
          margin-top: 3px;
          width: 100%;
        }
        .ticket-hash {
          font-family: monospace;
          font-size: 5pt;
          color: #94A3B8;
        }
        .no-print-bar {
          background: #0B192C;
          color: #FFFFFF;
          padding: 10px 16px;
          border-radius: 6px;
          margin-bottom: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .btn-print {
          background: #10B981;
          color: #FFFFFF;
          border: none;
          padding: 8px 16px;
          font-size: 10pt;
          font-weight: bold;
          border-radius: 4px;
          cursor: pointer;
        }
        @media print {
          .no-print-bar { display: none !important; }
          body { padding: 0 !important; }
        }
      </style>
    </head>
    <body>
      <div class="no-print-bar">
        <span>Vista previa de impresión limpia de alta fidelidad (${tokens.length} boletos)</span>
        <button class="btn-print" onclick="window.print()">🖨️ Enviar a Imprimir</button>
      </div>
      <div class="header">
        <div>
          <h1>${brandName} — Códigos QR Seguros</h1>
          <p>Lote: ${prefix} | Fecha: ${new Date().toLocaleDateString()} | Total: ${tokens.length} códigos</p>
        </div>
        <p style="text-align: right;">Criptografía SHA-256 Anti-Fraude</p>
      </div>
      <div class="grid" id="gridContainer">
        <p style="grid-column: 1 / -1; text-align: center; color: #64748B;">Cargando imágenes de alta resolución...</p>
      </div>
    </body>
    </html>
  `);

  printWindow.document.close();

  // Inyectar imágenes QR como data URLs en el popup
  const gridContainer = printWindow.document.getElementById('gridContainer');
  if (gridContainer) {
    gridContainer.innerHTML = '';
    for (const t of tokens) {
      const qrDataUrl = await QRCode.toDataURL(t.scanUrl, {
        width: 300,
        margin: 1,
        color: { dark: '#0B192C', light: '#FFFFFF' }
      });
      const ticketEl = printWindow.document.createElement('div');
      ticketEl.className = 'ticket';
      ticketEl.innerHTML = `
        <div class="ticket-brand">
          ${activeCustomLogoUrl ? `<img src="${activeCustomLogoUrl}" style="width: 14px; height: 14px; object-fit: contain;" />` : ''}
          <span>${brandName}</span>
        </div>
        <div class="ticket-qr">
          <img src="${qrDataUrl}" alt="${t.token}" />
        </div>
        <div class="ticket-brand-badge">${brandName.toUpperCase()}</div>
        <div class="ticket-code">${t.token}</div>
        <div class="ticket-scratch">Escanee para validar</div>
        <div class="ticket-hash">ID #${t.id} · ${t.hash.slice(0, 14)}</div>
      `;
      gridContainer.appendChild(ticketEl);
    }
  }
}

