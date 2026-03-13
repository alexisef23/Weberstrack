// ── SuperAdminDashboard.tsx ──────────────────────────────────────────────────
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button, Card } from '../ui/core';
import { BranchesManager } from './BranchesManager';
import { BreadTypesManager } from './BreadTypesManager';
import { UsersManager } from './UsersManager';
import { SuperAdminResumenPanel } from './SuperAdminResumenPanel';
import { LogOut, Users, Building2, Package, BarChart3 } from 'lucide-react';

const TABS = [
  { id: 'resumen' as const, label: 'Resumen', icon: BarChart3 },
  { id: 'users' as const, label: 'Usuarios', icon: Users },
  { id: 'branches' as const, label: 'Sucursales', icon: Building2 },
  { id: 'products' as const, label: 'Productos', icon: Package },
];

export function SuperAdminDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'resumen' | 'users' | 'branches' | 'products'>('resumen');

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <header className="sticky top-0 z-30 bg-surface border-b border-border shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto">
          <div>
            <h1 className="text-lg font-bold text-primary">Superadministrador</h1>
            <p className="text-xs text-slate-500">{user?.name}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={logout}>
            <LogOut size={18} />
          </Button>
        </div>
        {/* Tabs horizontales con scroll en mobile */}
        <div className="flex border-t border-border overflow-x-auto scrollbar-hide">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[80px] py-3 text-xs font-semibold uppercase tracking-wide flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-primary border-b-2 border-primary bg-primary/5'
                  : 'text-slate-500 hover:text-primary'
              }`}
            >
              <tab.icon size={14} />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.slice(0, 3)}</span>
            </button>
          ))}
        </div>
      </header>

      <main className="w-full max-w-4xl mx-auto px-4 py-6 overflow-x-hidden">
        {activeTab === 'resumen' && <SuperAdminResumenPanel />}
        {(activeTab === 'users' || activeTab === 'branches' || activeTab === 'products') && (
          <Card className="p-4 sm:p-6 overflow-hidden">
            {activeTab === 'users' && <UsersManager />}
            {activeTab === 'branches' && <BranchesManager />}
            {activeTab === 'products' && <BreadTypesManager />}
          </Card>
        )}
      </main>
    </div>
  );
}