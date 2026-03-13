import { Router, type Request, type Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

export const ordersRouter = Router();

const supabase = (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

// GET /api/orders — list with filters
ordersRouter.get('/', async (req: Request, res: Response) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase no configurado' });

  try {
    let query = supabase
      .from('orders')
      .select('*, branch:branches(name), promoter:profiles!orders_promoter_id_fkey(name)')
      .order('created_at', { ascending: false });

    const { supervisor_id, promoter_id, from, to, status } = req.query as Record<string, string>;
    if (supervisor_id) query = query.eq('supervisor_id', supervisor_id);
    if (promoter_id)   query = query.eq('promoter_id', promoter_id);
    if (from)          query = query.gte('created_at', from);
    if (to)            query = query.lte('created_at', to + 'T23:59:59');
    if (status)        query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;
    return res.json(data ?? []);
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

// GET /api/orders/stats — aggregate stats
ordersRouter.get('/stats', async (_req: Request, res: Response) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase no configurado' });

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('status, items, created_at');
    if (error) throw error;

    const orders = data ?? [];
    const stats = {
      total: orders.length,
      pending:  orders.filter(o => o.status === 'PENDING').length,
      approved: orders.filter(o => o.status === 'APPROVED').length,
      rejected: orders.filter(o => o.status === 'REJECTED').length,
      totalUnits: orders.reduce((s: number, o: { items: Array<{ actual_qty: number }> }) =>
        s + (o.items?.reduce((a: number, i: { actual_qty: number }) => a + (i.actual_qty || 0), 0) ?? 0), 0),
      totalWaste: orders.reduce((s: number, o: { items: Array<{ waste: number }> }) =>
        s + (o.items?.reduce((a: number, i: { waste: number }) => a + (i.waste || 0), 0) ?? 0), 0),
    };

    return res.json(stats);
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

// PATCH /api/orders/:id — update status/items
ordersRouter.patch('/:id', async (req: Request, res: Response) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase no configurado' });

  try {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from('orders')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});
