import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type {
  ChatPreferences,
  ClientBotConfig,
  ConversationThread,
  KnowledgeBaseEntry,
  KnowledgeCategory,
  SimulationResponse,
} from '../shared/types.ts';

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server. Add it in Settings > Secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const TONE_GUIDE: Record<ClientBotConfig['tone'], string> = {
  warm: 'Warm, empathetic, reassuring, and hospitable while keeping messages concise for mobile reading.',
  concise: 'Direct, crisp, efficient, and clear. Avoid fluff; get straight to pricing, times, or next steps.',
  executive: 'Polished, articulate, trustworthy, and consultative without sounding stiff.',
  friendly: 'Upbeat, approachable, conversational, and welcoming like a great front-of-house host.',
};

const REPLY_LENGTH_GUIDE: Record<ChatPreferences['replyLength'], string> = {
  short: 'Keep every WhatsApp reply ultra-concise (1 to 3 short sentences max).',
  balanced: 'Keep replies balanced for WhatsApp mobile screens (2 to 5 concise sentences or tight bullets).',
  detailed: 'Provide thorough, helpful details including inclusions, timings, and clear next steps while staying scannable.',
};

const UPSELL_STYLE_GUIDE: Record<ChatPreferences['upsellStyle'], string> = {
  'support-only': 'Answer strictly what the customer asked without suggesting add-ons or upgrades.',
  consultative: 'Gently mention relevant add-ons, packages, or upgrades only when helpful to the customer query.',
  proactive: 'Proactively recommend signature packages, meal plans, upgrades, or bundles alongside direct answers.',
};

const EMOJI_STYLE_GUIDE: Record<ChatPreferences['emojiStyle'], string> = {
  minimal: 'Avoid emojis or use at most 1 subtle functional emoji only when natural.',
  moderate: 'Use 1 to 2 warm, relevant emojis per reply to keep the WhatsApp chat approachable.',
  expressive: 'Use friendly, welcoming emojis naturally throughout replies while keeping pricing and dates crisp.',
};

export function buildSystemInstruction(client: ClientBotConfig): string {
  const servicesBlock = client.services.length
    ? client.services
        .map(
          (s) =>
            `- ${s.name} | Price: ${s.price} | Duration/Turnaround: ${s.duration} | Details: ${s.description}`,
        )
        .join('\n')
    : 'No services listed yet.';

  const faqBlock = client.faqs.length
    ? client.faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n')
    : 'No FAQs listed yet.';

  const enabledDocs = (client.knowledgeBase || []).filter(
    (entry) => entry.enabled && entry.content.trim().length > 0,
  );
  const knowledgeBlock = enabledDocs.length
    ? enabledDocs
        .map(
          (doc) =>
            `[Document: ${doc.title || 'Untitled'} | Category: ${doc.category}]\n${doc.content.trim()}`,
        )
        .join('\n\n')
    : 'No additional knowledge base documents uploaded.';

  const prefs: ChatPreferences = client.chatPreferences || {
    replyLength: 'balanced',
    upsellStyle: 'consultative',
    emojiStyle: 'minimal',
    customInstructions: '',
    priorityTopics: [],
  };

  return [
    `You are ${client.agentName}, the official WhatsApp Business assistant replying on behalf of "${client.businessName}" (${client.industry}).`,
    `Tagline: ${client.tagline}`,
    `Location: ${client.location}`,
    `Website: ${client.website}`,
    `Primary Language: ${client.primaryLanguage}. Always reply in ${client.primaryLanguage} unless the customer clearly writes in another language.`,
    `Tone & Style: ${TONE_GUIDE[client.tone]}`,
    '',
    'CLIENT CHAT OPTIMIZATION PREFERENCES:',
    `- Reply Length: ${REPLY_LENGTH_GUIDE[prefs.replyLength]}`,
    `- Sales & Recommendation Style: ${UPSELL_STYLE_GUIDE[prefs.upsellStyle]}`,
    `- Emoji Usage: ${EMOJI_STYLE_GUIDE[prefs.emojiStyle]}`,
    prefs.priorityTopics.length > 0
      ? `- Priority Topics to Highlight Naturally: ${prefs.priorityTopics.join(', ')}`
      : '',
    prefs.customInstructions.trim()
      ? `- Client Optimization Directive (HIGHEST PRIORITY STYLE RULE): ${prefs.customInstructions.trim()}`
      : '',
    '',
    'OPERATING HOURS:',
    client.operatingHours,
    '',
    'SERVICES, CATALOG & PRICING:',
    servicesBlock,
    '',
    'FREQUENTLY ASKED QUESTIONS:',
    faqBlock,
    '',
    'BUSINESS KNOWLEDGE BASE (Authoritative Policies, Directions & Details):',
    knowledgeBlock,
    '',
    'BOOKING & LEAD CAPTURE INSTRUCTIONS:',
    client.bookingInstructions,
    '',
    'ESCALATION & HUMAN HANDOFF RULES:',
    `Triggers requiring immediate handoff: ${client.escalationTriggers}`,
    `Human Escalation Contact: ${client.escalationContactName} (${client.escalationContactPhone}, ${client.escalationContactEmail})`,
    `If an escalation trigger occurs, set handoffTriggered=true, state handoffReason concisely, reassure the customer, and share the escalation contact or use this fallback guidance: "${client.fallbackMessage}"`,
    '',
    'WHATSAPP FORMATTING RULES:',
    '1. Follow the CLIENT CHAT OPTIMIZATION PREFERENCES above closely.',
    '2. Use WhatsApp bold formatting (*text*) sparingly for key prices, hours, or action items. Never use Markdown headers (#) or HTML.',
    '3. Never invent prices, policies, availability, or claims outside the provided business data and knowledge base. If a detail is missing, say you will verify with the team and trigger handoff.',
    '4. Provide up to 3 short, natural quickReplies (under 24 characters each) that the customer might tap next.',
    '5. In sourcesUsed, list the exact Document title(s) from BUSINESS KNOWLEDGE BASE that you relied on (or an empty array if none were needed).',
  ]
    .filter((line) => line !== undefined)
    .join('\n');
}

