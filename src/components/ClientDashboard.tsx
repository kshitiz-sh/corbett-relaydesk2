import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Check,
  Download,
  Link2,
  LogOut,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Save,
  Search,
  Send,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import type {
  ChatPreferences,
  ClientBotConfig,
  ClientReportSummary,
  ConversationStatus,
  ConversationThread,
  EmojiStylePreference,
  ReplyLengthPreference,
  UpsellStylePreference,
} from '../../shared/types.ts';

interface ClientDashboardProps {
  client: ClientBotConfig;
  isClientPortalMode?: boolean;
  onExitPortalMode?: () => void;
  onLogoutClient?: () => void;
  onSaveChatPreferences?: (prefs: ChatPreferences) => Promise<void>;
}

type DashboardSubTab = 'chats' | 'bookings' | 'reports' | 'preferences';

const STATUS_LABELS: Record<ConversationStatus, { label: string; colorClass: string }> = {
  active: { label: 'Active', colorClass: 'text-slate-700' },
  booked: { label: 'Confirmed', colorClass: 'text-emerald-700 font-medium' },
  escalated: { label: 'Escalated', colorClass: 'text-amber-700 font-medium' },
  resolved: { label: 'Resolved', colorClass: 'text-slate-500' },
};

function formatTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ClientDashboard({
  client,
  isClientPortalMode = false,
  onExitPortalMode,
  onLogoutClient,
  onSaveChatPreferences,
}: ClientDashboardProps) {
  const [subTab, setSubTab] = useState<DashboardSubTab>('chats');
  const [conversations, setConversations] = useState<ConversationThread[]>([]);
  const [report, setReport] = useState<ClientReportSummary | null>(null);
  const [selectedId, setSelectedId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ConversationStatus>('all');
  const [hostReply, setHostReply] = useState('');
  const [sendingHostReply, setSendingHostReply] = useState(false);
  const [replyHint, setReplyHint] = useState('');
  const [suggestingReply, setSuggestingReply] = useState(false);
  const [replySuggestions, setReplySuggestions] = useState<Array<{ label: string; text: string }>>([]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  // Client AI preferences state
  const [prefsDraft, setPrefsDraft] = useState<ChatPreferences>(
    client.chatPreferences || {
      replyLength: 'balanced',
      upsellStyle: 'consultative',
      emojiStyle: 'minimal',
      customInstructions: '',
      priorityTopics: [],
    },
  );
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [optimizingPrefs, setOptimizingPrefs] = useState(false);

  // Booking confirmation + WhatsApp alert modal state
  const [confirmTarget, setConfirmTarget] = useState<ConversationThread | null>(null);
  const [formRoom, setFormRoom] = useState('');
  const [formDates, setFormDates] = useState('');
  const [formGuests, setFormGuests] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formNote, setFormNote] = useState('');
  const [notifyHostPhone, setNotifyHostPhone] = useState(true);
  const [confirmingAlert, setConfirmingAlert] = useState(false);

  useEffect(() => {
    setPrefsDraft(
      client.chatPreferences || {
        replyLength: 'balanced',
        upsellStyle: 'consultative',
        emojiStyle: 'minimal',
        customInstructions: '',
        priorityTopics: [],
      },
    );
  }, [client.id, client.chatPreferences]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [convRes, repRes] = await Promise.all([
        fetch(`/api/conversations?clientId=${encodeURIComponent(client.id)}`),
        fetch(`/api/reports/${encodeURIComponent(client.id)}`),
      ]);
      const convData = (await convRes.json()) as { conversations?: ConversationThread[] };
      const repData = (await repRes.json()) as { report?: ClientReportSummary };
      const list = convData.conversations || [];
      setConversations(list);
      setReport(repData.report || null);
      if (list.length > 0 && !list.some((c) => c.id === selectedId)) {
        setSelectedId(list[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSelectedId('');
    setFeedbackBanner(null);
    setReplySuggestions([]);
    setReplyHint('');
    void loadData();
  }, [client.id]);

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase();
    return conversations.filter((conv) => {
      const matchesStatus = statusFilter === 'all' || conv.status === statusFilter;
      const matchesSearch =
        !q ||
        conv.customerName.toLowerCase().includes(q) ||
        conv.customerPhone.toLowerCase().includes(q) ||
        conv.messages.some((m) => m.text.toLowerCase().includes(q));
      return matchesStatus && matchesSearch;
    });
  }, [conversations, search, statusFilter]);

  const selectedThread =
    conversations.find((c) => c.id === selectedId) || filteredConversations[0] || null;

  const bookingThreads = useMemo(
    () => conversations.filter((c) => Boolean(c.bookingSummary)),
    [conversations],
  );

  const openConfirmModal = (thread: ConversationThread) => {
    setConfirmTarget(thread);
    setFormRoom(
      thread.bookingSummary?.serviceOrRoom ||
        client.services[0]?.name ||
        'Standard Booking',
    );
    setFormDates(thread.bookingSummary?.checkInOrDate || 'Confirmed Dates');
    setFormGuests(thread.bookingSummary?.guestsOrNotes || '');
    setFormAmount(thread.bookingSummary?.estimatedAmount || client.services[0]?.price || '');
    setFormNote('');
    setNotifyHostPhone(true);
  };

  const handleConfirmBookingAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmTarget) return;
    setConfirmingAlert(true);
    try {
      const res = await fetch(`/api/conversations/${confirmTarget.id}/confirm-booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceOrRoom: formRoom,
          checkInOrDate: formDates,
          guestsOrNotes: formGuests,
          estimatedAmount: formAmount,
          customAlertNote: formNote,
          notifyHost: notifyHostPhone,
        }),
      });
      const data = (await res.json()) as {
        conversation?: ConversationThread;
        guestDelivery?: { sent: boolean; detail?: string };
        error?: string;
      };
      if (!res.ok || !data.conversation) {
        throw new Error(data.error || 'Failed to send booking confirmation alert.');
      }
      setConfirmTarget(null);
      setSelectedId(data.conversation.id);
      await loadData();
      setFeedbackBanner(
        data.guestDelivery?.sent
          ? `Booking confirmed and live WhatsApp alert sent to ${data.conversation.customerPhone}.`
          : `Booking confirmed and WhatsApp confirmation alert logged for ${data.conversation.customerPhone} (${data.guestDelivery?.detail || 'simulated delivery'}).`,
      );
    } catch (err) {
      setFeedbackBanner(err instanceof Error ? err.message : 'Alert dispatch failed.');
    } finally {
      setConfirmingAlert(false);
    }
  };

  const handleToggleBotPause = async (thread: ConversationThread) => {
    const res = await fetch(`/api/conversations/${thread.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botPaused: !thread.botPaused }),
    });
    if (res.ok) {
      await loadData();
      setFeedbackBanner(
        !thread.botPaused
          ? `Bot paused for ${thread.customerPhone}. Replies will wait for the host.`
          : `Bot resumed for ${thread.customerPhone}.`,
      );
    }
  };

  const handleSendHostReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedThread || !hostReply.trim() || sendingHostReply) return;
    setSendingHostReply(true);
    try {
      const res = await fetch(`/api/conversations/${selectedThread.id}/host-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: hostReply.trim() }),
      });
      if (res.ok) {
        setHostReply('');
        setReplySuggestions([]);
        setReplyHint('');
        await loadData();
      }
    } finally {
      setSendingHostReply(false);
    }
  };

  const handleSuggestReply = async () => {
    if (!selectedThread || suggestingReply) return;
    setSuggestingReply(true);
    try {
      const res = await fetch(`/api/conversations/${selectedThread.id}/suggest-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hint: replyHint.trim() }),
      });
      const data = (await res.json()) as {
        suggestions?: Array<{ label: string; text: string }>;
        error?: string;
      };
      if (!res.ok || !data.suggestions) {
        throw new Error(data.error || 'Failed to generate AI reply suggestions.');
      }
      setReplySuggestions(data.suggestions);
    } catch (err) {
      setFeedbackBanner(err instanceof Error ? err.message : 'Unable to suggest reply.');
    } finally {
      setSuggestingReply(false);
    }
  };

  const handleSavePreferences = async () => {
    if (!onSaveChatPreferences || savingPrefs) return;
    setSavingPrefs(true);
    try {
      await onSaveChatPreferences(prefsDraft);
      setFeedbackBanner(
        `Saved AI chat optimization preferences for ${client.businessName}. All future WhatsApp replies will follow these rules.`,
      );
    } catch (err) {
      setFeedbackBanner(err instanceof Error ? err.message : 'Failed to save preferences.');
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleOptimizePreferencesWithAi = async () => {
    if (optimizingPrefs) return;
    setOptimizingPrefs(true);
    try {
      const res = await fetch(`/api/clients/${client.id}/optimize-preferences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientConfig: { ...client, chatPreferences: prefsDraft },
          suggestion: prefsDraft.customInstructions,
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
      setPrefsDraft(data.chatPreferences);
      if (onSaveChatPreferences) {
        await onSaveChatPreferences(data.chatPreferences);
      }
      setFeedbackBanner(data.summary || 'AI preferences optimized and saved.');
    } catch (err) {
      setFeedbackBanner(err instanceof Error ? err.message : 'AI optimization failed.');
    } finally {
      setOptimizingPrefs(false);
    }
  };

  const copyClientPortalUrl = async () => {
    const url = `${window.location.origin}/?client=${encodeURIComponent(client.slug)}&portal=1`;
    await navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 1800);
  };

  const downloadCsvReport = () => {
    const escapeCsv = (val: string) => `"${(val || '').replaceAll('"', '""')}"`;
    const headers = [
      'Conversation ID',
      'Guest Name',
      'WhatsApp Phone',
      'Channel',
      'Status',
      'Service / Room',
      'Dates',
      'Guests / Notes',
      'Estimated Tariff',
      'Booking Status',
      'WhatsApp Alert Sent At',
      'Message Count',
      'Last Activity',
    ];
    const rows = conversations.map((c) => [
      c.id,
      c.customerName,
      c.customerPhone,
      c.channel,
      c.status,
      c.bookingSummary?.serviceOrRoom || '',
      c.bookingSummary?.checkInOrDate || '',
      c.bookingSummary?.guestsOrNotes || '',
      c.bookingSummary?.estimatedAmount || '',
      c.bookingSummary?.bookingStatus || '',
      c.bookingSummary?.alertSentAt || '',
      String(c.messages.length),
      c.lastMessageAt,
    ]);
    const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${client.slug}-whatsapp-report.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            {client.businessName} — Client Dashboard
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Monitor WhatsApp bot chats, confirm guest bookings with instant WhatsApp alerts, and export reports · User ID:{' '}
            <span className="font-mono text-slate-800">{client.portalAuth?.userId || client.slug}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {isClientPortalMode && onLogoutClient && (
            <button
              type="button"
              onClick={onLogoutClient}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          )}
          {isClientPortalMode && onExitPortalMode && (
            <button
              type="button"
              onClick={onExitPortalMode}
              className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap"
            >
              Back to Agency Studio
            </button>
          )}
          <button
            type="button"
            onClick={() => void copyClientPortalUrl()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Link2 className="w-3.5 h-3.5" />}
            {copiedLink ? 'Portal Link Copied' : 'Share Client Link'}
          </button>
          <button
            type="button"
            onClick={downloadCsvReport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            Download CSV Report
          </button>
          <button
            type="button"
            onClick={() => void loadData()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Real KPI Strip */}
      {report && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'WhatsApp Chats', value: report.totalConversations },
            { label: 'Booking Inquiries', value: report.bookingInquiries },
            { label: 'Confirmed Bookings', value: report.confirmedBookings },
            { label: 'Confirmation Alerts', value: report.alertsSent },
            { label: 'Host Escalations', value: report.escalations },
            { label: 'Avg Bot Latency', value: `${report.avgLatencyMs}ms` },
          ].map((stat) => (
            <div key={stat.label} className="bg-white border border-slate-200 rounded-xl px-4 py-3.5">
              <div className="text-xs text-slate-500">{stat.label}</div>
              <div className="font-display text-xl font-bold text-slate-900 mt-1 tabular-nums">
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {feedbackBanner && (
        <div className="px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between gap-4">
          <span>{feedbackBanner}</span>
          <button
            type="button"
            onClick={() => setFeedbackBanner(null)}
            className="text-emerald-700 hover:text-emerald-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg w-fit overflow-x-auto max-w-full">
        {(
          [
            { id: 'chats', label: `WhatsApp Chats (${conversations.length})` },
            { id: 'bookings', label: `Bookings & Alerts (${bookingThreads.length})` },
            { id: 'reports', label: 'Analytics & Reports' },
            { id: 'preferences', label: 'AI Chat Preferences' },
          ] as Array<{ id: DashboardSubTab; label: string }>
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubTab(t.id)}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              subTab === t.id
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: WHATSAPP CHATS INBOX */}
      {subTab === 'chats' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[540px]">
          {/* Thread List */}
          <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col">
            <div className="p-3.5 border-b border-slate-200 space-y-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search guest name, phone, message..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto">
                {(['all', 'active', 'booked', 'escalated'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap ${
                      statusFilter === status
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {status === 'all' ? 'All' : STATUS_LABELS[status].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 divide-y divide-slate-200 overflow-y-auto max-h-[480px]">
              {loading ? (
                <div className="p-6 text-xs text-slate-500">Loading conversations...</div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No WhatsApp chats match this filter yet.
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const active = selectedThread?.id === conv.id;
                  const lastMsg = conv.messages[conv.messages.length - 1];
                  const statusMeta = STATUS_LABELS[conv.status];
                  return (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(conv.id);
                        setReplySuggestions([]);
                      }}
                      className={`w-full text-left p-3.5 transition-colors ${
                        active ? 'bg-emerald-50/50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-900 truncate">
                          {conv.customerName}
                        </span>
                        <span className={`text-[11px] shrink-0 ${statusMeta.colorClass}`}>
                          {statusMeta.label}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5 tabular-nums">
                        {conv.customerPhone} · {conv.messages.length} msgs
                      </div>
                      {lastMsg && (
                        <p className="text-xs text-slate-600 mt-1.5 line-clamp-2">
                          {lastMsg.text}
                        </p>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Selected Thread Detail */}
          <div className="lg:col-span-8 flex flex-col min-w-0">
            {!selectedThread ? (
              <div className="flex-1 flex items-center justify-center p-10 text-sm text-slate-500">
                Select a WhatsApp conversation on the left to inspect messages or confirm a booking.
              </div>
            ) : (
              <>
                <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="font-display text-sm font-semibold text-slate-900 truncate">
                        {selectedThread.customerName}
                      </h2>
                      <span className="text-xs font-mono text-slate-500">
                        {selectedThread.customerPhone}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 tabular-nums">
                      Channel: {selectedThread.channel === 'whatsapp-webhook' ? 'Live WhatsApp Webhook' : 'Studio Simulator'} · Last active {formatTime(selectedThread.lastMessageAt)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => void handleToggleBotPause(selectedThread)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                        selectedThread.botPaused
                          ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {selectedThread.botPaused ? (
                        <>
                          <PlayCircle className="w-3.5 h-3.5" />
                          Resume Bot
                        </>
                      ) : (
                        <>
                          <PauseCircle className="w-3.5 h-3.5" />
                          Pause Bot
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => openConfirmModal(selectedThread)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors whitespace-nowrap"
                    >
                      <Bell className="w-3.5 h-3.5" />
                      {selectedThread.bookingSummary?.bookingStatus === 'confirmed'
                        ? 'Resend WhatsApp Alert'
                        : 'Confirm & Send Alert'}
                    </button>
                  </div>
                </div>

                {selectedThread.bookingSummary && (
                  <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-700">
                    <span className="font-semibold text-slate-900">
                      {selectedThread.bookingSummary.serviceOrRoom}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{selectedThread.bookingSummary.checkInOrDate}</span>
                    <span aria-hidden="true">·</span>
                    <span>{selectedThread.bookingSummary.estimatedAmount}</span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={
                        selectedThread.bookingSummary.bookingStatus === 'confirmed'
                          ? 'text-emerald-700 font-medium'
                          : 'text-amber-700 font-medium'
                      }
                    >
                      {selectedThread.bookingSummary.bookingStatus === 'confirmed'
                        ? 'Booking Confirmed'
                        : 'Pending Confirmation'}
                    </span>
                  </div>
                )}

                <div className="whatsapp-wallpaper flex-1 p-5 space-y-3 overflow-y-auto max-h-[380px]">
                  {selectedThread.messages.map((msg) => {
                    const isCustomer = msg.role === 'customer';
                    const isAlert = msg.role === 'alert';
                    const isHost = msg.role === 'host';

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isCustomer ? 'items-start' : 'items-end'}`}
                      >
                        <div
                          className={`max-w-[82%] rounded-lg px-3.5 py-2.5 text-xs leading-relaxed shadow-xs ${
                            isAlert
                              ? 'bg-emerald-900 text-white'
                              : isHost
                                ? 'bg-slate-900 text-white'
                                : isCustomer
                                  ? 'bg-white text-slate-900'
                                  : 'bg-[#D9FDD3] text-slate-900'
                          }`}
                        >
                          <div className="text-[10px] font-semibold opacity-75 mb-1">
                            {isCustomer
                              ? selectedThread.customerName
                              : isAlert
                                ? 'WhatsApp Booking Confirmation Alert'
                                : isHost
                                  ? 'Host Manual Reply'
                                  : `${client.agentName} (AI Bot)`}
                          </div>
                          <div className="whitespace-pre-wrap">{msg.text}</div>
                          <div className="mt-1.5 flex items-center justify-end gap-2 text-[10px] opacity-70 tabular-nums">
                            {msg.intent && <span>Intent: {msg.intent}</span>}
                            {msg.deliveryStatus && (
                              <span>
                                {msg.deliveryStatus === 'graph-api-sent'
                                  ? 'Delivered via WhatsApp API'
                                  : 'Logged (Simulated API)'}
                              </span>
                            )}
                            <span>{formatTime(msg.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* AI Reply Suggestion Box */}
                <div className="px-3.5 py-2.5 bg-slate-50 border-t border-slate-200 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <input
                      type="text"
                      value={replyHint}
                      onChange={(e) => setReplyHint(e.target.value)}
                      placeholder="AI suggestion hint (e.g. Confirm 1 PM check-in, offer Pahadi dinner & morning safari)..."
                      className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
                    />
                    <button
                      type="button"
                      disabled={suggestingReply}
                      onClick={() => void handleSuggestReply()}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      {suggestingReply ? 'Drafting...' : 'Suggest AI Reply'}
                    </button>
                  </div>

                  {replySuggestions.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {replySuggestions.map((sug, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setHostReply(sug.text)}
                          className="text-left p-2.5 bg-white border border-slate-200 hover:border-emerald-600 rounded-lg transition-colors"
                        >
                          <div className="text-[11px] font-semibold text-emerald-700 mb-1">
                            {sug.label} · Click to insert
                          </div>
                          <div className="text-xs text-slate-700 line-clamp-2">{sug.text}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Host Reply Bar */}
                <form
                  onSubmit={(e) => void handleSendHostReply(e)}
                  className="p-3.5 bg-white border-t border-slate-200 flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={hostReply}
                    onChange={(e) => setHostReply(e.target.value)}
                    placeholder={`Send a manual WhatsApp reply as ${client.businessName} host...`}
                    className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
                  />
                  <button
                    type="submit"
                    disabled={sendingHostReply || !hostReply.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send Reply
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: BOOKINGS & WHATSAPP ALERTS */}
      {subTab === 'bookings' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {bookingThreads.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">
              No booking inquiries captured yet. When guests ask about rooms, dates, or services in WhatsApp, they appear here automatically.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                    <th className="py-3 px-4">Guest & Phone</th>
                    <th className="py-3 px-4">Room / Service</th>
                    <th className="py-3 px-4">Dates / Slot</th>
                    <th className="py-3 px-4">Tariff / Estimate</th>
                    <th className="py-3 px-4">Status & Alert</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {bookingThreads.map((conv) => {
                    const b = conv.bookingSummary!;
                    const confirmed = b.bookingStatus === 'confirmed';
                    return (
                      <tr key={conv.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900">{conv.customerName}</div>
                          <div className="text-xs font-mono text-slate-500 tabular-nums">
                            {conv.customerPhone}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-slate-900">{b.serviceOrRoom}</div>
                          <div className="text-xs text-slate-500 truncate max-w-[260px]">
                            {b.guestsOrNotes}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                          {b.checkInOrDate}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                          {b.estimatedAmount}
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <div className={confirmed ? 'text-emerald-700 font-medium' : 'text-amber-700 font-medium'}>
                            {confirmed ? 'Confirmed' : 'Pending Inquiry'}
                          </div>
                          {b.alertSentAt && (
                            <div className="text-slate-500 mt-0.5 tabular-nums">
                              Alert sent {formatTime(b.alertSentAt)}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => openConfirmModal(conv)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                              confirmed
                                ? 'text-slate-700 bg-white border border-slate-200 hover:bg-slate-50'
                                : 'text-white bg-emerald-600 hover:bg-emerald-700'
                            }`}
                          >
                            <Bell className="w-3.5 h-3.5" />
                            {confirmed ? 'Resend Alert' : 'Confirm & Alert'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: REPORTING & ANALYTICS */}
      {subTab === 'reports' && report && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-900">
                  Inquiry Intent Breakdown
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Customer questions handled across all recorded WhatsApp messages.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-500 tabular-nums">
                {report.totalMessages} total messages
              </span>
            </div>

            {report.intentBreakdown.length === 0 ? (
              <p className="text-xs text-slate-500 py-6">
                No intent data recorded yet.
              </p>
            ) : (
              <div className="space-y-3 pt-2">
                {report.intentBreakdown.map((row) => {
                  const maxCount = Math.max(...report.intentBreakdown.map((i) => i.count), 1);
                  const pct = Math.round((row.count / maxCount) * 100);
                  return (
                    <div key={row.intent} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-800 capitalize">
                          {row.intent.replaceAll('_', ' ')}
                        </span>
                        <span className="font-mono text-slate-600 tabular-nums">
                          {row.count} replies
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-900">
                  Daily Activity Log
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Conversations and confirmed bookings grouped by date.
                </p>
              </div>
              <button
                type="button"
                onClick={downloadCsvReport}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
            </div>

            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-medium">
                  <th className="py-2.5 px-5">Date</th>
                  <th className="py-2.5 px-5 text-right">Conversations</th>
                  <th className="py-2.5 px-5 text-right">Confirmed Bookings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {report.dailyActivity.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-500">
                      No activity recorded yet.
                    </td>
                  </tr>
                ) : (
                  report.dailyActivity.map((day) => (
                    <tr key={day.date} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-5 font-mono text-slate-800 tabular-nums">
                        {day.date}
                      </td>
                      <td className="py-2.5 px-5 text-right font-mono text-slate-700 tabular-nums">
                        {day.conversations}
                      </td>
                      <td className="py-2.5 px-5 text-right font-mono text-emerald-700 font-medium tabular-nums">
                        {day.bookings}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: CLIENT AI CHAT PREFERENCES & OPTIMIZATION SUGGESTION BOX */}
      {subTab === 'preferences' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Optimize Your WhatsApp AI Chat Preferences
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Tell the AI exactly how you want guest chats handled—reply length, upsell approach, and custom host preferences.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={optimizingPrefs}
                onClick={() => void handleOptimizePreferencesWithAi()}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors whitespace-nowrap"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                {optimizingPrefs ? 'Optimizing...' : 'Optimize Rules with AI'}
              </button>
              <button
                type="button"
                disabled={savingPrefs || !onSaveChatPreferences}
                onClick={() => void handleSavePreferences()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 rounded-lg transition-colors whitespace-nowrap"
              >
                <Save className="w-3.5 h-3.5" />
                {savingPrefs ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Reply Length
              </label>
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
                {(
                  [
                    { id: 'short', label: 'Short' },
                    { id: 'balanced', label: 'Balanced' },
                    { id: 'detailed', label: 'Detailed' },
                  ] as Array<{ id: ReplyLengthPreference; label: string }>
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPrefsDraft((p) => ({ ...p, replyLength: opt.id }))}
                    className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      prefsDraft.replyLength === opt.id
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Recommendation Style
              </label>
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
                {(
                  [
                    { id: 'support-only', label: 'Direct' },
                    { id: 'consultative', label: 'Helpful' },
                    { id: 'proactive', label: 'Upsell' },
                  ] as Array<{ id: UpsellStylePreference; label: string }>
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPrefsDraft((p) => ({ ...p, upsellStyle: opt.id }))}
                    className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      prefsDraft.upsellStyle === opt.id
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Emoji Style
              </label>
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
                {(
                  [
                    { id: 'minimal', label: 'Minimal' },
                    { id: 'moderate', label: 'Warm' },
                    { id: 'expressive', label: 'Friendly' },
                  ] as Array<{ id: EmojiStylePreference; label: string }>
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPrefsDraft((p) => ({ ...p, emojiStyle: opt.id }))}
                    className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      prefsDraft.emojiStyle === opt.id
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Chat Optimization Suggestion Box (Your Preferences for AI)
            </label>
            <textarea
              rows={4}
              value={prefsDraft.customInstructions}
              onChange={(e) =>
                setPrefsDraft((p) => ({ ...p, customInstructions: e.target.value }))
              }
              placeholder="Write any preference for how your WhatsApp bot should talk to guests (e.g. Always ask check-in dates first, mention our Kotdwar station guidance, keep messages crisp, suggest family meal combos)..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Priority Topics to Highlight (comma-separated)
            </label>
            <input
              type="text"
              value={prefsDraft.priorityTopics.join(', ')}
              onChange={(e) =>
                setPrefsDraft((p) => ({
                  ...p,
                  priorityTopics: e.target.value
                    .split(',')
                    .map((item) => item.trim())
                    .filter(Boolean),
                }))
              }
              placeholder="Seasonal Room Rates, Home-Cooked Meals, Safari Excursions"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
            />
          </div>
        </div>
      )}

      {/* Confirm Booking & Send WhatsApp Alert Modal */}
      {confirmTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-semibold text-slate-900">
                  Confirm Booking & Send WhatsApp Alert
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Recipient: {confirmTarget.customerName} ({confirmTarget.customerPhone})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmTarget(null)}
                aria-label="Close confirmation dialog"
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={(e) => void handleConfirmBookingAlert(e)} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Confirmed Room / Service
                </label>
                <input
                  type="text"
                  required
                  value={formRoom}
                  onChange={(e) => setFormRoom(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Check-in / Check-out Dates
                  </label>
                  <input
                    type="text"
                    required
                    value={formDates}
                    onChange={(e) => setFormDates(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Total Tariff / Estimate
                  </label>
                  <input
                    type="text"
                    required
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Guests, Meals & Safari Notes
                </label>
                <input
                  type="text"
                  value={formGuests}
                  onChange={(e) => setFormGuests(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Extra Note for Guest WhatsApp Alert (Optional)
                </label>
                <input
                  type="text"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="e.g. Check-in is 1:00 PM. Call host when passing Kotdwar."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
                />
              </div>

              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyHostPhone}
                  onChange={(e) => setNotifyHostPhone(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded"
                />
                <span>
                  Also send confirmation summary alert to Host Desk ({client.escalationContactPhone})
                </span>
              </label>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmTarget(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={confirmingAlert}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 rounded-lg"
                >
                  <Bell className="w-3.5 h-3.5" />
                  {confirmingAlert ? 'Sending Alert...' : 'Confirm & Send WhatsApp Alert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
