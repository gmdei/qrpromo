/**
 * ============================================================================
 * QR Shield Promo - Servicio de Validación Criptográfica y Gestión de Tokens
 * ============================================================================
 * 
 * Capa de servicio encargada de la comunicación con el backend de validación.
 * Emula latencia de red real (600ms), cabeceras de seguridad criptográficas,
 * estados HTTP y contratos JSON listos para producción.
 * 
 * GUÍA DE PASO A PRODUCCIÓN:
 * Para conectar tu base de datos o API real:
 * 1. Modifica la constante `API_CONFIG.USE_MOCK` a `false`.
 * 2. Define `API_CONFIG.BASE_URL` apuntando a tu microservicio (ej. https://api.tuempresa.com/v1).
 * 3. Los métodos `validateToken` y `redeemPrize` ya contienen la estructura de llamada HTTP `fetch` comentada.
 */

export const API_CONFIG = {
  USE_MOCK: true,
  BASE_URL: 'https://api.qrshieldpromo.com/api/v1',
  SIMULATED_LATENCY_MS: 600,
  CLIENT_VERSION: '2.4.0-enterprise'
};

/**
 * Base de Datos en Memoria para el Sandbox
 * Simula el estado atómico de los tokens en la base de datos central.
 */
const mockTokenDatabase = {
  'SHIELD-WIN-9021': {
    token: 'SHIELD-WIN-9021',
    status: 'VALID',
    isWinner: true,
    prize: {
      id: 'PRZ-9021',
      title: 'Pantalla Smart TV 65" 4K UHD Neo QLED + Barra de Sonido Dolby Atmos',
      titleEn: 'Smart TV 65" 4K UHD Neo QLED + Dolby Atmos Soundbar',
      category: 'Tecnología Premium',
      categoryEn: 'Premium Tech',
      valueEstimate: '$1,200 USD',
      claimDeadline: '2026-12-31T23:59:59Z',
      securityVerificationCode: 'VERIF-WIN-9021-ALPHA'
    },
    redeemed: false,
    batchId: 'BATCH-2026-Q4-BEV',
    createdAt: '2026-10-01T08:00:00Z'
  },
  'SHIELD-TRY-4412': {
    token: 'SHIELD-TRY-4412',
    status: 'VALID',
    isWinner: false,
    prize: null,
    messageEs: 'Código auténtico registrado para el gran sorteo final de cierre de campaña.',
    messageEn: 'Authentic code logged for the grand end-of-campaign draw.',
    redeemed: false,
    batchId: 'BATCH-2026-Q4-BEV',
    createdAt: '2026-10-01T08:00:00Z'
  },
  'SHIELD-ERR-8492': {
    token: 'SHIELD-ERR-8492',
    status: 'ALREADY_REDEEMED',
    isWinner: true,
    prize: {
      id: 'PRZ-8492',
      title: 'Bono Digital de Compras $200 USD',
      titleEn: 'Digital Shopping Voucher $200 USD'
    },
    redeemed: true,
    redeemedAt: '2026-10-28T10:14:22Z',
    redemptionMetadata: {
      transactionId: 'TRX-8492-RED-SECURE',
      ipAddress: '190.24.89.142 (ISP Cifrado / Geo: Bogotá, CO)',
      deviceSignature: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X)',
      retailOutlet: 'Punto de Venta Autorizado #042 - Terminal 03'
    },
    batchId: 'BATCH-2026-Q4-BEV',
    createdAt: '2026-10-01T08:00:00Z'
  }
};

/**
 * Normaliza cualquier formato de token de entrada
 * (ej. 'WIN-9021', 'shield-win-9021', 'https://shield.com?token=WIN-9021')
 */
export function normalizeToken(rawInput) {
  if (!rawInput) return '';
  let clean = rawInput.trim();
  
  // Si el usuario pega una URL completa:
  if (clean.includes('token=')) {
    try {
      const url = new URL(clean, window.location.origin);
      clean = url.searchParams.get('token') || clean;
    } catch {
      const match = clean.match(/token=([A-Za-z0-9_-]+)/);
      if (match) clean = match[1];
    }
  }

  clean = clean.toUpperCase();
  if (!clean.startsWith('SHIELD-') && (clean.startsWith('WIN-') || clean.startsWith('TRY-') || clean.startsWith('ERR-'))) {
    clean = `SHIELD-${clean}`;
  }
  return clean;
}

