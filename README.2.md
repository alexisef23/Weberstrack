# WeberTrack v2.0

Sistema de gestión de pedidos para **Weber's Bread**, Chihuahua México.

Stack: React 18 + Vite · TypeScript · Tailwind CSS · Supabase · Express · Leaflet · Recharts · Gemini AI

---

## 🚀 Inicio rápido (Modo Demo — sin backend)

```bash
cd frontend
npm install
npm run dev
```

Abre `http://localhost:5173` y selecciona un rol. **No requiere Supabase ni API keys** en modo demo.

---

## 📁 Estructura del proyecto

```
webertrack/
├── frontend/               # React + Vite (SPA)
│   ├── src/
│   │   ├── App.tsx                  # Router por rol
│   │   ├── main.tsx                 # Entry point
│   │   ├── index.css                # Design system (CSS variables)
│   │   ├── components/
│   │   │   ├── ui/                  # core.tsx, ThemeToggle
│   │   │   ├── chatbot/             # ChatbotFAB (botón flotante Gemini AI)
│   │   │   ├── maps/                # LiveMap (Leaflet + rutas)
│   │   │   ├── promotor/            # Dashboard, OrderForm, OrderCart, Métricas
│   │   │   ├── supervisor/          # Dashboard, ApprovalModal, MetricsPanel
│   │   │   ├── auditor/             # AuditorDashboard (8+ tipos de gráfica)
│   │   │   └── superadmin/          # CRUD Sucursales, Productos, Usuarios
│   │   ├── context/
│   │   │   ├── AuthContext.tsx      # Demo + Supabase auth
│   │   │   ├── ThemeContext.tsx     # Dark/light mode
│   │   │   └── WeberDataContext.tsx # Estado global, CRUD, sugerencias
│   │   ├── lib/
│   │   │   ├── supabase.ts          # Cliente Supabase
│   │   │   ├── supabaseQueries.ts   # Todas las queries/CRUD
│   │   │   ├── geminiUtils.ts       # Integración Gemini AI
│   │   │   ├── weberExportUtils.ts  # Export Excel + PDF
│   │   │   └── utils.ts             # Helpers
│   │   ├── types/webertrack.ts      # TypeScript types
│   │   └── config/
│   │       ├── demoUsers.ts         # Usuarios demo
│   │       └── mockData.ts          # Datos de prueba realistas
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts               # Vite + PWA
│   ├── tailwind.config.js
│   └── .env.example
│
├── backend/                # Express API (proxy AI + Supabase admin)
│   ├── src/
│   │   ├── server.ts                # Entry point Express
│   │   └── routes/
│   │       ├── ai.ts               # POST /api/ai/chat + /optimize-route
│   │       └── orders.ts           # GET/PATCH /api/orders
│   ├── package.json
│   └── .env.example
│
└── supabase/
    └── schema.sql                   # Schema completo + RLS + seed data
```

---

## ⚙️ Configuración completa

### 1. Frontend `.env`

```bash
cp frontend/.env.example frontend/.env
```

Edita `frontend/.env`:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key
VITE_GEMINI_API_KEY=tu_gemini_key      # Para chatbot directo
VITE_API_URL=http://localhost:3001     # Si usas el backend Express
```

### 2. Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Ve a **SQL Editor** y ejecuta `supabase/schema.sql`
3. Ve a **Authentication → Users** y crea usuarios asignando sus roles en `profiles`

### 3. Backend (opcional — para proxy Gemini y operaciones admin)

```bash
cd backend
npm install
cp .env.example .env
# Edita .env con tus keys
npm run dev
```

---

## 🎭 Roles y funcionalidades

| Rol | Funcionalidades |
|-----|----------------|
| **Promotor** | Ver sucursales asignadas · Crear pedidos con sugerencias automáticas · Carrito · Ver su ruta en mapa · Mis métricas |
| **Supervisor** | Aprobar/rechazar pedidos del equipo · Mapa con rutas y GPS · Métricas del equipo |
| **SuperAdmin** | CRUD Sucursales (con coords) · CRUD Tipos de pan · Gestión de usuarios · Dashboard resumen |
| **Auditor** | 8 tipos de gráfica · Mapa global · Exportar Excel/PDF · Chatbot Weber AI |

---

## 🗺️ Mapa (LiveMap)

- **OpenStreetMap** base (sin API key requerida)
- **3 estilos**: Estándar · Satélite (Esri) · Noche (CartoDB)
- **GPS en tiempo real** con `navigator.geolocation.watchPosition`
- **Rutas trazadas** entre sucursales con líneas animadas
- **Marcadores por estado**: Pendiente (amarillo) · Aprobado (verde) · Sin pedido (azul)
- **Popup** con info de cada sucursal al hacer clic

---

## 🤖 Chatbot Weber AI (FAB)

- Botón flotante `💬` en la esquina inferior derecha de **todos** los dashboards
- Conectado a **Gemini 1.5 Flash** con contexto de datos en tiempo real
- Funciona vía `VITE_GEMINI_API_KEY` directo o proxy backend `VITE_API_URL`
- Sugerencias automáticas · Historial de conversación · Limpiar chat

---

## 📊 Gráficas (Auditor)

| Tab | Gráficas |
|-----|----------|
| **Resumen** | Donut estado · Barras sucursales · Area 14 días · Treemap |
| **Productos** | Barras unidades+merma · Pie distribución · Barras % merma |
| **Equipo** | Barras por promotor · Barras pedidos/aprobados · Scatter correlación |
| **Tendencias** | Area ventas · Line merma · ComposedChart combinado |
| **Análisis** | Radar ventas/merma · Funnel flujo de pedidos · Tabla resumen |
| **Mapa** | LiveMap auditor |

---

## 📦 Algoritmo de sugerencia

```
suggested_qty = round(avg_14_days + σ × 1.56)
```

- Percentil ~94% (riesgo de desabasto 6%)
- Usa historial de ventas de los últimos 14 días
- Fallback a pedidos aprobados históricos si no hay historial

---

## 🏗️ Deploy

**Frontend** (Vercel / Netlify):
```bash
cd frontend && npm run build
# dist/ listo para deploy
```

**Backend** (Railway / Render):
```bash
cd backend && npm run build
# dist/server.js listo
```

---

## 📱 PWA

La app es instalable como PWA. El service worker cachea:
- Assets estáticos
- Tiles del mapa (OSM) — 7 días
- Respuestas de Supabase — 5 minutos

---

*WeberTrack v2.0 · Weber's Bread · Chihuahua, México*
