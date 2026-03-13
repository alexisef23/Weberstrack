import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useWeberData } from '../../context/WeberDataContext';
import { Button, Card, Input, StatusBadge } from '../ui/core';
import { ChatbotFAB } from '../chatbot/ChatbotFAB';
import { OrderCart } from './OrderCart';
import { OrderForm } from './OrderForm';
import { PromotorMetricsPanel } from './PromotorMetricsPanel';
import { LiveMap } from '../maps/LiveMap';
import {
  Search, LogOut, ShoppingCart, MapPin, ChevronRight, Loader2,
  BarChart3, Map, Package,
} from 'lucide-react';
import { toast } from 'sonner';
import { isSupabaseConfigured } from '../../lib/supabase';

type Tab = 'sucursales' | 'metricas' | 'mapa';

export function PromotorDashboard() {
  const { user, logout } = useAuth();
  const {
    getAssignedBranches, breadTypes, cart, addToCart, removeFromCart,
    getCartByBranch, createOrder, getHistoricalSales, getWasteHistory,
    getSuggestion, prefetchBranchHistory, orders, branches,
  } = useWeberData();

  const [activeTab, setActiveTab] = useState<Tab>('sucursales');
  const [search, setSearch] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<{ id: string; name: string } | null>(null);
  const [branchLoading, setBranchLoading] = useState(false);

  useEffect(() => {
    if (selectedBranch && isSupabaseConfigured()) {
      setBranchLoading(true);
      prefetchBranchHistory(selectedBranch.id).finally(() => setBranchLoading(false));
    } else if (selectedBranch) {
      setBranchLoading(false);
    }
  }, [selectedBranch?.id]);

  const assignedBranches = getAssignedBranches(user?.id ?? '');
  const filtered = assignedBranches.filter(
    b => b.name.toLowerCase().includes(search.toLowerCase()) || b.address.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddToCart = (branchId: string, branchName: string, items: Parameters<typeof addToCart>[2]) => {
    addToCart(branchId, branchName, items);
    setSelectedBranch(null);
    toast.success(`Añadido al carrito — ${branchName}`);
  };

  const handleConfirmOrder = async (branchId: string) => {
    const entry = cart.find(c => c.branchId === branchId);
    if (!entry || !user) return;
    try {
      await createOrder(branchId, user.id, user.name, entry.items, user.supervisor_id);
      removeFromCart(branchId);
      setCartOpen(false);
      toast.success(`Pedido enviado — ${entry.branchName}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al enviar pedido');
    }
  };

  const cartItemCount = cart.reduce((s, c) => s + c.items.length, 0);
  const myOrders = orders.filter(o => o.promoter_id === user?.id || orders.length > 0);

  const TABS = [
    { id: 'sucursales' as Tab, label: 'Sucursales', icon: MapPin },
    { id: 'mapa' as Tab, label: 'Mi ruta', icon: Map },
    { id: 'metricas' as Tab, label: 'Mis datos', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <OrderCart cart={cart} isOpen={cartOpen} onClose={() => setCartOpen(false)} onRemove={removeFromCart} onConfirm={handleConfirmOrder} />

      {selectedBranch && (
        branchLoading ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(7,17,31,.6)' }}>
            <div className="glass rounded-2xl p-6 flex items-center gap-3">
              <Loader2 className="animate-spin text-[var(--primary)]" size={24} />
              <p className="text-sm font-500 text-[var(--text)]">Cargando historial…</p>
            </div>
          </div>
        ) : (
          <OrderForm
            branchId={selectedBranch.id}
            branchName={selectedBranch.name}
            breadTypes={breadTypes}
            getHistoricalSales={getHistoricalSales}
            getWasteHistory={getWasteHistory}
            getSuggestion={getSuggestion}
            existingItems={getCartByBranch(selectedBranch.id)}
            onSave={items => handleAddToCart(selectedBranch.id, selectedBranch.name, items)}
            onClose={() => setSelectedBranch(null)}
          />
        )
      )}

      <header className="app-header">
        <div className="flex items-center justify-between px-4 py-3 max-w-3xl mx-auto">
          <div>
            <h1 className="font-bold text-[var(--text)]" style={{ fontFamily: 'Syne,sans-serif' }}>
              Hola, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p className="text-xs text-[var(--text-3)]">Promotor · WeberTrack</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCartOpen(true)}
              className="relative h-9 w-9 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center hover:border-[var(--primary-light)] transition-colors"
            >
              <ShoppingCart size={17} className="text-[var(--text-2)]" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-[var(--brand-700)] text-white text-[10px] font-bold rounded-full">
                  {cartItemCount}
                </span>
              )}
            </button>
            <Button variant="ghost" size="icon" onClick={logout}><LogOut size={16} /></Button>
          </div>
        </div>

        <div className="flex border-t border-[var(--border)] max-w-3xl mx-auto">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}>
              <tab.icon size={14} />{tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="px-4 pt-5 max-w-3xl mx-auto">
        {/* Sucursales */}
        {activeTab === 'sucursales' && (
          <>
            <div className="mb-4">
              <Input
                placeholder="Buscar sucursal por nombre o dirección…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                leftElement={<Search size={16} />}
              />
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="glass rounded-xl p-3 text-center">
                <p className="text-lg font-bold mono text-[var(--primary)]">{assignedBranches.length}</p>
                <p className="text-xs text-[var(--text-3)]">Sucursales</p>
              </div>
              <div className="glass rounded-xl p-3 text-center">
                <p className="text-lg font-bold mono text-[#f59e0b]">{cart.length}</p>
                <p className="text-xs text-[var(--text-3)]">En carrito</p>
              </div>
              <div className="glass rounded-xl p-3 text-center">
                <p className="text-lg font-bold mono text-[#16a34a]">{myOrders.filter(o => o.status === 'APPROVED').length}</p>
                <p className="text-xs text-[var(--text-3)]">Aprobados</p>
              </div>
            </div>

            <div className="space-y-2.5">
              {filtered.length === 0 ? (
                <Card className="!p-12 text-center">
                  <MapPin size={36} className="mx-auto mb-3 text-[var(--text-4)]" />
                  <p className="text-[var(--text-2)] font-500">Sin sucursales</p>
                  <p className="text-[var(--text-4)] text-sm mt-1">No hay resultados para tu búsqueda</p>
                </Card>
              ) : (
                filtered.map(branch => {
                  const inCart = cart.some(c => c.branchId === branch.id);
                  const branchOrders = myOrders.filter(o => o.branch_id === branch.id);
                  const lastOrder = branchOrders[0];
                  return (
                    <div
                      key={branch.id}
                      onClick={() => setSelectedBranch({ id: branch.id, name: branch.name })}
                      className={`glass rounded-2xl p-4 cursor-pointer hover:border-[var(--brand-400)] transition-all active:scale-[.99] ${inCart ? 'border-[var(--gold-500)]' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="icon-box-lg bg-gradient-to-br from-[var(--brand-100)] to-[var(--brand-50)] dark:from-[var(--brand-900)] dark:to-[var(--brand-950)]">
                          <MapPin size={22} className="text-[var(--primary)]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-[var(--text)] truncate">{branch.name}</p>
                            {inCart && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(232,185,48,.15)] text-[var(--gold-600)] dark:text-[var(--gold-400)] font-600 border border-[rgba(232,185,48,.3)]">
                                En carrito
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-[var(--text-3)] truncate">{branch.address}</p>
                          {lastOrder && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <StatusBadge status={lastOrder.status} />
                            </div>
                          )}
                        </div>
                        <ChevronRight size={18} className="text-[var(--text-4)] flex-shrink-0" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* Mapa */}
        {activeTab === 'mapa' && (
          <LiveMap
            orders={myOrders}
            branches={branches}
            teamBranches={assignedBranches}
            promoters={[]}
            mode="promotor"
            currentPromotorId={user?.id}
          />
        )}

        {/* Métricas */}
        {activeTab === 'metricas' && (
          <PromotorMetricsPanel orders={myOrders} />
        )}
      </main>

      <ChatbotFAB orders={myOrders} />
    </div>
  );
}
