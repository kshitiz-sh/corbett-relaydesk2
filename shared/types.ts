export type BotTone = 'warm' | 'concise' | 'executive' | 'friendly';

export type IndustrySector =
  | 'Healthcare & Clinics'
  | 'Restaurants & Hospitality'
  | 'Real Estate'
  | 'Automotive Services'
  | 'Beauty & Wellness'
  | 'E-Commerce & Retail'
  | 'Custom Business';

export interface ServiceItem {
  id: string;
  name: string;
  price: string;
  duration: string;
  description: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export type KnowledgeCategory =
  | 'Policies'
  | 'Directions & Access'
  | 'Property & Amenities'
  | 'Pricing & Offers'
  | 'General Info';

export type KnowledgeSourceType = 'manual' | 'website' | 'file';

export interface KnowledgeBaseEntry {
  id: string;
  title: string;
  category: KnowledgeCategory;
  content: string;
  sourceType: KnowledgeSourceType;
  sourceLabel?: string;
  enabled: boolean;
}

export type ReplyLengthPreference = 'short' | 'balanced' | 'detailed';
export type UpsellStylePreference = 'support-only' | 'consultative' | 'proactive';
export type EmojiStylePreference = 'minimal' | 'moderate' | 'expressive';

export interface ChatPreferences {
  replyLength: ReplyLengthPreference;
  upsellStyle: UpsellStylePreference;
  emojiStyle: EmojiStylePreference;
  customInstructions: string;
  priorityTopics: string[];
}

export interface ClientPortalAuth {
  userId: string;
  passwordHash?: string;
  hasPassword?: boolean;
}

export interface ClientBotConfig {
  id: string;
  slug: string;
  businessName: string;
  industry: IndustrySector;
  tagline: string;
  location: string;
  website: string;
  agentName: string;
  tone: BotTone;
  primaryLanguage: string;
  operatingHours: string;
  greetingMessage: string;
  fallbackMessage: string;
  services: ServiceItem[];
  faqs: FaqItem[];
  knowledgeBase: KnowledgeBaseEntry[];
  chatPreferences?: ChatPreferences;
  portalAuth?: ClientPortalAuth;
  escalationTriggers: string;
  escalationContactName: string;
  escalationContactPhone: string;
  escalationContactEmail: string;
  bookingInstructions: string;
  whatsappPhoneNumberId: string;
  whatsappVerifyToken: string;
  samplePrompts: string[];
  isBuiltInTemplate: boolean;
  updatedAt: string;
}

export interface SimulationMessage {
  id: string;
  role: 'customer' | 'assistant';
  text: string;
  timestamp: string;
  intent?: string;
  handoffTriggered?: boolean;
  handoffReason?: string;
  quickReplies?: string[];
  sourcesUsed?: string[];
  latencyMs?: number;
}

export interface SimulationResponse {
  reply: string;
  intent: string;
  handoffTriggered: boolean;
  handoffReason: string;
  quickReplies: string[];
  sourcesUsed: string[];
  detectedServiceOrRoom?: string;
  detectedDate?: string;
  detectedGuestCount?: string;
  latencyMs: number;
}

export interface WebhookLogEntry {
  id: string;
  timestamp: string;
  clientId: string;
  clientSlug: string;
  businessName: string;
  senderPhone: string;
  incomingText: string;
  replyText: string;
  intent: string;
  handoffTriggered: boolean;
  deliveryMode: 'simulated-webhook' | 'graph-api-sent' | 'graph-api-failed';
  deliveryDetail?: string;
  latencyMs: number;
}

export type ConversationStatus = 'active' | 'escalated' | 'booked' | 'resolved';

export interface ChatMessageRecord {
  id: string;
  role: 'customer' | 'assistant' | 'host' | 'alert';
  text: string;
  timestamp: string;
  intent?: string;
  handoffTriggered?: boolean;
  sourcesUsed?: string[];
  latencyMs?: number;
  deliveryStatus?: 'graph-api-sent' | 'simulated' | 'failed';
}

export interface BookingSummary {
  serviceOrRoom: string;
  checkInOrDate: string;
  guestsOrNotes: string;
  estimatedAmount: string;
  bookingStatus: 'inquiry' | 'confirmed' | 'cancelled';
  alertSentAt?: string;
  alertRecipient?: string;
  hostAlertSentAt?: string;
}

export interface ConversationThread {
  id: string;
  clientId: string;
  customerName: string;
  customerPhone: string;
  channel: 'whatsapp-webhook' | 'simulator';
  status: ConversationStatus;
  botPaused: boolean;
  lastMessageAt: string;
  messages: ChatMessageRecord[];
  bookingSummary?: BookingSummary;
}

export interface ClientReportSummary {
  totalConversations: number;
  totalMessages: number;
  bookingInquiries: number;
  confirmedBookings: number;
  escalations: number;
  alertsSent: number;
  avgLatencyMs: number;
  intentBreakdown: Array<{ intent: string; count: number }>;
  dailyActivity: Array<{ date: string; conversations: number; bookings: number }>;
}
