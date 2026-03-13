import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Sparkles, Bot, User, ChevronDown, RotateCcw } from 'lucide-react';
import { askWeberAI } from '../../lib/geminiUtils';
import type { Order } from '../../types/webertrack';
import { cn } from '../../lib/utils';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  ts: number;
}

const SUGGESTIONS = [
  '¿Cuál sucursal vende más?',
  '¿Qué pan tiene más merma?',
  '¿Cómo mejorar el inventario?',
  'Resumen de pedidos hoy',
];

function buildSummary(orders: Order[]): string {
  const totalUnits = orders.reduce((s, o) => s + o.items.reduce((a, i) => a + i.actual_qty, 0), 0);
  const totalWaste = orders.reduce((s, o) => s + o.items.reduce((a, i) => a + (i.waste || 0), 0), 0);
  const byStatus = orders.reduce((acc, o) => { acc[o.status] = (acc[o.status] ?? 0) + 1; return acc; }, {} as Record<string, number>);
  const byBread: Record<string, number> = {};
  orders.forEach(o => o.items.forEach(i => { const n = i.bread_type_name ?? i.bread_type_id; byBread[n] = (byBread[n] ?? 0) + i.actual_qty; }));
  const byBranch: Record<string, number> = {};
  orders.forEach(o => { const n = o.branch_name ?? o.branch_id; byBranch[n] = (byBranch[n] ?? 0) + o.items.reduce((s, i) => s + i.actual_qty, 0); });
  return `Pedidos totales: ${orders.length} | Unidades: ${totalUnits} | Merma: ${totalWaste}
Por estado: ${JSON.stringify(byStatus)}
Por tipo de pan: ${JSON.stringify(byBread)}
Por sucursal (top): ${JSON.stringify(Object.fromEntries(Object.entries(byBranch).sort((a,b)=>b[1]-a[1]).slice(0,5)))}
Pedidos recientes: ${orders.slice(0,5).map(o=>`${o.branch_name}(${o.status})`).join(', ')}`;
}

interface ChatbotFABProps {
  orders: Order[];
}

export function ChatbotFAB({ orders }: ChatbotFABProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasKey = !!(import.meta.env.VITE_GEMINI_API_KEY ?? '').toString().trim();
  const hasProxy = !!(import.meta.env.VITE_API_URL ?? '').toString().trim();
  const enabled = hasKey || hasProxy;

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || loading || !enabled) return;
    setInput('');
    const userMsg: Message = { role: 'user', text: q, ts: Date.now() };
    setMessages(m => [...m, userMsg]);
    setLoading(true);
    try {
      const summary = buildSummary(orders);
      const reply = await askWeberAI(q, summary);
      setMessages(m => [...m, { role: 'assistant', text: reply, ts: Date.now() }]);
    } catch (err) {
      setMessages(m => [...m, { role: 'assistant', text: `⚠️ ${err instanceof Error ? err.message : 'Error al conectar con el asistente.'}`, ts: Date.now() }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Panel */}
      {open && (
        <>
          <div className="backdrop" style={{ zIndex: 49 }} onClick={() => setOpen(false)} />
          <div className="chat-panel" style={{ zIndex: 50 }}>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] bg-gradient-to-r from-[var(--brand-800)] to-[var(--brand-600)]">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                <Sparkles size={18} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-white text-sm" style={{ fontFamily: 'Syne, sans-serif' }}>Weber AI</p>
                <p className="text-white/70 text-xs">Asistente inteligente de pedidos</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setMessages([])}
                  className="p-1.5 text-white/70 hover:text-white hover:bg-white/15 rounded-lg transition-colors"
                  title="Limpiar conversación"
                >
                  <RotateCcw size={14} />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 text-white/70 hover:text-white hover:bg-white/15 rounded-lg transition-colors"
                >
                  <ChevronDown size={18} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center gap-4 py-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--brand-100)] to-[var(--brand-50)] dark:from-[var(--brand-900)] dark:to-[var(--brand-950)] flex items-center justify-center">
                    <Bot size={32} className="text-[var(--primary)]" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-[var(--text)] text-sm">Pregúntame sobre los pedidos</p>
                    <p className="text-[var(--text-3)] text-xs mt-1">Tengo acceso a todos los datos en tiempo real</p>
                  </div>
                  {!enabled && (
                    <div className="w-full p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-xs text-[var(--text-3)] text-center">
                      Configura <code className="font-mono text-[var(--primary)]">VITE_GEMINI_API_KEY</code> para activar el asistente
                    </div>
                  )}
                  {enabled && (
                    <div className="w-full space-y-2">
                      <p className="text-xs text-[var(--text-4)] text-center">Sugerencias:</p>
                      {SUGGESTIONS.map(s => (
                        <button
                          key={s}
                          onClick={() => send(s)}
                          className="w-full text-left text-xs px-3 py-2 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] border border-[var(--border)] hover:border-[var(--primary-light)] text-[var(--text-2)] transition-all"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {messages.map((m) => (
                <div key={m.ts} className={cn('flex gap-2.5', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {m.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--brand-600)] to-[var(--brand-400)] flex items-center justify-center flex-shrink-0 mt-1">
                      <Sparkles size={12} className="text-white" />
                    </div>
                  )}
                  <div className={cn(
                    'max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                    m.role === 'user'
                      ? 'bg-[var(--brand-800)] text-white rounded-br-sm'
                      : 'bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] rounded-bl-sm'
                  )}>
                    {m.text}
                  </div>
                  {m.role === 'user' && (
                    <div className="w-7 h-7 rounded-full bg-[var(--surface-3)] border border-[var(--border)] flex items-center justify-center flex-shrink-0 mt-1">
                      <User size={12} className="text-[var(--text-3)]" />
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex gap-2.5 items-start">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--brand-600)] to-[var(--brand-400)] flex items-center justify-center flex-shrink-0">
                    <Sparkles size={12} className="text-white" />
                  </div>
                  <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[var(--primary)] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-[var(--primary)] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-[var(--primary)] animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="px-3 pb-3 pt-2 border-t border-[var(--border)]">
              <div className="flex gap-2 items-center bg-[var(--surface-2)] rounded-xl border border-[var(--border)] px-3 py-1 focus-within:border-[var(--primary-light)] focus-within:shadow-[0_0_0_3px_rgba(12,144,224,.12)] transition-all">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                  placeholder={enabled ? 'Escribe tu pregunta...' : 'API Key no configurada'}
                  disabled={!enabled || loading}
                  className="flex-1 bg-transparent text-sm text-[var(--text)] placeholder:text-[var(--text-4)] outline-none py-2"
                />
                <button
                  onClick={() => send()}
                  disabled={!input.trim() || loading || !enabled}
                  className="w-8 h-8 rounded-lg bg-[var(--brand-800)] text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--brand-700)] transition-colors flex-shrink-0"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cn('chat-fab', open && 'active')}
        aria-label="Abrir asistente Weber AI"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
        {!open && messages.length === 0 && enabled && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--gold-500)] rounded-full border-2 border-white dark:border-[var(--surface)] pulse-ring" />
        )}
      </button>
    </>
  );
}