export interface ConversationTurn {
  role: 'customer' | 'assistant';
  text: string;
}

export async function generateBotReply(
  client: ClientBotConfig,
  incomingMessage: string,
  history: ConversationTurn[] = [],
): Promise<SimulationResponse> {
  const start = Date.now();
  const ai = getAiClient();

  const transcript = history
    .slice(-10)
    .map((m) => `${m.role === 'customer' ? 'Customer' : client.agentName}: ${m.text}`)
    .join('\n');

  const prompt = transcript
    ? `Recent WhatsApp conversation:\n${transcript}\n\nLatest Customer WhatsApp message:\n${incomingMessage}`
    : `Customer WhatsApp message:\n${incomingMessage}`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      systemInstruction: buildSystemInstruction(client),
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          reply: {
            type: Type.STRING,
            description: 'The exact WhatsApp message to send back to the customer.',
          },
          intent: {
            type: Type.STRING,
            description: 'Short lowercase category: booking, pricing, hours_location, faq, support, handoff, or greeting.',
          },
          handoffTriggered: {
            type: Type.BOOLEAN,
            description: 'True if the message meets escalation triggers or cannot be answered from business facts.',
          },
          handoffReason: {
            type: Type.STRING,
            description: 'Brief explanation if handoffTriggered is true, otherwise empty string.',
          },
          quickReplies: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Up to 3 short follow-up tap suggestions (max 24 chars each).',
          },
          sourcesUsed: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Exact Knowledge Base document titles referenced in this reply.',
          },
          detectedServiceOrRoom: {
            type: Type.STRING,
            description: 'If the customer mentioned a specific room, package, or service, name it briefly, else empty string.',
          },
          detectedDate: {
            type: Type.STRING,
            description: 'If the customer mentioned dates, check-in, or appointment time, extract it briefly, else empty string.',
          },
          detectedGuestCount: {
            type: Type.STRING,
            description: 'If the customer mentioned number of guests/people/party size, extract it briefly, else empty string.',
          },
        },
        required: [
          'reply',
          'intent',
          'handoffTriggered',
          'handoffReason',
          'quickReplies',
          'sourcesUsed',
        ],
      },
    },
  });

  const rawText = (response.text ?? '{}').trim();
  let parsed: Partial<SimulationResponse> = {};
  try {
    parsed = JSON.parse(rawText) as Partial<SimulationResponse>;
  } catch {
    parsed = {
      reply: rawText || client.fallbackMessage,
      intent: 'general',
      handoffTriggered: false,
      handoffReason: '',
      quickReplies: [],
      sourcesUsed: [],
    };
  }

  return {
    reply: parsed.reply || client.fallbackMessage,
    intent: parsed.intent || 'general',
    handoffTriggered: Boolean(parsed.handoffTriggered),
    handoffReason: parsed.handoffReason || '',
    quickReplies: Array.isArray(parsed.quickReplies) ? parsed.quickReplies.slice(0, 3) : [],
    sourcesUsed: Array.isArray(parsed.sourcesUsed) ? parsed.sourcesUsed.slice(0, 4) : [],
    detectedServiceOrRoom: parsed.detectedServiceOrRoom || '',
    detectedDate: parsed.detectedDate || '',
    detectedGuestCount: parsed.detectedGuestCount || '',
    latencyMs: Date.now() - start,
  };
}

function isBlockedHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (
    lower === 'localhost' ||
    lower === '127.0.0.1' ||
    lower === '0.0.0.0' ||
    lower === '::1' ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal')
  ) {
    return true;
  }
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.)/.test(lower)) {
    return true;
  }
  return false;
}

function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6]|tr|section|article|br)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const VALID_CATEGORIES: KnowledgeCategory[] = [
  'Policies',
  'Directions & Access',
  'Property & Amenities',
  'Pricing & Offers',
  'General Info',
];

export async function extractKnowledgeFromWebsite(
  rawUrl: string,
  businessName: string,
): Promise<KnowledgeBaseEntry[]> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl.trim().startsWith('http') ? rawUrl.trim() : `https://${rawUrl.trim()}`);
  } catch {
    throw new Error('Please enter a valid website URL (e.g. https://thecorbettrajaehomestay.com/).');
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error('Only HTTP and HTTPS website URLs are supported.');
  }

  if (isBlockedHostname(parsedUrl.hostname)) {
    throw new Error('Private or local network URLs cannot be imported.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  let pageText = '';
  try {
    const res = await fetch(parsedUrl.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RelayDeskBot/1.0)',
        Accept: 'text/html,application/xhtml+xml,text/plain',
      },
    });
    if (!res.ok) {
      throw new Error(`Website returned HTTP ${res.status}.`);
    }
    const html = await res.text();
    pageText = stripHtmlToText(html).slice(0, 24000);
  } finally {
    clearTimeout(timeout);
  }

  if (pageText.length < 60) {
    throw new Error('Could not extract readable text from that page. Try pasting the text or uploading a .txt/.md file.');
  }

  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: `Extract structured WhatsApp customer-support Knowledge Base documents for "${businessName}" from the webpage content below (${parsedUrl.toString()}).\n\nWEBPAGE TEXT:\n${pageText}`,
    config: {
      systemInstruction:
        'Organize factual business information from the webpage into 2 to 5 concise, high-signal Knowledge Base entries for a WhatsApp customer support agent. Never invent facts not present in the source text. Use clear titles and concise bullet/prose content.',
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            category: {
              type: Type.STRING,
              description:
                'One of: Policies, Directions & Access, Property & Amenities, Pricing & Offers, General Info',
            },
            content: { type: Type.STRING },
          },
          required: ['title', 'category', 'content'],
        },
      },
    },
  });

  const items = JSON.parse((response.text ?? '[]').trim()) as Array<{
    title?: string;
    category?: string;
    content?: string;
  }>;

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('No structured business facts could be extracted from that URL.');
  }

  return items.slice(0, 6).map((item, idx) => ({
    id: `kb-web-${Date.now()}-${idx}`,
    title: (item.title || 'Website Overview').trim(),
    category: VALID_CATEGORIES.includes(item.category as KnowledgeCategory)
      ? (item.category as KnowledgeCategory)
      : 'General Info',
    content: (item.content || '').trim(),
    sourceType: 'website',
    sourceLabel: parsedUrl.hostname,
    enabled: true,
  }));
}

