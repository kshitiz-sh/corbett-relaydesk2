import { useMemo, useState } from 'react';
import { Check, Copy, Download, FileCode2, FileText } from 'lucide-react';
import type { ClientBotConfig } from '../../shared/types.ts';
import { buildExportedFiles, downloadClientZip } from '../utils/exportGenerator.ts';

interface CodebaseExporterProps {
  client: ClientBotConfig;
}

export function CodebaseExporter({ client }: CodebaseExporterProps) {
  const files = useMemo(() => buildExportedFiles(client), [client]);
  const [selectedPath, setSelectedPath] = useState<string>('client.config.ts');
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [copiedDownloadUrl, setCopiedDownloadUrl] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const activeFile = files.find((f) => f.path === selectedPath) || files[0];
  const fullProjectDownloadUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/export/full-project`
      : '/api/export/full-project';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(activeFile.content);
    setCopiedPath(activeFile.path);
    setTimeout(() => setCopiedPath(null), 1800);
  };

  const handleDownloadZip = async () => {
    setDownloading(true);
    try {
      await downloadClientZip(client);
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyDownloadUrl = async () => {
    await navigator.clipboard.writeText(fullProjectDownloadUrl);
    setCopiedDownloadUrl(true);
    setTimeout(() => setCopiedDownloadUrl(false), 1800);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Export &amp; Deploy Codebase for {client.businessName}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Download the <strong>Full Vercel + Supabase App</strong> (Dashboard, Login, Database &amp; Webhook) or the lightweight 6-file standalone Node bot.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void handleDownloadZip()}
            disabled={downloading}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            {downloading ? 'Packaging Bot...' : `Bot Only (${client.slug}.zip)`}
          </button>

          <a
            href="/api/export/full-project"
            download="corbett-relaydesk-vercel-supabase.zip"
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4" />
            Download Full Vercel + Supabase (.zip)
          </a>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 text-xs text-slate-600">
          <span className="font-medium text-slate-800">If preview blocks file downloads:</span>{' '}
          <code className="font-mono text-[11px] text-slate-700 break-all">
            {fullProjectDownloadUrl}
          </code>
        </div>
        <button
          type="button"
          onClick={() => void handleCopyDownloadUrl()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          {copiedDownloadUrl ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              Link Copied
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              Copy Download Link
            </>
          )}
        </button>
      </div>

      {/* 3-Step Scaling Workflow Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500">01. Duplicate Folder</div>
          <div className="font-display text-sm font-semibold text-slate-900 mt-1">
            Keep core engine untouched
          </div>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            <code className="font-mono">bot-engine.ts</code> and <code className="font-mono">server.ts</code> stay identical across dental clinics, restaurants, realty, and retail.
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500">02. Edit 1 Config File</div>
          <div className="font-display text-sm font-semibold text-slate-900 mt-1">
            Swap client.config.ts
          </div>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            Update business name, hours, service prices, FAQs, and escalation contact—or export directly from RelayDesk.
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500">03. Connect WhatsApp</div>
          <div className="font-display text-sm font-semibold text-slate-900 mt-1">
            Point Meta Webhook URL
          </div>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            Deploy to Cloud Run, Railway, or Fly.io and paste the client’s Meta Phone Number ID & Access Token into <code className="font-mono">.env</code>.
          </p>
        </div>
      </div>

      {/* File Tree + Code Viewer */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-slate-200 p-4 space-y-1 bg-slate-50/50">
          <div className="text-xs font-semibold text-slate-500 px-2 pb-2">
            {client.slug}-whatsapp-bot/
          </div>

          {files.map((file) => {
            const selected = file.path === activeFile.path;
            return (
              <button
                key={file.path}
                type="button"
                onClick={() => setSelectedPath(file.path)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-start gap-2.5 ${
                  selected
                    ? 'bg-white border border-slate-200 text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100/70'
                }`}
              >
                {file.path.endsWith('.md') ? (
                  <FileText className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                ) : (
                  <FileCode2
                    className={`w-4 h-4 mt-0.5 shrink-0 ${
                      file.changesPerClient ? 'text-emerald-600' : 'text-slate-400'
                    }`}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-xs font-medium truncate">{file.path}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {file.changesPerClient ? 'Customized per client' : 'Shared core template'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-8 flex flex-col min-w-0">
          <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between gap-4 bg-white">
            <div className="min-w-0">
              <div className="font-mono text-sm font-semibold text-slate-900 truncate">
                {activeFile.path}
              </div>
              <div className="text-xs text-slate-500 truncate">{activeFile.summary}</div>
            </div>

            <button
              type="button"
              onClick={() => void handleCopy()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {copiedPath === activeFile.path ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy File
                </>
              )}
            </button>
          </div>

          <pre className="p-5 bg-slate-950 text-slate-100 font-mono text-xs leading-relaxed overflow-x-auto max-h-[520px] overflow-y-auto">
            <code>{activeFile.content}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
