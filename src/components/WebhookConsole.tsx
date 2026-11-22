import { useEffect, useState } from 'react';
import { Check, Copy, Play, RefreshCw, ShieldCheck } from 'lucide-react';
import type { ClientBotConfig, WebhookLogEntry } from '../../shared/types.ts';

interface WebhookConsoleProps {
  client: ClientBotConfig;
}

export function WebhookConsole({ client }: WebhookConsoleProps) {
  const [senderPhone, setSenderPhone] = useState('+14155550199');
  const [customerText, setCustomerText] = useState(
    client.samplePrompts[0] || 'What are your hours and pricing?',
  );
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyOutput, setVerifyOutput] = useState<string | null>(null);
  const [webhookResponse, setWebhookResponse] = useState<string | null>(null);
  const [logs, setLogs] = useState<WebhookLogEntry[]>([]);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';
  const webhookUrl = `${origin}/api/webhook/${client.slug}`;

  useEffect(() => {
    setCustomerText(client.samplePrompts[0] || 'What are your hours and pricing?');
    setWebhookResponse(null);
    setVerifyOutput(null);
  }, [client.id]);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/webhook-logs');
      const data = (await res.json()) as { logs: WebhookLogEntry[] };
      setLogs(data.logs || []);
    } catch {
      // ignore initial log fetch error
    }
  };

  useEffect(() => {
    void fetchLogs();
  }, []);

  const copyWebhookUrl = async () => {
    await navigator.clipboard.writeText(webhookUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 1800);
  };

  const testHandshake = async () => {
    setVerifying(true);
    setVerifyOutput(null);
    try {
      const challenge = '984721034';
      const url = `/api/webhook/${client.slug}?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(
        client.whatsappVerifyToken,
      )}&hub.challenge=${challenge}`;
      const res = await fetch(url);
      const text = await res.text();
      setVerifyOutput(
        res.ok
          ? `HTTP ${res.status} Verified — Echoed challenge: ${text}`
          : `HTTP ${res.status} Failed — ${text}`,
      );
    } catch (err) {
      setVerifyOutput(err instanceof Error ? err.message : 'Handshake request failed.');
    } finally {
      setVerifying(false);
    }
  };

  const fireTestWebhook = async () => {
    if (!customerText.trim()) return;
    setTestingWebhook(true);
    setWebhookResponse(null);
    try {
      const metaPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'WABA_CLIENT_ACCOUNT',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '15550109999',
                    phone_number_id: client.whatsappPhoneNumberId,
                  },
                  messages: [
                    {
                      from: senderPhone.replace(/[^0-9+]/g, ''),
                      id: `wamid.${Date.now()}`,
                      timestamp: String(Math.floor(Date.now() / 1000)),
                      type: 'text',
                      text: { body: customerText.trim() },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const res = await fetch(`/api/webhook/${client.slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metaPayload),
      });

      const data = await res.json();
      setWebhookResponse(JSON.stringify(data, null, 2));
      await fetchLogs();
    } catch (err) {
      setWebhookResponse(err instanceof Error ? err.message : 'Webhook test failed.');
    } finally {
      setTestingWebhook(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">
          Meta WhatsApp Cloud API Webhook
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          This live server already exposes client-routed Meta WhatsApp Cloud API webhook endpoints for {client.businessName}.
        </p>
      </div>

      {/* Endpoint & Verification Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
          <div className="lg:col-span-7">
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Callback URL (Paste into Meta App Dashboard → WhatsApp → Configuration)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={webhookUrl}
                className="flex-1 px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
              />
              <button
                type="button"
                onClick={() => void copyWebhookUrl()}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedUrl ? 'Copied' : 'Copy URL'}
              </button>
            </div>
          </div>

          <div className="lg:col-span-3">
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Verify Token
            </label>
            <input
              type="text"
              readOnly
              value={client.whatsappVerifyToken}
              className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
            />
          </div>

          <div className="lg:col-span-2">
            <button
              type="button"
              onClick={() => void testHandshake()}
              disabled={verifying}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              {verifying ? 'Checking...' : 'Test Verify'}
            </button>
          </div>
        </div>

        {verifyOutput && (
          <div className="text-xs font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3.5 py-2.5">
            {verifyOutput}
          </div>
        )}
      </div>

      {/* Live Webhook Event Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Send Test Meta Webhook Event
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Posts an authentic Meta Cloud API payload to <code className="font-mono">/api/webhook/{client.slug}</code>.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Customer WhatsApp Number
            </label>
            <input
              type="text"
              value={senderPhone}
              onChange={(e) => setSenderPhone(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Incoming WhatsApp Message Body
            </label>
            <textarea
              rows={3}
              value={customerText}
              onChange={(e) => setCustomerText(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
            />
          </div>

          <button
            type="button"
            onClick={() => void fireTestWebhook()}
            disabled={testingWebhook || !customerText.trim()}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 transition-colors"
          >
            <Play className="w-4 h-4" />
            {testingWebhook ? 'Processing Webhook...' : 'Dispatch Webhook POST'}
          </button>
        </div>

        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-900">
              Webhook Handler Response & Graph API Payload
            </span>
            <span className="text-xs font-mono text-slate-500">POST /api/webhook/{client.slug}</span>
          </div>
          {webhookResponse ? (
            <pre className="p-4 bg-slate-950 text-slate-100 font-mono text-xs leading-relaxed overflow-x-auto max-h-[300px] overflow-y-auto">
              <code>{webhookResponse}</code>
            </pre>
          ) : (
            <div className="p-10 text-center text-xs text-slate-500">
              Dispatch a test webhook event on the left to inspect the real server JSON response and outbound Graph API payload.
            </div>
          )}
        </div>
      </div>

      {/* Live Webhook Activity Log */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Recent Webhook Activity</h3>
            <p className="text-xs text-slate-500">Live events processed by this server instance.</p>
          </div>
          <button
            type="button"
            onClick={() => void fetchLogs()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {logs.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500">
            No webhook events recorded yet. Test a webhook POST above or connect Meta WhatsApp Cloud API.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-medium">
                  <th className="py-2.5 px-4">Time</th>
                  <th className="py-2.5 px-4">Client</th>
                  <th className="py-2.5 px-4">Sender</th>
                  <th className="py-2.5 px-4">Incoming Message</th>
                  <th className="py-2.5 px-4">Bot Reply</th>
                  <th className="py-2.5 px-4">WhatsApp Delivery</th>
                  <th className="py-2.5 px-4 text-right">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {logs.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-900 whitespace-nowrap">
                      {entry.businessName}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                      {entry.senderPhone}
                    </td>
                    <td className="py-2.5 px-4 text-slate-700 max-w-[200px] truncate">
                      {entry.incomingText}
                    </td>
                    <td className="py-2.5 px-4 text-slate-700 max-w-[220px] truncate">
                      {entry.replyText}
                    </td>
                    <td className="py-2.5 px-4 max-w-[220px]">
                      <div
                        className={
                          entry.deliveryMode === 'graph-api-sent'
                            ? 'text-emerald-700 font-medium'
                            : entry.deliveryMode === 'graph-api-failed'
                              ? 'text-red-700 font-medium'
                              : 'text-slate-600'
                        }
                      >
                        {entry.deliveryMode === 'graph-api-sent'
                          ? 'Sent via Meta API'
                          : entry.deliveryMode === 'graph-api-failed'
                            ? 'Meta API Error'
                            : 'Simulated'}
                      </div>
                      {entry.deliveryDetail && (
                        <div className="text-[11px] text-slate-500 truncate" title={entry.deliveryDetail}>
                          {entry.deliveryDetail}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-600 whitespace-nowrap">
                      {entry.latencyMs}ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