export async function optimizeChatPreferencesWithAi(
  client: ClientBotConfig,
  clientSuggestionOrGoal: string,
): Promise<{ chatPreferences: ChatPreferences; summary: string }> {
  const ai = getAiClient();
  const current = client.chatPreferences || {
    replyLength: 'balanced' as const,
    upsellStyle: 'consultative' as const,
    emojiStyle: 'minimal' as const,
    customInstructions: '',
    priorityTopics: [],
  };

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: [
      `Business: ${client.businessName} (${client.industry})`,
      `Services: ${client.services.map((s) => `${s.name} (${s.price})`).join('; ') || 'None'}`,
      `Current Preferences: ${JSON.stringify(current)}`,
      `Client Suggestion / Optimization Goal: ${clientSuggestionOrGoal.trim() || 'Optimize WhatsApp chat replies for clarity, warmth, and higher booking conversion.'}`,
    ].join('\n\n'),
    config: {
      systemInstruction:
        'You are a WhatsApp AI conversation optimizer. Convert the client business profile and their natural-language preference feedback into crisp, actionable ChatPreferences JSON for their WhatsApp AI agent. Keep customInstructions under 420 characters and priorityTopics to 3–5 concise items.',
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          replyLength: {
            type: Type.STRING,
            description: 'One of: short, balanced, detailed',
          },
          upsellStyle: {
            type: Type.STRING,
            description: 'One of: support-only, consultative, proactive',
          },
          emojiStyle: {
            type: Type.STRING,
            description: 'One of: minimal, moderate, expressive',
          },
          customInstructions: {
            type: Type.STRING,
            description: 'Clear behavioral instructions incorporating the client preference.',
          },
          priorityTopics: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '3 to 5 high-value topics or packages the bot should highlight naturally.',
          },
          summary: {
            type: Type.STRING,
            description: 'One-sentence explanation of how the chat behavior was optimized.',
          },
        },
        required: [
          'replyLength',
          'upsellStyle',
          'emojiStyle',
          'customInstructions',
          'priorityTopics',
          'summary',
        ],
      },
    },
  });

  const parsed = JSON.parse((response.text ?? '{}').trim()) as {
    replyLength?: string;
    upsellStyle?: string;
    emojiStyle?: string;
    customInstructions?: string;
    priorityTopics?: string[];
    summary?: string;
  };

  const replyLength: ChatPreferences['replyLength'] =
    parsed.replyLength === 'short' || parsed.replyLength === 'detailed'
      ? parsed.replyLength
      : 'balanced';
  const upsellStyle: ChatPreferences['upsellStyle'] =
    parsed.upsellStyle === 'support-only' || parsed.upsellStyle === 'proactive'
      ? parsed.upsellStyle
      : 'consultative';
  const emojiStyle: ChatPreferences['emojiStyle'] =
    parsed.emojiStyle === 'moderate' || parsed.emojiStyle === 'expressive'
      ? parsed.emojiStyle
      : 'minimal';

  return {
    chatPreferences: {
      replyLength,
      upsellStyle,
      emojiStyle,
      customInstructions: (parsed.customInstructions || current.customInstructions || '').trim(),
      priorityTopics: Array.isArray(parsed.priorityTopics)
        ? parsed.priorityTopics.slice(0, 5)
        : current.priorityTopics,
    },
    summary:
      parsed.summary?.trim() || 'Updated WhatsApp AI chat preferences based on client feedback.',
  };
}

export async function suggestHostReplyWithAi(
  client: ClientBotConfig,
  thread: ConversationThread,
  hostPreferenceHint?: string,
): Promise<Array<{ label: string; text: string }>> {
  const ai = getAiClient();
  const transcript = thread.messages
    .slice(-12)
    .map((m) => `${m.role.toUpperCase()}: ${m.text}`)
    .join('\n');

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: [
      `Customer: ${thread.customerName} (${thread.customerPhone})`,
      thread.bookingSummary
        ? `Booking Summary: ${thread.bookingSummary.serviceOrRoom} | ${thread.bookingSummary.checkInOrDate} | ${thread.bookingSummary.estimatedAmount}`
        : '',
      `Recent Conversation:\n${transcript}`,
      `Host Optimization Hint / Preference: ${hostPreferenceHint?.trim() || 'Draft a helpful, conversion-friendly WhatsApp follow-up aligned with client preferences.'}`,
    ]
      .filter(Boolean)
      .join('\n\n'),
    config: {
      systemInstruction: `${buildSystemInstruction(client)}\n\nNow act as an AI co-pilot for the human host/team of "${client.businessName}". Suggest 2 ready-to-send WhatsApp replies that incorporate the host's hint and respect all pricing, policies, and client chat optimization preferences.`,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          suggestions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: {
                  type: Type.STRING,
                  description: 'Short 2-4 word label (e.g. Direct & Warm, With Safari Offer)',
                },
                text: {
                  type: Type.STRING,
                  description: 'Complete WhatsApp message ready to send to the customer.',
                },
              },
              required: ['label', 'text'],
            },
          },
        },
        required: ['suggestions'],
      },
    },
  });

  const parsed = JSON.parse((response.text ?? '{}').trim()) as {
    suggestions?: Array<{ label?: string; text?: string }>;
  };

  return (parsed.suggestions || [])
    .filter((s) => Boolean(s.text?.trim()))
    .slice(0, 3)
    .map((s, i) => ({
      label: (s.label || `Option ${i + 1}`).trim(),
      text: (s.text || '').trim(),
    }));
}
