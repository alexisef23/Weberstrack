import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useWeberData } from '../../context/WeberDataContext';
import { Button, Card, StatusBadge } from '../ui/core';
import { LiveMap } from '../maps/LiveMap';
import { OrderApprovalModal } from './OrderApprovalModal';
import { MetricsPanel } from './MetricsPanel';
import {
  LogOut, Map, Inbox, BarChart3, FileSpreadsheet, FileText,
  Calendar, RefreshCw, ChevronRight, Clock, CheckCircle2, XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { exportOrdersToExcel, exportOrdersToPDF } from '../../lib/weberExportUtils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type Tab = 'orders' | 'map' | 'metrics';

export function SupervisorDashboard() {
  const { user, logout } = useAuth();
  const { getOrdersBySupervisor, getPromotersBySupervisor, orders, updateOrder, branches, teamBranches, dateFilter, setDateFilter } = useWeberData();
  const [activeTab, setActiveTab] = useState<Tab>('orders');
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);

  const teamOrders = getOrdersBySupervisor(user?.id ?? '');
  const pendingCount = teamOrders.filter(o => o.status === 'PENDING').length;
  const promoters = getPromotersBySupervisor(user?.id ?? '');

  const handleApprove = async (orderId: string, items: typeof orders[0]['items'], comments?: string) => {
    try {
      await updateOrder(orderId, { status: 'APPROVED', items, supervisor_comments: comments, approved_at: new Date().toISOString(), supervisor_id: user?.id });
      setSelectedOrder(null);
      toast.success('✓ Pedido aprobado');
    } catch { toast.error('No se pudo aprobar. Revisa la consola.'); }
  };

  const handleReject = async (orderId: string, comments?: string) => {
    try {
      await updateOrder(orderId, { status: 'REJECTED', supervisor_comments: comments, supervisor_id: user?.id });
      setSelectedOrder(null);
      toast.success('Pedido rechazado');
    } catch { toast.error('No se pudo rechazar.'); }
  };

  const selected = teamOrders.find(o => o.id === selectedOrder);

  const TABS = [
    { id: 'orders' as Tab, label: 'Pedidos', icon: Inbox, badge: pendingCount },
    { id: 'map' as Tab, label: 'Mapa', icon: Map },
    { id: 'metrics' as Tab, label: 'Métricas', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {selected && (
        <OrderApprovalModal
          order={selected}
          onApprove={(items, comments) => handleApprove(selected.id, items, comments)}
          onReject={comments => handleReject(selected.id, comments)}
          onClose={() => setSelectedOrder(null)}
        />
      )}

      <header className="app-header">
        <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto">
          <div>
            <h1 className="font-bold text-[var(--text)]" style={{ fontFamily: 'Syne,sans-serif' }}>
              Hola, {user?.name?.split(' ')[0]}
            </h1>
            <p className="text-xs text-[var(--text-3)]">
              {pendingCount > 0
                ? <span className="text-[#f59e0b] font-600">{pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}</span>
                : 'Sin pendientes'
              } · Supervisor
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => exportOrdersToExcel(teamOrders)} leftIcon={<FileSpreadsheet size={13} />}>Excel</Button>
            <Button size="sm" variant="outline" onClick={() => exportOrdersToPDF(teamOrders)} leftIcon={<FileText size={13} />}>PDF</Button>
            <Button variant="ghost" size="icon" onClick={logout}><LogOut size={16} /></Button>
          </div>
        </div>

        <div className="flex border-t border-[var(--border)] max-w-4xl mx-auto">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}>
              <tab.icon size={14} />
              {tab.label}
              {tab.badge ? (
                <span className="bg-[#f59e0b] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none">
                  {tab.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </header>

      <main className="px-4 pt-5 max-w-4xl mx-auto">
        {/* Orders tab */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {/* Date filter */}
            <div className="flex flex-wrap items-center gap-2">
              <Calendar size={14} className="text-[var(--text-3)]" />
              <input type="date" value={dateFilter.from ?? ''} onChange={e => setDateFilter(f => ({ ...f, from: e.target.value || undefined }))} className="input h-8 w-auto text-sm px-2" />
              <span className="text-[var(--text-4)]">—</span>
              <input type="date" value={dateFilter.to ?? ''} onChange={e => setDateFilter(f => ({ ...f, to: e.target.value || undefined }))} className="input h-8 w-auto text-sm px-2" />
              {(dateFilter.from || dateFilter.to) && (
                <Button size="sm" variant="ghost" onClick={() => setDateFilter({})} leftIcon={<RefreshCw size={12} />}>Limpiar</Button>
              )}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total', value: teamOrders.length, icon: Inbox, color: '#064d80' },
                { label: 'Pendientes', value: pendingCount, icon: Clock, color: '#f59e0b' },
                { label: 'Aprobados', value: teamOrders.filter(o => o.status === 'APPROVED').length, icon: CheckCircle2, color: '#16a34a' },
              ].map(s => (
                <div key={s.label} className="glass rounded-2xl p-4 text-center">
                  <s.icon size={18} style={{ color: s.color }} className="mx-auto mb-1" />
                  <p className="text-xl font-bold mono" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-xs text-[var(--text-3)]">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Orders list */}
            {teamOrders.length === 0 ? (
              <Card className="!p-12 text-center">
                <Inbox size={40} className="mx-auto mb-3 text-[var(--text-4)]" />
                <p className="text-[var(--text-2)] font-500">No hay pedidos de tu equipo</p>
                <p className="text-[var(--text-4)] text-sm mt-1">Los pedidos aparecerán aquí cuando tus promotores los envíen</p>
              </Card>
            ) : (
              <div className="space-y-2.5">
                {teamOrders.map(order => (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrder(order.id)}
                    className="glass rounded-2xl p-4 cursor-pointer hover:border-[var(--brand-400)] transition-all hover:shadow-[var(--shadow-lg)] active:scale-[.99]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-[var(--text)] truncate">{order.branch_name ?? order.branch_id}</p>
                          <StatusBadge status={order.status} />
                        </div>
                        <p className="text-sm text-[var(--text-3)]">
                          {order.promoter_name} · {format(new Date(order.created_at), "d MMM, HH:mm", { locale: es })}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {order.items.slice(0, 3).map((item, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-2)]">
                              {item.bread_type_name}: <span className="font-600 mono">{item.actual_qty}</span>
                            </span>
                          ))}
                          {order.items.length > 3 && (
                            <span className="text-xs text-[var(--text-4)]">+{order.items.length - 3} más</span>
                          )}
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-[var(--text-4)] flex-shrink-0 mt-1" />
                    </div>
                    {order.supervisor_comments && (
                      <div className="mt-2 pt-2 border-t border-[var(--border)] text-xs text-[var(--text-3)] italic">
                        "{order.supervisor_comments}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Map tab */}
        {activeTab === 'map' && (
          <LiveMap
            orders={teamOrders}
            branches={branches}
            teamBranches={teamBranches}
            promoters={promoters}
            mode="supervisor"
          />
        )}

        {/* Metrics tab */}
        {activeTab === 'metrics' && <MetricsPanel orders={teamOrders} />}
      </main>
    </div>
  );
}
