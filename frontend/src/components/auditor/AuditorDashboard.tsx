import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useWeberData } from '../../context/WeberDataContext';
import { Button, Card } from '../ui/core';
import { ChatbotFAB } from '../chatbot/ChatbotFAB';
import { LiveMap } from '../maps/LiveMap';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ComposedChart, ScatterChart, Scatter, ZAxis,
} from 'recharts';
import {
  LogOut, FileSpreadsheet, FileText, Calendar, TrendingUp, TrendingDown,
  Package, MapPin, Users, ShoppingBag, BarChart2, BarChart3, Activity,
  PieChart as PieChartIcon, Layers, RefreshCw,
} from 'lucide-react';
import { exportOrdersToExcel, exportOrdersToPDF } from '../../lib/weberExportUtils';
import type { Order } from '../../types/webertrack';

// ─── PALETA ───────────────────────────────────────────────────────────────────
const PALETTE = ['#064d80','#0c90e0','#36adf6','#7cc9fb','#b9e1fd','#e8b930','#f5c842','#16a34a','#f59e0b','#ef4444'];

// ─── DATOS HARDCODEADOS — CHIHUAHUA ──────────────────────────────────────────

const DATA_VENTAS_PAN = [
  { name: 'Pan Blanco',   unidades: 1840, merma: 62, ratio: 3.4 },
  { name: 'Pan Integral', unidades: 1230, merma: 85, ratio: 6.9 },
  { name: 'Bollería',     unidades:  870, merma: 98, ratio: 11.3 },
  { name: 'Pan de Molde', unidades:  960, merma: 44, ratio: 4.6 },
  { name: 'Pan Centeno',  unidades:  540, merma: 31, ratio: 5.7 },
  { name: 'Pan Dulce',    unidades: 1110, merma: 73, ratio: 6.6 },
  { name: 'Baguette',     unidades:  430, merma: 55, ratio: 12.8 },
];

const DATA_PROMOTORES = [
  { name: 'J. Rodríguez', pedidos: 38, unidades: 890, aprobados: 34 },
  { name: 'M. Sánchez',   pedidos: 32, unidades: 740, aprobados: 29 },
  { name: 'C. Flores',    pedidos: 27, unidades: 620, aprobados: 24 },
  { name: 'A. Correa',    pedidos: 24, unidades: 580, aprobados: 22 },
  { name: 'P. Guevara',   pedidos: 21, unidades: 490, aprobados: 19 },
  { name: 'L. Mendoza',   pedidos: 18, unidades: 420, aprobados: 16 },
  { name: 'R. Castro',    pedidos: 15, unidades: 360, aprobados: 13 },
  { name: 'E. Torres',    pedidos: 12, unidades: 280, aprobados: 10 },
];

const DATA_SUCURSALES = [
  { name: 'Centro',         pedidos: 28, unidades: 680 },
  { name: 'Delicias',       pedidos: 22, unidades: 510 },
  { name: 'Cuauhtémoc',     pedidos: 18, unidades: 430 },
  { name: 'Parral',         pedidos: 15, unidades: 370 },
  { name: 'Camargo',        pedidos: 12, unidades: 290 },
  { name: 'Jiménez',        pedidos: 10, unidades: 240 },
  { name: 'Juárez Norte',   pedidos: 24, unidades: 590 },
  { name: 'Valle Verde',    pedidos:  9, unidades: 210 },
  { name: 'Nombre de Dios', pedidos: 14, unidades: 340 },
  { name: 'San Felipe',     pedidos: 11, unidades: 260 },
];

const DATA_MERMA_SUCURSAL = [
  { name: 'Centro',         Merma: 48 },
  { name: 'Delicias',       Merma: 31 },
  { name: 'Cuauhtémoc',     Merma: 22 },
  { name: 'Parral',         Merma: 37 },
  { name: 'Camargo',        Merma: 18 },
  { name: 'Jiménez',        Merma: 25 },
  { name: 'Juárez Norte',   Merma: 41 },
  { name: 'Valle Verde',    Merma: 14 },
  { name: 'Nombre de Dios', Merma: 29 },
  { name: 'San Felipe',     Merma: 20 },
];