/**
 * Genera un hash pseudoaleatorio que emula la firma HMAC SHA-256 del servidor
 */
function generateMockSignature(token, timestamp) {
  const seed = `${token}:${timestamp}:enterprise_salt_2026`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `sha256_${hex}f89a74c3e120bc9d${Date.now().toString(16)}`;
}

/**
 * Valida un token ante el servicio de seguridad
 * Emula respuesta con código de estado HTTP, latencia artificial y headers de auditoría.
 * 
 * @param {string} rawToken - Código o token a validar
 * @returns {Promise<ValidationResult>}
 */
export async function validateToken(rawToken) {
  const token = normalizeToken(rawToken);
  const startTime = performance.now();

  // ==========================================================================
  // TODO: PRODUCCIÓN - Descomentar y utilizar la llamada real con fetch:
  // ==========================================================================
  /*
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/tokens/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Version': API_CONFIG.CLIENT_VERSION,
        'Authorization': `Bearer ${sessionStorage.getItem('client_token') || ''}`
      },
      body: JSON.stringify({
        token,
        clientTimestamp: new Date().toISOString(),
        deviceFingerprint: navigator.userAgent
      })
    });
    const data = await response.json();
    return {
      status: response.status,
      ok: response.ok,
      latencyMs: Math.round(performance.now() - startTime),
      payload: data
    };
  } catch (error) {
    throw new Error(`Error en API de validación: ${error.message}`);
  }
  */

  // ==========================================================================
  // MOCK SANDBOX SIMULATOR:
  // ==========================================================================
  return new Promise((resolve) => {
    setTimeout(() => {
      const latencyMs = Math.round(performance.now() - startTime);
      const timestampIso = new Date().toISOString();
      const traceId = `TRX-${Math.floor(1000 + Math.random() * 9000)}-${Date.now().toString(36).toUpperCase()}`;
      const signature = generateMockSignature(token, timestampIso);

      const record = mockTokenDatabase[token];

      if (!token) {
        resolve({
          httpStatus: 400,
          ok: false,
          latencyMs,
          traceId,
          signature,
          payload: {
            success: false,
            error: {
              code: 'EMPTY_TOKEN',
              message: 'El código de token no puede estar vacío.'
            },
            timestamp: timestampIso
          }
        });
        return;
      }

      if (!record) {
        // Token no reconocido en la base de datos de la campaña
        resolve({
          httpStatus: 404,
          ok: false,
          latencyMs,
          traceId,
          signature,
          payload: {
            success: false,
            verdict: 'UNRECOGNIZED_TOKEN',
            token,
            error: {
              code: 'TOKEN_NOT_FOUND',
              message: 'El código ingresado no pertenece a ninguna serie autorizada de esta promoción o fue alterado.'
            },
            securityNote: 'Intento registrado en el firewall de auditoría.',
            timestamp: timestampIso
          }
        });
        return;
      }

      if (record.status === 'ALREADY_REDEEMED' || record.redeemed) {
        // Caso: Código ya utilizado
        resolve({
          httpStatus: 409, // Conflict / Duplicate
          ok: false,
          latencyMs,
          traceId,
          signature,
          payload: {
            success: false,
            verdict: 'ALREADY_REDEEMED',
            token: record.token,
            error: {
              code: 'TOKEN_DUPLICATE_USE',
              message: 'Este código ya fue validado y consumido con anterioridad.'
            },
            redemptionRecord: {
              redeemedAt: record.redeemedAt,
              transactionId: record.redemptionMetadata?.transactionId || traceId,
              ipAddress: record.redemptionMetadata?.ipAddress || '190.24.89.***',
              retailOutlet: record.redemptionMetadata?.retailOutlet || 'Punto de Venta Autorizado'
            },
            securityStatus: {
              atomicLockEngaged: true,
              tamperEvident: true,
              duplicatePrevented: true
            },
            timestamp: timestampIso
          }
        });
        return;
      }

      if (record.isWinner) {
        // Caso: Boleto Ganador
        resolve({
          httpStatus: 200,
          ok: true,
          latencyMs,
          traceId,
          signature,
          payload: {
            success: true,
            verdict: 'WINNER',
            token: record.token,
            isWinner: true,
            batchId: record.batchId,
            prize: record.prize,
            claimStatus: 'ELIGIBLE_FOR_REDEMPTION',
            verificationToken: record.prize.securityVerificationCode,
            securityStatus: {
              blindKeyValidated: true,
              antiBotPassed: true,
              budgetQuotaReserved: true
            },
            timestamp: timestampIso
          }
        });
        return;
      }

      // Caso: Boleto Sin Premio (Participación válida)
      resolve({
        httpStatus: 200,
        ok: true,
        latencyMs,
        traceId,
        signature,
        payload: {
          success: true,
          verdict: 'TRY_AGAIN',
          token: record.token,
          isWinner: false,
          batchId: record.batchId,
          prize: null,
          messageEs: record.messageEs,
          messageEn: record.messageEn,
          entryLogged: true,
          securityStatus: {
            blindKeyValidated: true,
            entryRecorded: true
          },
          timestamp: timestampIso
        }
      });
    }, API_CONFIG.SIMULATED_LATENCY_MS);
  });
}

