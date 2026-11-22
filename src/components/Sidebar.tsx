import {
  Bot,
  Code2,
  FolderKanban,
  LayoutDashboard,
  Lock,
  Plus,
  Webhook,
} from 'lucide-react';
import type { ClientBotConfig } from '../../shared/types.ts';

export type WorkspaceView = 'studio' | 'dashboard' | 'clients' | 'export' | 'webhook';

interface SidebarProps {
  activeView: WorkspaceView;
  onChangeView: (view: WorkspaceView) => void;
  clients: ClientBotConfig[];
  activeClientId: string;
  onSelectClient: (id: string) => void;
  onOpenNewClient: () => void;
  onOpenClientPortal: () => void;
}

const NAV_ITEMS: Array<{ id: WorkspaceView; label: string; icon: typeof Bot }> = [
  { id: 'studio', label: 'Agent Studio', icon: Bot },
  { id: 'dashboard', label: 'Client Dashboard', icon: LayoutDashboard },
  { id: 'clients', label: 'Client Templates', icon: FolderKanban },
  { id: 'export', label: 'Export Codebase', icon: Code2 },
  { id: 'webhook', label: 'Webhook & Deploy', icon: Webhook },
];

export function Sidebar({
  activeView,
  onChangeView,
  clients,
  activeClientId,
  onSelectClient,
  onOpenNewClient,
  onOpenClientPortal,
}: SidebarProps) {
  return (
    <aside className="w-full lg:w-[264px] lg:shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200 bg-white flex flex-col justify-between">
      <div>
        <div className="px-5 h-16 border-b border-slate-200 flex items-center justify-between">
          <a
            href="#studio"
            onClick={(e) => {
              e.preventDefault();
              onChangeView('studio');
            }}
            className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            RelayDesk
          </a>
        </div>

        <nav className="p-3 space-y-1" aria-label="Workspace navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChangeView(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-emerald-700' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-4 pt-4 border-t border-slate-200 px-3">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-xs font-semibold text-slate-500">Client Profiles</span>
            <button
              type="button"
              onClick={onOpenNewClient}
              className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              New Client
            </button>
          </div>

          <div className="space-y-0.5 max-h-[340px] overflow-y-auto pr-1">
            {clients.map((client) => {
              const selected = client.id === activeClientId;
              return (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => onSelectClient(client.id)}
                  className={`w-full text-left px-2.5 py-2 rounded-lg transition-colors ${
                    selected
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="text-sm font-medium truncate">{client.businessName}</div>
                  <div className="text-xs text-slate-500 truncate">{client.industry}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-slate-200 space-y-3">
        <button
          type="button"
          onClick={onOpenClientPortal}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors whitespace-nowrap"
        >
          <Lock className="w-3.5 h-3.5 text-slate-500" />
          Client Portal Login
        </button>
        <p className="hidden lg:block text-xs text-slate-500 leading-relaxed">
          Each client has a dedicated User ID and password for their dashboard.
        </p>
      </div>
    </aside>
  );
}
