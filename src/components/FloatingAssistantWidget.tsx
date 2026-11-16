import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Link, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import {
  AlertCircle,
  ExternalLink,
  GripHorizontal,
  LocateFixed,
  MapPin,
  Maximize2,
  MessageSquare,
  RotateCcw,
  Send,
  Stethoscope,
  X,
  Zap,
} from 'lucide-react';
import api from '../lib/api';
import {
  clampFloatingPosition,
  type AssistantMode,
  type ChatMessage,
} from '../lib/clinical';
import { useToast } from '../context/ToastContext';
import { MarkdownContent } from './MarkdownContent';

const FLOATING_MODES: Array<{ id: AssistantMode; label: string }> = [
  { id: 'advisor', label: 'Advisor' },
  { id: 'fast', label: 'Fast' },
  { id: 'maps', label: 'Maps' },
];

const QUICK_PROMPTS: Array<{ label: string; mode: AssistantMode; prompt: string }> = [
  {
    label: 'Critical patient handoff summary',
    mode: 'advisor',
    prompt: 'Summarize all critical and under-observation patients along with their assigned doctors.',
  },
  {
    label: 'Upcoming pre-bookings & reminders',
    mode: 'fast',
    prompt: 'List upcoming pre-booked sessions and check if any doctors have heavy caseloads.',
  },
  {
    label: 'Nearby 24h hospitals & pharmacies',
    mode: 'maps',
    prompt: 'Find top-rated hospitals, emergency diagnostic labs, and 24-hour pharmacies near Dhaka Central Hospital.',
  },
];

const CHAT_POS_KEY = 'dt_chat_pos';

function getDefaultChatPosition(): { x: number; y: number } {
  if (typeof window === 'undefined') return { x: 24, y: 24 };
  const width = Math.min(400, window.innerWidth - 32);
  const height = Math.min(540, window.innerHeight - 80);
  return clampFloatingPosition(
    { x: window.innerWidth - width - 20, y: window.innerHeight - height - 20 },
    { width, height },
    { width: window.innerWidth, height: window.innerHeight }
  );
}

function loadSavedChatPosition(): { x: number; y: number } {
  if (typeof window === 'undefined') return { x: 24, y: 24 };
  try {
    const raw = window.localStorage.getItem(CHAT_POS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { x?: number; y?: number };
      if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
        const width = Math.min(400, window.innerWidth - 32);
        const height = Math.min(540, window.innerHeight - 80);
        return clampFloatingPosition(
          { x: parsed.x, y: parsed.y },
          { width, height },
          { width: window.innerWidth, height: window.innerHeight }
        );
      }
    }
  } catch {
    // Fallback to default
  }
  return getDefaultChatPosition();
}

