import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  BookingSummary,
  ChatMessageRecord,
  ClientBotConfig,
  ClientReportSummary,
  ConversationStatus,
  ConversationThread,
  WebhookLogEntry,
} from '../shared/types.ts';
import { DEFAULT_CLIENTS } from '../shared/defaultClients.ts';
import {
  defaultInitialPasswordForClient,
  defaultUserIdForClient,
  hashPassword,
  verifyPassword,
} from './auth.ts';

const DATA_DIR =
  process.env.VERCEL === '1'
    ? path.join(os.tmpdir(), 'relaydesk-data')
    : path.resolve(process.cwd(), 'data');
const CLIENTS_FILE = path.join(DATA_DIR, 'clients.json');
const CONVERSATIONS_FILE = path.join(DATA_DIR, 'conversations.json');

let memoryWebhookLogs: WebhookLogEntry[] = [];
let supabaseClient: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Supabase is required in production; local JSON storage is disabled.');
    }
    return null;
  }
  if (!supabaseClient) {
    supabaseClient = createSupabaseClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return supabaseClient;
}

function buildStarterConversations(): ConversationThread[] {
  const now = Date.now();
  const hoursAgo = (h: number) => new Date(now - h * 3600 * 1000).toISOString();

  return [
    {
      id: 'conv-corbett-1',
      clientId: 'cli-corbett-rajae-homestay',
      customerName: 'Rohan Sharma',
      customerPhone: '+91 98114 22019',
      channel: 'whatsapp-webhook',
      status: 'booked',
      botPaused: false,
      lastMessageAt: hoursAgo(2),
      bookingSummary: {
        serviceOrRoom: 'Family Deluxe Room (Two-Room Set)',
        checkInOrDate: 'Nov 21 – Nov 23 (2 Nights)',
        guestsOrNotes: '4 Adults, 1 Child · Pahadi Dinner + Sonanadi Gypsy Safari',
        estimatedAmount: '₹7,600 (rooms) + meals/safari',
        bookingStatus: 'confirmed',
        alertSentAt: hoursAgo(2),
        alertRecipient: '+91 98114 22019',
        hostAlertSentAt: hoursAgo(2),
      },
      messages: [
        {
          id: 'm-1',
          role: 'customer',
          text: 'Hi, do you have a family room available for 4 adults and 1 child from Nov 21 to Nov 23?',
          timestamp: hoursAgo(4),
        },
        {
          id: 'm-2',
          role: 'assistant',
          text: 'Namaste! Our *Family Deluxe Room (Two-Room Set)* is ideal for 4–6 guests, with seasonal rates around *₹3,500 – ₹3,900+ per night*. Would you also like home-cooked Pahadi meals or a Jim Corbett / Sonanadi safari arranged?',
          timestamp: hoursAgo(4),
          intent: 'booking',
          sourcesUsed: ['Booking Confirmation & Safari Permits'],
          latencyMs: 640,
        },
        {
          id: 'm-3',
          role: 'customer',
          text: 'Yes please include dinner and morning Sonanadi safari if possible. Please confirm.',
          timestamp: hoursAgo(3),
        },
        {
          id: 'm-4',
          role: 'assistant',
          text: 'Thank you! I have noted your request for the *Family Deluxe Room* (Nov 21–23, 4 adults + 1 child) with dinner and Sonanadi safari. Let me connect you with our host desk on *+91 9411561965* to finalize your advance deposit and safari ID permits.',
          timestamp: hoursAgo(3),
          intent: 'handoff',
          handoffTriggered: true,
          sourcesUsed: ['Booking Confirmation & Safari Permits', 'Dining, Kitchen & Bonfire Guidelines'],
          latencyMs: 590,
        },
        {
          id: 'm-5',
          role: 'alert',
          text: 'Booking Confirmed — *The Corbett Rajae Homestay*\nGuest: Rohan Sharma\nRoom: Family Deluxe Room (Two-Room Set)\nDates: Nov 21 – Nov 23 (2 Nights)\nNotes: 4 Adults, 1 Child · Pahadi Dinner + Sonanadi Gypsy Safari\nEstimated: ₹7,600 (rooms) + meals/safari\nCheck-in: 2:00 PM (Winter) · Host Helpdesk: +91 9411561965',
          timestamp: hoursAgo(2),
          deliveryStatus: 'simulated',
        },
      ],
    },
    {
      id: 'conv-corbett-2',
      clientId: 'cli-corbett-rajae-homestay',
      customerName: 'Ananya Verma',
      customerPhone: '+91 99108 77341',
      channel: 'whatsapp-webhook',
      status: 'active',
      botPaused: false,
      lastMessageAt: hoursAgo(5),
      bookingSummary: {
        serviceOrRoom: 'Premium Spacious Room with Terrace',
        checkInOrDate: 'This Saturday (1 Night)',
        guestsOrNotes: '2 Adults · Valley/Terrace view + Bonfire',
        estimatedAmount: '₹3,200 / night',
        bookingStatus: 'inquiry',
      },
      messages: [
        {
          id: 'm-21',
          role: 'customer',
          text: 'Hi! Looking for a quiet terrace room for 2 people this Saturday. How do we reach from Kotdwar?',
          timestamp: hoursAgo(5),
        },
        {
          id: 'm-22',
          role: 'assistant',
          text: 'Namaste! Our *Premium Spacious Room with Terrace* ranges from *₹2,800 – ₹3,500 per night* and includes a private scenic balcony overlooking the foothills. We are located at Rathuadhab, Kumaldi—accessible via *Kotdwar Railway Station* or Ramnagar (please message before 5:00 PM if arriving in the evening for forest road guidance). Shall I pass your Saturday date to the host desk to confirm?',
          timestamp: hoursAgo(5),
          intent: 'booking',
          sourcesUsed: ['Directions & Nearest Transit Hubs'],
          latencyMs: 710,
        },
      ],
    },
    {
      id: 'conv-corbett-3',
      clientId: 'cli-corbett-rajae-homestay',
      customerName: 'Vikramaditya Joshi',
      customerPhone: '+91 97602 51890',
      channel: 'whatsapp-webhook',
      status: 'escalated',
      botPaused: false,
      lastMessageAt: hoursAgo(19),
      bookingSummary: {
        serviceOrRoom: 'Full Property Group Buyout (10 Guests)',
        checkInOrDate: 'Dec 12 – Dec 14',
        guestsOrNotes: '10 Adults · Corporate nature retreat + bird watching',
        estimatedAmount: 'Custom group quote',
        bookingStatus: 'inquiry',
      },
      messages: [
        {
          id: 'm-31',
          role: 'customer',
          text: 'We are a group of 10 bird watchers looking to book all rooms Dec 12-14. Can you give a group package rate?',
          timestamp: hoursAgo(19),
        },
        {
          id: 'm-32',
          role: 'assistant',
          text: 'Welcome to *The Corbett Rajae Homestay*! We love hosting bird-watching groups near Kalagarh Tiger Reserve. Because this is a *10-guest group inquiry*, I am escalating directly to our host desk (*+91 9411561965* / corbettrajaehomestay@gmail.com) for a custom multi-room package and guided birding quote.',
          timestamp: hoursAgo(19),
          intent: 'handoff',
          handoffTriggered: true,
          sourcesUsed: ['Booking Confirmation & Safari Permits'],
          latencyMs: 620,
        },
      ],
    },
  ];
}

