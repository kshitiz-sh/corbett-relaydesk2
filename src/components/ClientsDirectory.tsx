import { useMemo, useState } from 'react';
import { Code2, Copy, ExternalLink, Plus, Search, Trash2 } from 'lucide-react';
import type { ClientBotConfig } from '../../shared/types.ts';

interface ClientsDirectoryProps {
  clients: ClientBotConfig[];
  activeClientId: string;
  onSelectAndOpenStudio: (id: string) => void;
  onSelectAndExport: (id: string) => void;
  onCloneClient: (client: ClientBotConfig) => void;
  onDeleteClient: (id: string) => void;
  onOpenNewClient: () => void;
}

export function ClientsDirectory({
  clients,
  activeClientId,
  onSelectAndOpenStudio,
  onSelectAndExport,
  onCloneClient,
  onDeleteClient,
  onOpenNewClient,
}: ClientsDirectoryProps) {
  const [query, setQuery] = useState('');
  const [industryFilter, setIndustryFilter] = useState<string>('All');

  const industries = useMemo(() => {
    const unique = Array.from(new Set(clients.map((c) => c.industry)));
    return ['All', ...unique];
  }, [clients]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients.filter((c) => {
      const matchesIndustry = industryFilter === 'All' || c.industry === industryFilter;
      const matchesQuery =
        !q ||
        c.businessName.toLowerCase().includes(q) ||
        c.industry.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q);
      return matchesIndustry && matchesQuery;
    });
  }, [clients, query, industryFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Client Templates & Accounts
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Duplicate any industry starter template into a customized client bot in seconds.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenNewClient}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          New Client Bot
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by business name or industry..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
          {industries.map((ind) => (
            <button
              key={ind}
              type="button"
              onClick={() => setIndustryFilter(ind)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                industryFilter === ind
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {ind}
            </button>
          ))}
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-slate-600">No client profiles match your search filter.</p>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setIndustryFilter('All');
              }}
              className="mt-3 px-4 py-2 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4">Business</th>
                  <th className="py-3 px-4">Industry Sector</th>
                  <th className="py-3 px-4">Agent & Tone</th>
                  <th className="py-3 px-4 text-right">Services</th>
                  <th className="py-3 px-4">Webhook Slug</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filtered.map((client) => {
                  const isActive = client.id === activeClientId;
                  return (
                    <tr
                      key={client.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isActive ? 'bg-emerald-50/30' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{client.businessName}</div>
                        <div className="text-xs text-slate-500 truncate max-w-[240px]">
                          {client.tagline}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                        {client.industry}
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {client.agentName} · {client.tone}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                        {client.services.length}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-600 whitespace-nowrap">
                        /api/webhook/{client.slug}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onSelectAndOpenStudio(client.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-md hover:bg-slate-50 whitespace-nowrap"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Studio
                          </button>
                          <button
                            type="button"
                            onClick={() => onCloneClient(client)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-md hover:bg-slate-50 whitespace-nowrap"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            Clone
                          </button>
                          <button
                            type="button"
                            onClick={() => onSelectAndExport(client.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md whitespace-nowrap"
                          >
                            <Code2 className="w-3.5 h-3.5" />
                            Export
                          </button>
                          {clients.length > 1 && (
                            <button
                              type="button"
                              onClick={() => onDeleteClient(client.id)}
                              aria-label={`Delete ${client.businessName}`}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-md transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
