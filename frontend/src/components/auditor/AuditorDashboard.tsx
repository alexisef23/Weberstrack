import { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useWeberData } from '../../context/WeberDataContext';
import { Button, Card, StatusBadge } from '../ui/core';
import { ChatbotFAB } from '../chatbot/ChatbotFAB';
import { LiveMap } from '../maps/LiveMap';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ComposedChart, Scatter, ScatterChart, ZAxis, Treemap, FunnelChart, Funnel, LabelList,
} from 'recharts';
import {
  LogOut, FileSpreadsheet, FileText, Calendar, TrendingUp, TrendingDown,
  Package, MapPin, Users, ShoppingBag, BarChart2, BarChart3, Activity,
  PieChart as PieChartIcon, GitBranch, Layers, RefreshCw,
} from 'lucide-react';
import { exportOrdersToExcel, exportOrdersToPDF } from '../../lib/weberExportUtils';
import { format, subDays, parseISO, isAfter, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';

const PALETTE = ['#064d80','#0c90e0','#36adf6','#7cc9fb','#b9e1fd','#e8b930','#f5c842','#16a34a','#f59e0b','#ef4444'];

type ChartTab = 'overview' | 'bread' | 'team' | 'trends' | 'radar' | 'map';

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color?: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl p-3 text-sm min-w-[140px]">
      {label && <p className="font-700 text-[var(--text)] mb-2" style={{ fontFamily: 'Syne,sans-serif' }}>{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-[var(--text-3)]">{p.name}</span>
          </div>
          <span className="font-600 text-[var(--text)] mono">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export function AuditorDashboard() {
  const { user, logout } = useAuth();
  const { orders, branches, dateFilter, setDateFilter } = useWeberData();
  const [activeTab, setActiveTab] = useState<ChartTab>('overview');

  const stats = useMemo(() => {
    const merma = orders.reduce((s, o) => s + o.items.reduce((a, i) => a + (i.waste ?? 0), 0), 0);
    const ventas = orders.reduce((s, o) => s + o.items.reduce((a, i) => a + i.actual_qty, 0), 0);
    const pending = orders.filter(o => o.status === 'PENDING').length;
    const approved = orders.filter(o => o.status === 'APPROVED').length;
    const rejected = orders.filter(o => o.status === 'REJECTED').length;
    const rate = orders.length ? ((approved / orders.length) * 100).toFixed(1) : '0';

    // By bread type
    const byBread = Array.from(
      orders.reduce((acc, o) => {
        o.items.forEach(i => {
          const n = i.bread_type_name ?? i.bread_type_id;
          const cur = acc.get(n) ?? { unidades: 0, merma: 0 };
          acc.set(n, { unidades: cur.unidades + i.actual_qty, merma: cur.merma + (i.waste ?? 0) });
        });
        return acc;
      }, new Map<string, { unidades: number; merma: number }>())
    ).map(([name, d]) => ({ name, ...d, ratio: d.unidades ? +(d.merma / d.unidades * 100).toFixed(1) : 0 }))
      .sort((a, b) => b.unidades - a.unidades);

    // By promotor
    const byTeam = Array.from(
      orders.reduce((acc, o) => {
        const n = o.promoter_name ?? o.promoter_id;
        const cur = acc.get(n) ?? { pedidos: 0, unidades: 0, aprobados: 0 };
        const units = o.items.reduce((s, i) => s + i.actual_qty, 0);
        acc.set(n, { pedidos: cur.pedidos + 1, unidades: cur.unidades + units, aprobados: cur.aprobados + (o.status === 'APPROVED' ? 1 : 0) });
        return acc;
      }, new Map<string, { pedidos: number; unidades: number; aprobados: number }>())
    ).map(([name, d]) => ({ name, ...d })).sort((a, b) => b.unidades - a.unidades);

    // By day (trend)
    const last14 = Array.from({ length: 14 }, (_, i) => {
      const d = subDays(new Date(), 13 - i);
      const key = format(d, 'yyyy-MM-dd');
      const dayOrders = orders.filter(o => o.created_at?.startsWith(key));
      return {
        day: format(d, 'dd/MM', { locale: es }),
        pedidos: dayOrders.length,
        unidades: dayOrders.reduce((s, o) => s + o.items.reduce((a, i) => a + i.actual_qty, 0), 0),
        merma: dayOrders.reduce((s, o) => s + o.items.reduce((a, i) => a + (i.waste ?? 0), 0), 0),
      };
    });

    // By branch
    const byBranch = Array.from(
      orders.reduce((acc, o) => {
        const n = o.branch_name ?? o.branch_id;
        const cur = acc.get(n) ?? { pedidos: 0, unidades: 0 };
        acc.set(n, { pedidos: cur.pedidos + 1, unidades: cur.unidades + o.items.reduce((s, i) => s + i.actual_qty, 0) });
        return acc;
      }, new Map<string, { pedidos: number; unidades: number }>())
    ).map(([name, d]) => ({ name, ...d })).sort((a, b) => b.unidades - a.unidades);

    // Radar for bread types
    const radarData = byBread.slice(0, 6).map(b => ({
      pan: b.name.length > 12 ? b.name.slice(0, 12) + '…' : b.name,
      ventas: b.unidades,
      merma: b.merma,
    }));

    // Funnel: order flow
    const funnel = [
      { name: 'Total', value: orders.length, fill: '#064d80' },
      { name: 'Pendientes', value: pending, fill: '#f59e0b' },
      { name: 'Aprobados', value: approved, fill: '#16a34a' },
      { name: 'Rechazados', value: rejected, fill: '#ef4444' },
    ].filter(d => d.value > 0);

    // Treemap
    const treemap = byBranch.slice(0, 10).map((b, i) => ({ name: b.name, size: b.unidades, fill: PALETTE[i % PALETTE.length] }));

    return { merma, ventas, pending, approved, rejected, rate, byBread, byTeam, last14, byBranch, radarData, funnel, treemap };
  }, [orders]);

  const TABS: Array<{ id: ChartTab; label: string; icon: React.ElementType }> = [
    { id: 'overview', label: 'Resumen', icon: BarChart3 },
    { id: 'bread', label: 'Productos', icon: Package },
    { id: 'team', label: 'Equipo', icon: Users },
    { id: 'trends', label: 'Tendencias', icon: Activity },
    { id: 'radar', label: 'Análisis', icon: Layers },
    { id: 'map', label: 'Mapa', icon: MapPin },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="app-header">
        <div className="flex items-center justify-between px-4 py-3 max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--brand-800)] to-[var(--brand-500)] flex items-center justify-center">
              <BarChart2 size={18} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-[var(--text)] leading-tight" style={{ fontFamily: 'Syne,sans-serif' }}>Auditor</h1>
              <p className="text-xs text-[var(--text-3)]">{user?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => exportOrdersToExcel(orders)} leftIcon={<FileSpreadsheet size={13} />}>Excel</Button>
            <Button size="sm" variant="outline" onClick={() => exportOrdersToPDF(orders)} leftIcon={<FileText size={13} />}>PDF</Button>
            <Button variant="ghost" size="icon" onClick={logout}><LogOut size={16} /></Button>
          </div>
        </div>

        {/* Nav */}
        <div className="flex border-t border-[var(--border)] overflow-x-auto scrollbar-hide max-w-6xl mx-auto">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
              style={{ minWidth: 90 }}
            >
              <tab.icon size={14} />{tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="px-4 pt-5 max-w-6xl mx-auto space-y-5">
        {/* Date filter */}
        <div className="flex flex-wrap items-center gap-2">
          <Calendar size={15} className="text-[var(--text-3)]" />
          <input type="date" value={dateFilter.from ?? ''} onChange={e => setDateFilter(f => ({ ...f, from: e.target.value || undefined }))}
            className="input h-8 w-auto text-sm px-2" />
          <span className="text-[var(--text-4)]">—</span>
          <input type="date" value={dateFilter.to ?? ''} onChange={e => setDateFilter(f => ({ ...f, to: e.target.value || undefined }))}
            className="input h-8 w-auto text-sm px-2" />
          {(dateFilter.from || dateFilter.to) && (
            <Button size="sm" variant="ghost" onClick={() => setDateFilter({})} leftIcon={<RefreshCw size={12} />}>Limpiar</Button>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 fade-in-up">
          {[
            { label: 'Pedidos', value: orders.length, icon: ShoppingBag, color: 'primary', trend: null },
            { label: 'Unidades', value: stats.ventas, icon: Package, color: 'success', trend: '+' },
            { label: 'Merma', value: stats.merma, icon: TrendingDown, color: 'danger', trend: null },
            { label: 'Pendientes', value: stats.pending, icon: Activity, color: 'gold', trend: null },
            { label: 'Aprobados', value: stats.approved, icon: TrendingUp, color: 'success', trend: null },
            { label: 'Tasa aprobación', value: `${stats.rate}%`, icon: BarChart3, color: 'primary', trend: null },
          ].map((kpi, i) => (
            <div key={kpi.label} className={`stat-card ${kpi.color} fade-in-up-${Math.min(i+1,4)}`}>
              <div className="flex items-start justify-between mb-2">
                <div className={`icon-box bg-gradient-to-br ${
                  kpi.color === 'primary' ? 'from-[var(--brand-100)] to-[var(--brand-50)] dark:from-[var(--brand-900)] dark:to-[var(--brand-950)]' :
                  kpi.color === 'gold' ? 'from-yellow-100 to-yellow-50 dark:from-yellow-900/40 dark:to-yellow-950/40' :
                  kpi.color === 'success' ? 'from-green-100 to-green-50 dark:from-green-900/40 dark:to-green-950/40' :
                  'from-red-100 to-red-50 dark:from-red-900/40 dark:to-red-950/40'
                }`}>
                  <kpi.icon size={18} className={
                    kpi.color === 'primary' ? 'text-[var(--primary)]' :
                    kpi.color === 'gold' ? 'text-[var(--gold-500)]' :
                    kpi.color === 'success' ? 'text-[#16a34a]' : 'text-[var(--danger)]'
                  } />
                </div>
              </div>
              <p className="text-2xl font-bold text-[var(--text)] mono">{kpi.value}</p>
              <p className="text-xs text-[var(--text-3)] mt-0.5">{kpi.label}</p>
            </div>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Status donut */}
              <Card>
                <p className="font-bold text-[var(--text)] mb-4 flex items-center gap-2" style={{ fontFamily: 'Syne,sans-serif' }}>
                  <PieChartIcon size={16} className="text-[var(--primary)]" /> Estado de pedidos
                </p>
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={[
                        { name: 'Pendientes', value: stats.pending },
                        { name: 'Aprobados', value: stats.approved },
                        { name: 'Rechazados', value: stats.rejected },
                      ].filter(d => d.value > 0)} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                        <Cell fill="#f59e0b" /><Cell fill="#16a34a" /><Cell fill="#ef4444" />
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend formatter={(v) => <span className="text-xs text-[var(--text-2)]">{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Top branches bar */}
              <Card>
                <p className="font-bold text-[var(--text)] mb-4 flex items-center gap-2" style={{ fontFamily: 'Syne,sans-serif' }}>
                  <MapPin size={16} className="text-[var(--primary)]" /> Top sucursales
                </p>
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.byBranch.slice(0,6)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
                      <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10, fill: 'var(--text-3)' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="unidades" name="Unidades" fill="var(--brand-600)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* Area trend */}
            <Card>
              <p className="font-bold text-[var(--text)] mb-4 flex items-center gap-2" style={{ fontFamily: 'Syne,sans-serif' }}>
                <Activity size={16} className="text-[var(--primary)]" /> Actividad últimos 14 días
              </p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={stats.last14}>
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--brand-500)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="var(--brand-500)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend formatter={(v) => <span className="text-xs text-[var(--text-2)]">{v}</span>} />
                    <Area type="monotone" dataKey="unidades" name="Unidades" stroke="var(--brand-500)" strokeWidth={2.5} fill="url(#areaGrad)" dot={false} />
                    <Bar dataKey="pedidos" name="Pedidos" fill="var(--brand-200)" radius={[2,2,0,0]} opacity={.6} />
                    <Line type="monotone" dataKey="merma" name="Merma" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="5 3" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Treemap branches */}
            <Card>
              <p className="font-bold text-[var(--text)] mb-4 flex items-center gap-2" style={{ fontFamily: 'Syne,sans-serif' }}>
                <Layers size={16} className="text-[var(--primary)]" /> Volumen por sucursal
              </p>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <Treemap data={stats.treemap} dataKey="size" aspectRatio={4/2} stroke="var(--surface)" fill="var(--brand-600)">
                    {stats.treemap.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Treemap>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        )}

        {/* ── BREAD / PRODUCTS ── */}
        {activeTab === 'bread' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card>
                <p className="font-bold text-[var(--text)] mb-4" style={{ fontFamily: 'Syne,sans-serif' }}>Unidades vs Merma por pan</p>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.byBread}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-3)' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend formatter={(v) => <span className="text-xs text-[var(--text-2)]">{v}</span>} />
                      <Bar dataKey="unidades" name="Unidades" fill="var(--brand-600)" radius={[3,3,0,0]} />
                      <Bar dataKey="merma" name="Merma" fill="#f59e0b" radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card>
                <p className="font-bold text-[var(--text)] mb-4" style={{ fontFamily: 'Syne,sans-serif' }}>Distribución por tipo</p>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={stats.byBread} cx="50%" cy="50%" outerRadius={85} dataKey="unidades" nameKey="name" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                        {stats.byBread.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* Ratio merma */}
            <Card>
              <p className="font-bold text-[var(--text)] mb-4" style={{ fontFamily: 'Syne,sans-serif' }}>% Merma por tipo de pan</p>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.byBread}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-3)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} unit="%" />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="ratio" name="% Merma" radius={[3,3,0,0]}>
                      {stats.byBread.map((entry, i) => (
                        <Cell key={i} fill={entry.ratio > 10 ? '#ef4444' : entry.ratio > 5 ? '#f59e0b' : '#16a34a'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-[var(--text-3)]">
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#16a34a]" />Óptimo (&lt;5%)</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#f59e0b]" />Moderado (5-10%)</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#ef4444]" />Alto (&gt;10%)</div>
              </div>
            </Card>
          </div>
        )}

        {/* ── TEAM ── */}
        {activeTab === 'team' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card>
                <p className="font-bold text-[var(--text)] mb-4" style={{ fontFamily: 'Syne,sans-serif' }}>Unidades por promotor</p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.byTeam} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
                      <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10, fill: 'var(--text-3)' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="unidades" name="Unidades" radius={[0,4,4,0]}>
                        {stats.byTeam.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card>
                <p className="font-bold text-[var(--text)] mb-4" style={{ fontFamily: 'Syne,sans-serif' }}>Pedidos vs Aprobados</p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.byTeam}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-3)' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend formatter={(v) => <span className="text-xs text-[var(--text-2)]">{v}</span>} />
                      <Bar dataKey="pedidos" name="Pedidos" fill="var(--brand-600)" radius={[3,3,0,0]} />
                      <Bar dataKey="aprobados" name="Aprobados" fill="#16a34a" radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* Scatter: pedidos vs unidades */}
            <Card>
              <p className="font-bold text-[var(--text)] mb-4" style={{ fontFamily: 'Syne,sans-serif' }}>Correlación pedidos ↔ unidades</p>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="pedidos" name="Pedidos" tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
                    <YAxis dataKey="unidades" name="Unidades" tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
                    <ZAxis range={[80, 300]} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                    <Scatter data={stats.byTeam} fill="var(--brand-500)" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        )}

        {/* ── TRENDS ── */}
        {activeTab === 'trends' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card>
                <p className="font-bold text-[var(--text)] mb-4" style={{ fontFamily: 'Syne,sans-serif' }}>Tendencia de ventas (14 días)</p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.last14}>
                      <defs>
                        <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#064d80" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#064d80" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="unidades" name="Unidades" stroke="#064d80" strokeWidth={2.5} fill="url(#g1)" dot={{ r: 3, fill: '#064d80' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card>
                <p className="font-bold text-[var(--text)] mb-4" style={{ fontFamily: 'Syne,sans-serif' }}>Merma diaria (14 días)</p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.last14}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="merma" name="Merma" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3, fill: '#f59e0b' }} />
                      <Line type="monotone" dataKey="pedidos" name="Pedidos" stroke="#0c90e0" strokeWidth={2} strokeDasharray="5 3" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* Combined composed */}
            <Card>
              <p className="font-bold text-[var(--text)] mb-4" style={{ fontFamily: 'Syne,sans-serif' }}>Vista combinada: ventas, merma y pedidos</p>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={stats.last14}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend formatter={(v) => <span className="text-xs text-[var(--text-2)]">{v}</span>} />
                    <Bar yAxisId="left" dataKey="unidades" name="Unidades" fill="var(--brand-200)" radius={[2,2,0,0]} />
                    <Line yAxisId="left" type="monotone" dataKey="merma" name="Merma" stroke="#f59e0b" strokeWidth={2} dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="pedidos" name="Pedidos" stroke="#16a34a" strokeWidth={2} dot={false} strokeDasharray="5 3" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        )}

        {/* ── RADAR / ANALYSIS ── */}
        {activeTab === 'radar' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card>
                <p className="font-bold text-[var(--text)] mb-4" style={{ fontFamily: 'Syne,sans-serif' }}>Radar: ventas vs merma por pan</p>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={stats.radarData}>
                      <PolarGrid stroke="var(--border)" />
                      <PolarAngleAxis dataKey="pan" tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
                      <PolarRadiusAxis tick={{ fontSize: 10, fill: 'var(--text-4)' }} />
                      <Radar name="Ventas" dataKey="ventas" stroke="var(--brand-600)" fill="var(--brand-600)" fillOpacity={0.3} strokeWidth={2} />
                      <Radar name="Merma" dataKey="merma" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} strokeWidth={2} />
                      <Legend formatter={(v) => <span className="text-xs text-[var(--text-2)]">{v}</span>} />
                      <Tooltip content={<CustomTooltip />} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card>
                <p className="font-bold text-[var(--text)] mb-4" style={{ fontFamily: 'Syne,sans-serif' }}>Embudo de pedidos</p>
                <div className="h-72 flex items-center justify-center">
                  {stats.funnel.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <FunnelChart>
                        <Tooltip content={<CustomTooltip />} />
                        <Funnel dataKey="value" data={stats.funnel} isAnimationActive>
                          <LabelList position="right" fill="var(--text-2)" stroke="none" dataKey="name" style={{ fontSize: 12, fontFamily: 'DM Sans,sans-serif' }} />
                          {stats.funnel.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                        </Funnel>
                      </FunnelChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-[var(--text-4)] text-sm">No hay datos</p>
                  )}
                </div>
              </Card>
            </div>

            {/* Summary table */}
            <Card className="!p-0 overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--border)]">
                <p className="font-bold text-[var(--text)]" style={{ fontFamily: 'Syne,sans-serif' }}>Resumen por sucursal</p>
              </div>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Sucursal</th>
                      <th>Pedidos</th>
                      <th>Unidades</th>
                      <th>Progreso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.byBranch.map((b, i) => {
                      const max = stats.byBranch[0]?.unidades ?? 1;
                      return (
                        <tr key={i}>
                          <td className="font-500 text-[var(--text)]">{b.name}</td>
                          <td className="mono">{b.pedidos}</td>
                          <td className="mono font-600 text-[var(--primary)]">{b.unidades}</td>
                          <td className="w-32">
                            <div className="progress">
                              <div className="progress-bar" style={{ width: `${(b.unidades / max) * 100}%` }} />
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

        {/* ── MAP ── */}
        {activeTab === 'map' && (
          <LiveMap
            orders={orders}
            branches={branches}
            teamBranches={branches}
            promoters={[]}
            mode="auditor"
          />
        )}
      </main>

      <ChatbotFAB orders={orders} />
    </div>
  );
}
