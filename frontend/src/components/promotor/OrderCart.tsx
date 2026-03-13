import { Button } from '../ui/core';
import { ShoppingCart, X, Trash2, CheckCircle, Package } from 'lucide-react';
import type { OrderItem } from '../../types/webertrack';

interface OrderCartProps {
  cart: Array<{ branchId: string; branchName: string; items: OrderItem[] }>;
  isOpen: boolean;
  onClose: () => void;
  onRemove: (branchId: string) => void;
  onConfirm: (branchId: string) => void;
}

export function OrderCart({ cart, isOpen, onClose, onRemove, onConfirm }: OrderCartProps) {
  if (!isOpen) return null;

  const totalUnits = cart.reduce((s, c) => s + c.items.reduce((a, i) => a + i.actual_qty, 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="backdrop" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[var(--surface)] border-l border-[var(--border)] flex flex-col shadow-[var(--shadow-xl)] slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2.5">
            <div className="icon-box bg-gradient-to-br from-[var(--brand-100)] to-[var(--brand-50)] dark:from-[var(--brand-900)] dark:to-[var(--brand-950)]">
              <ShoppingCart size={18} className="text-[var(--primary)]" />
            </div>
            <div>
              <h3 className="font-bold text-[var(--text)]" style={{ fontFamily: 'Syne,sans-serif' }}>Carrito</h3>
              <p className="text-xs text-[var(--text-3)]">{cart.length} sucursal{cart.length !== 1 ? 'es' : ''} · {totalUnits} pzas</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[var(--surface-2)] text-[var(--text-3)] hover:text-[var(--text)] transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[var(--surface-2)] flex items-center justify-center">
                <Package size={28} className="text-[var(--text-4)]" />
              </div>
              <p className="font-500 text-[var(--text-2)]">Carrito vacío</p>
              <p className="text-xs text-[var(--text-4)] max-w-[180px]">Selecciona una sucursal y añade el pedido</p>
            </div>
          ) : (
            cart.map(({ branchId, branchName, items }) => (
              <div key={branchId} className="glass rounded-2xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <p className="font-bold text-[var(--text)] text-sm leading-tight">{branchName}</p>
                  <button
                    onClick={() => onRemove(branchId)}
                    className="p-1.5 rounded-lg text-[var(--danger)] hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="space-y-1.5 mb-3">
                  {items.map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                      <span className="text-[var(--text-2)] truncate">{item.bread_type_name ?? item.bread_type_id}</span>
                      <span className="font-bold mono text-[var(--primary)] ml-2">{item.actual_qty}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-2.5 border-t border-[var(--border)]">
                  <span className="text-xs text-[var(--text-3)]">
                    Total: <span className="font-700 mono text-[var(--text)]">{items.reduce((s, i) => s + i.actual_qty, 0)} pzas</span>
                  </span>
                  <Button size="sm" onClick={() => onConfirm(branchId)} leftIcon={<CheckCircle size={13} />}>
                    Confirmar
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-4 border-t border-[var(--border)] bg-[var(--surface-2)]">
            <Button
              className="w-full"
              size="lg"
              leftIcon={<CheckCircle size={18} />}
              onClick={() => { cart.forEach(c => onConfirm(c.branchId)); onClose(); }}
            >
              Confirmar todo ({cart.length})
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
