import type { Branch, BreadType, Order } from '../types/webertrack';
import { subDays, format } from 'date-fns';

export const MOCK_BRANCHES: Branch[] = [
  { id: 'b1', name: 'Sucursal Centro',       address: 'Av. Juárez 1520, Centro',          lat: 28.6353,  lng: -106.0889 },
  { id: 'b2', name: 'Sucursal Anáhuac',      address: 'Blvd. Anáhuac 2100',               lat: 28.6420,  lng: -106.0650 },
  { id: 'b3', name: 'Sucursal Nombre de Dios',address: 'Av. División del Norte 4500',     lat: 28.6180,  lng: -106.0750 },
  { id: 'b4', name: 'Sucursal Las Granjas',   address: 'Calle Las Granjas 890',            lat: 28.6500,  lng: -106.0970 },
  { id: 'b5', name: 'Sucursal Colinas',       address: 'Blvd. Ortiz Mena 3200',           lat: 28.6280,  lng: -106.1100 },
  { id: 'b6', name: 'Sucursal Cerro Grande',  address: 'Av. Cerro Grande 1780',            lat: 28.6610,  lng: -106.0820 },
];

export const MOCK_BREAD_TYPES: BreadType[] = [
  { id: 'bt1', name: 'Pan Blanco',       status: 'available', unit: 'pza' },
  { id: 'bt2', name: 'Pan Integral',     status: 'available', unit: 'pza' },
  { id: 'bt3', name: 'Pan Multigrano',   status: 'available', unit: 'pza' },
  { id: 'bt4', name: 'Pan de Caja 680g', status: 'available', unit: 'pza' },
  { id: 'bt5', name: 'Pan Dulce Surtido',status: 'available', unit: 'paq' },
  { id: 'bt6', name: 'Baguette',         status: 'available', unit: 'pza' },
  { id: 'bt7', name: 'Pan de Maíz',      status: 'sold_out',  unit: 'pza' },
  { id: 'bt8', name: 'Pan sin Gluten',   status: 'available', unit: 'pza' },
];

// generate realistic mock orders
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const STATUSES = ['PENDING', 'APPROVED', 'APPROVED', 'APPROVED', 'REJECTED'] as const;
const PROMOTERS = [
  { id: 'promotor_1', name: 'Carlos Mendoza' },
  { id: 'promotor_2', name: 'Ana García' },
];

function makeOrder(i: number): Order {
  const daysAgo = randInt(0, 13);
  const date = subDays(new Date(), daysAgo);
  const status = STATUSES[randInt(0, STATUSES.length - 1)];
  const branch = MOCK_BRANCHES[randInt(0, MOCK_BRANCHES.length - 1)];
  const promoter = PROMOTERS[randInt(0, 1)];
  const activeBreads = MOCK_BREAD_TYPES.filter(bt => bt.status === 'available');
  const numItems = randInt(3, 6);
  const shuffled = [...activeBreads].sort(() => Math.random() - .5).slice(0, numItems);

  const items = shuffled.map(bt => {
    const hist = randInt(40, 150);
    const waste = randInt(2, 12);
    const suggested = Math.ceil(hist * 1.06);
    const actual = randInt(Math.max(0, suggested - 10), suggested + 15);
    return {
      bread_type_id: bt.id,
      bread_type_name: bt.name,
      historical_sales: hist,
      waste,
      suggested_qty: suggested,
      actual_qty: actual,
    };
  });

  return {
    id: `order_${i}_${date.getTime()}`,
    branch_id: branch.id,
    branch_name: branch.name,
    promoter_id: promoter.id,
    promoter_name: promoter.name,
    supervisor_id: 'supervisor_1',
    supervisor_name: 'Roberto Ortiz',
    supervisor_comments: status === 'REJECTED' ? 'Cantidades inconsistentes con el historial.' : status === 'APPROVED' ? 'Pedido revisado y aprobado.' : null,
    status,
    items,
    created_at: date.toISOString(),
    approved_at: status === 'APPROVED' ? date.toISOString() : null,
  };
}

// Seed with fixed random so it's consistent
let seed = 42;
function seededRand() {
  seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
  return seed / 0x7fffffff;
}

export const MOCK_ORDERS: Order[] = Array.from({ length: 48 }, (_, i) => makeOrder(i));

// Sales history per branch+bread (for suggestion algorithm)
type SalesRecord = { date: string; quantity: number };
export const MOCK_SALES_HISTORY: Record<string, Record<string, SalesRecord[]>> = {};

MOCK_BRANCHES.forEach(b => {
  MOCK_SALES_HISTORY[b.id] = {};
  MOCK_BREAD_TYPES.forEach(bt => {
    MOCK_SALES_HISTORY[b.id][bt.id] = Array.from({ length: 30 }, (_, i) => ({
      date: format(subDays(new Date(), 29 - i), 'yyyy-MM-dd'),
      quantity: randInt(30, 120),
    }));
  });
});
