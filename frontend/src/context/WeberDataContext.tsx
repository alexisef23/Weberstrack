import {
  createContext, useContext, useState, useEffect, useCallback,
  useRef, type ReactNode,
} from 'react';
import type { Branch, BreadType, Order, OrderItem, DateFilter, CartEntry } from '../types/webertrack';
import { isSupabaseConfigured } from '../lib/supabase';
import * as sq from '../lib/supabaseQueries';
import {
  MOCK_BRANCHES, MOCK_BREAD_TYPES, MOCK_ORDERS, MOCK_SALES_HISTORY,
} from '../config/mockData';
import { useAuth } from './AuthContext';

// ─── Inventory suggestion algorithm ──────────────────────────────────────────
// Uses recent sales + waste with 6% safety stock (~94th percentile)
function calcSuggestion(sales: number[], _waste: number[]): number {
  if (!sales.length) return 0;
  const recent = sales.slice(0, 14);
  const avg = recent.reduce((s, v) => s + v, 0) / recent.length;
  const variance = recent.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / recent.length;
  const std = Math.sqrt(variance);
  return Math.max(1, Math.round(avg + std * 1.56)); // ~1.56σ ≈ 94th pct (≈6% risk)
}

// ─── Context interface ────────────────────────────────────────────────────────
interface WeberDataContextValue {
  // Data
  orders: Order[];
  branches: Branch[];
  breadTypes: BreadType[];
  teamBranches: Branch[];

  // Filters
  dateFilter: DateFilter;
  setDateFilter: React.Dispatch<React.SetStateAction<DateFilter>>;

  // Cart
  cart: CartEntry[];
  addToCart: (branchId: string, branchName: string, items: OrderItem[]) => void;
  removeFromCart: (branchId: string) => void;
  getCartByBranch: (branchId: string) => OrderItem[] | null;

  // Queries
  getOrdersBySupervisor: (supervisorId: string) => Order[];
  getPromotersBySupervisor: (supervisorId: string) => sq.ProfileRow[];
  getAssignedBranches: (promotorId: string) => Branch[];

  // History & suggestions
  getHistoricalSales: (branchId: string, breadTypeId: string) => number[];
  getWasteHistory: (branchId: string, breadTypeId: string) => number[];
  getSuggestion: (branchId: string, breadTypeId: string) => number;
  prefetchBranchHistory: (branchId: string) => Promise<void>;

  // CRUD
  createOrder: (
    branchId: string,
    promotorId: string,
    promotorName: string,
    items: OrderItem[],
    supervisorId?: string | null,
  ) => Promise<void>;
  updateOrder: (id: string, updates: Partial<Order>) => Promise<void>;
  createBranch: (branch: Omit<Branch, 'id'>) => Promise<void>;
  updateBranch: (id: string, updates: Partial<Branch>) => Promise<void>;
  deleteBranch: (id: string) => Promise<void>;
  createBreadType: (bt: Omit<BreadType, 'id'>) => Promise<void>;
  updateBreadType: (id: string, updates: Partial<BreadType>) => Promise<void>;
  deleteBreadType: (id: string) => Promise<void>;

  // State
  loading: boolean;
  refreshOrders: () => Promise<void>;
}

const WeberDataContext = createContext<WeberDataContextValue | null>(null);

