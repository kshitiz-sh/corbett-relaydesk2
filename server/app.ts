import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express, { type Express, type Request, type Response } from 'express';
import JSZip from 'jszip';
import type { ClientBotConfig } from '../shared/types.ts';
import {
  addWebhookLog,
  appendMessageToConversation,
  authenticateClientPortal,
  buildClientReport,
  claimWebhookMessage,
  createClient,
  deleteClient,
  getClientById,
  getClientBySlugOrPhoneId,
  getConversationByCustomer,
  getConversationById,
  getWebhookLogs,
  listClients,
  listConversations,
  recordConversationExchange,
  updateClient,
  updateConversationFields,
} from './store.ts';
import {
  extractKnowledgeFromWebsite,
  generateBotReply,
  optimizeChatPreferencesWithAi,
  suggestHostReplyWithAi,
  type ConversationTurn,
} from './botEngine.ts';
import {
  sanitizeClientForPublic,
  signClientToken,
  verifyClientToken,
} from './auth.ts';

interface RequestWithRawBody extends Request {
  rawBody?: Buffer;
}

interface WhatsAppWebhookPayload {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{
      value?: {
        messaging_product?: string;
        metadata?: {
          display_phone_number?: string;
          phone_number_id?: string;
        };
        contacts?: Array<{
          profile?: { name?: string };
          wa_id?: string;
        }>;
        messages?: Array<{
          from?: string;
          id?: string;
          timestamp?: string;
          type?: string;
          text?: { body?: string };
          button?: { text?: string };
          interactive?: {
            button_reply?: { title?: string };
            list_reply?: { title?: string };
          };
          image?: { caption?: string };
        }>;
      };
    }>;
  }>;
}

function verifyMetaSignature(req: RequestWithRawBody): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  const sigHeader = req.header('x-hub-signature-256');
  if (!appSecret || !sigHeader) return false;
  // On Vercel the platform can pre-parse the body, so the raw bytes may be unavailable.
  // Fall back to re-serialising the parsed body (still verified against the app secret).
  const rawBody =
    req.rawBody ??
    (req.body && typeof req.body === 'object' ? Buffer.from(JSON.stringify(req.body)) : undefined);
  if (!rawBody) return false;
  const expected =
    'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
  const sigBuf = Buffer.from(sigHeader);
  const expBuf = Buffer.from(expected);
  return sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
}

function resolveWhatsAppPhoneNumberId(
  clientPhoneNumberId?: string,
  webhookMetadataPhoneId?: string,
): string {
  if (webhookMetadataPhoneId) return webhookMetadataPhoneId;
  const envPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const isPlaceholder = !clientPhoneNumberId || clientPhoneNumberId === '104829104820999';
  if (envPhoneId && isPlaceholder) return envPhoneId;
  return clientPhoneNumberId || envPhoneId || '';
}

async function sendWhatsAppCloudReply(
  phoneNumberId: string,
  recipientPhone: string,
  messageBody: string,
): Promise<{ sent: boolean; detail?: string }> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!accessToken) {
    return { sent: false, detail: 'WHATSAPP_ACCESS_TOKEN not configured; reply logged locally.' };
  }
  if (!phoneNumberId) {
    return { sent: false, detail: 'WHATSAPP_PHONE_NUMBER_ID is missing.' };
  }

  const normalizedTo = recipientPhone.replace(/[^\d]/g, '');
  if (!normalizedTo) {
    return { sent: false, detail: 'Recipient phone number has no valid digits.' };
  }

  const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: normalizedTo,
      type: 'text',
      text: { body: messageBody },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return { sent: false, detail: `Graph API error (${response.status}): ${errorText}` };
  }

  return { sent: true };
}

async function sendWhatsAppCloudImage(
  phoneNumberId: string,
  recipientPhone: string,
  imageUrl: string,
  caption?: string,
): Promise<boolean> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const normalizedTo = recipientPhone.replace(/[^\d]/g, '');
  if (!accessToken || !phoneNumberId || !normalizedTo || !/^https:\/\//i.test(imageUrl)) return false;
  try {
    const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: normalizedTo,
        type: 'image',
        image: { link: imageUrl, ...(caption ? { caption: caption.slice(0, 1000) } : {}) },
      }),
    });
    if (!response.ok) console.error('WhatsApp image send failed:', response.status, (await response.text()).slice(0, 300));
    return response.ok;
  } catch (error) {
    console.error('WhatsApp image send error:', error);
    return false;
  }
}

