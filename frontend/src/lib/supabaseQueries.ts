import { supabase, isSupabaseConfigured } from './supabase';
import type { Branch, BreadType, Order, OrderItem, OrderStatus, User } from '../types/webertrack';

// ─── Profile types ────────────────────────────────────────────────────────────
export interface ProfileRow {
  id: string;
  name: string;
  email: string;
  role: 'PROMOTOR' | 'SUPERVISOR' | 'SUPERADMIN' | 'AUDITOR';
  supervisor_id?: string | null;
  assigned_branch_ids?: string[];
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export async function signIn(email: string, password: string) {
  if (!supabase) throw new Error('Supabase no configurado');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getCurrentUser(): Promise<User | null> {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, email, role, supervisor_id')
    .eq('id', user.id)
    .single();
  return profile ?? null;
}

// ─── Profiles ─────────────────────────────────────────────────────────────────
export async function fetchProfiles(): Promise<ProfileRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, role, supervisor_id, assigned_branch_ids')
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function updateProfileSupervisor(promoterId: string, supervisorId: string | null) {
  if (!supabase) throw new Error('Supabase no configurado');
  const { error } = await supabase
    .from('profiles')
    .update({ supervisor_id: supervisorId })
    .eq('id', promoterId);
  if (error) throw error;
}

export async function fetchPromotersBySupervisor(supervisorId: string): Promise<ProfileRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, role, supervisor_id, assigned_branch_ids')
    .eq('supervisor_id', supervisorId)
    .eq('role', 'PROMOTOR');
  if (error) throw error;
  return data ?? [];
}

// ─── Branches ─────────────────────────────────────────────────────────────────
export async function fetchBranches(): Promise<Branch[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('branches')
    .select('id, name, address, lat, lng, assigned_promotor_ids, status')
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function createBranch(branch: Omit<Branch, 'id'>): Promise<Branch> {
  if (!supabase) throw new Error('Supabase no configurado');
  const { data, error } = await supabase
    .from('branches')
    .insert([branch])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateBranch(id: string, updates: Partial<Branch>): Promise<void> {
  if (!supabase) throw new Error('Supabase no configurado');
  const { error } = await supabase.from('branches').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteBranch(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase no configurado');
  const { error } = await supabase.from('branches').delete().eq('id', id);
  if (error) throw error;
}

// ─── Bread types ──────────────────────────────────────────────────────────────
export async function fetchBreadTypes(): Promise<BreadType[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('bread_types')
    .select('id, name, status, unit')
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function createBreadType(bt: Omit<BreadType, 'id'>): Promise<BreadType> {
  if (!supabase) throw new Error('Supabase no configurado');
  const { data, error } = await supabase
    .from('bread_types')
    .insert([bt])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateBreadType(id: string, updates: Partial<BreadType>): Promise<void> {
  if (!supabase) throw new Error('Supabase no configurado');
  const { error } = await supabase.from('bread_types').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteBreadType(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase no configurado');
  const { error } = await supabase.from('bread_types').delete().eq('id', id);
  if (error) throw error;
}

// ─── Orders ───────────────────────────────────────────────────────────────────
export async function fetchOrders(filters?: {
  supervisorId?: string;
  promotorId?: string;
  from?: string;
  to?: string;
}): Promise<Order[]> {
  if (!supabase) return [];
  let query = supabase
    .from('orders')
    .select(`
      id, branch_id, promoter_id, supervisor_id, supervisor_comments,
      status, items, created_at, updated_at, approved_at,
      branch:branches(name),
      promoter:profiles!orders_promoter_id_fkey(name),
      supervisor:profiles!orders_supervisor_id_fkey(name)
    `)
    .order('created_at', { ascending: false });

  if (filters?.supervisorId)
    query = query.eq('supervisor_id', filters.supervisorId);
  if (filters?.promotorId)
    query = query.eq('promoter_id', filters.promotorId);
  if (filters?.from)
    query = query.gte('created_at', filters.from);
  if (filters?.to)
    query = query.lte('created_at', filters.to + 'T23:59:59');

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row: Record<string, unknown>) => ({
    ...row,
    branch_name: (row.branch as { name?: string } | null)?.name,
    promoter_name: (row.promoter as { name?: string } | null)?.name,
    supervisor_name: (row.supervisor as { name?: string } | null)?.name,
    items: Array.isArray(row.items) ? row.items : [],
  })) as Order[];
}

export async function createOrder(order: {
  branch_id: string;
  promoter_id: string;
  supervisor_id?: string | null;
  items: OrderItem[];
  status?: OrderStatus;
}): Promise<Order> {
  if (!supabase) throw new Error('Supabase no configurado');
  const { data, error } = await supabase
    .from('orders')
    .insert([{ ...order, status: order.status ?? 'PENDING' }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateOrder(
  id: string,
  updates: Partial<Pick<Order, 'status' | 'items' | 'supervisor_comments' | 'approved_at' | 'supervisor_id'>>
): Promise<void> {
  if (!supabase) throw new Error('Supabase no configurado');
  const { error } = await supabase.from('orders').update(updates).eq('id', id);
  if (error) throw error;
}

// ─── Sales history ────────────────────────────────────────────────────────────
export async function fetchSalesHistory(branchId: string): Promise<{
  bread_type_id: string;
  date: string;
  quantity: number;
}[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('sales_history')
    .select('bread_type_id, date, quantity')
    .eq('branch_id', branchId)
    .order('date', { ascending: false })
    .limit(180);
  if (error) throw error;
  return data ?? [];
}

// ─── Realtime ─────────────────────────────────────────────────────────────────
export function subscribeToOrders(
  callback: (payload: { eventType: string; new: Order; old: Order }) => void
) {
  if (!supabase) return () => {};
  const channel = supabase
    .channel('orders-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, callback)
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}
