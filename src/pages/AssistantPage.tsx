import { useEffect, useRef, useState, type FormEvent } from 'react';
import { format } from 'date-fns';
import {
  AlertCircle,
  ExternalLink,
  MapPin,
  MessageSquare,
  RotateCcw,
  Send,
  Stethoscope,
  Zap,
} from 'lucide-react';
import api from '../lib/api';
import type { AssistantMode, ChatMessage } from '../lib/clinical';
import { useToast } from '../context/ToastContext';
import { MarkdownContent } from '../components/MarkdownContent';

const MODE_OPTIONS: Array<{
  id: AssistantMode;
  label: string;
  modelLabel: string;
  description: string;
}> = [
  {
    id: 'advisor',
    label: 'Operations Advisor',
    modelLabel: 'gemini-4-hydrogen',
    description: 'Provider caseload balancing, critical patient review, and clinic workflows.',
  },
  {
    id: 'fast',
    label: 'Fast Triage',
    modelLabel: 'gemini-3.1-flash-lite',
    description: 'Low-latency bullet summaries for rapid shift handoffs.',
  },
  {
    id: 'maps',
    label: 'Facility Locator',
    modelLabel: 'gemini-4-hydrogen · Maps',
    description: 'Live Google Maps grounding for nearby hospitals, pharmacies, and labs.',
  },
];

const STARTER_PROMPTS: Array<{ label: string; mode: AssistantMode; prompt: string }> = [
  {
    label: 'Critical patient handoff summary',
    mode: 'advisor',
    prompt: 'Summarize all critical and under-observation patients along with their assigned doctors.',
  },
  {
    label: 'Recommend provider for new Cardiology intake',
    mode: 'fast',
    prompt: 'Which doctors currently have capacity for a new admission based on caseload?',
  },
  {
    label: 'Find nearby 24-hour hospitals & pharmacies',
    mode: 'maps',
    prompt: 'Find top-rated hospitals, emergency diagnostic labs, and 24-hour pharmacies near Dhaka Central Hospital.',
  },
];