export function createApiApp(): Express {
  if (process.env.NODE_ENV === 'production') {
    const required = [
      'GEMINI_API_KEY',
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'SESSION_SECRET',
      'ADMIN_ACCESS_TOKEN',
      'WHATSAPP_ACCESS_TOKEN',
      'WHATSAPP_PHONE_NUMBER_ID',
      'WHATSAPP_VERIFY_TOKEN',
      'WHATSAPP_APP_SECRET',
      'INITIAL_CLIENT_PASSWORD',
    ];
    const missing = required.filter((name) => !process.env[name]?.trim());
    if (missing.length) throw new Error(`Missing production environment variables: ${missing.join(', ')}`);
    if ((process.env.SESSION_SECRET || '').length < 32) throw new Error('SESSION_SECRET must be at least 32 characters.');
    if ((process.env.ADMIN_ACCESS_TOKEN || '').length < 32) throw new Error('ADMIN_ACCESS_TOKEN must be at least 32 characters.');
  }
  const app = express();

  app.use((req, _res, next) => {
    if (req.body !== undefined && typeof req.body === 'object') {
      (req as Request & { _body?: boolean })._body = true;
    }
    next();
  });

  app.use(
    express.json({
      limit: '1mb',
      verify: (req, _res, buf) => {
        (req as RequestWithRawBody).rawBody = buf;
      },
    }),
  );

  const loginAttempts = new Map<string, { count: number; resetAt: number }>();
  const rateLimit = (req: Request, res: Response, limit: number, windowMs: number): boolean => {
    const now = Date.now();
    const ip = req.ip || req.header('x-forwarded-for') || 'unknown';
    const current = loginAttempts.get(ip);
    if (!current || current.resetAt <= now) {
      loginAttempts.set(ip, { count: 1, resetAt: now + windowMs });
      return true;
    }
    current.count += 1;
    if (current.count > limit) {
      res.status(429).json({ error: 'Too many requests. Try again later.' });
      return false;
    }
    return true;
  };

  const extractToken = (req: Request): string => {
    const authHeader = req.header('authorization');
    if (authHeader?.toLowerCase().startsWith('bearer ')) return authHeader.slice(7).trim();
    const cookieHeader = req.header('cookie') || '';
    const found = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith('relaydesk_client_session='));
    return found ? decodeURIComponent(found.split('=')[1] || '') : '';
  };

  const isAdmin = (req: Request): boolean => {
    const configured = process.env.ADMIN_ACCESS_TOKEN?.trim();
    const provided = req.header('x-relaydesk-admin-token') || (req.header('authorization')?.toLowerCase().startsWith('bearer ') ? req.header('authorization')!.slice(7).trim() : '');
    if (!configured || !provided || configured.length !== provided.length) return false;
    return crypto.timingSafeEqual(Buffer.from(configured), Buffer.from(provided));
  };

  const getSession = (req: Request) => {
    try { return verifyClientToken(extractToken(req)); } catch { return null; }
  };

  const requireAdmin = (req: Request, res: Response): boolean => {
    if (isAdmin(req)) return true;
    res.status(401).json({ error: 'Admin authentication required.' });
    return false;
  };

  const requireClientAccess = (req: Request, res: Response, clientId: string): boolean => {
    if (isAdmin(req)) return true;
    const session = getSession(req);
    if (session?.clientId === clientId) return true;
    res.status(403).json({ error: 'You are not authorized to access this client.' });
    return false;
  };

  const publicClientSummary = (client: ClientBotConfig) => ({
    id: client.id,
    slug: client.slug,
    businessName: client.businessName,
    tagline: client.tagline,
    portalAuth: { userId: client.portalAuth?.userId || client.slug, hasPassword: Boolean(client.portalAuth?.hasPassword) },
  });

  // --- Health & Readiness Check ---
  app.get('/api/health', async (_req, res) => {
    const supabaseConfigured = Boolean(
      process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
    );
    let databaseReady = true;
    let databaseError: string | undefined;
    try {
      await listClients();
    } catch (err) {
      databaseReady = false;
      databaseError = err instanceof Error ? err.message : 'Database connection error';
    }

    res.json({
      ok: databaseReady && Boolean(process.env.GEMINI_API_KEY),
      storage: supabaseConfigured ? 'supabase' : 'local-json',
      databaseReady,
      ...(databaseError ? { databaseError } : {}),
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
      whatsappTokenConfigured: Boolean(process.env.WHATSAPP_ACCESS_TOKEN),
      whatsappPhoneIdConfigured: Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID),
      whatsappVerifyTokenConfigured: Boolean(process.env.WHATSAPP_VERIFY_TOKEN),
    });
  });

  // --- Client Portal Login & Session Endpoints ---
  app.post('/api/auth/client-login', async (req, res) => {
    try {
      if (!rateLimit(req, res, 10, 15 * 60 * 1000)) return;
      const { userId, password, clientSlug } = req.body as {
        userId?: string;
        password?: string;
        clientSlug?: string;
      };
      if (!userId?.trim() || !password) {
        res.status(400).json({ error: 'User ID and password are required.' });
        return;
      }

      const client = await authenticateClientPortal(userId, password, clientSlug);
      if (!client) {
        res.status(401).json({ error: 'Invalid User ID or password.' });
        return;
      }

      const token = signClientToken(client.id, client.portalAuth?.userId || userId.trim());
      res.setHeader(
        'Set-Cookie',
        `relaydesk_client_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=${process.env.NODE_ENV === 'production' ? 'None; Secure' : 'Lax'}; Max-Age=${7 * 24 * 60 * 60}`,
      );
      res.json({
        token,
        client: sanitizeClientForPublic(client),
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Login failed.',
      });
    }
  });

  app.get('/api/auth/me', async (req, res) => {
    try {
      const token = extractToken(req);
      const session = verifyClientToken(token);
      if (!session) {
        res.status(401).json({ error: 'Not authenticated.' });
        return;
      }
      const client = await getClientById(session.clientId);
      if (!client) {
        res.status(401).json({ error: 'Client account no longer exists.' });
        return;
      }
      res.json({ authenticated: true, client: sanitizeClientForPublic(client) });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Session verification failed.',
      });
    }
  });

  app.post('/api/auth/logout', (_req, res) => {
    res.setHeader(
      'Set-Cookie',
      'relaydesk_client_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
    );
    res.json({ ok: true });
  });

  // --- Client Config CRUD API ---
  app.get('/api/clients', async (req, res) => {
    try {
      const clients = await listClients();
      res.json({ clients: isAdmin(req) ? clients.map(sanitizeClientForPublic) : clients.map(publicClientSummary) });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to list clients.',
      });
    }
  });

  app.post('/api/clients', async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const body = req.body as Partial<ClientBotConfig> & {
        portalUserId?: string;
        portalPassword?: string;
      };
      if (!body.businessName?.trim()) {
        res.status(400).json({ error: 'Business name is required.' });
        return;
      }
      const baseSlug = (body.slug || body.businessName)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      const slug = `${baseSlug || 'client-bot'}-${Math.floor(100 + Math.random() * 900)}`;
      const portalUserId = (
        body.portalUserId ||
        body.portalAuth?.userId ||
        baseSlug ||
        slug
      )
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, '-');

      const created = await createClient(
        {
          id: `cli-${Date.now()}`,
          slug,
          businessName: body.businessName.trim(),
          industry: body.industry || 'Custom Business',
          tagline: body.tagline || 'Customer support & appointment concierge',
          location: body.location || '',
          website: body.website || '',
          agentName: body.agentName || 'Alex',
          tone: body.tone || 'warm',
          primaryLanguage: body.primaryLanguage || 'English',
          operatingHours: body.operatingHours || 'Mon–Fri 9:00 AM – 6:00 PM',
          greetingMessage:
            body.greetingMessage ||
            `Hello! Welcome to *${body.businessName.trim()}*. How can I help you today?`,
          fallbackMessage:
            body.fallbackMessage ||
            'Let me connect you with a member of our team so we can assist you directly.',
          services: Array.isArray(body.services) ? body.services : [],
          faqs: Array.isArray(body.faqs) ? body.faqs : [],
          knowledgeBase: Array.isArray(body.knowledgeBase) ? body.knowledgeBase : [],
          ...(body.chatPreferences ? { chatPreferences: body.chatPreferences } : {}),
          portalAuth: { userId: portalUserId },
          escalationTriggers:
            body.escalationTriggers || 'Complaints, refund requests, or requests for a human agent.',
          escalationContactName: body.escalationContactName || 'Support Desk',
          escalationContactPhone: body.escalationContactPhone || '+1 (555) 010-0000',
          escalationContactEmail: body.escalationContactEmail || 'support@example.com',
          bookingInstructions:
            body.bookingInstructions || 'Collect full name, contact info, and preferred date/time.',
          whatsappPhoneNumberId:
            body.whatsappPhoneNumberId ||
            String(Math.floor(100000000000000 + Math.random() * 899999999999999)),
          whatsappVerifyToken: body.whatsappVerifyToken || `${baseSlug || 'client'}_verify_token`,
          samplePrompts:
            Array.isArray(body.samplePrompts) && body.samplePrompts.length > 0
              ? body.samplePrompts
              : [
                  'What are your hours?',
                  'What services and pricing do you offer?',
                  'I would like to speak with someone.',
                ],
          isBuiltInTemplate: false,
          updatedAt: new Date().toISOString(),
        },
        body.portalPassword,
      );

      res.status(201).json({ client: sanitizeClientForPublic(created) });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to create client bot.',
      });
    }
  });

  app.put('/api/clients/:id', async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const body = req.body as Partial<ClientBotConfig> & { newPortalPassword?: string };
      const { newPortalPassword, ...patch } = body;
      const updated = await updateClient(req.params.id, patch, newPortalPassword);
      if (!updated) {
        res.status(404).json({ error: 'Client configuration not found.' });
        return;
      }
      res.json({ client: sanitizeClientForPublic(updated) });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to update client configuration.',
      });
    }
  });

  app.delete('/api/clients/:id', async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const deleted = await deleteClient(req.params.id);
      if (!deleted) {
        res
          .status(400)
          .json({ error: 'Cannot delete the last remaining client or client not found.' });
        return;
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to delete client.',
      });
    }
  });

  // --- Knowledge Base Website Importer ---
  app.post('/api/knowledge/import-url', async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const { url, businessName } = req.body as { url?: string; businessName?: string };
      if (!url?.trim()) {
        res.status(400).json({ error: 'Website URL is required.' });
        return;
      }
      const entries = await extractKnowledgeFromWebsite(url, businessName || 'this business');
      res.json({ entries });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to import website knowledge.',
      });
    }
  });

  // --- AI Chat Optimization Suggestion Engine ---
  app.post('/api/clients/:id/optimize-preferences', async (req, res) => {
    if (!requireClientAccess(req, res, req.params.id)) return;
    try {
      const { clientConfig, suggestion } = req.body as {
        clientConfig?: ClientBotConfig;
        suggestion?: string;
      };
      const resolvedClient = clientConfig || (await getClientById(req.params.id));
      if (!resolvedClient) {
        res.status(404).json({ error: 'Client configuration not found.' });
        return;
      }
      const optimized = await optimizeChatPreferencesWithAi(resolvedClient, suggestion || '');
      res.json(optimized);
    } catch (error) {
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to optimize AI chat preferences.',
      });
    }
  });

  // --- Client Dashboard: Conversations, Booking Confirmation Alerts & Reporting ---
  app.get('/api/conversations', async (req, res) => {
    try {
      const clientId = typeof req.query.clientId === 'string' ? req.query.clientId : undefined;
      if (!clientId || !requireClientAccess(req, res, clientId)) return;
      const conversations = await listConversations(clientId);
      res.json({ conversations });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to list conversations.',
      });
    }
  });

  app.get('/api/reports/:clientId', async (req, res) => {
    if (!requireClientAccess(req, res, req.params.clientId)) return;
    try {
      const report = await buildClientReport(req.params.clientId);
      res.json({ report });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to generate client report.',
      });
    }
  });

  app.patch('/api/conversations/:id', async (req, res) => {
    try {
      const existing = await getConversationById(req.params.id);
      if (!existing) {
        res.status(404).json({ error: 'Conversation not found.' });
        return;
      }
      if (!requireClientAccess(req, res, existing.clientId)) return;
      const body = req.body as {
        botPaused?: boolean;
        status?: 'active' | 'escalated' | 'booked' | 'resolved';
      };
      const updated = await updateConversationFields(req.params.id, {
        ...(typeof body.botPaused === 'boolean' ? { botPaused: body.botPaused } : {}),
        ...(body.status ? { status: body.status } : {}),
      });
      if (!updated) {
        res.status(404).json({ error: 'Conversation not found.' });
        return;
      }
      res.json({ conversation: updated });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to update conversation.',
      });
    }
  });

  app.post('/api/conversations/:id/host-reply', async (req, res) => {
    try {
      const { text } = req.body as { text?: string };
      if (!text?.trim()) {
        res.status(400).json({ error: 'Reply text is required.' });
        return;
      }
      const existing = await getConversationById(req.params.id);
      if (!existing) {
        res.status(404).json({ error: 'Conversation not found.' });
        return;
      }
      if (!requireClientAccess(req, res, existing.clientId)) return;
      const client = await getClientById(existing.clientId);
      const delivery = client
        ? await sendWhatsAppCloudReply(
            resolveWhatsAppPhoneNumberId(client.whatsappPhoneNumberId),
            existing.customerPhone,
            text.trim(),
          )
        : { sent: false, detail: 'Client config missing.' };

      const updated = await appendMessageToConversation(existing.id, {
        id: `msg-host-${Date.now()}`,
        role: 'host',
        text: text.trim(),
        timestamp: new Date().toISOString(),
        deliveryStatus: delivery.sent
          ? 'graph-api-sent'
          : process.env.WHATSAPP_ACCESS_TOKEN
            ? 'failed'
            : 'simulated',
      });

      res.json({ conversation: updated, delivery });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to send host reply.',
      });
    }
  });

  app.post('/api/conversations/:id/suggest-reply', async (req, res) => {
    try {
      const { hint } = req.body as { hint?: string };
      const existing = await getConversationById(req.params.id);
      if (!existing) {
        res.status(404).json({ error: 'Conversation not found.' });
        return;
      }
      if (!requireClientAccess(req, res, existing.clientId)) return;
      const client = await getClientById(existing.clientId);
      if (!client) {
        res.status(404).json({ error: 'Client configuration not found.' });
        return;
      }
      const suggestions = await suggestHostReplyWithAi(client, existing, hint);
      res.json({ suggestions });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to generate AI reply suggestions.',
      });
    }
  });

  app.post('/api/conversations/:id/confirm-booking', async (req, res) => {
    try {
      const {
        serviceOrRoom,
        checkInOrDate,
        guestsOrNotes,
        estimatedAmount,
        customAlertNote,
        notifyHost,
      } = req.body as {
        serviceOrRoom?: string;
        checkInOrDate?: string;
        guestsOrNotes?: string;
        estimatedAmount?: string;
        customAlertNote?: string;
        notifyHost?: boolean;
      };

      const existing = await getConversationById(req.params.id);
      if (!existing) {
        res.status(404).json({ error: 'Conversation not found.' });
        return;
      }
      if (!requireClientAccess(req, res, existing.clientId)) return;

      const client = await getClientById(existing.clientId);
      if (!client) {
        res.status(404).json({ error: 'Client bot configuration not found.' });
        return;
      }

      const roomText =
        serviceOrRoom?.trim() || existing.bookingSummary?.serviceOrRoom || 'Stay / Service';
      const dateText =
        checkInOrDate?.trim() || existing.bookingSummary?.checkInOrDate || 'Confirmed dates';
      const guestsText =
        guestsOrNotes?.trim() || existing.bookingSummary?.guestsOrNotes || 'Confirmed';
      const amountText =
        estimatedAmount?.trim() || existing.bookingSummary?.estimatedAmount || 'Confirmed rate';

      const guestAlertText = [
        `Booking Confirmed — *${client.businessName}*`,
        `Guest: ${existing.customerName}`,
        `Booking: ${roomText}`,
        `Dates / Slot: ${dateText}`,
        `Details: ${guestsText}`,
        `Tariff / Estimate: ${amountText}`,
        customAlertNote?.trim() ? `Note: ${customAlertNote.trim()}` : '',
        `Host Desk: ${client.escalationContactPhone} · ${client.location || client.website}`,
      ]
        .filter(Boolean)
        .join('\n');

      const resolvedPhoneId = resolveWhatsAppPhoneNumberId(client.whatsappPhoneNumberId);
      const guestDelivery = await sendWhatsAppCloudReply(
        resolvedPhoneId,
        existing.customerPhone,
        guestAlertText,
      );

      let hostDelivery: { sent: boolean; detail?: string } | null = null;
      if (notifyHost && client.escalationContactPhone) {
        const hostAlertText = `New Confirmed Booking Alert (${client.businessName})\nGuest: ${existing.customerName} (${existing.customerPhone})\nBooking: ${roomText}\nDates: ${dateText}\nDetails: ${guestsText}\nEstimate: ${amountText}`;
        hostDelivery = await sendWhatsAppCloudReply(
          resolvedPhoneId,
          client.escalationContactPhone,
          hostAlertText,
        );
      }

      const nowIso = new Date().toISOString();
      const updated = await appendMessageToConversation(
        existing.id,
        {
          id: `msg-alert-${Date.now()}`,
          role: 'alert',
          text: guestAlertText,
          timestamp: nowIso,
          deliveryStatus: guestDelivery.sent
            ? 'graph-api-sent'
            : process.env.WHATSAPP_ACCESS_TOKEN
              ? 'failed'
              : 'simulated',
        },
        {
          status: 'booked',
          bookingSummary: {
            serviceOrRoom: roomText,
            checkInOrDate: dateText,
            guestsOrNotes: guestsText,
            estimatedAmount: amountText,
            bookingStatus: 'confirmed',
            alertSentAt: nowIso,
            alertRecipient: existing.customerPhone,
            ...(notifyHost ? { hostAlertSentAt: nowIso } : {}),
          },
        },
      );

      res.json({
        conversation: updated,
        guestDelivery,
        hostDelivery,
      });
    } catch (error) {
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to confirm booking and send alert.',
      });
    }
  });

  // --- Live WhatsApp Simulator Endpoint ---
  app.post('/api/simulate', async (req, res) => {
    try {
      const { clientId, clientConfig, message, history, sessionPhone } = req.body as {
        clientId?: string;
        clientConfig?: ClientBotConfig;
        message?: string;
        history?: ConversationTurn[];
        sessionPhone?: string;
      };

      if (!message?.trim()) {
        res.status(400).json({ error: 'Message text is required.' });
        return;
      }

      const resolvedClient =
        clientConfig || (clientId ? await getClientById(clientId) : undefined);
      if (!resolvedClient) {
        res.status(404).json({ error: 'Client bot configuration not found.' });
        return;
      }
      if (!requireClientAccess(req, res, resolvedClient.id)) return;

      const result = await generateBotReply(resolvedClient, message.trim(), history || []);

      if (sessionPhone) {
        await recordConversationExchange({
          clientId: resolvedClient.id,
          customerPhone: sessionPhone,
          customerName: 'Simulator Test Guest',
          channel: 'simulator',
          incomingText: message.trim(),
          replyText: result.reply,
          intent: result.intent,
          handoffTriggered: result.handoffTriggered,
          sourcesUsed: result.sourcesUsed,
          latencyMs: result.latencyMs,
          detectedServiceOrRoom: result.detectedServiceOrRoom,
          detectedDate: result.detectedDate,
          detectedGuestCount: result.detectedGuestCount,
        });
      }

      res.json(result);
    } catch (error) {
      console.error('Simulation error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to generate WhatsApp reply.',
      });
    }
  });

  // --- Real Meta WhatsApp Cloud API Webhook Verification ---
  const handleWebhookVerify = async (req: Request, res: Response) => {
    try {
      const mode = req.query['hub.mode'];
      const token = typeof req.query['hub.verify_token'] === 'string' ? req.query['hub.verify_token'].trim() : '';
      const challenge = req.query['hub.challenge'];
      const slug = req.params.slug;

      const client = slug ? await getClientBySlugOrPhoneId(slug) : undefined;
      const validTokens = [
        client?.whatsappVerifyToken,
        process.env.WHATSAPP_VERIFY_TOKEN,
      ]
        .map((t) => (typeof t === 'string' ? t.trim() : ''))
        .filter(Boolean);

      if (mode === 'subscribe' && token && validTokens.includes(token)) {
        res.status(200).send(String(challenge ?? ''));
        return;
      }
      res.status(403).json({ error: 'Webhook verification failed: invalid verify token.' });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Webhook verification error.',
      });
    }
  };

  app.get('/api/webhook', handleWebhookVerify);
  app.get('/api/webhook/:slug', handleWebhookVerify);

  // --- Real Meta WhatsApp Cloud API Incoming Message Webhook ---
  const handleWebhookIncoming = async (req: Request, res: Response) => {
    try {
      if (!verifyMetaSignature(req as RequestWithRawBody)) {
        res.status(401).json({ error: 'Invalid Meta X-Hub-Signature-256.' });
        return;
      }

      const payload = req.body as WhatsAppWebhookPayload;
      const change = payload.entry?.[0]?.changes?.[0]?.value;
      const incomingMsg = change?.messages?.[0];
      const metadataPhoneId = change?.metadata?.phone_number_id;

      const incomingText =
        incomingMsg?.text?.body ||
        incomingMsg?.button?.text ||
        incomingMsg?.interactive?.button_reply?.title ||
        incomingMsg?.interactive?.list_reply?.title ||
        incomingMsg?.image?.caption;

      if (!incomingText?.trim()) {
        res.status(200).json({
          status: 'ignored',
          reason: 'No text, button, interactive reply, or caption in webhook payload.',
        });
        return;
      }

      const slugParam = req.params.slug;
      const client =
        (slugParam ? await getClientBySlugOrPhoneId(slugParam) : undefined) ||
        (metadataPhoneId ? await getClientBySlugOrPhoneId(metadataPhoneId) : undefined) ||
        (await listClients())[0];

      if (!client) {
        res.status(404).json({ error: 'No matching client bot found for webhook.' });
        return;
      }
      if (!incomingMsg?.id) {
        res.status(400).json({ error: 'Webhook message id is required.' });
        return;
      }
      const senderPhone = incomingMsg.from || '+15550199999';
      const senderName = change?.contacts?.[0]?.profile?.name;
      // Run the duplicate check and the thread lookup at the same time (saves a database round trip).
      const [claimed, existingThread] = await Promise.all([
        claimWebhookMessage(incomingMsg.id, client.id),
        getConversationByCustomer(client.id, senderPhone),
      ]);
      if (!claimed) {
        res.status(200).json({ status: 'deduplicated', messageId: incomingMsg.id });
        return;
      }

      if (existingThread?.botPaused) {
        await recordConversationExchange({
          clientId: client.id,
          customerPhone: senderPhone,
          customerName: senderName,
          channel: 'whatsapp-webhook',
          incomingText: incomingText.trim(),
        });
        res.status(200).json({
          status: 'bot_paused_logged',
          client: { id: client.id, slug: client.slug, businessName: client.businessName },
          reason: 'Bot is paused on this conversation; message logged for human host.',
        });
        return;
      }

      // Build multi-turn memory directly from persisted thread (works across serverless cold starts)
      const history: ConversationTurn[] = (existingThread?.messages || [])
        .filter(
          (m): m is typeof m & { role: 'customer' | 'assistant' } =>
            m.role === 'customer' || m.role === 'assistant',
        )
        .slice(-10)
        .map((m) => ({ role: m.role, text: m.text }));

      const aiResult = await generateBotReply(client, incomingText.trim(), history);

      const resolvedPhoneNumberId = resolveWhatsAppPhoneNumberId(
        client.whatsappPhoneNumberId,
        metadataPhoneId,
      );
      const delivery = await sendWhatsAppCloudReply(
        resolvedPhoneNumberId,
        senderPhone,
        aiResult.reply,
      );

      // Send room photos (after the text reply) when the guest asked about rooms.
      if (delivery.sent && aiResult.sendRoomPhotos && client.roomImages?.length) {
        for (const image of client.roomImages.slice(0, 4)) {
          await sendWhatsAppCloudImage(resolvedPhoneNumberId, senderPhone, image.url, image.caption);
        }
      }

      if (delivery.sent && aiResult.sendPropertyPhotos && !aiResult.sendRoomPhotos && client.propertyImages?.length) {
        for (const image of client.propertyImages.slice(0, 6)) {
          await sendWhatsAppCloudImage(resolvedPhoneNumberId, senderPhone, image.url, image.caption);
        }
      }

      const recordPromise = recordConversationExchange({
        clientId: client.id,
        customerPhone: senderPhone,
        customerName: senderName,
        channel: 'whatsapp-webhook',
        incomingText: incomingText.trim(),
        replyText: aiResult.reply,
        intent: aiResult.intent,
        handoffTriggered: aiResult.handoffTriggered,
        sourcesUsed: aiResult.sourcesUsed,
        latencyMs: aiResult.latencyMs,
        detectedServiceOrRoom: aiResult.detectedServiceOrRoom,
        detectedDate: aiResult.detectedDate,
        detectedGuestCount: aiResult.detectedGuestCount,
      });

      const logEntry = {
        id: `wh-${Date.now()}`,
        timestamp: new Date().toISOString(),
        clientId: client.id,
        clientSlug: client.slug,
        businessName: client.businessName,
        senderPhone,
        incomingText: incomingText.trim(),
        replyText: aiResult.reply,
        intent: aiResult.intent,
        handoffTriggered: aiResult.handoffTriggered,
        deliveryMode: delivery.sent
          ? ('graph-api-sent' as const)
          : process.env.WHATSAPP_ACCESS_TOKEN
            ? ('graph-api-failed' as const)
            : ('simulated-webhook' as const),
        deliveryDetail: delivery.detail,
        latencyMs: aiResult.latencyMs,
      };

      const [recordedThread] = await Promise.all([recordPromise, addWebhookLog(logEntry)]);

      // Lead alert: tell the owner's sales contact when a guest shows real booking interest (once per 12h per guest).
      try {
        const alertPhone = (client.leadAlertPhone || process.env.LEAD_ALERT_PHONE || '').replace(/[^\d]/g, '');
        const hasDetails = Boolean(aiResult.detectedDate || aiResult.detectedGuestCount);
        const isLead = alertPhone && !senderPhone.replace(/[^\d]/g, '').endsWith(alertPhone.slice(-10)) &&
          ['booking', 'handoff'].includes(aiResult.intent) &&
          (hasDetails || aiResult.handoffTriggered || /book|reserve|available|availability|confirm/i.test(incomingText));
        const recentAlert = (recordedThread?.messages || []).some(
          (m) => m.role === 'alert' && m.id.startsWith('msg-lead-') && Date.now() - new Date(m.timestamp).getTime() < 12 * 3600 * 1000,
        );
        if (isLead && !recentAlert && recordedThread?.id) {
          const alertText = [
            `🔔 New Lead – ${client.businessName}`,
            `Guest: ${senderName || 'Unknown'} (+${senderPhone.replace(/[^\d]/g, '')})`,
            `Interested in: ${aiResult.detectedServiceOrRoom || 'Not specified yet'}`,
            `Dates: ${aiResult.detectedDate || 'Not shared yet'}`,
            `Guests: ${aiResult.detectedGuestCount || 'Not shared yet'}`,
            `Guest said: "${incomingText.trim().slice(0, 200)}"`,
            `Bot replied: "${aiResult.reply.slice(0, 200)}"`,
            `Chat: wa.me/${senderPhone.replace(/[^\d]/g, '')}`,
          ].join('\n');
          const alertDelivery = await sendWhatsAppCloudReply(resolvedPhoneNumberId, alertPhone, alertText);
          if (!alertDelivery.sent) console.error('Lead alert failed:', alertDelivery.detail);
          await appendMessageToConversation(recordedThread.id, {
            id: `msg-lead-${Date.now()}`,
            role: 'alert',
            text: `Lead alert ${alertDelivery.sent ? 'sent to' : 'FAILED for'} +${alertPhone}`,
            timestamp: new Date().toISOString(),
            deliveryStatus: alertDelivery.sent ? 'graph-api-sent' : 'failed',
          });
        }
      } catch (leadError) {
        console.error('Lead alert error:', leadError);
      }

      res.status(200).json({
        status: 'processed',
        client: { id: client.id, slug: client.slug, businessName: client.businessName },
        delivery,
        aiResult,
        outboundGraphPayload: {
          messaging_product: 'whatsapp',
          to: senderPhone.replace(/[^\d]/g, '') || senderPhone,
          type: 'text',
          text: { body: aiResult.reply },
        },
      });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Webhook processing error.',
      });
    }
  };

  app.post('/api/webhook', handleWebhookIncoming);
  app.post('/api/webhook/:slug', handleWebhookIncoming);

  app.get('/api/webhook-logs', async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const logs = await getWebhookLogs();
      res.json({ logs });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fetch webhook logs.',
      });
    }
  });

  app.get('/api/export/full-project', async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const rootDir = process.cwd();
      if (!fs.existsSync(path.join(rootDir, 'vercel.json')) || !fs.existsSync(path.join(rootDir, 'src'))) {
        res.status(404).json({
          error:
            'Full source tree is not mounted in this serverless runtime. Download from AI Studio or clone your GitHub repository directly.',
        });
        return;
      }

      const zip = new JSZip();
      const rootFiles = [
        'package.json',
        'vercel.json',
        'tsconfig.json',
        'vite.config.ts',
        'index.html',
        '.gitignore',
        '.env.example',
        'metadata.json',
        'server.ts',
      ];

      for (const fileName of rootFiles) {
        const fullPath = path.join(rootDir, fileName);
        if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
          zip.file(fileName, fs.readFileSync(fullPath));
        }
      }

      const includeDirs = ['api', 'server', 'shared', 'src', 'supabase'];
      const walkDir = (dirPath: string) => {
        if (!fs.existsSync(dirPath)) return;
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name.startsWith('.DS_Store') || entry.name === 'node_modules' || entry.name === 'dist') {
            continue;
          }
          const abs = path.join(dirPath, entry.name);
          const rel = path.relative(rootDir, abs).split(path.sep).join('/');
          if (entry.isDirectory()) {
            walkDir(abs);
          } else if (entry.isFile()) {
            zip.file(rel, fs.readFileSync(abs));
          }
        }
      };

      for (const dirName of includeDirs) {
        walkDir(path.join(rootDir, dirName));
      }

      const deployGuide = `# Corbett Rajae Homestay — Full Vercel + Supabase Deployment Guide

This package contains the complete RelayDesk platform:
- Studio & AI Chat Optimizer
- Client Dashboard (Live WhatsApp Inbox, Booking Confirmation Alerts, CSV Reports)
- Per-Client Portal Login (credentials are set through environment configuration)
- Vercel Serverless API (\`vercel.json\` + \`api/index.ts\`)
- Supabase PostgreSQL Schema (\`supabase/schema.sql\`)

## Step 1: Initialize Supabase
1. Open your Supabase project -> **SQL Editor**.
2. Paste and run \`supabase/schema.sql\`.
3. Copy **Project URL** (\`SUPABASE_URL\`) and **service_role key** (\`SUPABASE_SERVICE_ROLE_KEY\`) from **Project Settings -> API**.

## Step 2: Deploy to Vercel
1. Push this folder to GitHub (or import via Vercel CLI: \`npx vercel\`).
2. Add Environment Variables in Vercel:
   - \`GEMINI_API_KEY\`
   - \`SUPABASE_URL\`
   - \`SUPABASE_SERVICE_ROLE_KEY\`
   - \`SESSION_SECRET\` (any random 32+ character string)
   - \`WHATSAPP_ACCESS_TOKEN\` (permanent Meta System User token)
   - \`WHATSAPP_PHONE_NUMBER_ID\` (Corbett's real Meta Phone Number ID)
   - \`WHATSAPP_VERIFY_TOKEN\` (e.g. \`corbett_rajae_verify_2026\`)
   - \`WHATSAPP_APP_SECRET\` (required)
3. Deploy and verify \`https://<your-domain>.vercel.app/api/health\`.

## Step 3: Connect Meta WhatsApp Webhook
- Callback URL: \`https://<your-domain>.vercel.app/api/webhook/whatsapp\`
- Verify Token: \`corbett_rajae_verify_2026\`
- Subscribe to the \`messages\` webhook field.

## Client Portal Login
- URL: \`https://<your-domain>.vercel.app/?client=corbett-rajae-homestay&portal=1\`
- User ID: \`corbett-rajae\`
- Password: the value of \`INITIAL_CLIENT_PASSWORD\` at first seed; rotate it after first login
`;
      zip.file('DEPLOY_VERCEL_SUPABASE.md', deployGuide);

      const buffer = await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="corbett-relaydesk-vercel-supabase.zip"',
      );
      res.send(buffer);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to package project ZIP.',
      });
    }
  });

  return app;
}
