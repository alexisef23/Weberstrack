import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/core';
import { BranchesManager } from './BranchesManager';
import { BreadTypesManager } from './BreadTypesManager';
import { UsersManager } from './UsersManager';
import { SuperAdminResumenPanel } from './SuperAdminResumenPanel';
import { LogOut, Users, Building2, Package, BarChart3 } from 'lucide-react';

type Tab = 'resumen' | 'users' | 'branches' | 'products';

const TABS = [
  { id: 'resumen' as Tab, label: 'Resumen', icon: BarChart3 },
  { id: 'users' as Tab, label: 'Usuarios', icon: Users },
  { id: 'branches' as Tab, label: 'Sucursales', icon: Building2 },
  { id: 'products' as Tab, label: 'Productos', icon: Package },
];

export function SuperAdminDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('resumen');

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="app-header">
        <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto">
          <div>
            <h1 className="font-bold text-[var(--text)]" style={{ fontFamily: 'Syne,sans-serif' }}>Administración</h1>
            <p className="text-xs text-[var(--text-3)]">{user?.name}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={logout}><LogOut size={16} /></Button>
        </div>
        <div className="flex border-t border-[var(--border)] max-w-4xl mx-auto">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}>
              <tab.icon size={14} />{tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="px-4 pt-5 max-w-4xl mx-auto">
        {activeTab === 'resumen' && <SuperAdminResumenPanel />}
        {activeTab !== 'resumen' && (
          <div className="glass rounded-2xl p-5">
            {activeTab === 'users' && <UsersManager />}
            {activeTab === 'branches' && <BranchesManager />}
            {activeTab === 'products' && <BreadTypesManager />}
          </div>
        )}
      </main>
    </div>
  );
}