export function AssistantPage() {
  const { showToast } = useToast();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [mode, setMode] = useState<AssistantMode>('advisor');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'acquired' | 'unavailable'>('idle');

  const threadEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    function loadHistory() {
      api
        .get<{ messages: ChatMessage[] }>('/assistant/history')
        .then((res) => {
          if (!cancelled) {
            setMessages(res.data.messages || []);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setErrorBanner('Unable to load previous conversation history.');
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoadingHistory(false);
          }
        });
    }

    loadHistory();
    window.addEventListener('dt-assistant-updated', loadHistory);

    return () => {
      cancelled = true;
      window.removeEventListener('dt-assistant-updated', loadHistory);
    };
  }, []);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  function requestBrowserLocation() {
    if (!navigator.geolocation) {
      setLocationStatus('unavailable');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setLocationStatus('acquired');
        showToast('Location enabled for nearby Google Maps results.');
      },
      () => {
        setLocationStatus('unavailable');
      },
      { timeout: 5000 }
    );
  }

  async function sendMessageText(text: string, activeMode: AssistantMode) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setErrorBanner(null);
    setSending(true);
    setInput('');

    try {
      const res = await api.post<{
        userMessage: ChatMessage;
        assistantMessage: ChatMessage;
      }>('/assistant/chat', {
        message: trimmed,
        mode: activeMode,
        location: activeMode === 'maps' ? coords : null,
      });

      setMessages((prev) => [...prev, res.data.userMessage, res.data.assistantMessage]);
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } };
      const msg = apiErr.response?.data?.message || 'Unable to generate assistant response.';
      setErrorBanner(msg);
      setInput(trimmed);
    } finally {
      setSending(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await sendMessageText(input, mode);
  }

  async function handleClearHistory() {
    try {
      await api.delete('/assistant/history');
      setMessages([]);
      setErrorBanner(null);
      showToast('Conversation cleared.');
    } catch {
      showToast('Unable to clear conversation.', 'error');
    }
  }

  const activeModeMeta = MODE_OPTIONS.find((m) => m.id === mode) ?? MODE_OPTIONS[0];

  return (
    <div className="space-y-5 flex flex-col h-[calc(100vh-8.5rem)] min-h-[540px]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#0F172A] dark:text-white">
            Clinical Operations Assistant
          </h1>
          <p className="text-sm text-[#64748B] dark:text-slate-400 mt-0.5">
            Multi-turn Gemini operations workspace with live roster context and Google Maps grounding
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {mode === 'maps' && (
            <button
              type="button"
              onClick={requestBrowserLocation}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
            >
              <MapPin className="w-3.5 h-3.5 text-[#2563EB] dark:text-blue-400" />
              <span>
                {locationStatus === 'acquired'
                  ? 'Location Active'
                  : locationStatus === 'unavailable'
                    ? 'Location Unavailable'
                    : 'Use My Location'}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={handleClearHistory}
            disabled={messages.length === 0 || sending}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 rounded-lg transition-colors whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New Thread</span>
          </button>
        </div>
      </div>

      {/* Mode Selector Bar */}
      <div className="bg-white/95 dark:bg-slate-900/95 border border-[#E2E8F0] dark:border-slate-800 rounded-lg p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          {MODE_OPTIONS.map((opt) => {
            const isActive = mode === opt.id;
            const Icon =
              opt.id === 'maps' ? MapPin : opt.id === 'fast' ? Zap : Stethoscope;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setMode(opt.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-white dark:bg-slate-900 text-[#0F172A] dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-slate-200'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#2563EB] dark:text-blue-400' : ''}`} />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>

        <p className="text-xs text-[#64748B] dark:text-slate-400">
          <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">{activeModeMeta.modelLabel}</span>
          <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
          <span>{activeModeMeta.description}</span>
        </p>
      </div>

      {/* Chat Container */}
      <div className="flex-1 min-h-0 bg-white/95 dark:bg-slate-900/95 border border-[#E2E8F0] dark:border-slate-800 rounded-lg flex flex-col overflow-hidden">
        {/* Scrollable Message Thread */}
        <div
          className="flex-1 overflow-y-auto p-5 space-y-4"
          aria-live="polite"
          aria-label="Conversation thread"
        >
          {loadingHistory ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-14 w-2/3 bg-slate-100 dark:bg-slate-800 rounded-lg" />
              <div className="h-20 w-3/4 bg-slate-100 dark:bg-slate-800 rounded-lg ml-auto" />
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto py-8">
              <div className="w-11 h-11 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 flex items-center justify-center mb-3">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h2 className="text-base font-semibold text-[#0F172A] dark:text-white">
                Start an operational conversation
              </h2>
              <p className="text-sm text-[#64748B] dark:text-slate-400 mt-1">
                Ask about current provider caseloads, critical patient handoffs, or search nearby
                medical facilities grounded with Google Maps.
              </p>

              <div className="mt-6 grid grid-cols-1 gap-2 w-full">
                {STARTER_PROMPTS.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setMode(item.mode);
                      sendMessageText(item.prompt, item.mode);
                    }}
                    className="text-left px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[#0F172A] dark:text-slate-100">{item.label}</p>
                      <p className="text-xs text-[#64748B] dark:text-slate-400 truncate mt-0.5">{item.prompt}</p>
                    </div>
                    <span className="text-[11px] font-medium text-[#2563EB] dark:text-blue-400 whitespace-nowrap shrink-0">
                      {item.mode === 'maps' ? 'Maps' : item.mode === 'fast' ? 'Fast' : 'Advisor'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[90%] sm:max-w-[82%] rounded-lg px-4 py-3 ${
                      isUser
                        ? 'bg-[#2563EB] text-white'
                        : 'bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-[#0F172A] dark:text-slate-100'
                    }`}
                  >
                    {isUser ? (
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    ) : (
                      <MarkdownContent content={msg.content} />
                    )}

                    {!isUser && msg.mapLinks && msg.mapLinks.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
                        <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Google Maps Verified Places
                        </p>
                        <div className="space-y-2">
                          {msg.mapLinks.map((place) => (
                            <div
                              key={place.uri}
                              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md p-2.5"
                            >
                              <a
                                href={place.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2563EB] dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
                              >
                                <MapPin className="w-3.5 h-3.5 shrink-0" />
                                <span>{place.title}</span>
                                <ExternalLink className="w-3 h-3 shrink-0" />
                              </a>
                              {place.reviewSnippets.length > 0 && (
                                <p className="mt-1 text-xs text-[#64748B] dark:text-slate-400 line-clamp-2">
                                  “{place.reviewSnippets[0].text}”
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <span className="mt-1 px-1 text-[11px] text-[#94A3B8] dark:text-slate-500 tabular-nums">
                    {isUser ? 'You' : msg.model} ·{' '}
                    {format(new Date(msg.createdAt), 'h:mm a')}
                  </span>
                </div>
              );
            })
          )}

          {sending && (
            <div className="flex items-start">
              <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 w-56 space-y-2 animate-pulse">
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-5/6" />
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
              </div>
            </div>
          )}

          <div ref={threadEndRef} />
        </div>

        {/* Error Banner */}
        {errorBanner && (
          <div
            role="alert"
            className="mx-4 mb-2 px-3.5 py-2.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/70 rounded-lg flex items-center gap-2 text-xs text-[#DC2626] dark:text-red-400"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorBanner}</span>
          </div>
        )}

        {/* Composer */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3">
          <input
            type="text"
            aria-label="Message Clinical Operations Assistant"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sending}
            placeholder={
              mode === 'maps'
                ? 'Ask for hospitals, pharmacies, or diagnostic clinics near a location...'
                : 'Ask about doctor caseloads, critical patients, or shift triage...'
            }
            className="flex-1 px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#2563EB] hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Send className="w-4 h-4" />
            <span>{sending ? 'Sending...' : 'Send'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