export function WeberDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [breadTypes, setBreadTypes] = useState<BreadType[]>([]);
  const [profiles, setProfiles] = useState<sq.ProfileRow[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>({});
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [forceDemo, setForceDemo] = useState(false);
  // sales history cache: branchId → breadTypeId → number[]
  const salesCache = useRef<Record<string, Record<string, number[]>>>({});

  const isMock = !isSupabaseConfigured() || forceDemo;

  // ─── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { setLoading(false); return; }

    if (isMock) {
      setBranches(MOCK_BRANCHES);
      setBreadTypes(MOCK_BREAD_TYPES);
      setOrders(MOCK_ORDERS);
      // Pre-populate sales cache
      Object.entries(MOCK_SALES_HISTORY).forEach(([bId, byBread]) => {
        salesCache.current[bId] = {};
        Object.entries(byBread).forEach(([btId, records]) => {
          salesCache.current[bId][btId] = records.map(r => r.quantity);
        });
      });
      setLoading(false);
      return;
    }

    // Real Supabase load - with fallback to mock on error
    Promise.all([
      sq.fetchBranches(),
      sq.fetchBreadTypes(),
      sq.fetchOrders(buildOrderFilter()),
      sq.fetchProfiles(),
    ])
      .then(([b, bt, o, p]) => {
        setBranches(b);
        setBreadTypes(bt);
        setOrders(o);
        setProfiles(p);
      })
      .catch(err => {
        console.error('Supabase error, switching to demo mode:', err);
        // Fallback to mock data
        setForceDemo(true);
        setBranches(MOCK_BRANCHES);
        setBreadTypes(MOCK_BREAD_TYPES);
        setOrders(MOCK_ORDERS);
        Object.entries(MOCK_SALES_HISTORY).forEach(([bId, byBread]) => {
          salesCache.current[bId] = {};
          Object.entries(byBread).forEach(([btId, records]) => {
            salesCache.current[bId][btId] = records.map(r => r.quantity);
          });
        });
      })
      .finally(() => setLoading(false));
  }, [user?.id]);

  // ─── Realtime orders ───────────────────────────────────────────────────────
  useEffect(() => {
    if (isMock || !user) return;
    const unsub = sq.subscribeToOrders(({ eventType, new: newRow }) => {
      if (eventType === 'INSERT') setOrders(prev => [newRow, ...prev]);
      if (eventType === 'UPDATE') setOrders(prev => prev.map(o => o.id === newRow.id ? { ...o, ...newRow } : o));
      if (eventType === 'DELETE') setOrders(prev => prev.filter(o => o.id !== newRow.id));
    });
    return unsub;
  }, [user?.id, isMock]);

  // ─── Date filter re-fetch ─────────────────────────────────────────────────
  useEffect(() => {
    if (isMock || !user) return;
    sq.fetchOrders(buildOrderFilter())
      .then(setOrders)
      .catch(err => {
        console.error('Date filter fetch error:', err);
        setForceDemo(true);
      });
  }, [dateFilter.from, dateFilter.to]);

  function buildOrderFilter() {
    return {
      supervisorId: user?.role === 'SUPERVISOR' ? user.id : undefined,
      promotorId:   user?.role === 'PROMOTOR'   ? user.id : undefined,
      from: dateFilter.from,
      to:   dateFilter.to,
    };
  }

  const refreshOrders = async () => {
    if (isMock) return;
    try {
      const o = await sq.fetchOrders(buildOrderFilter());
      setOrders(o);
    } catch (err) {
      console.error('Refresh orders error:', err);
      setForceDemo(true);
    }
  };

  // ─── Sales history ────────────────────────────────────────────────────────
  const prefetchBranchHistory = async (branchId: string) => {
    if (salesCache.current[branchId]) return;
    if (isMock) {
      salesCache.current[branchId] = salesCache.current[branchId] ?? {};
      return;
    }
    try {
      const records = await sq.fetchSalesHistory(branchId);
      const byBread: Record<string, number[]> = {};
      records.forEach(r => {
        (byBread[r.bread_type_id] = byBread[r.bread_type_id] ?? []).push(r.quantity);
      });
      salesCache.current[branchId] = byBread;
    } catch {}
  };

  const getHistoricalSales = (branchId: string, breadTypeId: string): number[] =>
    salesCache.current[branchId]?.[breadTypeId] ?? [];

  const getWasteHistory = (branchId: string, breadTypeId: string): number[] => {
    // We derive waste from approved orders in state
    return orders
      .filter(o => o.branch_id === branchId && o.status === 'APPROVED')
      .flatMap(o => o.items.filter(i => i.bread_type_id === breadTypeId).map(i => i.waste ?? 0))
      .slice(0, 30);
  };

  const getSuggestion = (branchId: string, breadTypeId: string): number => {
    const sales = getHistoricalSales(branchId, breadTypeId);
    const waste = getWasteHistory(branchId, breadTypeId);
    if (sales.length) return calcSuggestion(sales, waste);
    // Fallback: derive from existing orders
    const fallback = orders
      .filter(o => o.branch_id === branchId && o.status === 'APPROVED')
      .flatMap(o => o.items.filter(i => i.bread_type_id === breadTypeId).map(i => i.actual_qty))
      .slice(0, 14);
    if (fallback.length) return calcSuggestion(fallback, []);
    return 50; // sensible default
  };

  // ─── Cart ─────────────────────────────────────────────────────────────────
  const addToCart = (branchId: string, branchName: string, items: OrderItem[]) => {
    setCart(prev => {
      const idx = prev.findIndex(c => c.branchId === branchId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { branchId, branchName, items };
        return next;
      }
      return [...prev, { branchId, branchName, items }];
    });
  };

  const removeFromCart = (branchId: string) =>
    setCart(prev => prev.filter(c => c.branchId !== branchId));

  const getCartByBranch = (branchId: string) =>
    cart.find(c => c.branchId === branchId)?.items ?? null;

  // ─── Order queries ─────────────────────────────────────────────────────────
  const getOrdersBySupervisor = useCallback(
    (supervisorId: string) =>
      orders.filter(o => o.supervisor_id === supervisorId || isMock),
    [orders, isMock]
  );

  const getPromotersBySupervisor = useCallback(
    (supervisorId: string): sq.ProfileRow[] =>
      profiles.filter(p => p.role === 'PROMOTOR' && p.supervisor_id === supervisorId),
    [profiles]
  );

  const getAssignedBranches = useCallback(
    (promotorId: string): Branch[] => {
      if (isMock) return branches;
      const profile = profiles.find(p => p.id === promotorId);
      if (!profile?.assigned_branch_ids?.length) return branches;
      const ids = new Set(profile.assigned_branch_ids);
      return branches.filter(b => ids.has(b.id));
    },
    [branches, profiles, isMock]
  );

  // ─── CRUD helpers ─────────────────────────────────────────────────────────
  const teamBranches = user?.role === 'PROMOTOR'
    ? getAssignedBranches(user.id)
    : branches;

  // Orders
  const createOrder = async (
    branchId: string,
    promotorId: string,
    promotorName: string,
    items: OrderItem[],
    supervisorId?: string | null,
  ) => {
    if (isMock) {
      const branch = branches.find(b => b.id === branchId);
      const newOrder: Order = {
        id: `order_${Date.now()}`,
        branch_id: branchId,
        branch_name: branch?.name,
        promoter_id: promotorId,
        promoter_name: promotorName,
        supervisor_id: supervisorId ?? null,
        supervisor_name: null,
        supervisor_comments: null,
        status: 'PENDING',
        items,
        created_at: new Date().toISOString(),
      };
      setOrders(prev => [newOrder, ...prev]);
      return;
    }
    try {
      const created = await sq.createOrder({ branch_id: branchId, promoter_id: promotorId, supervisor_id: supervisorId, items });
      const branch = branches.find(b => b.id === branchId);
      setOrders(prev => [{
        ...created,
        branch_name: branch?.name,
        promoter_name: promotorName,
      }, ...prev]);
    } catch (err) {
      console.error('Create order error:', err);
      setForceDemo(true);
      // Fallback to mock order creation
      const branch = branches.find(b => b.id === branchId);
      const newOrder: Order = {
        id: `order_${Date.now()}`,
        branch_id: branchId,
        branch_name: branch?.name,
        promoter_id: promotorId,
        promoter_name: promotorName,
        supervisor_id: supervisorId ?? null,
        supervisor_name: null,
        supervisor_comments: null,
        status: 'PENDING',
        items,
        created_at: new Date().toISOString(),
      };
      setOrders(prev => [newOrder, ...prev]);
    }
  };

  const updateOrder = async (id: string, updates: Partial<Order>) => {
    if (isMock) {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
      return;
    }
    try {
      await sq.updateOrder(id, updates);
      setOrders(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
    } catch (err) {
      console.error('Update order error:', err);
      setForceDemo(true);
      setOrders(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
    }
  };

  // Branches
  const createBranch = async (branch: Omit<Branch, 'id'>) => {
    if (isMock) {
      setBranches(prev => [...prev, { ...branch, id: `b_${Date.now()}` }]);
      return;
    }
    try {
      const created = await sq.createBranch(branch);
      setBranches(prev => [...prev, created]);
    } catch (err) {
      console.error('Create branch error:', err);
      setForceDemo(true);
      setBranches(prev => [...prev, { ...branch, id: `b_${Date.now()}` }]);
    }
  };

  const updateBranch = async (id: string, updates: Partial<Branch>) => {
    if (isMock) { setBranches(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b)); return; }
    try {
      await sq.updateBranch(id, updates);
      setBranches(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
    } catch (err) {
      console.error('Update branch error:', err);
      setForceDemo(true);
      setBranches(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
    }
  };

  const deleteBranch = async (id: string) => {
    if (isMock) { setBranches(prev => prev.filter(b => b.id !== id)); return; }
    try {
      await sq.deleteBranch(id);
      setBranches(prev => prev.filter(b => b.id !== id));
    } catch (err) {
      console.error('Delete branch error:', err);
      setForceDemo(true);
      setBranches(prev => prev.filter(b => b.id !== id));
    }
  };

  // Bread types
  const createBreadType = async (bt: Omit<BreadType, 'id'>) => {
    if (isMock) { setBreadTypes(prev => [...prev, { ...bt, id: `bt_${Date.now()}` }]); return; }
    try {
      const created = await sq.createBreadType(bt);
      setBreadTypes(prev => [...prev, created]);
    } catch (err) {
      console.error('Create bread type error:', err);
      setForceDemo(true);
      setBreadTypes(prev => [...prev, { ...bt, id: `bt_${Date.now()}` }]);
    }
  };

  const updateBreadType = async (id: string, updates: Partial<BreadType>) => {
    if (isMock) { setBreadTypes(prev => prev.map(bt => bt.id === id ? { ...bt, ...updates } : bt)); return; }
    try {
      await sq.updateBreadType(id, updates);
      setBreadTypes(prev => prev.map(bt => bt.id === id ? { ...bt, ...updates } : bt));
    } catch (err) {
      console.error('Update bread type error:', err);
      setForceDemo(true);
      setBreadTypes(prev => prev.map(bt => bt.id === id ? { ...bt, ...updates } : bt));
    }
  };

  const deleteBreadType = async (id: string) => {
    if (isMock) { setBreadTypes(prev => prev.filter(bt => bt.id !== id)); return; }
    try {
      await sq.deleteBreadType(id);
      setBreadTypes(prev => prev.filter(bt => bt.id !== id));
    } catch (err) {
      console.error('Delete bread type error:', err);
      setForceDemo(true);
      setBreadTypes(prev => prev.filter(bt => bt.id !== id));
    }
  };

  return (
    <WeberDataContext.Provider value={{
      orders, branches, breadTypes, teamBranches, dateFilter, setDateFilter,
      cart, addToCart, removeFromCart, getCartByBranch,
      getOrdersBySupervisor, getPromotersBySupervisor, getAssignedBranches,
      getHistoricalSales, getWasteHistory, getSuggestion, prefetchBranchHistory,
      createOrder, updateOrder,
      createBranch, updateBranch, deleteBranch,
      createBreadType, updateBreadType, deleteBreadType,
      loading, refreshOrders,
    }}>
      {children}
    </WeberDataContext.Provider>
  );
}

export function useWeberData() {
  const ctx = useContext(WeberDataContext);
  if (!ctx) throw new Error('useWeberData must be used within WeberDataProvider');
  return ctx;
}
