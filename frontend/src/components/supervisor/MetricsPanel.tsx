import { useMemo } from 'react';
import { Card } from '../ui/core';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import type { Order } from '../../types/webertrack';

const PALETTE = ['#064d80','#0c90e0','#36adf6','#7cc9fb','#e8b930'];

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color?: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl p-3 text-sm min-w-[130px]">
      {label && <p className="font-700 text-[var(--text)] mb-2">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-2">
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

export function MetricsPanel({ orders }: { orders: Order[] }) {
  const { kpis, byPromoter, pieStatus, byBread, radarData } = useMemo(() => {
    const pending = orders.filter(o => o.status === 'PENDING').length;
    const approved = orders.filter(o => o.status === 'APPROVED').length;
    const rejected = orders.filter(o => o.status === 'REJECTED').length;
    const totalItems = orders.reduce((s, o) => s + o.items.reduce((a, i) => a + i.actual_qty, 0), 0);
    const promoters = new Set(orders.map(o => o.promoter_id)).size;

    const byPromoter = Array.from(
      orders.reduce((acc, o) => {
        const n = o.promoter_name ?? o.promoter_id;
        const units = o.items.reduce((s, i) => s + i.actual_qty, 0);
        const cur = acc.get(n) ?? { pedidos: 0, unidades: 0 };
        acc.set(n, { pedidos: cur.pedidos + 1, unidades: cur.unidades + units });
        return acc;
      }, new Map<string, { pedidos: number; unidades: number }>())
    ).map(([name, d]) => ({ name, ...d }));

    const byBread = Array.from(
      orders.reduce((acc, o) => {
        o.items.forEach(i => {
          const n = i.bread_type_name ?? i.bread_type_id;
          acc.set(n, (acc.get(n) ?? 0) + i.actual_qty);
        });
        return acc;
      }, new Map<string, number>())
    ).map(([name, unidades]) => ({ name, unidades })).sort((a, b) => b.unidades - a.unidades);

    const radarData = byPromoter.map(p => ({ name: p.name.split(' ')[0], pedidos: p.pedidos, unidades: Math.round(p.unidades / 10) }));

    return {
      kpis: { pending, approved, rejected, totalItems, promoters, approvalRate: orders.length ? +((approved / orders.length) * 100).toFixed(0) : 0 },
      byPromoter,
      pieStatus: [
        { name: 'Pendientes', value: pending, fill: '#f59e0b' },
        { name: 'Aprobados', value: approved, fill: '#16a34a' },
        { name: 'Rechazados', value: rejected, fill: '#ef4444' },
      ].filter(d => d.value > 0),
      byBread,
      radarData,
    };
  }, [orders]);

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Total pedidos', value: orders.length, color: '#064d80' },
          { label: 'Pendientes', value: kpis.pending, color: '#f59e0b' },
          { label: 'Aprobados', value: kpis.approved, color: '#16a34a' },
          { label: 'Rechazados', value: kpis.rejected, color: '#ef4444' },
          { label: 'Total unidades', value: kpis.totalItems, color: '#064d80' },
          { label: 'Tasa aprobación', value: `${kpis.approvalRate}%`, color: '#0c90e0' },
        ].map(k => (
          <div key={k.label} className="glass rounded-2xl p-4">
            <p className="text-2xl font-bold mono" style={{ color: k.color }}>{k.value}</p>
            <p className="text-xs text-[var(--text-3)] mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Bar: by promotor */}
        <Card>
          <p className="font-bold text-[var(--text)] mb-4" style={{ fontFamily: 'Syne,sans-serif' }}>Unidades por promotor</p>
          <div className="h-56">
            {byPromoter.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byPromoter}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="unidades" name="Unidades" fill="var(--brand-600)" radius={[3,3,0,0]}>
                    {byPromoter.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-[var(--text-4)] text-sm flex items-center justify-center h-full">Sin datos</p>}
          </div>
        </Card>

        {/* Pie: status */}
        <Card>
          <p className="font-bold text-[var(--text)] mb-4" style={{ fontFamily: 'Syne,sans-serif' }}>Estado de pedidos</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieStatus.length ? pieStatus : [{ name: 'Sin datos', value: 1, fill: 'var(--border)' }]}
                  cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {(pieStatus.length ? pieStatus : [{ name: '-', value: 1, fill: 'var(--border)' }]).map((_, i) => (
                    <Cell key={i} fill={(pieStatus.length ? pieStatus : [{ fill: 'var(--border)' }])[i]?.fill ?? PALETTE[i]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={(v) => <span className="text-xs text-[var(--text-2)]">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* By bread */}
      <Card>
        <p className="font-bold text-[var(--text)] mb-4" style={{ fontFamily: 'Syne,sans-serif' }}>Unidades por tipo de pan</p>
        <div className="h-52">
          {byBread.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byBread}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-3)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="unidades" name="Unidades" fill="var(--brand-500)" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-[var(--text-4)] text-sm flex items-center justify-center h-full">Sin datos</p>}
        </div>
      </Card>

      {/* Radar */}
      {radarData.length > 1 && (
        <Card>
          <p className="font-bold text-[var(--text)] mb-4" style={{ fontFamily: 'Syne,sans-serif' }}>Comparativa del equipo</p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
                <PolarRadiusAxis tick={{ fontSize: 10, fill: 'var(--text-4)' }} />
                <Radar name="Pedidos" dataKey="pedidos" stroke="#064d80" fill="#064d80" fillOpacity={0.25} strokeWidth={2} />
                <Radar name="Unidades (÷10)" dataKey="unidades" stroke="#e8b930" fill="#e8b930" fillOpacity={0.2} strokeWidth={2} />
                <Legend formatter={(v) => <span className="text-xs text-[var(--text-2)]">{v}</span>} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
}
