import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import type { ChatPreferences, ClientBotConfig } from '../shared/types.ts';
import { DEFAULT_CLIENTS } from '../shared/defaultClients.ts';
import { Sidebar, type WorkspaceView } from './components/Sidebar.tsx';
import { ClientConfigEditor } from './components/ClientConfigEditor.tsx';
import { WhatsAppSimulator } from './components/WhatsAppSimulator.tsx';
import { ClientsDirectory } from './components/ClientsDirectory.tsx';
import { CodebaseExporter } from './components/CodebaseExporter.tsx';
import { WebhookConsole } from './components/WebhookConsole.tsx';
import { ClientDashboard } from './components/ClientDashboard.tsx';
import { ClientLoginScreen } from './components/ClientLoginScreen.tsx';
import { NewClientModal } from './components/NewClientModal.tsx';
import { AdminAccessScreen } from './components/AdminAccessScreen.tsx';
import { clearAdminToken, getAdminToken } from './adminAuth.ts';

const CLIENT_TOKEN_STORAGE_KEY = 'relaydesk_client_token';

const VIEW_LABELS: Record<WorkspaceView, string> = {
  studio: 'Agent Studio',
  dashboard: 'Client Dashboard',
  clients: 'Client Templates',
  export: 'Export Codebase',
  webhook: 'Webhook & Deploy',
};

