import { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import type { ClientBotConfig } from '../../shared/types.ts';

interface ClientLoginScreenProps {
  targetClient?: ClientBotConfig | null;
  onAuthenticated: (client: ClientBotConfig, token: string) => void;
  onBackToStudio?: () => void;
}

export function ClientLoginScreen({
  targetClient,
  onAuthenticated,
  onBackToStudio,
}: ClientLoginScreenProps) {
  const [userId, setUserId] = useState(targetClient?.portalAuth?.userId || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim() || !password || submitting) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/auth/client-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId.trim(),
          password,
          ...(targetClient?.slug ? { clientSlug: targetClient.slug } : {}),
        }),
      });
      const data = (await res.json()) as {
        client?: ClientBotConfig;
        token?: string;
        error?: string;
      };
      if (!res.ok || !data.client || !data.token) {
        throw new Error(data.error || 'Invalid User ID or password.');
      }
      onAuthenticated(data.client, data.token);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-emerald-700">
            RelayDesk Client Portal
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-900 text-balance">
            {targetClient ? targetClient.businessName : 'Client Dashboard Sign In'}
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            Sign in with your assigned User ID and password to manage WhatsApp guest chats, confirm bookings, send alerts, and tune AI preferences.
          </p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Client User ID
            </label>
            <input
              type="text"
              required
              autoComplete="username"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="e.g. corbett-rajae"
              className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your portal password"
                className="w-full pl-3 pr-10 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !userId.trim() || !password}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 rounded-lg transition-colors"
          >
            <Lock className="w-4 h-4" />
            {submitting ? 'Signing In...' : 'Sign In to Client Portal'}
          </button>
        </form>

        {onBackToStudio && (
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>Managing multiple bots?</span>
            <button
              type="button"
              onClick={onBackToStudio}
              className="font-medium text-slate-700 hover:text-slate-900 underline-offset-2 hover:underline"
            >
              Open Agency Studio
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
