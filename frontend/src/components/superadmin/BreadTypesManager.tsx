import { useState } from 'react';
import { useWeberData } from '../../context/WeberDataContext';
import { Button, Input } from '../ui/core';
import { Plus, Pencil, Trash2, X, Package, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { BreadStatus } from '../../types/webertrack';
import { cn } from '../../lib/utils';

const STATUS_OPTIONS: Array<{ value: BreadStatus; label: string; color: string }> = [
  { value: 'available',    label: 'Disponible',    color: 'text-[#16a34a] bg-[rgba(22,163,74,.1)]' },
  { value: 'sold_out',     label: 'Agotado',       color: 'text-[#f59e0b] bg-[rgba(245,158,11,.1)]' },
  { value: 'discontinued', label: 'Descontinuado', color: 'text-[var(--text-3)] bg-[var(--surface-3)]' },
];

type FormState = { name: string; status: BreadStatus; unit: string };
const EMPTY: FormState = { name: '', status: 'available', unit: 'pza' };

export function BreadTypesManager() {
  const { breadTypes, createBreadType, updateBreadType, deleteBreadType } = useWeberData();
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);

  const openCreate = () => { setCreating(true); setEditing(null); setForm(EMPTY); };
  const openEdit = (bt: typeof breadTypes[0]) => {
    setEditing(bt.id); setCreating(false);
    setForm({ name: bt.name, status: bt.status, unit: bt.unit ?? 'pza' });
  };
  const close = () => { setCreating(false); setEditing(null); };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await updateBreadType(editing, form);
        toast.success('Producto actualizado');
      } else {
        await createBreadType(form);
        toast.success('Producto creado');
      }
      close();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar "${name}"?`)) return;
    setSaving(true);
    try {
      await deleteBreadType(id);
      toast.success('Producto eliminado');
      close();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al eliminar');
    } finally {
      setSaving(false);
    }
  };

  const isOpen = creating || !!editing;
  const statusLabel = (s: string) => STATUS_OPTIONS.find(o => o.value === s)?.label ?? s;
  const statusColor = (s: string) => STATUS_OPTIONS.find(o => o.value === s)?.color ?? '';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[var(--text)]" style={{ fontFamily: 'Syne,sans-serif' }}>Tipos de pan</h2>
          <p className="text-sm text-[var(--text-3)]">{breadTypes.length} productos</p>
        </div>
        <Button size="sm" onClick={openCreate} leftIcon={<Plus size={14} />}>Nuevo</Button>
      </div>

      {isOpen && (
        <div className="rounded-2xl border border-[var(--border-2)] bg-[var(--surface-2)] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-bold text-[var(--text)]" style={{ fontFamily: 'Syne,sans-serif' }}>
              {editing ? 'Editar producto' : 'Nuevo producto'}
            </p>
            <button onClick={close} className="p-1.5 rounded-lg hover:bg-[var(--surface-3)] text-[var(--text-3)] transition-colors">
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Input label="Nombre" placeholder="Pan Blanco, Integral…" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <Input label="Unidad" placeholder="pza, kg, paq" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} />
          </div>
          <div>
            <p className="text-xs font-700 text-[var(--text-3)] uppercase tracking-wide mb-2">Estado</p>
            <div className="flex gap-2 flex-wrap">
              {STATUS_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setForm(f => ({ ...f, status: opt.value }))}
                  className={cn('px-3 py-1.5 rounded-xl text-xs font-600 border transition-all', form.status === opt.value ? opt.color + ' border-current' : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-3)]')}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={close}>Cancelar</Button>
            <Button size="sm" onClick={handleSave} disabled={!form.name.trim() || saving} loading={saving}>Guardar</Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {breadTypes.length === 0 ? (
          <div className="py-12 text-center text-[var(--text-4)]">
            <Package size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Sin productos registrados</p>
          </div>
        ) : (
          breadTypes.map(bt => (
            <div key={bt.id} className="flex items-center justify-between p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--border-2)] transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--brand-100)] to-[var(--brand-50)] dark:from-[var(--brand-900)] dark:to-[var(--brand-950)] flex items-center justify-center flex-shrink-0">
                  <Package size={16} className="text-[var(--primary)]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-600 text-[var(--text)]">{bt.name}</p>
                    <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-600', statusColor(bt.status))}>
                      {statusLabel(bt.status)}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-3)]">Unidad: {bt.unit ?? 'pza'}</p>
                </div>
              </div>
              <div className="flex gap-1.5">
                <Button size="icon" variant="ghost" onClick={() => openEdit(bt)}><Pencil size={14} /></Button>
                <Button size="icon" variant="danger" onClick={() => handleDelete(bt.id, bt.name)} disabled={saving}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