const DATA_TENDENCIA = [
  { day: '28/02', pedidos: 8,  unidades: 180, merma: 14 },
  { day: '01/03', pedidos: 11, unidades: 260, merma: 18 },
  { day: '02/03', pedidos:  7, unidades: 150, merma: 11 },
  { day: '03/03', pedidos: 14, unidades: 330, merma: 22 },
  { day: '04/03', pedidos: 13, unidades: 310, merma: 20 },
  { day: '05/03', pedidos:  6, unidades: 130, merma:  9 },
  { day: '06/03', pedidos:  5, unidades: 110, merma:  8 },
  { day: '07/03', pedidos: 16, unidades: 390, merma: 27 },
  { day: '08/03', pedidos: 18, unidades: 430, merma: 29 },
  { day: '09/03', pedidos: 12, unidades: 290, merma: 19 },
  { day: '10/03', pedidos: 20, unidades: 480, merma: 32 },
  { day: '11/03', pedidos: 17, unidades: 410, merma: 26 },
  { day: '12/03', pedidos: 15, unidades: 360, merma: 24 },
  { day: '13/03', pedidos: 19, unidades: 450, merma: 30 },
];

const DATA_TENDENCIA_SEMANAL = [
  { semana: 'S1 Ene', Ventas: 3200, Merma: 112 },
  { semana: 'S2 Ene', Ventas: 3540, Merma:  98 },
  { semana: 'S3 Ene', Ventas: 3180, Merma: 125 },
  { semana: 'S4 Ene', Ventas: 3720, Merma: 104 },
  { semana: 'S1 Feb', Ventas: 3860, Merma:  91 },
  { semana: 'S2 Feb', Ventas: 4100, Merma:  87 },
  { semana: 'S3 Feb', Ventas: 3950, Merma:  95 },
  { semana: 'S4 Feb', Ventas: 4280, Merma:  82 },
  { semana: 'S1 Mar', Ventas: 4420, Merma:  78 },
  { semana: 'S2 Mar', Ventas: 4190, Merma:  93 },
  { semana: 'S3 Mar', Ventas: 4560, Merma:  74 },
  { semana: 'S4 Mar', Ventas: 4730, Merma:  69 },
];

const DATA_RADAR = DATA_VENTAS_PAN.slice(0, 6).map(b => ({
  pan: b.name.length > 12 ? b.name.slice(0, 12) + '…' : b.name,
  ventas: b.unidades,
  merma: b.merma,
}));

const DATA_ESTADO_PEDIDOS = [
  { name: 'Aprobados',  value: 142, fill: '#16a34a' },
  { name: 'Pendientes', value:  23, fill: '#f59e0b' },
  { name: 'Rechazados', value:  11, fill: '#ef4444' },
];

// KPI totales
const TOTAL_VENTAS    = DATA_VENTAS_PAN.reduce((s, d) => s + d.unidades, 0);
const TOTAL_MERMA     = DATA_VENTAS_PAN.reduce((s, d) => s + d.merma, 0);
const TOTAL_PEDIDOS   = DATA_ESTADO_PEDIDOS.reduce((s, d) => s + d.value, 0);
const TOTAL_APROBADOS = DATA_ESTADO_PEDIDOS.find(d => d.name === 'Aprobados')?.value ?? 0;
const TASA_APROBACION = ((TOTAL_APROBADOS / TOTAL_PEDIDOS) * 100).toFixed(1);

// Orders para chatbot
const CHATBOT_ORDERS: Order[] = DATA_PROMOTORES.map((p, i) => ({
  id: `ord-${i}`,
  branch_id: `branch-${i % DATA_SUCURSALES.length}`,
  branch_name: DATA_SUCURSALES[i % DATA_SUCURSALES.length].name,
  promoter_id: `promoter-${i}`,
  promoter_name: p.name,
  status: i % 7 === 0 ? 'PENDING' : i % 9 === 0 ? 'REJECTED' : 'APPROVED',
  supervisor_comments: undefined,
  created_at: new Date(Date.now() - i * 86400000 * 2).toISOString(),
  items: DATA_VENTAS_PAN.slice(0, 3).map(pan => ({
    bread_type_id: pan.name.toLowerCase().replace(/ /g, '-'),
    bread_type_name: pan.name,
    historical_sales: Math.floor(pan.unidades / 12),
    waste: pan.merma,
    suggested_qty: Math.floor(pan.unidades / 10),
    actual_qty: Math.floor(pan.unidades / 10),
  })),
}));

