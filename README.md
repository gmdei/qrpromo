# QR Shield Promo 🛡️
### Plataforma Empresarial de Sorteos y Validación Criptográfica de Códigos QR

[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![JavaScript](https://img.shields.io/badge/ES_Modules-Modern_JS-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/es/docs/Web/JavaScript)
[![Security](https://img.shields.io/badge/Security-SHA--256%20Zero--Knowledge-10B981)](#seguridad-de-grado-bancario)
[![i18n](https://img.shields.io/badge/i18n-ES%20%7C%20EN-0EA5E9)](#internacionalización-i18n)

Aplicación web moderna, interactiva y de alto impacto (*Mobile-First*) que funciona como:
1. **Presentación Comercial & Ejecutiva:** Diseñada para cautivar a directores de marketing, gerentes de marca y comités de finanzas.
2. **Sandbox / Simulador en Vivo:** Permite experimentar en tiempo real los 3 escenarios clave de escaneo (Ganador, Sin Premio, Código Replicado/Fraude), inspeccionar el payload JSON con cabeceras de seguridad y registrar telemetría de auditoría.
3. **Centro de Operaciones VDP (Variable Data Printing):**
   - **Personalización de Marca (Theming en vivo):** Selector de colores corporativos y nombre de cliente con adaptación en tiempo real.
   - **Generador Masivo de Lotes (Excel / CSV):** Exporta el formato estándar industrial para prensas digitales (HP Indigo, Fiery, Domino, flexografía).
   - **Planillas de Impresión / PDF:** Cuadrícula de etiquetas vectoriales a 300 DPI con QR nítidos para raspar o cortar.
4. **Base Arquitectónica para Producción:** Lista para conectar una API real simplemente cambiando una línea de configuración en `src/services/mockValidatorService.js`.

---

## 🚀 Inicio Rápido (Desarrollo Local)

### Prerrequisitos
- [Node.js](https://nodejs.org/) v18+ instalado.

### Instalación y Ejecución

```bash
# 1. Clonar el repositorio
git clone <URL_DE_TU_REPOSITORIO>
cd "concurso con qr"

# 2. Instalar dependencias
npm install
# (En Windows PowerShell si hay restricción de scripts: npm.cmd install)

# 3. Iniciar servidor local de desarrollo
npm run dev
# (o npm.cmd run dev)
```

Abre en tu navegador:
```
http://localhost:3000/
```

---

## 🛠️ Tecnologías Empleadas

- **Frontend Core:** HTML5 Semántico, Vanilla JavaScript modular (ES Modules).
- **Estilos:** Vanilla CSS con Custom Properties (`tokens`), Glassmorphism (`backdrop-filter`), animaciones fluidas y micro-interacciones.
- **Herramienta de Construcción:** [Vite](https://vitejs.dev/) con Hot Module Replacement (HMR).
- **Generación Vectorial de QR:** `qrcode` (renderizado dinámico de Canvas/SVG en tiempo real).
- **Lector Óptico de Cámara:** `html5-qrcode` (acceso a cámara web y lente nativo de smartphones).
- **Micro-Animaciones de Éxito:** `canvas-confetti`.

---

## 🏛️ Arquitectura y Separación de Capas

```
concurso con qr/
├── index.html                   # Estructura semántica, accesibilidad y modales nativos
├── package.json                 # Scripts de build, dev y dependencias
├── locales/
│   ├── es.json                  # Diccionario en Español corporativo y persuasivo
│   └── en.json                  # Diccionario en Inglés ejecutivo (English Corporate)
├── src/
│   ├── main.js                  # Orquestador UI, i18n sin recarga, tabs y eventos
│   ├── services/
│   │   └── mockValidatorService.js  # Capa de API desacoplada, latencia 600ms, TODOs
│   └── styles/
│       └── main.css             # Design tokens HSL, glassmorphism, responsive utilities
└── dist/                        # Bundle optimizado generado para producción
```

---

## 🔒 Paso a Producción (Conexión con Base de Datos Real)

El archivo `src/services/mockValidatorService.js` funciona como fachada de servicio (*Service Facade Pattern*). Para pasar a producción con tu propia base de datos (PostgreSQL, MongoDB, MySQL) o microservicio backend:

```javascript
// src/services/mockValidatorService.js

export const API_CONFIG = {
  USE_MOCK: false, // ⬅️ Cambiar a false para activar peticiones HTTP reales
  BASE_URL: 'https://api.tuempresa.com/api/v1', // ⬅️ Tu endpoint productivo
  CLIENT_VERSION: '2.4.0-enterprise'
};
```

Los métodos `validateToken` y `redeemPrize` ya contienen la estructura `fetch` documentada y lista para producción:
- `POST /api/v1/tokens/validate` (Validación de unicidad y reglas de asignación).
- `POST /api/v1/tokens/redeem` (Canje seguro atómico y emisión de voucher).

---

## 🌐 Internacionalización (i18n)

El selector en la barra superior `[ 🇪🇸 ES | 🇺🇸 EN ]` permite cambiar instantáneamente entre Español e Inglés sin recargar la página ni perder el estado del simulador. Todos los textos residen en `locales/es.json` y `locales/en.json`.

---

## 📄 Licencia

Este proyecto está bajo licencia MIT. Desarrollado para activaciones y promociones corporativas masivas.
