import { useMemo, useState, useEffect } from 'react';
import { Card } from '../ui/core';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';
import { useWeberData } from '../../context/WeberDataContext';
import { isSupabaseConfigured } from '../../lib/supabase';
import * as sq from '../../lib/supabaseQueries';
import type { ProfileRow } from '../../lib/supabaseQueries';
import { Building2, Package, Users, ShoppingBag, TrendingUp } from 'lucide-react';
import { subDays, format } from 'date-fns';

const PALETTE = ['#064d80','#0c90e0','#36adf6','#7cc9fb','#e8b930','#16a34a'];

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color?: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl p-3 text-sm">
      {label && <p className="font-700 text-[var(--text)] mb-1.5">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-[var(--text-3)]">{p.name}</span>
          </div>
          <span className="font-600 mono text-[var(--text)]">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export function SuperAdminResumenPanel() {
  const { branches, breadTypes, orders } = useWeberData();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);

  useEffect(() => {
    if (isSupabaseConfigured()) {
      sq.fetchProfiles().then(setProfiles).catch(() => setProfiles([]));
    }
  }, []);

  const stats = useMemo(() => {
    const roleCounts = profiles.reduce((acc, p) => {
      const r = p.role || 'Sin rol';
      acc[r] = (acc[r] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const barByRole = Object.entries(roleCounts).map(([name, Usuarios]) => ({ name, Usuarios }));

    const statusCounts = orders.reduce((acc, o) => {
      acc[o.status] = (acc[o.status] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const barByStatus = [
      { name: 'Pendientes', Pedidos: statusCounts['PENDING'] ?? 0 },
      { name: 'Aprobados',  Pedidos: statusCounts['APPROVED'] ?? 0 },
      { name: 'Rechazados', Pedidos: statusCounts['REJECTED'] ?? 0 },
    ].filter(d => d.Pedidos > 0);

    const productByStatus = breadTypes.reduce((acc, b) => {
      acc[b.status] = (acc[b.status] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const pieProducts = [
      { name: 'Disponible', value: productByStatus['available'] ?? 0, fill: '#16a34a' },
      { name: 'Agotado',    value: productByStatus['sold_out'] ?? 0,  fill: '#f59e0b' },
      { name: 'Descont.',   value: productByStatus['discontinued'] ?? 0, fill: '#94a3b8' },
    ].filter(d => d.value > 0);

    const trend = Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), 6 - i);
      const key = format(d, 'yyyy-MM-dd');
      const dayOrds = orders.filter(o => o.created_at?.startsWith(key));
      return {
        day: format(d, 'dd/MM'),
        pedidos: dayOrds.length,
        unidades: dayOrds.reduce((s, o) => s + o.items.reduce((a, i) => a + i.actual_qty, 0), 0),
      };
    });

    return { barByRole, barByStatus, pieProducts, trend };
  }, [profiles, orders, breadTypes]);

  const kpis = [
    { label: 'Sucursales', value: branches.length, icon: Building2, color: '#064d80' },
    { label: 'Productos',  value: breadTypes.length, icon: Package,  color: '#0c90e0' },
    { label: 'Usuarios',   value: profiles.length || '—', icon: Users, color: '#e8b930' },
    { label: 'Pedidos',    value: orders.length, icon: ShoppingBag, color: '#16a34a' },
  ];

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map(k => (
          <div key={k.label} className="glass rounded-2xl p-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: k.color + '18' }}>
              <k.icon size={18} style={{ color: k.color }} />
            </div>
            <p className="text-2xl font-bold mono" style={{ color: k.color }}>{k.value}</p>
            <p className="text-xs text-[var(--text-3)] mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Roles bar */}
        <Card>
          <p className="font-bold text-[var(--text)] mb-4" style={{ fontFamily: 'Syne,sans-serif' }}>Usuarios por rol</p>
          <div className="h-52">
            {stats.barByRole.some(d => d.Usuarios > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.barByRole}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="Usuarios" radius={[3,3,0,0]}>
                    {stats.barByRole.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-[var(--text-4)]">{isSupabaseConfigured() ? 'Sin usuarios' : 'Conecta Supabase'}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Status bar */}
        <Card>
          <p className="font-bold text-[var(--text)] mb-4" style={{ fontFamily: 'Syne,sans-serif' }}>Pedidos por estado</p>
          <div className="h-52">
            {stats.barByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.barByStatus}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="Pedidos" radius={[3,3,0,0]}>
                    <Cell fill="#f59e0b" /><Cell fill="#16a34a" /><Cell fill="#ef4444" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-[var(--text-4)]">Sin pedidos</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Product status pie + trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <p className="font-bold text-[var(--text)] mb-4" style={{ fontFamily: 'Syne,sans-serif' }}>Estado de productos</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.pieProducts.length ? stats.pieProducts : [{ name: 'Sin datos', value: 1, fill: 'var(--border)' }]}
                  cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                  {(stats.pieProducts.length ? stats.pieProducts : [{ fill: 'var(--border)' }]).map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={(v) => <span className="text-xs text-[var(--text-2)]">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <p className="font-bold text-[var(--text)] mb-4 flex items-center gap-2" style={{ fontFamily: 'Syne,sans-serif' }}>
            <TrendingUp size={16} className="text-[var(--primary)]" /> Actividad 7 días
          </p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.trend}>
                <defs>
                  <linearGradient id="saGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#064d80" stopOpacity={.25} />
                    <stop offset="95%" stopColor="#064d80" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="pedidos" name="Pedidos" stroke="#064d80" strokeWidth={2.5} fill="url(#saGrad)" dot={{ r: 3, fill: '#064d80' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
