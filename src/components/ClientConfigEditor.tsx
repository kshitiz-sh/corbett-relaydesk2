import { useEffect, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  Link2,
  Plus,
  Save,
  SlidersHorizontal,
  Trash2,
  Upload,
} from 'lucide-react';
import type {
  BotTone,
  ChatPreferences,
  ClientBotConfig,
  EmojiStylePreference,
  FaqItem,
  IndustrySector,
  KnowledgeBaseEntry,
  KnowledgeCategory,
  ReplyLengthPreference,
  ServiceItem,
  UpsellStylePreference,
} from '../../shared/types.ts';

interface ClientConfigEditorProps {
  client: ClientBotConfig;
  onChange: (updated: ClientBotConfig) => void;
  onSave: () => Promise<void>;
  onUpdateCredentials?: (userId: string, newPassword: string) => Promise<void>;
  onClone: () => void;
  isDirty: boolean;
  isSaving: boolean;
}

type EditorTab = 'identity' | 'catalog' | 'knowledge' | 'handoff';

const KNOWLEDGE_CATEGORIES: KnowledgeCategory[] = [
  'Policies',
  'Directions & Access',
  'Property & Amenities',
  'Pricing & Offers',
  'General Info',
];

const INDUSTRIES: IndustrySector[] = [
  'Healthcare & Clinics',
  'Restaurants & Hospitality',
  'Real Estate',
  'Automotive Services',
  'Beauty & Wellness',
  'E-Commerce & Retail',
  'Custom Business',
];

const TONES: Array<{ value: BotTone; label: string; hint: string }> = [
  { value: 'warm', label: 'Warm & Welcoming', hint: 'Empathetic, hospitable front-desk tone' },
  { value: 'concise', label: 'Crisp & Concise', hint: 'Fast, direct answers with zero fluff' },
  { value: 'executive', label: 'Executive & Formal', hint: 'Consultative, trustworthy advisory tone' },
  { value: 'friendly', label: 'Friendly & Casual', hint: 'Upbeat conversational host style' },
];

