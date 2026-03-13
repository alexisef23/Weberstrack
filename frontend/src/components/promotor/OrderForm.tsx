import { useState } from 'react';
import { Button } from '../ui/core';
import { X, TrendingUp, AlertTriangle, ShoppingCart, Sparkles, Info } from 'lucide-react';
import type { BreadType, OrderItem } from '../../types/webertrack';
import { cn } from '../../lib/utils';

interface OrderFormProps {
  branchId: string;
  branchName: string;
  breadTypes: BreadType[];
  getHistoricalSales: (branchId: string, breadTypeId: string) => number[];
  getWasteHistory: (branchId: string, breadTypeId: string) => number[];
  getSuggestion: (branchId: string, breadTypeId: string) => number;
  existingItems?: OrderItem[] | null;
  onSave: (items: OrderItem[]) => void;
  onClose: () => void;
}

export function OrderForm({
  branchId, branchName, breadTypes, getHistoricalSales, getWasteHistory,
  getSuggestion, existingItems, onSave, onClose,
}: OrderFormProps) {
  const [items, setItems] = useState<OrderItem[]>(() =>
    existingItems?.length
      ? existingItems
      : breadTypes
          .filter(bt => bt.status === 'available')
          .map(bt => ({
            bread_type_id: bt.id,
            bread_type_name: bt.name,
            historical_sales: getHistoricalSales(branchId, bt.id).reduce((a, b) => a + b, 0) || 0,
            waste: getWasteHistory(branchId, bt.id).reduce((a, b) => a + b, 0) || 0,
            suggested_qty: getSuggestion(branchId, bt.id),
            actual_qty: getSuggestion(branchId, bt.id),
          }))
  );

  const totalUnits = items.reduce((s, i) => s + i.actual_qty, 0);

  const update = (idx: number, field: keyof OrderItem, value: number) => {
    setItems(prev => {
      const next = [...prev];
      (next[idx] as Record<string, unknown>)[field] = value;
      return next;
    });
  };

  const setAllToSuggested = () => {
    setItems(prev => prev.map(i => ({ ...i, actual_qty: i.suggested_qty })));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(7,17,31,.6)', backdropFilter: 'blur(8px)' }}>
      <div className="glass rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-[var(--shadow-xl)] overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-[var(--border)] flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[var(--text)]" style={{ fontFamily: 'Syne,sans-serif' }}>
              Pedido — {branchName}
            </h2>
            <p className="text-sm text-[var(--text-3)] mt-0.5">Ajusta merma y cantidades a pedir</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[var(--surface-2)] text-[var(--text-3)] hover:text-[var(--text)] transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Info bar */}
        <div className="px-6 py-3 bg-[var(--surface-2)] border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[var(--text-3)]">
            <Sparkles size={13} className="text-[var(--primary)]" />
            <span>La sugerencia usa el historial con riesgo 6%</span>
          </div>
          <Button size="xs" variant="outline" onClick={setAllToSuggested} leftIcon={<Sparkles size={11} />}>
            Usar todas las sugerencias
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {items.map((item, idx) => {
            const suggested = item.suggested_qty;
            const actual = item.actual_qty;
            const diff = actual - suggested;
            return (
              <div key={item.bread_type_id}
                className={cn(
                  'rounded-2xl border p-4 transition-colors',
                  actual > 0 ? 'border-[var(--border)] bg-[var(--surface)]' : 'border-[var(--border)] bg-[var(--surface-2)] opacity-60'
                )}
              >
                <div className="flex flex-wrap items-center gap-4">
                  {/* Name + stats */}
                  <div className="flex-1 min-w-[140px]">
                    <p className="font-bold text-[var(--text)] text-sm">{item.bread_type_name}</p>
                    <div className="flex gap-3 mt-1.5 flex-wrap">
                      <div className="flex items-center gap-1 text-xs text-[var(--text-3)]">
                        <TrendingUp size={11} />
                        <span>Histórico: <span className="font-600 mono">{item.historical_sales}</span></span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-[#f59e0b]">
                        <AlertTriangle size={11} />
                        <span>Merma:</span>
                        <input
                          type="number" min={0} value={item.waste}
                          onChange={e => update(idx, 'waste', Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-12 h-5 rounded-lg border border-[var(--border)] px-1 text-center text-xs bg-[var(--surface)] text-[var(--text)] outline-none focus:border-[#f59e0b]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Suggested */}
                  <div className="flex items-center gap-2">
                    <div className="text-center">
                      <p className="text-[10px] text-[var(--text-4)] uppercase tracking-wide">Sugerido</p>
                      <button
                        onClick={() => update(idx, 'actual_qty', suggested)}
                        className="px-3 py-1 mt-0.5 rounded-lg bg-[rgba(12,144,224,.1)] text-[var(--primary)] font-bold mono text-sm hover:bg-[rgba(12,144,224,.2)] transition-colors border border-[rgba(12,144,224,.2)]"
                        title="Usar sugerido"
                      >
                        {suggested}
                      </button>
                    </div>
                  </div>

                  {/* Quantity input */}
                  <div className="flex items-center gap-2">
                    <div className="text-center">
                      <p className="text-[10px] text-[var(--text-4)] uppercase tracking-wide">Cantidad</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <button
                          onClick={() => update(idx, 'actual_qty', Math.max(0, actual - 1))}
                          className="w-7 h-9 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] flex items-center justify-center text-[var(--text-2)] hover:bg-[var(--surface-3)] transition-colors font-bold"
                        >−</button>
                        <input
                          type="number" min={0} value={actual}
                          onChange={e => update(idx, 'actual_qty', Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-16 h-9 rounded-lg border border-[var(--border)] text-center font-bold mono text-sm bg-[var(--surface)] text-[var(--text)] outline-none focus:border-[var(--primary-light)]"
                        />
                        <button
                          onClick={() => update(idx, 'actual_qty', actual + 1)}
                          className="w-7 h-9 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] flex items-center justify-center text-[var(--text-2)] hover:bg-[var(--surface-3)] transition-colors font-bold"
                        >+</button>
                      </div>
                    </div>

                    {/* Diff indicator */}
                    {actual > 0 && diff !== 0 && (
                      <span className={cn('text-xs font-600', diff > 0 ? 'text-[#f59e0b]' : 'text-[var(--text-4)]')}>
                        {diff > 0 ? `+${diff}` : diff}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border)] flex items-center justify-between gap-3 bg-[var(--surface)]">
          <div>
            <p className="text-sm text-[var(--text-3)]">Total a pedir</p>
            <p className="text-2xl font-bold text-[var(--primary)] mono">{totalUnits} <span className="text-base font-400">pzas</span></p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button
              onClick={() => { const withQty = items.filter(i => i.actual_qty > 0); if (withQty.length) { onSave(withQty); onClose(); } }}
              disabled={totalUnits === 0}
              leftIcon={<ShoppingCart size={16} />}
            >
              Añadir al carrito
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
