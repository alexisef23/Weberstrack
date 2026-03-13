import { Router, type Request, type Response } from 'express';
import dotenv from 'dotenv';
dotenv.config();

export const aiRouter = Router();

const GEMINI_KEY = process.env.GEMINI_API_KEY;

const SYSTEM_PROMPT = `Eres Weber AI, el asistente inteligente de WeberTrack, el sistema de gestión de pedidos de Weber's Bread en Chihuahua, México.

Tu rol:
- Analizar datos de pedidos, sucursales, promotores y tipos de pan
- Identificar patrones de ventas, tendencias y anomalías
- Sugerir mejoras en inventario, rutas y eficiencia operativa
- Responder preguntas sobre el negocio de forma clara y accionable

Reglas:
- Responde SIEMPRE en español, de forma concisa y directa
- Usa datos reales del contexto cuando estén disponibles
- Si no tienes suficientes datos, indícalo honestamente
- Formatea respuestas con bullets cuando aplique
- Sé amable pero profesional
- Máximo 3 párrafos por respuesta`;

aiRouter.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, context } = req.body as { message?: string; context?: string };

    if (!message?.trim()) {
      return res.status(400).json({ error: 'message es requerido' });
    }

    if (!GEMINI_KEY) {
      return res.status(503).json({ error: 'GEMINI_API_KEY no configurada en el servidor' });
    }

    const prompt = `${SYSTEM_PROMPT}

DATOS ACTUALES DEL SISTEMA:
${context ?? 'Sin datos disponibles'}

PREGUNTA DEL USUARIO:
${message}

Responde de forma útil, precisa y en español.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 600,
            topP: 0.9,
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const err = await geminiRes.json().catch(() => ({}));
      const msg = (err as { error?: { message?: string } })?.error?.message ?? `Gemini error ${geminiRes.status}`;
      return res.status(502).json({ error: msg });
    }

    const data = await geminiRes.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!text) return res.status(502).json({ error: 'Respuesta vacía de Gemini' });

    return res.json({ response: text });

  } catch (err) {
    console.error('[AI /chat]', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Error interno' });
  }
});

// Route optimization endpoint
aiRouter.post('/optimize-route', async (req: Request, res: Response) => {
  try {
    const { branches, currentLocation } = req.body as {
      branches?: Array<{ id: string; name: string; lat: number; lng: number; hasPending: boolean }>;
      currentLocation?: { lat: number; lng: number };
    };

    if (!GEMINI_KEY) return res.status(503).json({ error: 'GEMINI_API_KEY no configurada' });
    if (!branches?.length) return res.status(400).json({ error: 'branches es requerido' });

    const branchList = branches
      .map((b, i) => `${i + 1}. ${b.name} (${b.lat.toFixed(4)},${b.lng.toFixed(4)}) — ${b.hasPending ? 'PEDIDO PENDIENTE' : 'sin pedido'}`)
      .join('\n');

    const prompt = `Eres un optimizador de rutas de reparto de pan en Chihuahua, México.

Sucursales a visitar:
${branchList}

${currentLocation ? `Posición actual del promotor: (${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)})` : ''}

Instrucciones:
- Prioriza las sucursales con pedidos pendientes
- Minimiza la distancia total de recorrido (algoritmo heurístico del vecino más cercano)
- Considera el tráfico típico de Chihuahua (mañana: centro congestionado, tarde: periféria)
- Devuelve SOLO un JSON con la estructura: { "order": [{ "id": string, "name": string, "reason": string }], "estimatedMinutes": number, "tips": string[] }
- No incluyas texto extra, solo el JSON`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 800 },
        }),
      }
    );

    if (!geminiRes.ok) return res.status(502).json({ error: 'Error de Gemini' });

    const data = await geminiRes.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const clean = raw.replace(/```json|```/g, '').trim();

    try {
      const parsed = JSON.parse(clean);
      return res.json(parsed);
    } catch {
      return res.json({ order: branches, estimatedMinutes: null, tips: ['No se pudo optimizar la ruta automáticamente.'] });
    }
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Error interno' });
  }
});
