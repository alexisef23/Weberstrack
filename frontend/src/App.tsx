import { useAuth } from './context/AuthContext';
import { WeberDataProvider } from './context/WeberDataContext';
import { LoginScreen } from './components/LoginScreen';
import { PromotorDashboard } from './components/promotor/PromotorDashboard';
import { SupervisorDashboard } from './components/supervisor/SupervisorDashboard';
import { SuperAdminDashboard } from './components/superadmin/SuperAdminDashboard';
import { AuditorDashboard } from './components/auditor/AuditorDashboard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Loader2 } from 'lucide-react';
import { Toaster } from 'sonner';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--brand-800)] to-[var(--brand-500)] flex items-center justify-center">
            <Loader2 size={26} className="text-white animate-spin" />
          </div>
          <p className="text-sm font-500 text-[var(--text-3)]">Cargando WeberTrack…</p>
        </div>
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  return (
    <WeberDataProvider>
      {user.role === 'PROMOTOR'   && <PromotorDashboard />}
      {user.role === 'SUPERVISOR' && <SupervisorDashboard />}
      {user.role === 'SUPERADMIN' && <SuperAdminDashboard />}
      {user.role === 'AUDITOR'    && <AuditorDashboard />}
    </WeberDataProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
      <Toaster
        position="top-right"
        richColors
        toastOptions={{
          style: {
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '13px',
            borderRadius: '12px',
          },
        }}
      />
    </ErrorBoundary>
  );
}
