import JSZip from 'jszip';
import type { ClientBotConfig } from '../../shared/types.ts';

export interface ExportedFile {
  path: string;
  language: string;
  summary: string;
  changesPerClient: boolean;
  content: string;
}

export function buildExportedFiles(client: ClientBotConfig): ExportedFile[] {
  const clientConfigObject = {
    businessName: client.businessName,
    industry: client.industry,
    tagline: client.tagline,
    location: client.location,
    website: client.website,
    agentName: client.agentName,
    tone: client.tone,
    primaryLanguage: client.primaryLanguage,
    operatingHours: client.operatingHours,
    greetingMessage: client.greetingMessage,
    fallbackMessage: client.fallbackMessage,
    bookingInstructions: client.bookingInstructions,
    escalation: {
      triggers: client.escalationTriggers,
      contactName: client.escalationContactName,
      contactPhone: client.escalationContactPhone,
      contactEmail: client.escalationContactEmail,
    },
    services: client.services.map(({ name, price, duration, description }) => ({
      name,
      price,
      duration,
      description,
    })),
    faqs: client.faqs.map(({ question, answer }) => ({
      question,
      answer,
    })),
    knowledgeBase: (client.knowledgeBase || [])
      .filter((entry) => entry.enabled && entry.content.trim().length > 0)
      .map(({ title, category, content }) => ({
        title,
        category,
        content,
      })),
    chatPreferences: client.chatPreferences || {
      replyLength: 'balanced',
      upsellStyle: 'consultative',
      emojiStyle: 'minimal',
      customInstructions: '',
      priorityTopics: [],
    },
  };

  const clientConfigTs = `// ============================================================================
// ONLY EDIT THIS FILE WHEN ONBOARDING A NEW CLIENT
// Client: ${client.businessName} (${client.industry})
// ============================================================================

export interface ClientProfile {
  businessName: string;
  industry: string;
  tagline: string;
  location: string;
  website: string;
  agentName: string;
  tone: 'warm' | 'concise' | 'executive' | 'friendly';
  primaryLanguage: string;
  operatingHours: string;
  greetingMessage: string;
  fallbackMessage: string;
  bookingInstructions: string;
  escalation: {
    triggers: string;
    contactName: string;
    contactPhone: string;
    contactEmail: string;
  };
  services: Array<{
    name: string;
    price: string;
    duration: string;
    description: string;
  }>;
  faqs: Array<{
    question: string;
    answer: string;
  }>;
  knowledgeBase: Array<{
    title: string;
    category: string;
    content: string;
  }>;
  chatPreferences: {
    replyLength: 'short' | 'balanced' | 'detailed';
    upsellStyle: 'support-only' | 'consultative' | 'proactive';
    emojiStyle: 'minimal' | 'moderate' | 'expressive';
    customInstructions: string;
    priorityTopics: string[];
  };
}

export const clientConfig: ClientProfile = ${JSON.stringify(clientConfigObject, null, 2)};
`;

  const botEngineTs = `import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { clientConfig, type ClientProfile } from './client.config.ts';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: { 'User-Agent': 'aistudio-build' },
  },
});

const TONE_MAP: Record<ClientProfile['tone'], string> = {
  warm: 'Warm, empathetic, and hospitable while keeping messages concise for mobile reading.',
  concise: 'Direct, crisp, and efficient. Get straight to pricing, hours, or next steps.',
  executive: 'Polished, articulate, and consultative.',
  friendly: 'Upbeat, approachable, and conversational.',
};

function buildPrompt(profile: ClientProfile): string {
  const services = profile.services
    .map((s) => \`- \${s.name} | Price: \${s.price} | Duration: \${s.duration} | \${s.description}\`)
    .join('\\n');

  const faqs = profile.faqs
    .map((f) => \`Q: \${f.question}\\nA: \${f.answer}\`)
    .join('\\n\\n');

  const knowledgeDocs = (profile.knowledgeBase || [])
    .map((k) => \`[\${k.title} | \${k.category}]\\n\${k.content}\`)
    .join('\\n\\n');

  const prefs = profile.chatPreferences || {
    replyLength: 'balanced',
    upsellStyle: 'consultative',
    emojiStyle: 'minimal',
    customInstructions: '',
    priorityTopics: [],
  };

  return [
    \`You are \${profile.agentName}, replying on WhatsApp on behalf of "\${profile.businessName}" (\${profile.industry}).\`,
    \`Location: \${profile.location} | Website: \${profile.website}\`,
    \`Language: \${profile.primaryLanguage}. Tone: \${TONE_MAP[profile.tone]}\`,
    \`Hours: \${profile.operatingHours}\`,
    \`Chat Optimization: length=\${prefs.replyLength}, upsell=\${prefs.upsellStyle}, emoji=\${prefs.emojiStyle}\`,
    prefs.priorityTopics.length ? \`Priority Topics: \${prefs.priorityTopics.join(', ')}\` : '',
    prefs.customInstructions ? \`Client Preference Rules: \${prefs.customInstructions}\` : '',
    '',
    'SERVICES & PRICING:',
    services,
    '',
    'FAQS:',
    faqs,
    '',
    'BUSINESS KNOWLEDGE BASE:',
    knowledgeDocs || 'None',
    '',
    \`BOOKING RULES: \${profile.bookingInstructions}\`,
    \`ESCALATION TRIGGERS: \${profile.escalation.triggers}\`,
    \`ESCALATION CONTACT: \${profile.escalation.contactName} (\${profile.escalation.contactPhone})\`,
    \`FALLBACK GUIDANCE: \${profile.fallbackMessage}\`,
    'Keep replies brief and tailored to the client optimization rules above, use WhatsApp *bold* sparingly, and never invent prices or policies.',
  ].filter(Boolean).join('\\n');
}

export interface ConversationTurn {
  role: 'customer' | 'assistant';
  text: string;
}

export async function generateWhatsAppReply(
  incomingMessage: string,
  history: ConversationTurn[] = [],
) {
  const transcript = history
    .slice(-10)
    .map((m) => \`\${m.role === 'customer' ? 'Guest' : clientConfig.agentName}: \${m.text}\`)
    .join('\\n');

  const prompt = transcript
    ? \`Recent WhatsApp chat:\\n\${transcript}\\n\\nLatest message:\\n\${incomingMessage}\`
    : incomingMessage;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      systemInstruction: buildPrompt(clientConfig),
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          reply: { type: Type.STRING },
          intent: { type: Type.STRING },
          handoffTriggered: { type: Type.BOOLEAN },
        },
        required: ['reply', 'intent', 'handoffTriggered'],
      },
    },
  });

  return JSON.parse((response.text ?? '{}').trim()) as {
    reply: string;
    intent: string;
    handoffTriggered: boolean;
  };
}
`;

  const serverTs = `import 'dotenv/config';
import crypto from 'node:crypto';
import express from 'express';
import { clientConfig } from './client.config.ts';
import { generateWhatsAppReply, type ConversationTurn } from './bot-engine.ts';

const app = express();
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
    },
  }),
);

const PORT = Number(process.env.PORT || 3000);
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || '${client.whatsappVerifyToken}';
const THREAD_TTL_MS = 2 * 60 * 60 * 1000;

const processedMessageIds = new Map<string, number>();
const customerThreads = new Map<string, { turns: ConversationTurn[]; updatedAt: number }>();

function verifyMetaSignature(req: express.Request): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) return true;
  const sig = req.header('x-hub-signature-256');
  const rawBody = (req as express.Request & { rawBody?: Buffer }).rawBody;
  if (!sig || !rawBody) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    res.status(200).send(String(challenge ?? ''));
    return;
  }
  res.sendStatus(403);
});

app.post('/webhook', async (req, res) => {
  try {
    if (!verifyMetaSignature(req)) {
      res.sendStatus(401);
      return;
    }

    const change = req.body?.entry?.[0]?.changes?.[0]?.value;
    const msg = change?.messages?.[0];
    const phoneNumberId = change?.metadata?.phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID;
    const incomingText =
      msg?.text?.body ||
      msg?.button?.text ||
      msg?.interactive?.button_reply?.title ||
      msg?.interactive?.list_reply?.title ||
      msg?.image?.caption;

    if (!incomingText || !msg?.from) {
      res.sendStatus(200);
      return;
    }

    if (msg.id) {
      const now = Date.now();
      for (const [id, ts] of processedMessageIds.entries()) {
        if (now - ts > THREAD_TTL_MS) processedMessageIds.delete(id);
      }
      if (processedMessageIds.has(msg.id)) {
        res.status(200).json({ status: 'deduplicated' });
        return;
      }
      processedMessageIds.set(msg.id, now);
    }

    const existing = customerThreads.get(msg.from);
    const history = existing && Date.now() - existing.updatedAt < THREAD_TTL_MS ? existing.turns : [];

    const result = await generateWhatsAppReply(incomingText, history);

    const updatedTurns: ConversationTurn[] = [
      ...history,
      { role: 'customer', text: incomingText },
      { role: 'assistant', text: result.reply },
    ];
    customerThreads.set(msg.from, {
      turns: updatedTurns.slice(-12),
      updatedAt: Date.now(),
    });

    if (process.env.WHATSAPP_ACCESS_TOKEN && phoneNumberId) {
      await fetch(\`https://graph.facebook.com/v21.0/\${phoneNumberId}/messages\`, {
        method: 'POST',
        headers: {
          Authorization: \`Bearer \${process.env.WHATSAPP_ACCESS_TOKEN}\`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: String(msg.from).replace(/[^\\d]/g, ''),
          type: 'text',
          text: { body: result.reply },
        }),
      });
    }

    res.status(200).json({ status: 'ok', business: clientConfig.businessName, ...result });
  } catch (error) {
    console.error('Webhook error:', error);
    res.sendStatus(500);
  }
});

app.listen(PORT, () => {
  console.log(\`\${clientConfig.businessName} WhatsApp bot running on port \${PORT}\`);
});
`;

  const packageJson = JSON.stringify(
    {
      name: `${client.slug}-whatsapp-bot`,
      version: '1.0.0',
      private: true,
      type: 'module',
      scripts: {
        dev: 'tsx server.ts',
        start: 'node server.ts',
      },
      dependencies: {
        '@google/genai': '^3.3.0',
        dotenv: '^17.2.3',
        express: '^4.21.2',
      },
      devDependencies: {
        tsx: '^4.21.0',
        '@types/express': '^4.17.21',
        '@types/node': '^22.14.0',
      },
    },
    null,
    2,
  );

  const envExample = `PORT=3000
GEMINI_API_KEY=your_gemini_api_key
WHATSAPP_ACCESS_TOKEN=your_meta_whatsapp_cloud_api_token
WHATSAPP_PHONE_NUMBER_ID=${client.whatsappPhoneNumberId}
WHATSAPP_VERIFY_TOKEN=${client.whatsappVerifyToken}
# Optional: Meta App Secret for X-Hub-Signature-256 webhook signature verification
WHATSAPP_APP_SECRET=
`;

  const readmeMd = `# ${client.businessName} — WhatsApp Business AI Bot

Generated by RelayDesk. This standalone codebase is designed so **only \`client.config.ts\`** needs edits when cloning for another client.

## Quick Setup (Under 5 Minutes)

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Copy environment variables:
   \`\`\`bash
   cp .env.example .env
   \`\`\`
   Fill in \`GEMINI_API_KEY\` and your client's \`WHATSAPP_ACCESS_TOKEN\`.

3. Start the webhook server:
   \`\`\`bash
   npm start
   \`\`\`

4. Connect in Meta Developer Dashboard:
   - Callback URL: \`https://your-client-domain.com/webhook\`
   - Verify Token: \`${client.whatsappVerifyToken}\`
   - Subscribe to the \`messages\` webhook field.

## Scaling to Your Next Client

Duplicate this folder and edit only \`client.config.ts\` (business name, services, hours, FAQs, and escalation contact). \`bot-engine.ts\` and \`server.ts\` require zero modifications.
`;

  return [
    {
      path: 'client.config.ts',
      language: 'TypeScript',
      summary: 'Only file edited per client: business identity, hours, services, FAQs, and handoff rules.',
      changesPerClient: true,
      content: clientConfigTs,
    },
    {
      path: 'bot-engine.ts',
      language: 'TypeScript',
      summary: 'Reusable Gemini 4 Hydrogen reply engine shared identically across all client bots.',
      changesPerClient: false,
      content: botEngineTs,
    },
    {
      path: 'server.ts',
      language: 'TypeScript',
      summary: 'Reusable Express Meta WhatsApp Cloud API webhook server (GET verify + POST reply).',
      changesPerClient: false,
      content: serverTs,
    },
    {
      path: 'package.json',
      language: 'JSON',
      summary: 'Minimal production dependencies ready for Node 22+ or Cloud Run.',
      changesPerClient: false,
      content: packageJson,
    },
    {
      path: '.env.example',
      language: 'Env',
      summary: 'Client environment variables for Gemini and Meta WhatsApp Cloud API.',
      changesPerClient: true,
      content: envExample,
    },
    {
      path: 'README.md',
      language: 'Markdown',
      summary: 'Step-by-step client onboarding and Meta webhook connection guide.',
      changesPerClient: false,
      content: readmeMd,
    },
  ];
}

export async function downloadClientZip(client: ClientBotConfig): Promise<void> {
  const zip = new JSZip();
  const folder = zip.folder(`${client.slug}-whatsapp-bot`);
  if (!folder) return;

  const files = buildExportedFiles(client);
  for (const file of files) {
    folder.file(file.path, file.content);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${client.slug}-whatsapp-bot.zip`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