export default function App() {
  const [clients, setClients] = useState<ClientBotConfig[]>(DEFAULT_CLIENTS);
  const [activeClientId, setActiveClientId] = useState<string>(DEFAULT_CLIENTS[0].id);
  const [draftClient, setDraftClient] = useState<ClientBotConfig>(DEFAULT_CLIENTS[0]);
  const [activeView, setActiveView] = useState<WorkspaceView>('studio');
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingClients, setLoadingClients] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authenticatedClient, setAuthenticatedClient] = useState<ClientBotConfig | null>(null);
  const [requestedClientSlug, setRequestedClientSlug] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('client');
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [cloneSource, setCloneSource] = useState<ClientBotConfig | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [isClientPortalMode, setIsClientPortalMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('portal') === '1';
  });

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  useEffect(() => {
    let mounted = true;
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const slugParam = params?.get('client') || null;
    const portalFlag = params?.get('portal') === '1';
    const storedToken =
      typeof window !== 'undefined' ? window.sessionStorage.getItem(CLIENT_TOKEN_STORAGE_KEY) : null;

    const loadInitial = async () => {
      try {
        const [clientsRes, meRes] = await Promise.all([
          fetch('/api/clients'),
          fetch('/api/auth/me', {
            headers: storedToken ? { Authorization: `Bearer ${storedToken}` } : {},
          }),
        ]);

        const clientsData = (await clientsRes.json()) as { clients?: ClientBotConfig[] };
        const meData = meRes.ok
          ? ((await meRes.json()) as { authenticated?: boolean; client?: ClientBotConfig })
          : { authenticated: false };

        if (!mounted) return;

        // Without a valid admin token the API returns only public summaries
        // (no faqs/services/etc.), which the studio cannot render.
        const adminData = Array.isArray(clientsData.clients?.[0]?.faqs);
        if (!adminData && getAdminToken()) clearAdminToken();
        setIsAdmin(adminData);

        const loadedClients =
          clientsData.clients && clientsData.clients.length > 0
            ? clientsData.clients
            : DEFAULT_CLIENTS;
        setClients(loadedClients);

        if (!adminData) {
          // Visitors without admin access land on the client portal sign-in.
          if (meRes.ok && meData.client) {
            setAuthenticatedClient(meData.client);
            setActiveClientId(meData.client.id);
            setDraftClient(meData.client);
          } else if (typeof window !== 'undefined') {
            window.sessionStorage.removeItem(CLIENT_TOKEN_STORAGE_KEY);
          }
          setActiveView('dashboard');
          setIsClientPortalMode(true);
          return;
        }

        if (meRes.ok && meData.client) {
          setAuthenticatedClient(meData.client);
        } else if (typeof window !== 'undefined') {
          window.sessionStorage.removeItem(CLIENT_TOKEN_STORAGE_KEY);
        }

        if (portalFlag) {
          setIsClientPortalMode(true);
          setActiveView('dashboard');
          if (meRes.ok && meData.client) {
            setActiveClientId(meData.client.id);
            setDraftClient(meData.client);
            return;
          }
        }

        const matched = slugParam
          ? loadedClients.find((c) => c.slug === slugParam || c.id === slugParam)
          : undefined;
        const target = matched || loadedClients[0];
        setActiveClientId(target.id);
        setDraftClient(target);
      } catch {
        // fallback already populated with DEFAULT_CLIENTS
      } finally {
        if (mounted) {
          setLoadingClients(false);
          setCheckingAuth(false);
        }
      }
    };

    void loadInitial();
    return () => {
      mounted = false;
    };
  }, []);

  const selectClient = (id: string) => {
    const found = clients.find((c) => c.id === id);
    if (!found) return;
    setActiveClientId(found.id);
    setDraftClient(structuredClone(found));
    setIsDirty(false);
  };

  const handleDraftChange = (updated: ClientBotConfig) => {
    setDraftClient(updated);
    setIsDirty(true);
  };

  const handleSaveClient = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/clients/${draftClient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draftClient),
      });
      const data = (await res.json()) as { client?: ClientBotConfig; error?: string };
      if (!res.ok || !data.client) {
        throw new Error(data.error || 'Failed to save client configuration.');
      }
      setClients((prev) => prev.map((c) => (c.id === data.client!.id ? data.client! : c)));
      setDraftClient(data.client);
      if (authenticatedClient?.id === data.client.id) {
        setAuthenticatedClient(data.client);
      }
      setIsDirty(false);
      notify(`Saved ${data.client.businessName}`);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateCredentials = async (userId: string, newPassword: string) => {
    const res = await fetch(`/api/clients/${draftClient.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        portalAuth: { userId },
        ...(newPassword ? { newPortalPassword: newPassword } : {}),
      }),
    });
    const data = (await res.json()) as { client?: ClientBotConfig; error?: string };
    if (!res.ok || !data.client) {
      throw new Error(data.error || 'Failed to update client login credentials.');
    }
    setClients((prev) => prev.map((c) => (c.id === data.client!.id ? data.client! : c)));
    setDraftClient((prev) =>
      isDirty ? { ...prev, portalAuth: data.client!.portalAuth } : data.client!,
    );
    if (authenticatedClient?.id === data.client.id) {
      setAuthenticatedClient(data.client);
    }
    notify(`Updated portal login for ${data.client.businessName}`);
  };

  const handleSaveChatPreferences = async (nextPrefs: ChatPreferences) => {
    const targetClient =
      isClientPortalMode && authenticatedClient ? authenticatedClient : draftClient;
    const updatedDraft: ClientBotConfig = {
      ...targetClient,
      chatPreferences: nextPrefs,
    };
    const res = await fetch(`/api/clients/${targetClient.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatPreferences: nextPrefs }),
    });
    const data = (await res.json()) as { client?: ClientBotConfig; error?: string };
    if (!res.ok || !data.client) {
      throw new Error(data.error || 'Failed to save AI chat preferences.');
    }
    setClients((prev) => prev.map((c) => (c.id === data.client!.id ? data.client! : c)));
    if (authenticatedClient?.id === data.client.id) {
      setAuthenticatedClient(data.client);
    }
    if (draftClient.id === data.client.id) {
      setDraftClient(isDirty ? updatedDraft : data.client);
    }
    notify('Saved AI chat optimization preferences');
  };

  const handleCreateClient = async (
    payload: Partial<ClientBotConfig> & { portalUserId?: string; portalPassword?: string },
  ) => {
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { client?: ClientBotConfig; error?: string };
    if (!res.ok || !data.client) {
      throw new Error(data.error || 'Failed to create client.');
    }
    setClients((prev) => [data.client!, ...prev]);
    setActiveClientId(data.client.id);
    setDraftClient(structuredClone(data.client));
    setIsDirty(false);
    setActiveView('studio');
    notify(`Created ${data.client.businessName}`);
  };

  const handleDeleteClient = async (id: string) => {
    const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
    if (!res.ok) return;
    const remaining = clients.filter((c) => c.id !== id);
    setClients(remaining);
    if (activeClientId === id && remaining.length > 0) {
      setActiveClientId(remaining[0].id);
      setDraftClient(structuredClone(remaining[0]));
      setIsDirty(false);
    }
    notify('Client profile deleted');
  };

  const handleOpenClientPortal = () => {
    setRequestedClientSlug(draftClient.slug);
    if (authenticatedClient && authenticatedClient.id !== draftClient.id) {
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(CLIENT_TOKEN_STORAGE_KEY);
      }
      setAuthenticatedClient(null);
    }
    setIsClientPortalMode(true);
    setActiveView('dashboard');
    if (typeof window !== 'undefined') {
      window.history.replaceState(
        {},
        '',
        `/?client=${encodeURIComponent(draftClient.slug)}&portal=1`,
      );
    }
  };

  const handleClientAuthenticated = (client: ClientBotConfig, token: string) => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(CLIENT_TOKEN_STORAGE_KEY, token);
      window.history.replaceState({}, '', `/?client=${encodeURIComponent(client.slug)}&portal=1`);
    }
    setAuthenticatedClient(client);
    setClients((prev) =>
      prev.some((c) => c.id === client.id)
        ? prev.map((c) => (c.id === client.id ? client : c))
        : [client, ...prev],
    );
    setActiveClientId(client.id);
    setDraftClient(structuredClone(client));
    setIsDirty(false);
    setIsClientPortalMode(true);
    setActiveView('dashboard');
    notify(`Signed in to ${client.businessName}`);
  };

  const handleClientLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore network error
    }
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(CLIENT_TOKEN_STORAGE_KEY);
    }
    setAuthenticatedClient(null);
    notify('Signed out of Client Portal');
  };

  const exitPortalToStudio = () => {
    setIsClientPortalMode(false);
    setActiveView('studio');
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/');
    }
  };

  if (isClientPortalMode && !checkingAuth && !loadingClients && !authenticatedClient) {
    const matchedTarget = requestedClientSlug
      ? clients.find((c) => c.slug === requestedClientSlug || c.id === requestedClientSlug) || null
      : null;

    return (
      <>
        <ClientLoginScreen
          targetClient={matchedTarget}
          onAuthenticated={handleClientAuthenticated}
          onBackToStudio={exitPortalToStudio}
        />
        {toast && (
          <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs font-medium px-4 py-2.5 rounded-lg shadow-lg">
            {toast}
          </div>
        )}
      </>
    );
  }

  if (!isClientPortalMode && !checkingAuth && !loadingClients && !isAdmin) {
    return <AdminAccessScreen onBackToClientLogin={() => setIsClientPortalMode(true)} />;
  }

  const handleExportProject = async () => {
    try {
      const res = await fetch('/api/export/full-project');
      if (!res.ok) throw new Error('Export failed. Check your admin sign-in.');
      const url = URL.createObjectURL(await res.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = 'corbett-relaydesk-vercel-supabase.zip';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Export failed.');
    }
  };

  const portalActiveClient =
    isClientPortalMode && authenticatedClient ? authenticatedClient : draftClient;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row">
      {!isClientPortalMode && (
        <Sidebar
          activeView={activeView}
          onChangeView={setActiveView}
          clients={clients}
          activeClientId={activeClientId}
          onSelectClient={selectClient}
          onOpenNewClient={() => {
            setCloneSource(null);
            setShowNewModal(true);
          }}
          onOpenClientPortal={handleOpenClientPortal}
        />
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Header Bar: Breadcrumb + 1 Primary Action */}
        <header className="h-16 px-6 bg-white border-b border-slate-200 flex items-center justify-between gap-8 shrink-0">
          <div className="min-w-0 flex items-center gap-2 text-sm text-slate-500 truncate">
            <span className="truncate">{isClientPortalMode ? 'Client Portal' : 'Clients'}</span>
            <span aria-hidden="true">/</span>
            <span className="font-medium text-slate-900 truncate">
              {portalActiveClient.businessName}
            </span>
            <span aria-hidden="true">/</span>
            <span className="truncate">
              {isClientPortalMode ? 'WhatsApp Dashboard' : VIEW_LABELS[activeView]}
            </span>
          </div>

          {!isClientPortalMode && (
            <button
              type="button"
              onClick={() => void handleExportProject()}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Export Full App (.zip)
            </button>
          )}
        </header>

        <main className="flex-1 p-6 max-w-[1400px] w-full mx-auto">
          {loadingClients || (isClientPortalMode && checkingAuth) ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 h-[540px] bg-white border border-slate-200 rounded-xl animate-pulse" />
              <div className="lg:col-span-5 h-[540px] bg-white border border-slate-200 rounded-xl animate-pulse" />
            </div>
          ) : (
            <>
              {(isClientPortalMode || activeView === 'dashboard') && (
                <ClientDashboard
                  client={portalActiveClient}
                  isClientPortalMode={isClientPortalMode}
                  onSaveChatPreferences={handleSaveChatPreferences}
                  onLogoutClient={() => void handleClientLogout()}
                  onExitPortalMode={exitPortalToStudio}
                />
              )}

              {!isClientPortalMode && activeView === 'studio' && (
                <div className="space-y-6">
                  <div>
                    <h1 className="font-display text-2xl font-bold text-slate-900 text-balance">
                      {draftClient.businessName}
                    </h1>
                    <p className="text-sm text-slate-600 mt-1">
                      {draftClient.industry} · {draftClient.tagline}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    <div className="lg:col-span-7 min-w-0">
                      <ClientConfigEditor
                        client={draftClient}
                        onChange={handleDraftChange}
                        onSave={handleSaveClient}
                        onUpdateCredentials={handleUpdateCredentials}
                        onClone={() => {
                          setCloneSource(draftClient);
                          setShowNewModal(true);
                        }}
                        isDirty={isDirty}
                        isSaving={isSaving}
                      />
                    </div>

                    <div className="lg:col-span-5 min-w-0 lg:sticky lg:top-6">
                      <WhatsAppSimulator
                        client={draftClient}
                        onSaveChatPreferences={handleSaveChatPreferences}
                      />
                    </div>
                  </div>
                </div>
              )}

              {!isClientPortalMode && activeView === 'clients' && (
                <ClientsDirectory
                  clients={clients}
                  activeClientId={activeClientId}
                  onSelectAndOpenStudio={(id) => {
                    selectClient(id);
                    setActiveView('studio');
                  }}
                  onSelectAndExport={(id) => {
                    selectClient(id);
                    setActiveView('export');
                  }}
                  onCloneClient={(client) => {
                    setCloneSource(client);
                    setShowNewModal(true);
                  }}
                  onDeleteClient={(id) => void handleDeleteClient(id)}
                  onOpenNewClient={() => {
                    setCloneSource(null);
                    setShowNewModal(true);
                  }}
                />
              )}

              {!isClientPortalMode && activeView === 'export' && (
                <CodebaseExporter client={draftClient} />
              )}

              {!isClientPortalMode && activeView === 'webhook' && (
                <WebhookConsole client={draftClient} />
              )}
            </>
          )}
        </main>
      </div>

      {showNewModal && (
        <NewClientModal
          templates={clients}
          initialTemplate={cloneSource}
          onClose={() => setShowNewModal(false)}
          onCreate={handleCreateClient}
        />
      )}

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs font-medium px-4 py-2.5 rounded-lg shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
