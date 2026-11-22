import { useState } from 'react';
import { Eye, EyeOff, X } from 'lucide-react';
import type { ClientBotConfig, IndustrySector } from '../../shared/types.ts';

interface NewClientModalProps {
  templates: ClientBotConfig[];
  initialTemplate?: ClientBotConfig | null;
  onClose: () => void;
  onCreate: (
    payload: Partial<ClientBotConfig> & { portalUserId?: string; portalPassword?: string },
  ) => Promise<void>;
}

const INDUSTRIES: IndustrySector[] = [
  'Healthcare & Clinics',
  'Restaurants & Hospitality',
  'Real Estate',
  'Automotive Services',
  'Beauty & Wellness',
  'E-Commerce & Retail',
  'Custom Business',
];

export function NewClientModal({
  templates,
  initialTemplate,
  onClose,
  onCreate,
}: NewClientModalProps) {
  const [templateId, setTemplateId] = useState<string>(
    initialTemplate?.id || templates[0]?.id || '',
  );
  const [businessName, setBusinessName] = useState(
    initialTemplate ? `${initialTemplate.businessName} (Copy)` : '',
  );
  const [industry, setIndustry] = useState<IndustrySector>(
    initialTemplate?.industry || 'Custom Business',
  );
  const [agentName, setAgentName] = useState(initialTemplate?.agentName || 'Alex');
  const [location, setLocation] = useState(initialTemplate?.location || '');
  const [portalUserId, setPortalUserId] = useState('');
  const [userIdTouched, setUserIdTouched] = useState(false);
  const [portalPassword, setPortalPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const slugify = (val: string) =>
    val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

  const handleBusinessNameChange = (val: string) => {
    setBusinessName(val);
    if (!userIdTouched) {
      setPortalUserId(slugify(val));
    }
  };

  const handleTemplateChange = (id: string) => {
    setTemplateId(id);
    const found = templates.find((t) => t.id === id);
    if (found) {
      setIndustry(found.industry);
      setAgentName(found.agentName);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim() || !portalUserId.trim() || !portalPassword.trim()) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const base = templates.find((t) => t.id === templateId);
      const name = businessName.trim();
      await onCreate({
        ...(base ? structuredClone(base) : {}),
        businessName: name,
        industry,
        agentName: agentName.trim() || 'Alex',
        location: location.trim() || base?.location || '',
        greetingMessage: base
          ? base.greetingMessage.replaceAll(base.businessName, name)
          : `Hello! Welcome to *${name}*. How can I help you today?`,
        isBuiltInTemplate: false,
        portalUserId: portalUserId.trim().toLowerCase(),
        portalPassword: portalPassword.trim(),
      });
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create client bot.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Create New Client Bot
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Start from an industry template and customize only the client details.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Starter Template
            </label>
            <select
              value={templateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-emerald-600"
            >
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.businessName} ({tpl.industry})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Client Business Name
            </label>
            <input
              type="text"
              required
              autoFocus
              value={businessName}
              onChange={(e) => handleBusinessNameChange(e.target.value)}
              placeholder="e.g. Harborview Dental Clinic"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Industry Sector
              </label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value as IndustrySector)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-emerald-600"
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
                Assistant Name
              </label>
              <input
                type="text"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="Maya"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Client Location / City
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. 120 Harbor St, Seattle, WA"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Client Login User ID
              </label>
              <input
                type="text"
                required
                value={portalUserId}
                onChange={(e) => {
                  setUserIdTouched(true);
                  setPortalUserId(e.target.value);
                }}
                placeholder="e.g. harborview-dental"
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Client Portal Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={portalPassword}
                  onChange={(e) => setPortalPassword(e.target.value)}
                  placeholder="Set initial password"
                  className="w-full pl-3 pr-9 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {errorMsg}
            </div>
          )}

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !businessName.trim() || !portalUserId.trim() || !portalPassword.trim()}
              className="px-4 py-2 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400"
            >
              {submitting ? 'Creating...' : 'Create Client Bot'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
