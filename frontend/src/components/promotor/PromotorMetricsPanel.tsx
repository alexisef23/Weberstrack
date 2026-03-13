import { useMemo } from 'react';
import { Card } from '../ui/core';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';
import type { Order } from '../../types/webertrack';
import { subDays, format } from 'date-fns';

const PALETTE = ['#064d80','#0c90e0','#36adf6','#7cc9fb','#e8b930'];

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color?: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl p-3 text-sm min-w-[130px]">
      {label && <p className="font-700 text-[var(--text)] mb-2">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-2">
          <span className="text-[var(--text-3)]">{p.name}</span>
          <span className="font-600 mono">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export function PromotorMetricsPanel({ orders }: { orders: Order[] }) {
  const { byBranch, pieStatus, trend, totalUnits } = useMemo(() => {
    const byBranch = Array.from(
      orders.reduce((acc, o) => {
        const n = o.branch_name ?? o.branch_id;
        const total = o.items.reduce((s, i) => s + i.actual_qty, 0);
        acc.set(n, (acc.get(n) ?? 0) + total);
        return acc;
      }, new Map<string, number>())
    ).map(([name, Unidades]) => ({ name, Unidades }));

    const pieStatus = [
      { name: 'Pendientes', value: orders.filter(o => o.status === 'PENDING').length, fill: '#f59e0b' },
      { name: 'Aprobados', value: orders.filter(o => o.status === 'APPROVED').length, fill: '#16a34a' },
      { name: 'Rechazados', value: orders.filter(o => o.status === 'REJECTED').length, fill: '#ef4444' },
    ].filter(d => d.value > 0);

    const trend = Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), 6 - i);
      const key = format(d, 'yyyy-MM-dd');
      const dayOrders = orders.filter(o => o.created_at?.startsWith(key));
      return {
        day: format(d, 'dd/MM'),
        pedidos: dayOrders.length,
        unidades: dayOrders.reduce((s, o) => s + o.items.reduce((a, i) => a + i.actual_qty, 0), 0),
      };
    });

    const totalUnits = orders.reduce((s, o) => s + o.items.reduce((a, i) => a + i.actual_qty, 0), 0);

    return { byBranch, pieStatus, trend, totalUnits };
  }, [orders]);

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold mono text-[var(--primary)]">{orders.length}</p>
          <p className="text-xs text-[var(--text-3)]">Pedidos</p>
        </div>
        <div className="glass rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold mono text-[#16a34a]">{totalUnits}</p>
          <p className="text-xs text-[var(--text-3)]">Unidades</p>
        </div>
        <div className="glass rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold mono text-[var(--primary)]">{new Set(orders.map(o => o.branch_id)).size}</p>
          <p className="text-xs text-[var(--text-3)]">Sucursales</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Card>
          <p className="font-bold text-[var(--text)] mb-4" style={{ fontFamily: 'Syne,sans-serif' }}>Por sucursal</p>
          <div className="h-52">
            {byBranch.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byBranch}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-3)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="Unidades" radius={[3,3,0,0]}>
                    {byBranch.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-[var(--text-4)] text-sm flex items-center justify-center h-full">Sin pedidos aún</p>}
          </div>
        </Card>

        <Card>
          <p className="font-bold text-[var(--text)] mb-4" style={{ fontFamily: 'Syne,sans-serif' }}>Estado</p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieStatus.length ? pieStatus : [{ name: 'Sin datos', value: 1, fill: 'var(--border)' }]}
                  cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                  {(pieStatus.length ? pieStatus : [{ fill: 'var(--border)' }]).map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={(v) => <span className="text-xs text-[var(--text-2)]">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card>
        <p className="font-bold text-[var(--text)] mb-4" style={{ fontFamily: 'Syne,sans-serif' }}>Actividad 7 días</p>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="pg1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#064d80" stopOpacity={.25} />
                  <stop offset="95%" stopColor="#064d80" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="unidades" name="Unidades" stroke="#064d80" strokeWidth={2.5} fill="url(#pg1)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
