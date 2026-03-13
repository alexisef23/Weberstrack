import { useAuth } from '../context/AuthContext';
import { Button } from './ui/core';
import { DEMO_ROLES } from '../config/demoUsers';
import { MapPin, BarChart3, ShieldCheck, Eye, ArrowRight } from 'lucide-react';

const ROLE_ICONS = {
  PROMOTOR: MapPin,
  SUPERVISOR: ShieldCheck,
  SUPERADMIN: BarChart3,
  AUDITOR: Eye,
};

const ROLE_GRADIENTS: Record<string, string> = {
  PROMOTOR:   'from-[#064d80] to-[#0c90e0]',
  SUPERVISOR: 'from-[#0c90e0] to-[#36adf6]',
  SUPERADMIN: 'from-[#c9980a] to-[#e8b930]',
  AUDITOR:    'from-[#15803d] to-[#4ade80]',
};

export function LoginScreen() {
  const { loginAs } = useAuth();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-5 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 rounded-full blur-3xl opacity-20" style={{ background: 'var(--brand-500)', transform: 'translate(-50%, -50%)' }} />
      <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full blur-3xl opacity-15" style={{ background: 'var(--gold-500)', transform: 'translate(40%, 40%)' }} />

      <div className="w-full max-w-md relative z-10">
        {/* Logo area */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: 'linear-gradient(135deg, var(--brand-800), var(--brand-500))' }}>
            <img src="/webers-logo.png" alt="Weber's" className="w-10 h-10 object-contain" onError={(e) => { e.currentTarget.style.display='none'; (e.currentTarget.nextSibling as HTMLElement).style.display='flex'; }} />
            <span className="text-white font-black text-xl hidden items-center">W</span>
          </div>
          <h1 className="text-3xl font-black text-[var(--text)]" style={{ fontFamily: 'Syne,sans-serif' }}>
            Weber<span className="text-gradient">Track</span>
          </h1>
          <p className="text-[var(--text-3)] text-sm mt-1.5">Sistema de gestión de pedidos · Weber's Bread</p>
        </div>

        {/* Role cards */}
        <div className="glass rounded-3xl p-5 shadow-[var(--shadow-xl)]">
          <p className="text-xs font-700 text-[var(--text-3)] uppercase tracking-widest mb-4 text-center">Selecciona tu rol para acceder</p>
          <div className="grid grid-cols-2 gap-3">
            {DEMO_ROLES.map(r => {
              const Icon = ROLE_ICONS[r.role] ?? BarChart3;
              return (
                <button
                  key={r.role}
                  onClick={() => loginAs(r.user)}
                  className="group relative flex flex-col items-start p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface)] hover:border-[var(--primary-light)] hover:shadow-[var(--shadow-lg)] transition-all active:scale-[.97] text-left"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${ROLE_GRADIENTS[r.role]} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <Icon size={18} className="text-white" />
                  </div>
                  <p className="font-bold text-[var(--text)] text-sm leading-tight">{r.label}</p>
                  <p className="text-[11px] text-[var(--text-3)] mt-1 leading-tight">{r.description}</p>
                  <div className="mt-3 flex items-center gap-1 text-[10px] text-[var(--primary)] font-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Entrar</span>
                    <ArrowRight size={10} />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-[var(--border)] text-center">
            <p className="text-xs text-[var(--text-4)]">Modo demo · Sin contraseña requerida</p>
          </div>
        </div>

        <p className="text-center text-xs text-[var(--text-4)] mt-5">WeberTrack v2.0 · Weber's Bread</p>
      </div>
    </div>
  );
}
