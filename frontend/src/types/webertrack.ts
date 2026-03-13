// ─── Core Types ───────────────────────────────────────────────────────────────

export type UserRole = 'PROMOTOR' | 'SUPERVISOR' | 'SUPERADMIN' | 'AUDITOR';
export type OrderStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'DELIVERED';
export type BreadStatus = 'available' | 'sold_out' | 'discontinued';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  supervisor_id?: string | null;
  supervisor_name?: string | null;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  lat?: number | null;
  lng?: number | null;
  assigned_promotor_ids?: string[];
  status?: 'active' | 'inactive';
}

export interface BreadType {
  id: string;
  name: string;
  status: BreadStatus;
  unit?: string;
}

export interface OrderItem {
  bread_type_id: string;
  bread_type_name?: string;
  historical_sales: number;
  waste: number;
  suggested_qty: number;
  actual_qty: number;
}

export interface Order {
  id: string;
  branch_id: string;
  branch_name?: string;
  promoter_id: string;
  promoter_name?: string;
  supervisor_id?: string | null;
  supervisor_name?: string | null;
  supervisor_comments?: string | null;
  status: OrderStatus;
  items: OrderItem[];
  created_at: string;
  updated_at?: string;
  approved_at?: string | null;
}

export interface DateFilter {
  from?: string;
  to?: string;
}

export interface SaleRecord {
  branch_id: string;
  bread_type_id: string;
  date: string;
  quantity: number;
}

export interface CartEntry {
  branchId: string;
  branchName: string;
  items: OrderItem[];
}
