import { useMemo, useState, useEffect } from 'react';
import { Card } from '../ui/core';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useWeberData } from '../../context/WeberDataContext';
import { isSupabaseConfigured } from '../../lib/supabase';
import * as sq from '../../lib/supabaseQueries';
import type { ProfileRow } from '../../lib/supabaseQueries';
import { BarChart3, PieChart as PieChartIcon, Users, Building2, Package, ShoppingCart } from 'lucide-react';

const CHART_COLORS = ['#0c4a6e', '#0ea5e9', '#0369a1', '#7dd3fc', '#0e7490'];

/** Resumen con gráficas para SuperAdmin — layout controlado */
export function SuperAdminResumenPanel() {
  const { branches, breadTypes, orders } = useWeberData();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);

  useEffect(() => {
    if (isSupabaseConfigured()) {
      sq.fetchProfiles().then(setProfiles).catch(() => setProfiles([]));
    }
  }, []);

  const { barByRole, barByStatus, pieByProductStatus } = useMemo(() => {
    const roleCounts = profiles.reduce((acc, p) => {
      const r = (p.role as string) || 'Sin rol';
      acc[r] = (acc[r] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const barByRole = Object.entries(roleCounts).map(([name, value]) => ({ name, Usuarios: value }));

    const statusCounts = orders.reduce((acc, o) => {
      acc[o.status] = (acc[o.status] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const barByStatus = Object.entries(statusCounts).map(([name, value]) => ({ name, Pedidos: value }));

    const productByStatus = breadTypes.reduce((acc, b) => {
      acc[b.status] = (acc[b.status] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const pieByProductStatus = Object.entries(productByStatus).map(([name, value], i) => ({
      name: name === 'available' ? 'Disponible' : name === 'sold_out' ? 'Agotado' : name === 'discontinued' ? 'Descontinuado' : name,
      value,
      fill: CHART_COLORS[i % CHART_COLORS.length],
    }));

    return {
      barByRole: barByRole.length ? barByRole : [{ name: 'Sin datos', Usuarios: 0 }],
      barByStatus: barByStatus.length ? barByStatus : [{ name: 'Sin pedidos', Pedidos: 0 }],
      pieByProductStatus: pieByProductStatus.length ? pieByProductStatus : [{ name: 'Sin productos', value: 1, fill: '#94a3b8' }],
    };
  }, [profiles, orders, breadTypes]);

  const kpis = [
    { label: 'Sucursales', value: branches.length, icon: Building2, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Productos', value: breadTypes.length, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Usuarios', value: profiles.length, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    { label: 'Pedidos', value: orders.length, icon: ShoppingCart, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
  ];

  return (
    <div className="space-y-6 overflow-x-hidden">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map(k => (
          <Card key={k.label} className="p-4 overflow-hidden">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg ${k.bg} flex items-center justify-center shrink-0`}>
                <k.icon size={18} className={k.color} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 truncate">{k.label}</p>
                <p className={`text-xl font-bold mt-0.5 ${k.color}`}>{k.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4 overflow-hidden">
          <h4 className="font-semibold text-primary mb-4 text-sm flex items-center gap-2">
            <BarChart3 size={16} /> Usuarios por rol
          </h4>
          <div className="w-full" style={{ height: 220 }}>
            {barByRole.some(d => d.Usuarios > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barByRole} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={30} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="Usuarios" fill="#0c4a6e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                {isSupabaseConfigured() ? 'No hay usuarios' : 'Conecta Supabase para ver usuarios'}
              </div>
            )}
          </div>
        </Card>

        <Card className="p-4 overflow-hidden">
          <h4 className="font-semibold text-primary mb-4 text-sm flex items-center gap-2">
            <BarChart3 size={16} /> Pedidos por estado
          </h4>
          <div className="w-full" style={{ height: 220 }}>
            {barByStatus.some(d => d.Pedidos > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barByStatus} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={30} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="Pedidos" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">No hay pedidos</div>
            )}
          </div>
        </Card>
      </div>

      <Card className="p-4 overflow-hidden">
        <h4 className="font-semibold text-primary mb-4 text-sm flex items-center gap-2">
          <PieChartIcon size={16} /> Productos por estado
        </h4>
        <div className="w-full" style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <Pie
                data={pieByProductStatus}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={65}
                paddingAngle={2}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={false}
              >
                {pieByProductStatus.map((_, i) => (
                  <Cell key={i} fill={pieByProductStatus[i].fill} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}