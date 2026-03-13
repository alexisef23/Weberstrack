const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const API_URL = import.meta.env.VITE_API_URL as string | undefined;

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

export async function askWeberAI(question: string, dataSummary: string): Promise<string> {
  const prompt = `${SYSTEM_PROMPT}

DATOS ACTUALES DEL SISTEMA:
${dataSummary}

PREGUNTA DEL USUARIO:
${question}

Responde de forma útil, precisa y en español.`;

  // Try backend proxy first
  if (API_URL) {
    try {
      const res = await fetch(`${API_URL}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question, context: dataSummary }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.response ?? data.message ?? 'Sin respuesta del servidor.';
      }
    } catch {
      // fall through to direct API
    }
  }

  // Direct Gemini API
  if (!GEMINI_API_KEY) {
    throw new Error('Configura VITE_GEMINI_API_KEY o VITE_API_URL para usar el asistente.');
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
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
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        ],
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `Error Gemini: ${res.status}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Respuesta vacía de Gemini.');
  return text.trim();
}