// ─── TOOLTIP ─────────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color?: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-border rounded-xl p-3 text-sm shadow-lg min-w-[140px]">
      {label && <p className="font-bold text-primary mb-2 text-xs">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
            <span className="text-slate-500 text-xs">{p.name}</span>
          </div>
          <span className="font-bold text-primary text-xs font-mono">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─── TIPOS ────────────────────────────────────────────────────────────────────
type ChartTab = 'overview' | 'bread' | 'team' | 'trends' | 'radar';

// ─── COMPONENTE ───────────────────────────────────────────────────────────────
export function AuditorDashboard() {
  const { user, logout } = useAuth();
  const { dateFilter, setDateFilter } = useWeberData();
  const [activeTab, setActiveTab] = useState<ChartTab>('overview');

  const TABS: Array<{ id: ChartTab; label: string; icon: React.ElementType }> = [
    { id: 'overview', label: 'Resumen',    icon: BarChart3   },
    { id: 'bread',    label: 'Productos',  icon: Package     },
    { id: 'team',     label: 'Equipo',     icon: Users       },
    { id: 'trends',   label: 'Tendencias', icon: Activity    },
    { id: 'radar',    label: 'Análisis',   icon: Layers      },
  ];

  const kpis = [
    { label: 'Pedidos',          value: String(TOTAL_PEDIDOS),   icon: ShoppingBag,   color: 'text-primary',   bg: 'bg-primary/10'                     },
    { label: 'Unidades',         value: TOTAL_VENTAS.toLocaleString(), icon: Package, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20'  },
    { label: 'Merma',            value: String(TOTAL_MERMA),     icon: TrendingDown,  color: 'text-red-500',   bg: 'bg-red-50 dark:bg-red-900/20'      },
    { label: 'Pendientes',       value: '23',                    icon: Activity,      color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20'  },
    { label: 'Aprobados',        value: String(TOTAL_APROBADOS), icon: TrendingUp,    color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20'  },
    { label: 'Tasa aprobación',  value: `${TASA_APROBACION}%`,  icon: BarChart3,     color: 'text-primary',   bg: 'bg-primary/10'                     },
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden pb-10">

      {/* Header */}
      <header className="sticky top-0 z-30 bg-surface border-b border-border shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <BarChart2 size={18} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-primary text-base leading-tight">Auditor</h1>
              <p className="text-xs text-slate-500">{user?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Button size="sm" variant="outline" onClick={() => exportOrdersToExcel(CHATBOT_ORDERS)} className="gap-1 shrink-0">
              <FileSpreadsheet size={13} /> Excel
            </Button>
            <Button size="sm" variant="outline" onClick={() => exportOrdersToPDF(CHATBOT_ORDERS)} className="gap-1 shrink-0">
              <FileText size={13} /> PDF
            </Button>
            <Button variant="ghost" size="icon" onClick={logout} className="shrink-0">
              <LogOut size={16} />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-t border-border overflow-x-auto scrollbar-hide max-w-6xl mx-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[80px] py-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-primary border-b-2 border-primary bg-primary/5'
                  : 'text-slate-500 hover:text-primary'
              }`}
            >
              <tab.icon size={13} />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.slice(0, 4)}</span>
            </button>
          ))}
        </div>
      </header>

      <main className="w-full max-w-6xl mx-auto px-4 py-5 space-y-5 overflow-x-hidden">

        {/* Filtro fechas */}
        <div className="flex flex-wrap items-center gap-2">
          <Calendar size={15} className="text-slate-400 shrink-0" />
          <input type="date" value={dateFilter.from ?? ''}
            onChange={e => setDateFilter(f => ({ ...f, from: e.target.value || undefined }))}
            className="h-8 px-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm" />
          <span className="text-slate-400 shrink-0">—</span>
          <input type="date" value={dateFilter.to ?? ''}
            onChange={e => setDateFilter(f => ({ ...f, to: e.target.value || undefined }))}
            className="h-8 px-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm" />
          {(dateFilter.from || dateFilter.to) && (
            <Button size="sm" variant="ghost" onClick={() => setDateFilter({})}>
              <RefreshCw size={12} className="mr-1" /> Limpiar
            </Button>
          )}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {kpis.map(k => (
            <Card key={k.label} className="p-3 overflow-hidden">
              <div className={`w-8 h-8 rounded-lg ${k.bg} flex items-center justify-center mb-2`}>
                <k.icon size={16} className={k.color} />
              </div>
              <p className={`text-xl font-bold font-mono ${k.color}`}>{k.value}</p>
              <p className="text-xs text-slate-500 mt-0.5 truncate">{k.label}</p>
            </Card>
          ))}
        </div>

        {/* ── OVERVIEW ──────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

              {/* Donut estado */}
              <Card className="p-4 overflow-hidden">
                <p className="font-bold text-primary mb-4 text-sm flex items-center gap-2">
                  <PieChartIcon size={15} /> Estado de pedidos
                </p>
                <div style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={DATA_ESTADO_PEDIDOS} cx="50%" cy="50%"
                        innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                        {DATA_ESTADO_PEDIDOS.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Top sucursales horizontal */}
              <Card className="p-4 overflow-hidden">
                <p className="font-bold text-primary mb-4 text-sm flex items-center gap-2">
                  <MapPin size={15} /> Top sucursales por unidades
                </p>
                <div style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={DATA_SUCURSALES.slice(0, 6)} layout="vertical"
                      margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="unidades" name="Unidades" fill="#064d80" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* Área actividad 14 días */}
            <Card className="p-4 overflow-hidden">
              <p className="font-bold text-primary mb-4 text-sm flex items-center gap-2">
                <Activity size={15} /> Actividad últimos 14 días
              </p>
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={DATA_TENDENCIA} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#0c90e0" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#0c90e0" stopOpacity={0}    />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="day" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 10 }} width={35} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="unidades" name="Unidades"
                      stroke="#0c90e0" strokeWidth={2.5} fill="url(#areaGrad)" dot={false} />
                    <Bar dataKey="pedidos" name="Pedidos" fill="#b9e1fd" radius={[2, 2, 0, 0]} opacity={0.7} />
                    <Line type="monotone" dataKey="merma" name="Merma"
                      stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="5 3" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Tabla resumen sucursales */}
            <Card className="p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="font-bold text-primary text-sm flex items-center gap-2">
                  <Layers size={15} /> Resumen por sucursal
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-slate-50 dark:bg-slate-900/50">
                      <th className="text-left px-4 py-2 text-xs font-semibold text-primary">Sucursal</th>
                      <th className="text-right px-4 py-2 text-xs font-semibold text-primary">Pedidos</th>
                      <th className="text-right px-4 py-2 text-xs font-semibold text-primary">Unidades</th>
                      <th className="px-4 py-2 text-xs font-semibold text-primary">Progreso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DATA_SUCURSALES.map((b, i) => {
                      const max = DATA_SUCURSALES[0].unidades;
                      return (
                        <tr key={i} className="border-b border-border last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="px-4 py-2 font-medium text-primary">{b.name}</td>
                          <td className="px-4 py-2 text-right font-mono text-slate-600 dark:text-slate-400">{b.pedidos}</td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-primary">{b.unidades}</td>
                          <td className="px-4 py-2 w-32">
                            <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${(b.unidades / max) * 100}%` }} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ── PRODUCTOS ─────────────────────────────────────────────── */}
        {activeTab === 'bread' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

              <Card className="p-4 overflow-hidden">
                <p className="font-bold text-primary mb-4 text-sm">Unidades vs Merma por pan</p>
                <div style={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={DATA_VENTAS_PAN} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={42} />
                      <YAxis tick={{ fontSize: 10 }} width={38} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="unidades" name="Unidades" fill="#064d80" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="merma"    name="Merma"    fill="#f59e0b" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-4 overflow-hidden">
                <p className="font-bold text-primary mb-4 text-sm">Distribución por tipo de pan</p>
                <div style={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={DATA_VENTAS_PAN} cx="50%" cy="50%" outerRadius={90}
                        dataKey="unidades" nameKey="name"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}>
                        {DATA_VENTAS_PAN.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* % Merma por pan */}
            <Card className="p-4 overflow-hidden">
              <p className="font-bold text-primary mb-4 text-sm">% Merma por tipo de pan</p>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={DATA_VENTAS_PAN} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={42} />
                    <YAxis tick={{ fontSize: 10 }} width={38} unit="%" />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="ratio" name="% Merma" radius={[3, 3, 0, 0]}>
                      {DATA_VENTAS_PAN.map((e, i) => (
                        <Cell key={i} fill={e.ratio > 10 ? '#ef4444' : e.ratio > 5 ? '#f59e0b' : '#16a34a'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500 inline-block" /> Óptimo (&lt;5%)</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400 inline-block" /> Moderado (5-10%)</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500 inline-block"   /> Alto (&gt;10%)</div>
              </div>
            </Card>

            {/* Merma por sucursal */}
            <Card className="p-4 overflow-hidden">
              <p className="font-bold text-primary mb-4 text-sm">Merma por sucursal</p>
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={DATA_MERMA_SUCURSAL} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={42} />
                    <YAxis tick={{ fontSize: 10 }} width={38} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="Merma" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        )}

        {/* ── EQUIPO ────────────────────────────────────────────────── */}
        {activeTab === 'team' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

              <Card className="p-4 overflow-hidden">
                <p className="font-bold text-primary mb-4 text-sm">Unidades por promotor</p>
                <div style={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={DATA_PROMOTORES} layout="vertical"
                      margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="unidades" name="Unidades" radius={[0, 4, 4, 0]}>
                        {DATA_PROMOTORES.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-4 overflow-hidden">
                <p className="font-bold text-primary mb-4 text-sm">Pedidos vs Aprobados por promotor</p>
                <div style={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={DATA_PROMOTORES} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={42} />
                      <YAxis tick={{ fontSize: 10 }} width={35} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="pedidos"   name="Pedidos"   fill="#064d80" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="aprobados" name="Aprobados" fill="#16a34a" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* Scatter correlación */}
            <Card className="p-4 overflow-hidden">
              <p className="font-bold text-primary mb-4 text-sm">Correlación pedidos ↔ unidades por promotor</p>
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="pedidos"  name="Pedidos"  tick={{ fontSize: 10 }} label={{ value: 'Pedidos',  position: 'insideBottom', offset: -2, fontSize: 10 }} />
                    <YAxis dataKey="unidades" name="Unidades" tick={{ fontSize: 10 }} label={{ value: 'Unidades', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                    <ZAxis range={[60, 200]} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                    <Scatter data={DATA_PROMOTORES} fill="#0c90e0" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        )}

        {/* ── TENDENCIAS ────────────────────────────────────────────── */}
        {activeTab === 'trends' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

              <Card className="p-4 overflow-hidden">
                <p className="font-bold text-primary mb-4 text-sm">Tendencia de ventas — últimos 14 días</p>
                <div style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={DATA_TENDENCIA} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#064d80" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#064d80" stopOpacity={0}   />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="day" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 10 }} width={35} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="unidades" name="Unidades"
                        stroke="#064d80" strokeWidth={2.5} fill="url(#g1)"
                        dot={{ r: 3, fill: '#064d80' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-4 overflow-hidden">
                <p className="font-bold text-primary mb-4 text-sm">Merma diaria — últimos 14 días</p>
                <div style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={DATA_TENDENCIA} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="day" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 10 }} width={35} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="merma"   name="Merma"   stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="pedidos" name="Pedidos" stroke="#0c90e0" strokeWidth={2}   dot={false} strokeDasharray="5 3" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* Tendencia semanal Ene–Mar */}
            <Card className="p-4 overflow-hidden">
              <p className="font-bold text-primary mb-4 text-sm">Tendencia semanal Ventas vs Merma (Ene–Mar)</p>
              <div style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={DATA_TENDENCIA_SEMANAL} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="semana" tick={{ fontSize: 9 }} interval={1} angle={-20} textAnchor="end" height={36} />
                    <YAxis tick={{ fontSize: 10 }} width={38} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="Ventas" stroke="#064d80" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="Merma"  stroke="#f59e0b" strokeWidth={2}   dot={{ r: 3 }} strokeDasharray="5 3" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Vista combinada */}
            <Card className="p-4 overflow-hidden">
              <p className="font-bold text-primary mb-4 text-sm">Vista combinada: unidades, merma y pedidos</p>
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={DATA_TENDENCIA} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="day" tick={{ fontSize: 9 }} />
                    <YAxis yAxisId="left"  tick={{ fontSize: 10 }} width={35} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} width={30} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar      yAxisId="left"  dataKey="unidades" name="Unidades" fill="#b9e1fd" radius={[2, 2, 0, 0]} />
                    <Line     yAxisId="left"  type="monotone" dataKey="merma"   name="Merma"   stroke="#f59e0b" strokeWidth={2} dot={false} />
                    <Line     yAxisId="right" type="monotone" dataKey="pedidos" name="Pedidos" stroke="#16a34a" strokeWidth={2} dot={false} strokeDasharray="5 3" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        )}

        {/* ── ANÁLISIS / RADAR ──────────────────────────────────────── */}
        {activeTab === 'radar' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

              <Card className="p-4 overflow-hidden">
                <p className="font-bold text-primary mb-4 text-sm">Radar: ventas vs merma por tipo de pan</p>
                <div style={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={DATA_RADAR}>
                      <PolarGrid stroke="var(--border)" />
                      <PolarAngleAxis dataKey="pan" tick={{ fontSize: 11 }} />
                      <PolarRadiusAxis tick={{ fontSize: 9 }} />
                      <Radar name="Ventas" dataKey="ventas" stroke="#064d80" fill="#064d80" fillOpacity={0.3} strokeWidth={2} />
                      <Radar name="Merma"  dataKey="merma"  stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} strokeWidth={2} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Embudo manual (sin FunnelChart — no disponible en recharts v2) */}
              <Card className="p-4 overflow-hidden">
                <p className="font-bold text-primary mb-4 text-sm">Embudo de pedidos</p>
                <div className="space-y-3 pt-4">
                  {[
                    { label: 'Total recibidos', value: TOTAL_PEDIDOS,   pct: 100,  color: '#064d80' },
                    { label: 'Procesados',       value: TOTAL_PEDIDOS - 5, pct: 95, color: '#0c90e0' },
                    { label: 'Aprobados',         value: TOTAL_APROBADOS, pct: Math.round((TOTAL_APROBADOS / TOTAL_PEDIDOS) * 100), color: '#16a34a' },
                    { label: 'Rechazados',        value: 11,              pct: Math.round((11 / TOTAL_PEDIDOS) * 100),              color: '#ef4444' },
                  ].map((row, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-slate-600 dark:text-slate-400">{row.label}</span>
                        <span className="font-bold font-mono" style={{ color: row.color }}>{row.value} ({row.pct}%)</span>
                      </div>
                      <div className="h-7 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center px-2">
                        <div className="h-5 rounded-md transition-all"
                          style={{ width: `${row.pct}%`, background: row.color, opacity: 0.85 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Tabla detalle de pan */}
            <Card className="p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="font-bold text-primary text-sm">Detalle por tipo de pan</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-slate-50 dark:bg-slate-900/50">
                      <th className="text-left px-4 py-2 text-xs font-semibold text-primary">Pan</th>
                      <th className="text-right px-4 py-2 text-xs font-semibold text-primary">Unidades</th>
                      <th className="text-right px-4 py-2 text-xs font-semibold text-primary">Merma</th>
                      <th className="text-right px-4 py-2 text-xs font-semibold text-primary">% Merma</th>
                      <th className="px-4 py-2 text-xs font-semibold text-primary">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DATA_VENTAS_PAN.map((b, i) => (
                      <tr key={i} className="border-b border-border last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="px-4 py-2 font-medium text-primary">{b.name}</td>
                        <td className="px-4 py-2 text-right font-mono font-bold text-primary">{b.unidades.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right font-mono text-slate-600 dark:text-slate-400">{b.merma}</td>
                        <td className="px-4 py-2 text-right font-mono font-bold" style={{
                          color: b.ratio > 10 ? '#ef4444' : b.ratio > 5 ? '#f59e0b' : '#16a34a',
                        }}>{b.ratio}%</td>
                        <td className="px-4 py-2">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            b.ratio > 10 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            b.ratio > 5  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                           'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          }`}>
                            {b.ratio > 10 ? 'Alto' : b.ratio > 5 ? 'Moderado' : 'Óptimo'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* Chatbot */}
        <ChatbotFAB orders={CHATBOT_ORDERS} />
      </main>
    </div>
  );
}