/**
 * Canjea un premio ganador y lo vincula de forma intransferible a los datos del ganador.
 * 
 * @param {string} rawToken - Código del ticket ganador
 * @param {Object} winnerData - Datos del formulario de canje
 * @returns {Promise<RedemptionResult>}
 */
export async function redeemPrize(rawToken, winnerData) {
  const token = normalizeToken(rawToken);
  const startTime = performance.now();

  // ==========================================================================
  // TODO: PRODUCCIÓN - Descomentar llamada real a endpoint POST /api/v1/tokens/redeem:
  // ==========================================================================
  /*
  const response = await fetch(`${API_CONFIG.BASE_URL}/tokens/redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, winnerData })
  });
  return await response.json();
  */

  return new Promise((resolve) => {
    setTimeout(() => {
      const latencyMs = Math.round(performance.now() - startTime);
      const timestampIso = new Date().toISOString();
      const voucherCode = `VCH-${Math.floor(100000 + Math.random() * 900000)}-${token.replace('SHIELD-', '')}`;
      const voucherHash = `SHA256-${generateMockSignature(token, timestampIso).slice(-16).toUpperCase()}`;

      // Marcamos el token en la base de datos simulada como ya redimido para que futuros reintentos fallen:
      if (mockTokenDatabase[token]) {
        mockTokenDatabase[token].redeemed = true;
        mockTokenDatabase[token].status = 'ALREADY_REDEEMED';
        mockTokenDatabase[token].redeemedAt = timestampIso;
        mockTokenDatabase[token].redemptionMetadata = {
          transactionId: voucherCode,
          ipAddress: 'IP Cliente Actual (Verificada por SSL)',
          deviceSignature: navigator.userAgent,
          retailOutlet: 'Canje Digital Directo Web'
        };
      }

      resolve({
        httpStatus: 200,
        ok: true,
        latencyMs,
        payload: {
          success: true,
          verdict: 'REDEEMED_SUCCESSFULLY',
          token,
          voucherCode,
          voucherHash,
          issuedAt: timestampIso,
          winner: {
            fullName: winnerData.fullName,
            idNumber: winnerData.idNumber,
            email: winnerData.email,
            phone: winnerData.phone
          },
          redemptionInstructionsEs: 'Presenta este código en cualquier distribuidor autorizado o en el portal de despachos con tu documento de identidad.',
          redemptionInstructionsEn: 'Present this digital voucher code at any authorized redemption partner along with your legal ID.',
          expiresAt: '2026-12-31T23:59:59Z'
        }
      });
    }, API_CONFIG.SIMULATED_LATENCY_MS);
  });
}

/**
 * Reinicia la base de datos simulada para permitir múltiples pruebas
 */
export function resetMockDatabase() {
  mockTokenDatabase['SHIELD-WIN-9021'].redeemed = false;
  mockTokenDatabase['SHIELD-WIN-9021'].status = 'VALID';
  mockTokenDatabase['SHIELD-ERR-8492'].redeemed = true;
  mockTokenDatabase['SHIELD-ERR-8492'].status = 'ALREADY_REDEEMED';
}