export function ClientConfigEditor({
  client,
  onChange,
  onSave,
  onUpdateCredentials,
  onClone,
  isDirty,
  isSaving,
}: ClientConfigEditorProps) {
  const [tab, setTab] = useState<EditorTab>('identity');
  const [importUrl, setImportUrl] = useState(client.website || '');
  const [importingUrl, setImportingUrl] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [optimizingPrefs, setOptimizingPrefs] = useState(false);
  const [optimizeNote, setOptimizeNote] = useState<string | null>(null);
  const [portalUserIdInput, setPortalUserIdInput] = useState(
    client.portalAuth?.userId || client.slug,
  );
  const [newPortalPassword, setNewPortalPassword] = useState('');
  const [showPortalPassword, setShowPortalPassword] = useState(false);
  const [updatingCredentials, setUpdatingCredentials] = useState(false);
  const [credStatus, setCredStatus] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [copiedPortalLink, setCopiedPortalLink] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setImportUrl(client.website || '');
    setImportStatus(null);
    setOptimizeNote(null);
    setPortalUserIdInput(client.portalAuth?.userId || client.slug);
    setNewPortalPassword('');
    setCredStatus(null);
  }, [client.id, client.portalAuth?.userId, client.slug]);

  const prefs: ChatPreferences = client.chatPreferences || {
    replyLength: 'balanced',
    upsellStyle: 'consultative',
    emojiStyle: 'minimal',
    customInstructions: '',
    priorityTopics: [],
  };

  const updateField = <K extends keyof ClientBotConfig>(key: K, value: ClientBotConfig[K]) => {
    onChange({ ...client, [key]: value });
  };

  const updatePrefs = (patch: Partial<ChatPreferences>) => {
    updateField('chatPreferences', { ...prefs, ...patch });
  };

  const handleAiOptimizePrefs = async () => {
    setOptimizingPrefs(true);
    setOptimizeNote(null);
    try {
      const res = await fetch(`/api/clients/${client.id}/optimize-preferences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientConfig: client,
          suggestion: prefs.customInstructions,
        }),
      });
      const data = (await res.json()) as {
        chatPreferences?: ChatPreferences;
        summary?: string;
        error?: string;
      };
      if (!res.ok || !data.chatPreferences) {
        throw new Error(data.error || 'Failed to optimize chat preferences.');
      }
      updateField('chatPreferences', data.chatPreferences);
      setOptimizeNote(data.summary || 'Optimized rules ready. Click Save Changes to persist.');
    } catch (err) {
      setOptimizeNote(err instanceof Error ? err.message : 'Unable to optimize rules.');
    } finally {
      setOptimizingPrefs(false);
    }
  };

  const addService = () => {
    const newItem: ServiceItem = {
      id: `srv-${Date.now()}`,
      name: '',
      price: '',
      duration: '',
      description: '',
    };
    updateField('services', [...client.services, newItem]);
  };

  const updateService = (index: number, patch: Partial<ServiceItem>) => {
    const next = client.services.map((item, idx) => (idx === index ? { ...item, ...patch } : item));
    updateField('services', next);
  };

  const removeService = (index: number) => {
    updateField(
      'services',
      client.services.filter((_, idx) => idx !== index),
    );
  };

  const addFaq = () => {
    const newFaq: FaqItem = {
      id: `faq-${Date.now()}`,
      question: '',
      answer: '',
    };
    updateField('faqs', [...client.faqs, newFaq]);
  };

  const updateFaq = (index: number, patch: Partial<FaqItem>) => {
    const next = client.faqs.map((item, idx) => (idx === index ? { ...item, ...patch } : item));
    updateField('faqs', next);
  };

  const removeFaq = (index: number) => {
    updateField(
      'faqs',
      client.faqs.filter((_, idx) => idx !== index),
    );
  };

  const kbList = client.knowledgeBase || [];
  const enabledKbCount = kbList.filter((d) => d.enabled).length;

  const addKnowledgeDoc = () => {
    const entry: KnowledgeBaseEntry = {
      id: `kb-${Date.now()}`,
      title: '',
      category: 'General Info',
      content: '',
      sourceType: 'manual',
      sourceLabel: 'Manual entry',
      enabled: true,
    };
    updateField('knowledgeBase', [entry, ...kbList]);
  };

  const updateKnowledgeDoc = (index: number, patch: Partial<KnowledgeBaseEntry>) => {
    const next = kbList.map((item, idx) => (idx === index ? { ...item, ...patch } : item));
    updateField('knowledgeBase', next);
  };

  const removeKnowledgeDoc = (index: number) => {
    updateField(
      'knowledgeBase',
      kbList.filter((_, idx) => idx !== index),
    );
  };

  const handleImportWebsite = async () => {
    const targetUrl = (importUrl || client.website || '').trim();
    if (!targetUrl) {
      setImportStatus({ type: 'err', text: 'Enter a website URL to import.' });
      return;
    }
    setImportingUrl(true);
    setImportStatus(null);
    try {
      const res = await fetch('/api/knowledge/import-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl, businessName: client.businessName }),
      });
      const data = (await res.json()) as { entries?: KnowledgeBaseEntry[]; error?: string };
      if (!res.ok || !data.entries) {
        throw new Error(data.error || 'Failed to extract knowledge from URL.');
      }
      updateField('knowledgeBase', [...data.entries, ...kbList]);
      setImportStatus({
        type: 'ok',
        text: `Imported ${data.entries.length} knowledge document${data.entries.length === 1 ? '' : 's'}. Review and click Save Changes.`,
      });
    } catch (err) {
      setImportStatus({
        type: 'err',
        text: err instanceof Error ? err.message : 'Unable to fetch website.',
      });
    } finally {
      setImportingUrl(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const trimmed = text.trim().slice(0, 15000);
      if (!trimmed) {
        setImportStatus({ type: 'err', text: 'Uploaded file is empty.' });
        return;
      }
      const cleanTitle = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
      const entry: KnowledgeBaseEntry = {
        id: `kb-file-${Date.now()}`,
        title: cleanTitle || file.name,
        category: 'General Info',
        content: trimmed,
        sourceType: 'file',
        sourceLabel: file.name,
        enabled: true,
      };
      updateField('knowledgeBase', [entry, ...kbList]);
      setImportStatus({
        type: 'ok',
        text: `Added "${file.name}" to Knowledge Base. Click Save Changes to persist.`,
      });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl flex flex-col">
      <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-900">
            Client Bot Configuration
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Changes here feed directly into the simulator, webhook server, and exported <code className="font-mono text-slate-700">client.config.ts</code>.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onClone}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            <Copy className="w-3.5 h-3.5" />
            Clone for New Client
          </button>
          <button
            type="button"
            onClick={() => void onSave()}
            disabled={isSaving || !isDirty}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              isDirty
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? 'Saving...' : isDirty ? 'Save Changes' : 'Saved'}
          </button>
        </div>
      </div>

      <div className="px-6 pt-3 border-b border-slate-200 flex items-center gap-2 overflow-x-auto">
        {(
          [
            { id: 'identity', label: '01. Identity & Tone' },
            { id: 'catalog', label: `02. Services & FAQ (${client.services.length})` },
            { id: 'knowledge', label: `03. Knowledge Base (${enabledKbCount})` },
            { id: 'handoff', label: '04. Handoff & WhatsApp' },
          ] as Array<{ id: EditorTab; label: string }>
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
              tab === item.id
                ? 'border-emerald-600 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="p-6 space-y-6">
        {tab === 'identity' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Business Name
                </label>
                <input
                  type="text"
                  value={client.businessName}
                  onChange={(e) => updateField('businessName', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Industry Sector
                </label>
                <select
                  value={client.industry}
                  onChange={(e) => updateField('industry', e.target.value as IndustrySector)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                >
                  {INDUSTRIES.map((sector) => (
                    <option key={sector} value={sector}>
                      {sector}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Agent Persona Name
                </label>
                <input
                  type="text"
                  value={client.agentName}
                  onChange={(e) => updateField('agentName', e.target.value)}
                  placeholder="e.g. Maya"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Primary Reply Language
                </label>
                <input
                  type="text"
                  value={client.primaryLanguage}
                  onChange={(e) => updateField('primaryLanguage', e.target.value)}
                  placeholder="English"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Business Location / Address
                </label>
                <input
                  type="text"
                  value={client.location}
                  onChange={(e) => updateField('location', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Website URL
                </label>
                <input
                  type="text"
                  value={client.website}
                  onChange={(e) => updateField('website', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Operating Hours
              </label>
              <input
                type="text"
                value={client.operatingHours}
                onChange={(e) => updateField('operatingHours', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-2">
                Reply Tone
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {TONES.map((option) => {
                  const active = client.tone === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateField('tone', option.value)}
                      className={`text-left px-3.5 py-2.5 rounded-lg border transition-colors ${
                        active
                          ? 'border-emerald-600 bg-emerald-50/60 text-slate-900'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="text-sm font-medium">{option.label}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{option.hint}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Opening WhatsApp Greeting
              </label>
              <textarea
                rows={3}
                value={client.greetingMessage}
                onChange={(e) => updateField('greetingMessage', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
              />
            </div>

            <div className="pt-5 border-t border-slate-200 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    AI Chat Optimization & Client Preferences
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Guide reply length, recommendation style, and custom behavior rules for {client.businessName}.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={optimizingPrefs}
                  onClick={() => void handleAiOptimizePrefs()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  {optimizingPrefs ? 'Optimizing...' : 'Optimize Rules with AI'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1.5">
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
                        onClick={() => updatePrefs({ replyLength: opt.id })}
                        className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                          prefs.replyLength === opt.id
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
                  <label className="block text-[11px] font-medium text-slate-600 mb-1.5">
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
                        onClick={() => updatePrefs({ upsellStyle: opt.id })}
                        className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                          prefs.upsellStyle === opt.id
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
                  <label className="block text-[11px] font-medium text-slate-600 mb-1.5">
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
                        onClick={() => updatePrefs({ emojiStyle: opt.id })}
                        className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                          prefs.emojiStyle === opt.id
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
                  AI Chat Suggestion Box (Client Preferences & Coaching Instructions)
                </label>
                <textarea
                  rows={3}
                  value={prefs.customInstructions}
                  onChange={(e) => updatePrefs({ customInstructions: e.target.value })}
                  placeholder="Describe how the client prefers chats handled (e.g. Keep replies under 3 sentences, suggest Pahadi meals and morning safaris early, ask for guest count and dates)..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Priority Topics to Highlight (comma-separated)
                </label>
                <input
                  type="text"
                  value={prefs.priorityTopics.join(', ')}
                  onChange={(e) =>
                    updatePrefs({
                      priorityTopics: e.target.value
                        .split(',')
                        .map((item) => item.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="Seasonal Room Rates, Home-Cooked Meals, Safari Excursions"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                />
              </div>

              {optimizeNote && (
                <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  {optimizeNote}
                </div>
              )}
            </div>
          </>
        )}

        {tab === 'catalog' && (
          <>
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Services, Menu & Pricing</h3>
                  <p className="text-xs text-slate-500">
                    The bot quotes strictly from these rows and never invents prices.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addService}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Service
                </button>
              </div>

              {client.services.length === 0 ? (
                <div className="py-8 text-center border border-dashed border-slate-200 rounded-lg text-sm text-slate-500">
                  No services added yet. Click &ldquo;Add Service&rdquo; to list offerings and pricing.
                </div>
              ) : (
                <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg">
                  {client.services.map((srv, idx) => (
                    <div key={srv.id} className="p-4 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                        <div className="sm:col-span-5">
                          <label className="block text-[11px] font-medium text-slate-500 mb-1">
                            Service / Product Name
                          </label>
                          <input
                            type="text"
                            value={srv.name}
                            onChange={(e) => updateService(idx, { name: e.target.value })}
                            placeholder="e.g. Routine Cleaning"
                            className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-emerald-600"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <label className="block text-[11px] font-medium text-slate-500 mb-1">
                            Price
                          </label>
                          <input
                            type="text"
                            value={srv.price}
                            onChange={(e) => updateService(idx, { price: e.target.value })}
                            placeholder="$120"
                            className="w-full px-2.5 py-1.5 text-sm font-mono border border-slate-200 rounded-md focus:outline-none focus:border-emerald-600"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <label className="block text-[11px] font-medium text-slate-500 mb-1">
                            Duration / Turnaround
                          </label>
                          <input
                            type="text"
                            value={srv.duration}
                            onChange={(e) => updateService(idx, { duration: e.target.value })}
                            placeholder="45 mins"
                            className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-emerald-600"
                          />
                        </div>
                        <div className="sm:col-span-1 flex justify-end sm:pt-5">
                          <button
                            type="button"
                            onClick={() => removeService(idx)}
                            aria-label="Remove service"
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-md transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div>
                        <input
                          type="text"
                          value={srv.description}
                          onChange={(e) => updateService(idx, { description: e.target.value })}
                          placeholder="Short customer-facing details"
                          className="w-full px-2.5 py-1.5 text-xs text-slate-700 border border-slate-200 rounded-md focus:outline-none focus:border-emerald-600"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Frequently Asked Questions</h3>
                  <p className="text-xs text-slate-500">
                    Policies, insurance, parking, shipping, or dietary answers.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addFaq}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add FAQ
                </button>
              </div>

              {client.faqs.length === 0 ? (
                <div className="py-6 text-center border border-dashed border-slate-200 rounded-lg text-sm text-slate-500">
                  No FAQs defined yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {client.faqs.map((faq, idx) => (
                    <div key={faq.id} className="p-3.5 border border-slate-200 rounded-lg space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={faq.question}
                          onChange={(e) => updateFaq(idx, { question: e.target.value })}
                          placeholder="Customer question..."
                          className="flex-1 px-2.5 py-1.5 text-sm font-medium border border-slate-200 rounded-md focus:outline-none focus:border-emerald-600"
                        />
                        <button
                          type="button"
                          onClick={() => removeFaq(idx)}
                          aria-label="Remove FAQ"
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-md transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <textarea
                        rows={2}
                        value={faq.answer}
                        onChange={(e) => updateFaq(idx, { answer: e.target.value })}
                        placeholder="Approved business answer..."
                        className="w-full px-2.5 py-1.5 text-xs text-slate-700 border border-slate-200 rounded-md focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {tab === 'knowledge' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Import Business Knowledge
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Sync details from the client’s website or upload menus, tariff sheets, and SOPs (.txt, .md, .csv, .json). Active entries are injected directly into every WhatsApp reply.
              </p>

              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <input
                  type="url"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  placeholder={client.website || 'https://client-website.com'}
                  className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
                />
                <button
                  type="button"
                  disabled={importingUrl}
                  onClick={() => void handleImportWebsite()}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <Globe className="w-3.5 h-3.5" />
                  {importingUrl ? 'Extracting...' : 'Import from Website'}
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,.csv,.json"
                  onChange={(e) => void handleFileUpload(e)}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload Text / Menu / Policy File
                </button>
                <button
                  type="button"
                  onClick={addKnowledgeDoc}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Document
                </button>
              </div>

              {importStatus && (
                <div
                  className={`mt-3 text-xs px-3 py-2 rounded-lg border ${
                    importStatus.type === 'ok'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border-red-200 text-red-700'
                  }`}
                >
                  {importStatus.text}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 tabular-nums">
                  {enabledKbCount} of {kbList.length} documents active in bot context
                </span>
              </div>

              {kbList.length === 0 ? (
                <div className="py-8 text-center border border-dashed border-slate-200 rounded-lg text-sm text-slate-500">
                  No knowledge base documents yet. Import from the client website, upload a file, or click &ldquo;Add Document&rdquo;.
                </div>
              ) : (
                <div className="space-y-3">
                  {kbList.map((doc, idx) => (
                    <div
                      key={doc.id}
                      className={`p-4 border rounded-lg space-y-3 transition-colors ${
                        doc.enabled
                          ? 'border-slate-200 bg-white'
                          : 'border-slate-200 bg-slate-50/70 opacity-75'
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={doc.enabled}
                          onChange={(e) => updateKnowledgeDoc(idx, { enabled: e.target.checked })}
                          aria-label={`Enable ${doc.title || 'document'}`}
                          className="w-4 h-4 accent-emerald-600 rounded shrink-0"
                        />
                        <input
                          type="text"
                          value={doc.title}
                          onChange={(e) => updateKnowledgeDoc(idx, { title: e.target.value })}
                          placeholder="Document title (e.g. Check-in, Directions, Refund Policy)"
                          className="flex-1 min-w-[180px] px-2.5 py-1.5 text-sm font-medium border border-slate-200 rounded-md focus:outline-none focus:border-emerald-600"
                        />
                        <select
                          value={doc.category}
                          onChange={(e) =>
                            updateKnowledgeDoc(idx, {
                              category: e.target.value as KnowledgeCategory,
                            })
                          }
                          className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:border-emerald-600"
                        >
                          {KNOWLEDGE_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => removeKnowledgeDoc(idx)}
                          aria-label="Delete knowledge document"
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-md transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <textarea
                        rows={3}
                        value={doc.content}
                        onChange={(e) => updateKnowledgeDoc(idx, { content: e.target.value })}
                        placeholder="Paste factual policies, directions, room details, seasonal notes, or SOPs..."
                        className="w-full px-3 py-2 text-xs text-slate-700 leading-relaxed border border-slate-200 rounded-md focus:outline-none focus:border-emerald-600"
                      />

                      <div className="flex items-center gap-2 text-[11px] text-slate-500 tabular-nums">
                        <span>Source: {doc.sourceLabel || doc.sourceType}</span>
                        <span aria-hidden="true">·</span>
                        <span>{doc.content.length} chars</span>
                        <span aria-hidden="true">·</span>
                        <span>{doc.enabled ? 'Active' : 'Paused'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'handoff' && (
          <>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Booking & Lead Capture Rules
              </label>
              <textarea
                rows={3}
                value={client.bookingInstructions}
                onChange={(e) => updateField('bookingInstructions', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Human Escalation Triggers
              </label>
              <textarea
                rows={3}
                value={client.escalationTriggers}
                onChange={(e) => updateField('escalationTriggers', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Escalation Contact
                </label>
                <input
                  type="text"
                  value={client.escalationContactName}
                  onChange={(e) => updateField('escalationContactName', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Escalation Phone
                </label>
                <input
                  type="text"
                  value={client.escalationContactPhone}
                  onChange={(e) => updateField('escalationContactPhone', e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Escalation Email
                </label>
                <input
                  type="email"
                  value={client.escalationContactEmail}
                  onChange={(e) => updateField('escalationContactEmail', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Fallback Handoff Message
              </label>
              <textarea
                rows={2}
                value={client.fallbackMessage}
                onChange={(e) => updateField('fallbackMessage', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Meta WhatsApp Phone Number ID
                </label>
                <input
                  type="text"
                  value={client.whatsappPhoneNumberId}
                  onChange={(e) => updateField('whatsappPhoneNumberId', e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Webhook Verify Token
                </label>
                <input
                  type="text"
                  value={client.whatsappVerifyToken}
                  onChange={(e) => updateField('whatsappVerifyToken', e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            {onUpdateCredentials && (
              <div className="pt-5 border-t border-slate-200 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Client Portal Login Credentials
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Each client uses these credentials to sign in privately to their WhatsApp dashboard.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const url = `${window.location.origin}/?client=${encodeURIComponent(client.slug)}&portal=1`;
                      void navigator.clipboard.writeText(url);
                      setCopiedPortalLink(true);
                      setTimeout(() => setCopiedPortalLink(false), 1800);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
                  >
                    {copiedPortalLink ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Link2 className="w-3.5 h-3.5" />
                    )}
                    {copiedPortalLink ? 'Login URL Copied' : 'Copy Portal Login Link'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Login User ID
                    </label>
                    <input
                      type="text"
                      value={portalUserIdInput}
                      onChange={(e) => setPortalUserIdInput(e.target.value)}
                      placeholder="e.g. corbett-rajae"
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      New / Reset Password (optional if keeping existing)
                    </label>
                    <div className="relative">
                      <input
                        type={showPortalPassword ? 'text' : 'password'}
                        value={newPortalPassword}
                        onChange={(e) => setNewPortalPassword(e.target.value)}
                        placeholder="Enter new password to reset"
                        className="w-full pl-3 pr-9 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPortalPassword((p) => !p)}
                        aria-label={showPortalPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      >
                        {showPortalPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-slate-500">
                    {client.portalAuth?.hasPassword
                      ? 'Password is active and hashed.'
                      : 'Set an initial password for this client.'}
                  </div>
                  <button
                    type="button"
                    disabled={updatingCredentials || !portalUserIdInput.trim()}
                    onClick={async () => {
                      setUpdatingCredentials(true);
                      setCredStatus(null);
                      try {
                        await onUpdateCredentials(
                          portalUserIdInput.trim().toLowerCase(),
                          newPortalPassword.trim(),
                        );
                        setNewPortalPassword('');
                        setCredStatus({
                          type: 'ok',
                          text: 'Updated client portal User ID / password.',
                        });
                      } catch (err) {
                        setCredStatus({
                          type: 'err',
                          text:
                            err instanceof Error
                              ? err.message
                              : 'Unable to update login credentials.',
                        });
                      } finally {
                        setUpdatingCredentials(false);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    {updatingCredentials ? 'Updating...' : 'Update Login & Password'}
                  </button>
                </div>

                {credStatus && (
                  <div
                    className={`text-xs px-3 py-2 rounded-lg border ${
                      credStatus.type === 'ok'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-red-50 border-red-200 text-red-700'
                    }`}
                  >
                    {credStatus.text}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
