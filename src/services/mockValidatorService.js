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
 * Registra un lote de tokens generados masivamente en la base de datos de validación
 * @param {Array} tokens - Lista de tokens creados
 * @param {string} brandName - Nombre del cliente/marca
 */
export function registerBatchInDatabase(tokens, brandName) {
  if (!tokens || !Array.isArray(tokens)) return;
  const brand = brandName || 'Promoción';

  tokens.forEach((t) => {
    const cleanToken = t.token.toUpperCase().trim();
    mockTokenDatabase[cleanToken] = {
      token: cleanToken,
      status: 'VALID',
      isWinner: !!t.isWinner,
      prize: t.isWinner ? {
        id: `PRZ-${t.id}-${Date.now().toString(36).toUpperCase()}`,
        title: `Bono Digital de Compras ${brand} ($150 USD) + Kit Oficial`,
        titleEn: `Digital Shopping Voucher ${brand} ($150 USD) + Official Kit`,
        category: 'Premio Instantáneo de Campaña',
        categoryEn: 'Instant Campaign Prize',
        valueEstimate: '$150 USD',
        claimDeadline: '2026-12-31T23:59:59Z',
        securityVerificationCode: `VERIF-${t.id}-${t.hash ? t.hash.slice(0, 8) : 'SEC'}`
      } : null,
      messageEs: `Código auténtico verificado para ${brand}. Acumulas 100 puntos y participas en el gran sorteo final de campaña.`,
      messageEn: `Authentic code verified for ${brand}. You earn 100 points and qualify for the final grand draw.`,
      redeemed: false,
      batchId: `BATCH-${brand.toUpperCase().replace(/[^A-Z0-9]/g, '')}-2026`,
      createdAt: t.createdAt || new Date().toISOString()
    };
  });
}

/**
 * Normaliza cualquier formato de token de entrada
 * Soporta tokens puros, URLs con ?token=, URLs completas o hash fragments.
 */
export function normalizeToken(rawInput) {
  if (!rawInput) return '';
  let clean = String(rawInput).trim();
  
  // Si contiene URL completa o parámetro token:
  if (clean.includes('token=')) {
    try {
      const url = new URL(clean, window.location.origin);
      clean = url.searchParams.get('token') || clean;
    } catch {
      const match = clean.match(/token=([A-Za-z0-9_-]+)/);
      if (match) clean = match[1];
    }
  }

  // Quitar prefijos de protocolo o rutas residuales si quedaron
  clean = clean.replace(/^[a-z]+:\/\/[^/]+/i, '');
  clean = clean.replace(/^[/?#]+/, '');
  if (clean.includes('token=')) {
    clean = clean.split('token=')[1].split('&')[0];
  }

  clean = clean.toUpperCase().replace(/[^A-Z0-9_-]/g, '');

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

      let record = mockTokenDatabase[token];

      // Auto-reconocimiento inteligente si el token coincide con formato de campaña (ej. EMPRESA-XYZ-0001):
      if (!record && token && /^[A-Z0-9]{2,16}-[A-Z0-9]{2,10}-[0-9]{2,8}$/.test(token)) {
        const parts = token.split('-');
        const prefix = parts[0];
        const seqNum = parseInt(parts[parts.length - 1], 10) || 1;
        const isWinner = (seqNum % 4 === 0); // 1 de cada 4 es ganador
        mockTokenDatabase[token] = {
          token,
          status: 'VALID',
          isWinner,
          prize: isWinner ? {
            id: `PRZ-${seqNum}`,
            title: `Bono Digital de Compras ${prefix} ($100 USD)`,
            titleEn: `Digital Shopping Voucher ${prefix} ($100 USD)`,
            category: 'Premio Oficial de Campaña',
            categoryEn: 'Official Campaign Prize',
            valueEstimate: '$100 USD',
            claimDeadline: '2026-12-31T23:59:59Z',
            securityVerificationCode: `SEC-${token}`
          } : null,
          messageEs: `Código auténtico registrado para ${prefix}. Acumulas puntos y participas en el gran sorteo final.`,
          messageEn: `Authentic code registered for ${prefix}. You earn points and enter the grand sweepstakes.`,
          redeemed: false,
          batchId: `BATCH-${prefix}-AUTO`,
          createdAt: new Date().toISOString()
        };
        record = mockTokenDatabase[token];
      }

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
        // Candado Atómico de Un Solo Uso: Se marca como consumido inmediatamente en el servidor.
        record.redeemed = true;
        record.status = 'ALREADY_REDEEMED';
        record.redeemedAt = timestampIso;
        record.redemptionMetadata = {
          transactionId: traceId,
          ipAddress: '190.24.89.*** (Escaneo Móvil)',
          retailOutlet: 'Premio Desbloqueado - Primer Escaneo'
        };

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
            verificationToken: record.prize?.securityVerificationCode || `SEC-${record.token}`,
            securityStatus: {
              blindKeyValidated: true,
              antiBotPassed: true,
              budgetQuotaReserved: true,
              atomicLockEngaged: true,
              singleUseConsumed: true
            },
            timestamp: timestampIso
          }
        });
        return;
      }

      // Caso: Boleto Sin Premio (Participación válida)
      // Candado Atómico de Un Solo Uso: El intento queda consumido de inmediato.
      record.redeemed = true;
      record.status = 'ALREADY_REDEEMED';
      record.redeemedAt = timestampIso;
      record.redemptionMetadata = {
        transactionId: traceId,
        ipAddress: '190.24.89.*** (Escaneo Móvil)',
        retailOutlet: 'Participación Registrada - Código Consumido'
      };

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
          messageEs: record.messageEs || 'Código auténtico verificado. Tu participación ha sido registrada para el sorteo final.',
          messageEn: record.messageEn || 'Authentic code verified. Your participation has been recorded for the final draw.',
          entryLogged: true,
          securityStatus: {
            blindKeyValidated: true,
            entryRecorded: true,
            atomicLockEngaged: true,
            singleUseConsumed: true
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

      // Asegurar bloqueo definitivo intransferible
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
          redemptionInstructionsEs: 'Presenta este comprobante digital en cualquier distribuidor autorizado o en el portal de despachos con tu documento de identidad.',
          redemptionInstructionsEn: 'Present this digital voucher code at any authorized redemption partner along with your legal ID.',
          expiresAt: '2026-12-31T23:59:59Z'
        }
      });
    }, API_CONFIG.SIMULATED_LATENCY_MS);
  });
}

/**
 * Reinicia la base de datos simulada para permitir nuevas rondas de pruebas del Sandbox
 */
export function resetMockDatabase() {
  Object.keys(mockTokenDatabase).forEach(k => {
    if (k === 'SHIELD-ERR-8492') {
      mockTokenDatabase[k].redeemed = true;
      mockTokenDatabase[k].status = 'ALREADY_REDEEMED';
    } else {
      mockTokenDatabase[k].redeemed = false;
      mockTokenDatabase[k].status = 'VALID';
      delete mockTokenDatabase[k].redeemedAt;
      delete mockTokenDatabase[k].redemptionMetadata;
    }
  });
}