export function FloatingAssistantWidget() {
  const { pathname } = useLocation();
  const { showToast } = useToast();

  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number }>(() => loadSavedChatPosition());
  const [isDragging, setIsDragging] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [mode, setMode] = useState<AssistantMode>('advisor');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'acquired' | 'unavailable'>('idle');

  const threadEndRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const dragStateRef = useRef<{
    active: boolean;
    pointerId: number | null;
    startPointerX: number;
    startPointerY: number;
    originX: number;
    originY: number;
    boxWidth: number;
    boxHeight: number;
  }>({
    active: false,
    pointerId: null,
    startPointerX: 0,
    startPointerY: 0,
    originX: 0,
    originY: 0,
    boxWidth: 400,
    boxHeight: 540,
  });

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await api.get<{ messages: ChatMessage[] }>('/assistant/history');
      setMessages(res.data.messages || []);
      setLoaded(true);
    } catch {
      setErrorBanner('Unable to load previous conversation history.');
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (open && !loaded) {
      loadHistory();
    }
  }, [open, loaded, loadHistory]);

  useEffect(() => {
    function handleSync() {
      if (open) {
        loadHistory();
      } else {
        setLoaded(false);
      }
    }
    window.addEventListener('dt-assistant-updated', handleSync);
    return () => window.removeEventListener('dt-assistant-updated', handleSync);
  }, [open, loadHistory]);

  useEffect(() => {
    if (open) {
      threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, sending, open]);

  useEffect(() => {
    function handleResize() {
      const rect = dialogRef.current?.getBoundingClientRect();
      const box = {
        width: rect?.width || Math.min(400, window.innerWidth - 32),
        height: rect?.height || Math.min(540, window.innerHeight - 80),
      };
      setPosition((prev) =>
        clampFloatingPosition(prev, box, {
          width: window.innerWidth,
          height: window.innerHeight,
        })
      );
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(CHAT_POS_KEY, JSON.stringify(position));
    } catch {
      // Ignore storage errors
    }
  }, [position]);

  function handleHeaderPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('button, a')) {
      return;
    }
    e.preventDefault();
    const rect = dialogRef.current?.getBoundingClientRect();
    dragStateRef.current = {
      active: true,
      pointerId: e.pointerId,
      startPointerX: e.clientX,
      startPointerY: e.clientY,
      originX: position.x,
      originY: position.y,
      boxWidth: rect?.width || 400,
      boxHeight: rect?.height || 540,
    };
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handleHeaderPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragStateRef.current.active) return;
    const dx = e.clientX - dragStateRef.current.startPointerX;
    const dy = e.clientY - dragStateRef.current.startPointerY;
    const next = clampFloatingPosition(
      { x: dragStateRef.current.originX + dx, y: dragStateRef.current.originY + dy },
      { width: dragStateRef.current.boxWidth, height: dragStateRef.current.boxHeight },
      { width: window.innerWidth, height: window.innerHeight }
    );
    setPosition(next);
  }

  function handleHeaderPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragStateRef.current.active) return;
    dragStateRef.current.active = false;
    setIsDragging(false);
    if (dragStateRef.current.pointerId !== null) {
      try {
        e.currentTarget.releasePointerCapture(dragStateRef.current.pointerId);
      } catch {
        // Ignore if already released
      }
      dragStateRef.current.pointerId = null;
    }
  }

  function handleResetPosition() {
    setPosition(getDefaultChatPosition());
  }

  if (pathname.startsWith('/assistant')) {
    return null;
  }

  function requestLocation() {
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
      window.dispatchEvent(new CustomEvent('dt-assistant-updated'));
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } };
      setErrorBanner(apiErr.response?.data?.message || 'Unable to generate assistant response.');
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
      window.dispatchEvent(new CustomEvent('dt-assistant-updated'));
      showToast('Conversation cleared.');
    } catch {
      showToast('Unable to clear conversation.', 'error');
    }
  }

  if (!open) {
    return (
      <div className="fixed bottom-5 right-5 z-40">
        <button
          type="button"
          onClick={() => {
            setPosition(loadSavedChatPosition());
            setOpen(true);
          }}
          aria-label="Open AI Assistant chat"
          aria-expanded={false}
          className="inline-flex items-center gap-2.5 h-11 px-4 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-medium shadow-lg border border-blue-500/40 transition-all duration-150 whitespace-nowrap"
        >
          <MessageSquare className="w-4 h-4 shrink-0" />
          <span>AI Assistant</span>
        </button>
      </div>
    );
  }

  return (
    <section
      ref={dialogRef}
      role="dialog"
      aria-label="Floating Clinical AI Assistant"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      className="fixed z-40 w-[calc(100vw-2rem)] sm:w-[400px] h-[540px] max-h-[calc(100vh-2rem)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl flex flex-col overflow-hidden"
    >
      {/* Draggable Header */}
      <div
        data-testid="floating-assistant-drag-handle"
        onPointerDown={handleHeaderPointerDown}
        onPointerMove={handleHeaderPointerMove}
        onPointerUp={handleHeaderPointerUp}
        onPointerCancel={handleHeaderPointerUp}
        className={`px-4 py-3 bg-[#0F172A] dark:bg-slate-950 text-white border-b border-slate-800 flex items-center justify-between gap-2 shrink-0 select-none touch-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <GripHorizontal className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
          <div className="w-7 h-7 rounded-lg bg-[#2563EB] flex items-center justify-center shrink-0">
            <MessageSquare className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold leading-tight truncate">
              Clinical AI Assistant
            </h2>
            <p className="text-[11px] text-slate-400 truncate">
              {mode === 'fast'
                ? 'gemini-3.1-flash-lite'
                : mode === 'maps'
                  ? 'gemini-4-hydrogen · Maps'
                  : 'gemini-4-hydrogen'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleResetPosition}
            aria-label="Reset chat position"
            title="Dock bottom-right"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
          >
            <LocateFixed className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleClearHistory}
            disabled={messages.length === 0 || sending}
            aria-label="Clear assistant thread"
            title="New Thread"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-40 rounded-md transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <Link
            to="/assistant"
            onClick={() => setOpen(false)}
            aria-label="Open full assistant workspace"
            title="Expand to full view"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close AI Assistant chat"
            title="Minimize"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

          {/* Compact Mode Bar */}
          <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-1 p-0.5 bg-slate-200/70 dark:bg-slate-800 rounded-lg">
              {FLOATING_MODES.map((item) => {
                const active = mode === item.id;
                const Icon =
                  item.id === 'maps' ? MapPin : item.id === 'fast' ? Zap : Stethoscope;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMode(item.id)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-white dark:bg-slate-700 text-[#0F172A] dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
                    }`}
                  >
                    <Icon className={`w-3 h-3 ${active ? 'text-[#2563EB] dark:text-blue-400' : ''}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {mode === 'maps' && (
              <button
                type="button"
                onClick={requestLocation}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors whitespace-nowrap"
              >
                <MapPin className="w-3 h-3 text-[#2563EB] dark:text-blue-400" />
                <span>{locationStatus === 'acquired' ? 'GPS On' : 'Location'}</span>
              </button>
            )}
          </div>

          {/* Scrollable Thread */}
          <div
            className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-white dark:bg-slate-900"
            aria-live="polite"
            aria-label="Floating assistant conversation"
          >
            {loadingHistory ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-10 w-3/4 bg-slate-100 dark:bg-slate-800 rounded-lg" />
                <div className="h-14 w-4/5 bg-slate-100 dark:bg-slate-800 rounded-lg ml-auto" />
              </div>
            ) : messages.length === 0 ? (
              <div className="py-4 space-y-3">
                <p className="text-xs text-[#64748B] dark:text-slate-400 leading-relaxed">
                  Ask about live provider caseloads, critical patient handoffs, or search nearby
                  medical facilities via Google Maps.
                </p>
                <div className="space-y-2">
                  {QUICK_PROMPTS.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        setMode(item.mode);
                        sendMessageText(item.prompt, item.mode);
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors flex items-center justify-between gap-2"
                    >
                      <span className="text-xs font-medium text-[#0F172A] dark:text-slate-100 truncate">
                        {item.label}
                      </span>
                      <span className="text-[11px] font-medium text-[#2563EB] dark:text-blue-400 shrink-0">
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
                      className={`max-w-[90%] rounded-lg px-3 py-2.5 ${
                        isUser
                          ? 'bg-[#2563EB] text-white'
                          : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#0F172A] dark:text-slate-100'
                      }`}
                    >
                      {isUser ? (
                        <p className="text-xs whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      ) : (
                        <MarkdownContent content={msg.content} />
                      )}

                      {!isUser && msg.mapLinks && msg.mapLinks.length > 0 && (
                        <div className="mt-2.5 pt-2.5 border-t border-slate-200 dark:border-slate-700 space-y-1.5">
                          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Google Maps Places
                          </p>
                          {msg.mapLinks.map((place) => (
                            <div
                              key={place.uri}
                              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md p-2"
                            >
                              <a
                                href={place.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-medium text-[#2563EB] dark:text-blue-400 hover:underline"
                              >
                                <MapPin className="w-3 h-3 shrink-0" />
                                <span className="truncate">{place.title}</span>
                                <ExternalLink className="w-3 h-3 shrink-0" />
                              </a>
                              {place.reviewSnippets.length > 0 && (
                                <p className="mt-1 text-[11px] text-[#64748B] dark:text-slate-400 line-clamp-2">
                                  “{place.reviewSnippets[0].text}”
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="mt-1 px-1 text-[10px] text-[#94A3B8] dark:text-slate-500 tabular-nums">
                      {isUser ? 'You' : msg.model} · {format(new Date(msg.createdAt), 'h:mm a')}
                    </span>
                  </div>
                );
              })
            )}

            {sending && (
              <div className="flex items-start">
                <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 w-44 space-y-1.5 animate-pulse">
                  <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded w-5/6" />
                  <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
                </div>
              </div>
            )}

            <div ref={threadEndRef} />
          </div>

          {/* Error Banner */}
          {errorBanner && (
            <div
              role="alert"
              className="mx-3 mb-2 px-3 py-2 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg flex items-start gap-2 text-xs text-[#DC2626] dark:text-red-400 shrink-0"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{errorBanner}</span>
            </div>
          )}

          {/* Composer */}
          <form
            onSubmit={handleSubmit}
            className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              aria-label="Message Floating AI Assistant"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending}
              placeholder={
                mode === 'maps'
                  ? 'Search nearby hospitals or labs...'
                  : 'Ask about caseloads or patients...'
              }
              className="flex-1 min-w-0 px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label="Send message"
              className="inline-flex items-center justify-center h-8 px-3 text-xs font-medium text-white bg-[#2563EB] hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
      </form>
    </section>
  );
}
