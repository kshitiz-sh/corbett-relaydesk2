import { Fragment, useEffect, useRef, useState } from 'react';
import { BadgeCheck, RotateCcw, Send, SlidersHorizontal } from 'lucide-react';
import type {
  ChatPreferences,
  ClientBotConfig,
  SimulationMessage,
  SimulationResponse,
} from '../../shared/types.ts';

interface WhatsAppSimulatorProps {
  client: ClientBotConfig;
  onSaveChatPreferences?: (prefs: ChatPreferences) => Promise<void>;
}

function formatWhatsAppText(text: string) {
  const parts = text.split(/(\*[^*]+\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <strong key={idx} className="font-semibold text-slate-900">
          {part.slice(1, -1)}
        </strong>
      );
    }
    return <Fragment key={idx}>{part}</Fragment>;
  });
}

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function WhatsAppSimulator({ client, onSaveChatPreferences }: WhatsAppSimulatorProps) {
  const [messages, setMessages] = useState<SimulationMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [suggestionText, setSuggestionText] = useState('');
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeStatus, setOptimizeStatus] = useState<string | null>(null);
  const [lastMeta, setLastMeta] = useState<{
    intent: string;
    latencyMs: number;
    handoffTriggered: boolean;
    handoffReason: string;
    sourcesUsed: string[];
  } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([
      {
        id: `greeting-${client.id}`,
        role: 'assistant',
        text: client.greetingMessage,
        timestamp: nowTime(),
        quickReplies: client.samplePrompts.slice(0, 2).map((p) =>
          p.length > 28 ? `${p.slice(0, 26)}...` : p,
        ),
      },
    ]);
    setLastMeta(null);
    setErrorMsg(null);
    setSuggestionText('');
    setOptimizeStatus(null);
  }, [client.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || loading) return;

    const customerMsg: SimulationMessage = {
      id: `cus-${Date.now()}`,
      role: 'customer',
      text: trimmed,
      timestamp: nowTime(),
    };

    const priorHistory = messages.map((m) => ({ role: m.role, text: m.text }));
    const nextMessages = [...messages, customerMsg];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          clientConfig: client,
          message: trimmed,
          history: priorHistory,
          sessionPhone: '+91 90000 12345 (Demo)',
        }),
      });

      const raw = await response.text();
      let data: Partial<SimulationResponse> & { error?: string } = {};
      try {
        data = JSON.parse(raw) as Partial<SimulationResponse> & { error?: string };
      } catch {
        throw new Error(
          `Server returned HTTP ${response.status}${raw ? `: ${raw.slice(0, 140)}` : ''}`,
        );
      }

      if (!response.ok || !data.reply) {
        throw new Error(data.error || `Failed to generate bot reply (HTTP ${response.status}).`);
      }

      const assistantMsg: SimulationMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        text: data.reply,
        timestamp: nowTime(),
        intent: data.intent || 'general',
        handoffTriggered: Boolean(data.handoffTriggered),
        handoffReason: data.handoffReason || '',
        quickReplies: data.quickReplies || [],
        sourcesUsed: data.sourcesUsed || [],
        latencyMs: data.latencyMs || 0,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setLastMeta({
        intent: data.intent || 'general',
        latencyMs: data.latencyMs || 0,
        handoffTriggered: Boolean(data.handoffTriggered),
        handoffReason: data.handoffReason || '',
        sourcesUsed: data.sourcesUsed || [],
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to reach bot server.');
    } finally {
      setLoading(false);
    }
  };

  const resetChat = () => {
    setMessages([
      {
        id: `greeting-${Date.now()}`,
        role: 'assistant',
        text: client.greetingMessage,
        timestamp: nowTime(),
      },
    ]);
    setLastMeta(null);
    setErrorMsg(null);
  };

  const lastCustomerPrompt = [...messages].reverse().find((m) => m.role === 'customer')?.text || '';

  const applyOptimizationSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    const note = suggestionText.trim();
    if (!note || optimizing) return;
    setOptimizing(true);
    setOptimizeStatus(null);
    try {
      const existing = client.chatPreferences?.customInstructions?.trim();
      const combinedNote = existing ? `${existing}\nAlso apply: ${note}` : note;

      const res = await fetch(`/api/clients/${client.id}/optimize-preferences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientConfig: client,
          suggestion: combinedNote,
        }),
      });
      const data = (await res.json()) as {
        chatPreferences?: ChatPreferences;
        summary?: string;
        error?: string;
      };
      if (!res.ok || !data.chatPreferences) {
        throw new Error(data.error || 'Failed to optimize preferences.');
      }
      if (onSaveChatPreferences) {
        await onSaveChatPreferences(data.chatPreferences);
      }
      setSuggestionText('');
      setOptimizeStatus(data.summary || 'Client chat preference applied and saved.');
    } catch (err) {
      setOptimizeStatus(err instanceof Error ? err.message : 'Unable to apply suggestion.');
    } finally {
      setOptimizing(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
      {/* Simulator Phone Header */}
      <div className="bg-[#075E54] text-white px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-700/80 border border-white/20 flex items-center justify-center font-display text-sm font-bold shrink-0">
            {client.businessName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold truncate">{client.businessName}</span>
              <BadgeCheck className="w-4 h-4 text-emerald-300 shrink-0" />
            </div>
            <div className="text-[11px] text-emerald-100/90 truncate">
              WhatsApp Business · {client.agentName}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={resetChat}
          title="Reset test conversation"
          className="p-2 text-emerald-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors shrink-0"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* WhatsApp Chat Surface */}
      <div
        ref={scrollRef}
        className="whatsapp-wallpaper h-[390px] overflow-y-auto p-4 space-y-3"
      >
        {messages.map((msg) => {
          const isCustomer = msg.role === 'customer';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3.5 py-2 text-[13.5px] leading-relaxed shadow-xs ${
                  isCustomer
                    ? 'bg-[#D9FDD3] text-slate-900 rounded-tr-none'
                    : 'bg-white text-slate-800 rounded-tl-none'
                }`}
              >
                <div className="whitespace-pre-wrap">{formatWhatsAppText(msg.text)}</div>
                <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-slate-500 tabular-nums">
                  <span>{msg.timestamp}</span>
                  {isCustomer && <span className="text-sky-600 font-semibold">✓✓</span>}
                </div>
              </div>

              {!isCustomer && msg.handoffTriggered && (
                <div className="mt-1.5 text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1 max-w-[85%]">
                  Human handoff flagged → {client.escalationContactName}
                  {msg.handoffReason ? ` (${msg.handoffReason})` : ''}
                </div>
              )}

              {!isCustomer && msg.quickReplies && msg.quickReplies.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5 max-w-[90%]">
                  {msg.quickReplies.map((qr) => (
                    <button
                      key={qr}
                      type="button"
                      disabled={loading}
                      onClick={() => void sendMessage(qr)}
                      className="px-2.5 py-1 text-xs font-medium text-[#075E54] bg-white/95 hover:bg-white border border-slate-200 rounded-md transition-colors"
                    >
                      {qr}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex items-start">
            <div className="bg-white rounded-lg rounded-tl-none px-3.5 py-2.5 text-xs text-slate-500 shadow-xs">
              {client.agentName} is typing...
            </div>
          </div>
        )}
      </div>

      {/* Sample Test Prompts */}
      <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200">
        <div className="text-[11px] font-medium text-slate-500 mb-1.5">
          Test customer prompts for {client.industry}
        </div>
        <div className="flex flex-col gap-1">
          {client.samplePrompts.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              disabled={loading}
              onClick={() => void sendMessage(prompt)}
              className="text-left text-xs text-slate-700 hover:text-emerald-700 hover:bg-white px-2 py-1 rounded transition-colors truncate"
            >
              “{prompt}”
            </button>
          ))}
        </div>
      </div>

      {errorMsg && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200 text-xs text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void sendMessage(input);
        }}
        className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a customer WhatsApp message..."
          className="flex-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-emerald-600"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="Send message"
          className="p-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 transition-colors shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* Clean unboxed reply analysis metadata */}
      {lastMeta && (
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600 tabular-nums">
          <span>Intent: {lastMeta.intent}</span>
          <span aria-hidden="true">·</span>
          <span>Response: {lastMeta.latencyMs}ms</span>
          <span aria-hidden="true">·</span>
          <span className={lastMeta.handoffTriggered ? 'text-amber-700 font-medium' : ''}>
            Escalation: {lastMeta.handoffTriggered ? 'Triggered' : 'Handled by bot'}
          </span>
          {lastMeta.sourcesUsed.length > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span>KB: {lastMeta.sourcesUsed.join(', ')}</span>
            </>
          )}
        </div>
      )}

      {/* AI Chat Optimization Suggestion Box */}
      <form
        onSubmit={(e) => void applyOptimizationSuggestion(e)}
        className="p-4 bg-white border-t border-slate-200 space-y-2.5"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-700" />
            <span>AI Chat Suggestion Box</span>
          </div>
          <span className="text-[11px] text-slate-500">
            Optimize replies for {client.businessName}
          </span>
        </div>

        <textarea
          rows={2}
          value={suggestionText}
          onChange={(e) => setSuggestionText(e.target.value)}
          placeholder="Tell the AI how to optimize replies (e.g. Keep answers under 2 sentences, suggest Pahadi meals early, ask for check-in dates)..."
          className="w-full px-3 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-emerald-600"
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              'Keep replies shorter (1–2 sentences)',
              'Ask check-in dates & guests first',
              'Highlight packages & add-ons gently',
            ].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setSuggestionText(preset)}
                className="px-2 py-1 text-[11px] text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                {preset}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {lastCustomerPrompt && (
              <button
                type="button"
                disabled={loading || optimizing}
                onClick={() => void sendMessage(lastCustomerPrompt)}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
              >
                Re-test Last
              </button>
            )}
            <button
              type="submit"
              disabled={optimizing || !suggestionText.trim()}
              className="px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 rounded-lg transition-colors whitespace-nowrap"
            >
              {optimizing ? 'Optimizing...' : 'Optimize & Save'}
            </button>
          </div>
        </div>

        {optimizeStatus && (
          <div className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md px-2.5 py-1.5">
            {optimizeStatus}
          </div>
        )}
      </form>
    </div>
  );
}
