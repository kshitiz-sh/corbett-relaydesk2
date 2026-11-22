import { useState } from 'react';
import { Lock } from 'lucide-react';
import { setAdminToken, verifyAdminToken } from '../adminAuth.ts';

interface AdminAccessScreenProps {
  onBackToClientLogin: () => void;
}

export function AdminAccessScreen({ onBackToClientLogin }: AdminAccessScreenProps) {
  const [token, setToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim() || submitting) return;
    setSubmitting(true);
    setErrorMsg(null);
    const ok = await verifyAdminToken(token);
    if (!ok) {
      setErrorMsg('That admin token was not accepted.');
      setSubmitting(false);
      return;
    }
    setAdminToken(token);
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-emerald-700">RelayDesk Agency Studio</div>
          <h1 className="font-display text-2xl font-bold text-slate-900 text-balance">
            Admin sign in
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            Enter the ADMIN_ACCESS_TOKEN you set in Vercel to manage all client bots.
          </p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Admin token</label>
            <input
              type="password"
              required
              autoComplete="off"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
            />
          </div>

          {errorMsg && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !token.trim()}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 rounded-lg transition-colors"
          >
            <Lock className="w-4 h-4" />
            {submitting ? 'Checking...' : 'Open Agency Studio'}
          </button>
        </form>

        <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Are you a client?</span>
          <button
            type="button"
            onClick={onBackToClientLogin}
            className="font-medium text-slate-700 hover:text-slate-900 underline-offset-2 hover:underline"
          >
            Client portal sign in
          </button>
        </div>
      </div>
    </div>
  );
}
