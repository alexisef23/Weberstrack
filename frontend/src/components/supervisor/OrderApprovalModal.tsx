import { useState } from 'react';
import { Button, StatusBadge } from '../ui/core';
import { Check, X, MessageSquare, Package } from 'lucide-react';
import type { Order, OrderItem } from '../../types/webertrack';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface OrderApprovalModalProps {
  order: Order;
  onApprove: (items: OrderItem[], comments?: string) => void;
  onReject: (comments?: string) => void;
  onClose: () => void;
}

export function OrderApprovalModal({ order, onApprove, onReject, onClose }: OrderApprovalModalProps) {
  const [items, setItems] = useState<OrderItem[]>(order.items);
  const [comments, setComments] = useState(order.supervisor_comments ?? '');

  const updateQty = (idx: number, qty: number) => {
    setItems(prev => { const next = [...prev]; next[idx] = { ...next[idx], actual_qty: Math.max(0, qty) }; return next; });
  };

  const totalUnits = items.reduce((s, i) => s + i.actual_qty, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(7,17,31,.6)', backdropFilter: 'blur(8px)' }}>
      <div className="glass rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-[var(--shadow-xl)] overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-[var(--border)]">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-[var(--text)]" style={{ fontFamily: 'Syne,sans-serif' }}>
                {order.branch_name}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-[var(--text-3)]">Por {order.promoter_name}</p>
                <StatusBadge status={order.status} />
              </div>
              <p className="text-xs text-[var(--text-4)] mt-0.5">
                {format(new Date(order.created_at), "d 'de' MMMM, HH:mm", { locale: es })}
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-[var(--surface-2)] text-[var(--text-3)] transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2.5">
          <div className="flex items-center gap-2 mb-3">
            <Package size={15} className="text-[var(--text-3)]" />
            <p className="text-sm font-600 text-[var(--text-2)]">Cantidades del pedido</p>
          </div>
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
              <div className="flex-1">
                <p className="text-sm font-600 text-[var(--text)]">{item.bread_type_name ?? item.bread_type_id}</p>
                <p className="text-xs text-[var(--text-3)] mt-0.5">Sugerido: {item.suggested_qty} · Merma: {item.waste}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => updateQty(idx, item.actual_qty - 1)} className="w-7 h-7 rounded-lg bg-[var(--surface-3)] hover:bg-[var(--border)] flex items-center justify-center font-bold text-[var(--text-2)] transition-colors">−</button>
                <input
                  type="number" min={0} value={item.actual_qty}
                  onChange={e => updateQty(idx, parseInt(e.target.value) || 0)}
                  className="w-14 h-8 rounded-lg border border-[var(--border)] text-center font-bold mono text-sm bg-[var(--surface)] text-[var(--text)] outline-none focus:border-[var(--primary-light)]"
                />
                <button onClick={() => updateQty(idx, item.actual_qty + 1)} className="w-7 h-7 rounded-lg bg-[var(--surface-3)] hover:bg-[var(--border)] flex items-center justify-center font-bold text-[var(--text-2)] transition-colors">+</button>
              </div>
            </div>
          ))}

          {/* Comments */}
          <div className="mt-2">
            <label className="flex items-center gap-1.5 text-xs font-600 text-[var(--text-3)] uppercase tracking-wide mb-2">
              <MessageSquare size={12} /> Comentarios
            </label>
            <textarea
              value={comments}
              onChange={e => setComments(e.target.value)}
              placeholder="Notas adicionales para el promotor…"
              rows={3}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text-4)] outline-none focus:border-[var(--primary-light)] resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--surface-2)]">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-[var(--text-3)]">Total: <span className="font-bold mono text-[var(--text)]">{totalUnits} pzas</span></p>
          </div>
          <div className="flex gap-2.5">
            <Button variant="danger" onClick={() => onReject(comments)} className="flex-1" leftIcon={<X size={15} />}>
              Rechazar
            </Button>
            <Button onClick={() => onApprove(items, comments)} className="flex-1" leftIcon={<Check size={15} />}>
              Aprobar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
