import { useState, useEffect } from 'react';
import { isSupabaseConfigured } from '../../lib/supabase';
import * as sq from '../../lib/supabaseQueries';
import type { ProfileRow } from '../../lib/supabaseQueries';
import { Users, ExternalLink, Loader2, UserCheck, Shield, Eye, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

const ROLE_CONFIG: Record<string, { label: string; icon: React.ElementType; colorClass: string }> = {
  PROMOTOR:   { label: 'Promotor',   icon: Users,     colorClass: 'bg-[rgba(6,77,128,.1)] text-[#064d80] dark:bg-[rgba(54,173,246,.15)] dark:text-[#36adf6]' },
  SUPERVISOR: { label: 'Supervisor', icon: Shield,     colorClass: 'bg-[rgba(12,144,224,.1)] text-[#0c90e0]' },
  SUPERADMIN: { label: 'SuperAdmin', icon: BarChart3,  colorClass: 'bg-[rgba(232,185,48,.1)] text-[#c9980a] dark:text-[var(--gold-400)]' },
  AUDITOR:    { label: 'Auditor',    icon: Eye,        colorClass: 'bg-[rgba(22,163,74,.1)] text-[#15803d] dark:text-[#4ade80]' },
};

export function UsersManager() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) { setLoading(false); return; }
    sq.fetchProfiles()
      .then(setProfiles)
      .catch(() => toast.error('Error al cargar usuarios'))
      .finally(() => setLoading(false));
  }, []);

  const supervisors = profiles.filter(p => p.role === 'SUPERVISOR');

  const handleAssignSupervisor = async (promoterId: string, supervisorId: string | null) => {
    setSavingId(promoterId);
    try {
      await sq.updateProfileSupervisor(promoterId, supervisorId);
      setProfiles(prev => prev.map(p => p.id === promoterId ? { ...p, supervisor_id: supervisorId } : p));
      toast.success('Supervisor asignado');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al asignar');
    } finally {
      setSavingId(null);
    }
  };

  if (!isSupabaseConfigured()) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-[var(--text)]" style={{ fontFamily: 'Syne,sans-serif' }}>Usuarios</h2>
        <div className="rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] p-6 text-center">
          <Users size={32} className="text-[var(--text-4)] mx-auto mb-3" />
          <p className="font-600 text-[var(--text-2)] mb-1">Modo demo</p>
          <p className="text-sm text-[var(--text-3)]">
            Conecta Supabase para gestionar usuarios reales. Configura{' '}
            <code className="text-xs font-mono text-[var(--primary)] bg-[var(--surface-3)] px-1.5 py-0.5 rounded">VITE_SUPABASE_URL</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[var(--text)]" style={{ fontFamily: 'Syne,sans-serif' }}>Usuarios</h2>
          <p className="text-sm text-[var(--text-3)]">{profiles.length} registrados</p>
        </div>
        <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-600 text-[var(--primary)] hover:underline">
          <ExternalLink size={13} /> Supabase
        </a>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-[var(--primary)]" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Supervisor</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map(p => {
                  const cfg = ROLE_CONFIG[p.role];
                  const Icon = cfg?.icon ?? Users;
                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--brand-600)] to-[var(--brand-400)] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {p.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                          </div>
                          <span className="font-500 text-[var(--text)]">{p.name}</span>
                        </div>
                      </td>
                      <td className="text-[var(--text-3)]">{p.email}</td>
                      <td>
                        <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-600', cfg?.colorClass ?? 'bg-[var(--surface-3)] text-[var(--text-3)]')}>
                          <Icon size={11} />
                          {cfg?.label ?? p.role}
                        </span>
                      </td>
                      <td>
                        {p.role === 'PROMOTOR' ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={p.supervisor_id ?? ''}
                              onChange={e => handleAssignSupervisor(p.id, e.target.value || null)}
                              disabled={savingId === p.id}
                              className="h-8 px-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text)] outline-none focus:border-[var(--primary-light)] transition-colors"
                            >
                              <option value="">Sin asignar</option>
                              {supervisors.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                            {savingId === p.id && <Loader2 size={14} className="animate-spin text-[var(--primary)]" />}
                          </div>
                        ) : (
                          <span className="text-[var(--text-4)] text-sm">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 bg-[var(--surface-2)] border-t border-[var(--border)]">
            <p className="text-xs text-[var(--text-4)]">
              Para crear o editar usuarios (email, contraseña, rol) usa Supabase Dashboard → Authentication → Users
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
