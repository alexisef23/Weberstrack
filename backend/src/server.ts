import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { aiRouter } from './routes/ai.js';
import { ordersRouter } from './routes/orders.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Security & middleware ────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '1mb' }));

// Rate limiting
app.use('/api/ai', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 50,
  message: { error: 'Demasiadas solicitudes, intenta en 15 minutos.' },
}));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', version: '2.0.0', ts: new Date().toISOString() }));
app.use('/api/ai', aiRouter);
app.use('/api/orders', ordersRouter);

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// ─── Error handler ────────────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[WeberTrack Backend]', err);
  res.status(500).json({ error: err.message || 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║  WeberTrack Backend v2.0             ║
  ║  Servidor: http://localhost:${PORT}     ║
  ╚══════════════════════════════════════╝
  `);
});