// --- Local JSON Fallback Helpers ---
function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function ensureClientPortalAuth(client: ClientBotConfig): {
  client: ClientBotConfig;
  changed: boolean;
} {
  const userId = defaultUserIdForClient(client);
  const existingHash = client.portalAuth?.passwordHash;
  if (client.portalAuth?.userId === userId && existingHash) {
    return { client, changed: false };
  }
  const passwordHash =
    existingHash || hashPassword(defaultInitialPasswordForClient(client));
  return {
    changed: true,
    client: {
      ...client,
      portalAuth: {
        userId,
        passwordHash,
        hasPassword: true,
      },
    },
  };
}

function readLocalClients(): ClientBotConfig[] {
  try {
    ensureDataDir();
    if (!fs.existsSync(CLIENTS_FILE)) {
      const seeded = DEFAULT_CLIENTS.map((c) => ensureClientPortalAuth(structuredClone(c)).client);
      fs.writeFileSync(CLIENTS_FILE, JSON.stringify(seeded, null, 2), 'utf-8');
      return seeded;
    }
    const raw = fs.readFileSync(CLIENTS_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as ClientBotConfig[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const seeded = DEFAULT_CLIENTS.map((c) => ensureClientPortalAuth(structuredClone(c)).client);
      fs.writeFileSync(CLIENTS_FILE, JSON.stringify(seeded, null, 2), 'utf-8');
      return seeded;
    }
    const corbett = DEFAULT_CLIENTS.find((c) => c.id === 'cli-corbett-rajae-homestay');
    let changed = false;
    let normalized = parsed.map((client) => {
      const matchingDefault = DEFAULT_CLIENTS.find((d) => d.id === client.id);
      let updatedClient = client;
      if (!Array.isArray(client.knowledgeBase)) {
        changed = true;
        updatedClient = {
          ...updatedClient,
          knowledgeBase: matchingDefault ? structuredClone(matchingDefault.knowledgeBase) : [],
        };
      }
      if (!updatedClient.chatPreferences && matchingDefault?.chatPreferences) {
        changed = true;
        updatedClient = {
          ...updatedClient,
          chatPreferences: structuredClone(matchingDefault.chatPreferences),
        };
      }
      const authRes = ensureClientPortalAuth(updatedClient);
      if (authRes.changed) {
        changed = true;
        updatedClient = authRes.client;
      }
      return updatedClient;
    });
    if (corbett && !normalized.some((c) => c.id === corbett.id)) {
      normalized = [ensureClientPortalAuth(structuredClone(corbett)).client, ...normalized];
      changed = true;
    }
    if (changed) {
      fs.writeFileSync(CLIENTS_FILE, JSON.stringify(normalized, null, 2), 'utf-8');
    }
    return normalized;
  } catch (error) {
    console.error('Failed reading local clients store:', error);
    return DEFAULT_CLIENTS.map((c) => ensureClientPortalAuth(structuredClone(c)).client);
  }
}

function writeLocalClients(clients: ClientBotConfig[]): void {
  ensureDataDir();
  fs.writeFileSync(CLIENTS_FILE, JSON.stringify(clients, null, 2), 'utf-8');
}

function readLocalConversations(): ConversationThread[] {
  try {
    ensureDataDir();
    if (!fs.existsSync(CONVERSATIONS_FILE)) {
      const starter = buildStarterConversations();
      fs.writeFileSync(CONVERSATIONS_FILE, JSON.stringify(starter, null, 2), 'utf-8');
      return starter;
    }
    const raw = fs.readFileSync(CONVERSATIONS_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as ConversationThread[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed reading local conversations store:', error);
    return buildStarterConversations();
  }
}

function writeLocalConversations(threads: ConversationThread[]): void {
  ensureDataDir();
  fs.writeFileSync(CONVERSATIONS_FILE, JSON.stringify(threads, null, 2), 'utf-8');
}

// --- Public Async Store API (Supabase when configured, local JSON otherwise) ---
export async function listClients(): Promise<ClientBotConfig[]> {
  const sb = getSupabase();
  if (!sb) return readLocalClients();

  const { data, error } = await sb
    .from('clients')
    .select('data')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Supabase listClients error:', error);
    if (error.code === '42P01' || error.code === 'PGRST205') {
      throw new Error('Supabase tables not found. Run supabase/schema.sql in your Supabase SQL Editor.');
    }
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    const seeded = DEFAULT_CLIENTS.map((c) => ensureClientPortalAuth(structuredClone(c)).client);
    const rows = seeded.map((c) => ({
      id: c.id,
      slug: c.slug,
      whatsapp_phone_number_id: c.whatsappPhoneNumberId,
      data: c,
      updated_at: c.updatedAt,
    }));
    const { error: seedErr } = await sb.from('clients').upsert(rows, { onConflict: 'id' });
    // 23505 = another cold start already seeded the row; harmless.
    if (seedErr && seedErr.code !== '23505') console.error('Supabase seed clients error:', seedErr);
    return seeded;
  }

  const normalizedRows: ClientBotConfig[] = [];
  const toUpdate: ClientBotConfig[] = [];
  for (const row of data) {
    const rawClient = row.data as ClientBotConfig;
    const authRes = ensureClientPortalAuth(rawClient);
    normalizedRows.push(authRes.client);
    if (authRes.changed) {
      toUpdate.push(authRes.client);
    }
  }
  if (toUpdate.length > 0) {
    await sb.from('clients').upsert(
      toUpdate.map((c) => ({
        id: c.id,
        slug: c.slug,
        whatsapp_phone_number_id: c.whatsappPhoneNumberId,
        data: c,
        updated_at: c.updatedAt,
      })),
      { onConflict: 'id' },
    );
  }

  return normalizedRows;
}

export async function getClientById(id: string): Promise<ClientBotConfig | undefined> {
  const clients = await listClients();
  return clients.find((c) => c.id === id);
}

export async function getClientBySlugOrPhoneId(
  slugOrId: string,
): Promise<ClientBotConfig | undefined> {
  const clients = await listClients();
  return clients.find(
    (c) =>
      c.slug === slugOrId ||
      c.id === slugOrId ||
      c.whatsappPhoneNumberId === slugOrId,
  );
}

export async function createClient(
  client: ClientBotConfig,
  plainPassword?: string,
): Promise<ClientBotConfig> {
  const userId = defaultUserIdForClient(client);
  const allClients = await listClients();
  if (allClients.some((c) => defaultUserIdForClient(c) === userId)) {
    throw new Error(`Login User ID "${userId}" is already assigned to another client.`);
  }

  const passwordHash = hashPassword(
    plainPassword?.trim() || defaultInitialPasswordForClient(client),
  );
  const prepared: ClientBotConfig = {
    ...client,
    portalAuth: {
      userId,
      passwordHash,
      hasPassword: true,
    },
  };

  const sb = getSupabase();
  if (!sb) {
    writeLocalClients([prepared, ...allClients]);
    return prepared;
  }

  const { error } = await sb.from('clients').insert({
    id: prepared.id,
    slug: prepared.slug,
    whatsapp_phone_number_id: prepared.whatsappPhoneNumberId,
    data: prepared,
    updated_at: prepared.updatedAt,
  });
  if (error) throw new Error(error.message);
  return prepared;
}

export async function updateClient(
  id: string,
  patch: Partial<ClientBotConfig>,
  newPassword?: string,
): Promise<ClientBotConfig | null> {
  const allClients = await listClients();
  const existing = allClients.find((c) => c.id === id);
  if (!existing) return null;

  const nextUserId =
    patch.portalAuth?.userId?.trim().toLowerCase() ||
    existing.portalAuth?.userId ||
    defaultUserIdForClient(existing);

  if (allClients.some((c) => c.id !== id && defaultUserIdForClient(c) === nextUserId)) {
    throw new Error(`Login User ID "${nextUserId}" is already assigned to another client.`);
  }

  const nextPasswordHash = newPassword?.trim()
    ? hashPassword(newPassword.trim())
    : existing.portalAuth?.passwordHash ||
      hashPassword(defaultInitialPasswordForClient(existing));

  const updated: ClientBotConfig = {
    ...existing,
    ...patch,
    id: existing.id,
    portalAuth: {
      userId: nextUserId,
      passwordHash: nextPasswordHash,
      hasPassword: true,
    },
    updatedAt: new Date().toISOString(),
  };

  const sb = getSupabase();
  if (!sb) {
    const index = allClients.findIndex((c) => c.id === id);
    if (index === -1) return null;
    allClients[index] = updated;
    writeLocalClients(allClients);
    return updated;
  }

  const { error } = await sb
    .from('clients')
    .update({
      slug: updated.slug,
      whatsapp_phone_number_id: updated.whatsappPhoneNumberId,
      data: updated,
      updated_at: updated.updatedAt,
    })
    .eq('id', id);

  if (error) throw new Error(error.message);
  return updated;
}

export async function authenticateClientPortal(
  userId: string,
  password: string,
  clientSlug?: string,
): Promise<ClientBotConfig | null> {
  const normalizedUser = userId.trim().toLowerCase();
  if (!normalizedUser || !password) return null;
  const clients = await listClients();

  const match = clients.find((c) => {
    const matchesUser = defaultUserIdForClient(c) === normalizedUser;
    if (!matchesUser) return false;
    if (clientSlug && c.slug !== clientSlug && c.id !== clientSlug) return false;
    return true;
  });

  if (!match?.portalAuth?.passwordHash) return null;
  if (!verifyPassword(password, match.portalAuth.passwordHash)) {
    return null;
  }
  return match;
}

export async function deleteClient(id: string): Promise<boolean> {
  const clients = await listClients();
  if (clients.length <= 1 || !clients.some((c) => c.id === id)) return false;

  const sb = getSupabase();
  if (!sb) {
    writeLocalClients(clients.filter((c) => c.id !== id));
    return true;
  }

  const { error } = await sb.from('clients').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return true;
}

export async function listConversations(clientId?: string): Promise<ConversationThread[]> {
  const sb = getSupabase();
  if (!sb) {
    const all = readLocalConversations();
    const filtered = clientId ? all.filter((c) => c.clientId === clientId) : all;
    return [...filtered].sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
  }

  let query = sb
    .from('conversations')
    .select('data')
    .order('last_message_at', { ascending: false });

  if (clientId) {
    query = query.eq('client_id', clientId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  if (!data || data.length === 0) {
    const checkAll = await sb.from('conversations').select('id').limit(1);
    if (!checkAll.error && (!checkAll.data || checkAll.data.length === 0)) {
      const starter = buildStarterConversations();
      await sb.from('conversations').upsert(
        starter.map((t) => ({
          id: t.id,
          client_id: t.clientId,
          customer_phone: t.customerPhone,
          status: t.status,
          bot_paused: t.botPaused,
          last_message_at: t.lastMessageAt,
          data: t,
        })),
        { onConflict: 'id' },
      );
      return clientId ? starter.filter((c) => c.clientId === clientId) : starter;
    }
    return [];
  }

  return data.map((row) => row.data as ConversationThread);
}

export async function getConversationById(id: string): Promise<ConversationThread | undefined> {
  const sb = getSupabase();
  if (!sb) {
    return readLocalConversations().find((c) => c.id === id);
  }

  const { data, error } = await sb
    .from('conversations')
    .select('data')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data?.data as ConversationThread | undefined) ?? undefined;
}

export async function getConversationByCustomer(
  clientId: string,
  customerPhone: string,
): Promise<ConversationThread | undefined> {
  const sb = getSupabase();
  if (!sb) {
    return readLocalConversations().find(
      (c) => c.clientId === clientId && c.customerPhone === customerPhone,
    );
  }

  const { data, error } = await sb
    .from('conversations')
    .select('data')
    .eq('client_id', clientId)
    .eq('customer_phone', customerPhone)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data?.data as ConversationThread | undefined) ?? undefined;
}

async function saveConversationRow(thread: ConversationThread): Promise<void> {
  const sb = getSupabase();
  if (!sb) {
    const threads = readLocalConversations();
    const idx = threads.findIndex((t) => t.id === thread.id);
    if (idx === -1) {
      writeLocalConversations([thread, ...threads]);
    } else {
      threads[idx] = thread;
      writeLocalConversations(threads);
    }
    return;
  }

  const { error } = await sb.from('conversations').upsert(
    {
      id: thread.id,
      client_id: thread.clientId,
      customer_phone: thread.customerPhone,
      status: thread.status,
      bot_paused: thread.botPaused,
      last_message_at: thread.lastMessageAt,
      data: thread,
    },
    { onConflict: 'id' },
  );
  if (error) throw new Error(error.message);
}

export async function recordConversationExchange(params: {
  clientId: string;
  customerPhone: string;
  customerName?: string;
  channel: 'whatsapp-webhook' | 'simulator';
  incomingText: string;
  replyText?: string;
  intent?: string;
  handoffTriggered?: boolean;
  sourcesUsed?: string[];
  latencyMs?: number;
  detectedServiceOrRoom?: string;
  detectedDate?: string;
  detectedGuestCount?: string;
}): Promise<ConversationThread> {
  const existing = await getConversationByCustomer(params.clientId, params.customerPhone);
  const nowIso = new Date().toISOString();

  const newMessages: ChatMessageRecord[] = [
    {
      id: `msg-c-${Date.now()}`,
      role: 'customer',
      text: params.incomingText,
      timestamp: nowIso,
    },
  ];

  if (params.replyText) {
    newMessages.push({
      id: `msg-b-${Date.now() + 1}`,
      role: 'assistant',
      text: params.replyText,
      timestamp: nowIso,
      intent: params.intent,
      handoffTriggered: params.handoffTriggered,
      sourcesUsed: params.sourcesUsed,
      latencyMs: params.latencyMs,
    });
  }

  const hasBookingSignal =
    params.intent === 'booking' ||
    Boolean(params.detectedServiceOrRoom) ||
    Boolean(params.detectedDate);

  if (!existing) {
    const status: ConversationStatus = params.handoffTriggered ? 'escalated' : 'active';
    const created: ConversationThread = {
      id: `conv-${Date.now()}`,
      clientId: params.clientId,
      customerName:
        params.customerName ||
        (params.channel === 'simulator' ? 'Simulator Test Guest' : params.customerPhone),
      customerPhone: params.customerPhone,
      channel: params.channel,
      status,
      botPaused: false,
      lastMessageAt: nowIso,
      messages: newMessages,
      bookingSummary: hasBookingSignal
        ? {
            serviceOrRoom: params.detectedServiceOrRoom || 'General Inquiry',
            checkInOrDate: params.detectedDate || 'Dates pending',
            guestsOrNotes: params.detectedGuestCount || params.incomingText.slice(0, 80),
            estimatedAmount: 'TBD',
            bookingStatus: 'inquiry',
          }
        : undefined,
    };
    await saveConversationRow(created);
    return created;
  }

  const nextStatus: ConversationStatus =
    existing.status === 'booked'
      ? 'booked'
      : params.handoffTriggered
        ? 'escalated'
        : existing.status;

  let nextBooking: BookingSummary | undefined = existing.bookingSummary;
  if (hasBookingSignal) {
    nextBooking = {
      serviceOrRoom:
        params.detectedServiceOrRoom || existing.bookingSummary?.serviceOrRoom || 'General Inquiry',
      checkInOrDate:
        params.detectedDate || existing.bookingSummary?.checkInOrDate || 'Dates pending',
      guestsOrNotes:
        params.detectedGuestCount ||
        existing.bookingSummary?.guestsOrNotes ||
        params.incomingText.slice(0, 80),
      estimatedAmount: existing.bookingSummary?.estimatedAmount || 'TBD',
      bookingStatus: existing.bookingSummary?.bookingStatus || 'inquiry',
      alertSentAt: existing.bookingSummary?.alertSentAt,
      alertRecipient: existing.bookingSummary?.alertRecipient,
      hostAlertSentAt: existing.bookingSummary?.hostAlertSentAt,
    };
  }

  const updated: ConversationThread = {
    ...existing,
    status: nextStatus,
    lastMessageAt: nowIso,
    messages: [...existing.messages, ...newMessages].slice(-60),
    bookingSummary: nextBooking,
  };
  await saveConversationRow(updated);
  return updated;
}

export async function appendMessageToConversation(
  id: string,
  message: ChatMessageRecord,
  patch?: Partial<Pick<ConversationThread, 'status' | 'botPaused' | 'bookingSummary'>>,
): Promise<ConversationThread | null> {
  const existing = await getConversationById(id);
  if (!existing) return null;

  const updated: ConversationThread = {
    ...existing,
    ...patch,
    lastMessageAt: message.timestamp,
    messages: [...existing.messages, message].slice(-60),
  };
  await saveConversationRow(updated);
  return updated;
}

export async function updateConversationFields(
  id: string,
  patch: Partial<Pick<ConversationThread, 'status' | 'botPaused' | 'bookingSummary'>>,
): Promise<ConversationThread | null> {
  const existing = await getConversationById(id);
  if (!existing) return null;

  const updated: ConversationThread = {
    ...existing,
    ...patch,
  };
  await saveConversationRow(updated);
  return updated;
}

export async function buildClientReport(clientId: string): Promise<ClientReportSummary> {
  const threads = await listConversations(clientId);
  let totalMessages = 0;
  let bookingInquiries = 0;
  let confirmedBookings = 0;
  let escalations = 0;
  let alertsSent = 0;
  let latencySum = 0;
  let latencyCount = 0;

  const intentCounts = new Map<string, number>();
  const dailyMap = new Map<string, { conversations: number; bookings: number }>();

  for (const thread of threads) {
    totalMessages += thread.messages.length;
    if (thread.bookingSummary) {
      bookingInquiries += 1;
      if (thread.bookingSummary.bookingStatus === 'confirmed') {
        confirmedBookings += 1;
      }
      if (thread.bookingSummary.alertSentAt) {
        alertsSent += 1;
      }
    }
    if (thread.status === 'escalated' || thread.messages.some((m) => m.handoffTriggered)) {
      escalations += 1;
    }

    const dayKey = thread.lastMessageAt.slice(0, 10);
    const dayEntry = dailyMap.get(dayKey) || { conversations: 0, bookings: 0 };
    dayEntry.conversations += 1;
    if (thread.bookingSummary?.bookingStatus === 'confirmed') {
      dayEntry.bookings += 1;
    }
    dailyMap.set(dayKey, dayEntry);

    for (const msg of thread.messages) {
      if (msg.role === 'assistant') {
        if (msg.intent) {
          intentCounts.set(msg.intent, (intentCounts.get(msg.intent) || 0) + 1);
        }
        if (typeof msg.latencyMs === 'number' && msg.latencyMs > 0) {
          latencySum += msg.latencyMs;
          latencyCount += 1;
        }
      }
    }
  }

  const intentBreakdown = Array.from(intentCounts.entries())
    .map(([intent, count]) => ({ intent, count }))
    .sort((a, b) => b.count - a.count);

  const dailyActivity = Array.from(dailyMap.entries())
    .map(([date, vals]) => ({ date, ...vals }))
    .sort((a, b) => b.date.localeCompare(a.date));

  return {
    totalConversations: threads.length,
    totalMessages,
    bookingInquiries,
    confirmedBookings,
    escalations,
    alertsSent,
    avgLatencyMs: latencyCount > 0 ? Math.round(latencySum / latencyCount) : 0,
    intentBreakdown,
    dailyActivity,
  };
}

export async function addWebhookLog(entry: WebhookLogEntry): Promise<void> {
  const sb = getSupabase();
  if (!sb) {
    memoryWebhookLogs = [entry, ...memoryWebhookLogs].slice(0, 50);
    return;
  }

  const { error } = await sb.from('webhook_logs').insert({
    id: entry.id,
    client_id: entry.clientId,
    timestamp: entry.timestamp,
    data: entry,
  });
  if (error) console.error('Supabase addWebhookLog error:', error);
}

export async function getWebhookLogs(): Promise<WebhookLogEntry[]> {
  const sb = getSupabase();
  if (!sb) {
    return memoryWebhookLogs;
  }

  const { data, error } = await sb
    .from('webhook_logs')
    .select('data')
    .order('timestamp', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Supabase getWebhookLogs error:', error);
    return [];
  }
  return (data || []).map((row) => row.data as WebhookLogEntry);
}

export async function claimWebhookMessage(messageId: string, clientId: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) {
    throw new Error('Supabase is required for durable webhook deduplication.');
  }
  const { error } = await sb.from('webhook_receipts').insert({
    message_id: messageId,
    client_id: clientId,
  });
  if (!error) return true;
  if (error.code === '23505') return false;
  throw new Error(`Webhook receipt claim failed: ${error.message}`);
}
