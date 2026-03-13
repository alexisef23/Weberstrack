import { useState } from 'react';
import { useWeberData } from '../../context/WeberDataContext';
import { Button, Input } from '../ui/core';
import { Plus, Pencil, Trash2, X, MapPin, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type FormState = { name: string; address: string; lat: number; lng: number };
const EMPTY: FormState = { name: '', address: '', lat: 28.6353, lng: -106.0889 };

export function BranchesManager() {
  const { branches, createBranch, updateBranch, deleteBranch } = useWeberData();
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);

  const openCreate = () => { setCreating(true); setEditing(null); setForm(EMPTY); };
  const openEdit = (b: typeof branches[0]) => {
    setEditing(b.id); setCreating(false);
    setForm({ name: b.name, address: b.address, lat: b.lat ?? 28.6353, lng: b.lng ?? -106.0889 });
  };
  const close = () => { setCreating(false); setEditing(null); };

  const handleSave = async () => {
    if (!form.name.trim() || !form.address.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await updateBranch(editing, form);
        toast.success('Sucursal actualizada');
      } else {
        await createBranch({ ...form, assigned_promotor_ids: ['*'] });
        toast.success('Sucursal creada');
      }
      close();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar "${name}"? Esta acción no se puede deshacer.`)) return;
    setSaving(true);
    try {
      await deleteBranch(id);
      toast.success('Sucursal eliminada');
      close();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al eliminar');
    } finally {
      setSaving(false);
    }
  };

  const isOpen = creating || !!editing;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[var(--text)]" style={{ fontFamily: 'Syne,sans-serif' }}>
            Sucursales
          </h2>
          <p className="text-sm text-[var(--text-3)]">{branches.length} registradas</p>
        </div>
        <Button size="sm" onClick={openCreate} leftIcon={<Plus size={14} />}>Nueva</Button>
      </div>

      {/* Form */}
      {isOpen && (
        <div className="rounded-2xl border border-[var(--border-2)] bg-[var(--surface-2)] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-bold text-[var(--text)]" style={{ fontFamily: 'Syne,sans-serif' }}>
              {editing ? 'Editar sucursal' : 'Nueva sucursal'}
            </p>
            <button onClick={close} className="p-1.5 rounded-lg hover:bg-[var(--surface-3)] text-[var(--text-3)] transition-colors">
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Nombre" placeholder="Sucursal Centro" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <Input label="Dirección" placeholder="Av. Principal 123" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            <Input label="Latitud" type="number" step="0.0001" placeholder="28.6353" value={form.lat} onChange={e => setForm(f => ({ ...f, lat: parseFloat(e.target.value) || 0 }))} />
            <Input label="Longitud" type="number" step="0.0001" placeholder="-106.0889" value={form.lng} onChange={e => setForm(f => ({ ...f, lng: parseFloat(e.target.value) || 0 }))} />
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={close}>Cancelar</Button>
            <Button size="sm" onClick={handleSave} disabled={!form.name.trim() || !form.address.trim() || saving}
              loading={saving}>
              Guardar
            </Button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-2">
        {branches.length === 0 ? (
          <div className="py-12 text-center text-[var(--text-4)]">
            <MapPin size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Sin sucursales registradas</p>
          </div>
        ) : (
          branches.map(b => (
            <div key={b.id} className="flex items-center justify-between p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--border-2)] transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--brand-100)] to-[var(--brand-50)] dark:from-[var(--brand-900)] dark:to-[var(--brand-950)] flex items-center justify-center flex-shrink-0">
                  <MapPin size={16} className="text-[var(--primary)]" />
                </div>
                <div className="min-w-0">
                  <p className="font-600 text-[var(--text)] truncate">{b.name}</p>
                  <p className="text-xs text-[var(--text-3)] truncate">{b.address}</p>
                  {b.lat != null && (
                    <p className="text-[11px] text-[var(--text-4)] mono">{b.lat?.toFixed(4)}, {b.lng?.toFixed(4)}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <Button size="icon" variant="ghost" onClick={() => openEdit(b)}><Pencil size={14} /></Button>
                <Button size="icon" variant="danger" onClick={() => handleDelete(b.id, b.name)} disabled={saving}>
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
