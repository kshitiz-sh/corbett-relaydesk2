import type { ClientBotConfig } from './types.ts';

export const DEFAULT_CLIENTS: ClientBotConfig[] = [
  {
    id: 'cli-corbett-rajae-homestay',
    slug: 'corbett-rajae-homestay',
    propertyImages: [
      { url: 'https://corbett-rajae-relaydesk.vercel.app/property/property-exterior.jpg', caption: 'The Corbett Rajae Homestay' },
      { url: 'https://corbett-rajae-relaydesk.vercel.app/property/terrace-kitchen.jpg', caption: 'Terrace & Pahadi Kitchen' },
      { url: 'https://corbett-rajae-relaydesk.vercel.app/property/terrace-night.jpg', caption: 'Terrace at night' },
      { url: 'https://corbett-rajae-relaydesk.vercel.app/property/corridor.jpg', caption: 'Balcony corridor with valley views' },
      { url: 'https://corbett-rajae-relaydesk.vercel.app/property/waterfall.jpg', caption: 'Nearby waterfall' },
      { url: 'https://corbett-rajae-relaydesk.vercel.app/property/sunrise-view.jpg', caption: 'Sunrise view of the valley' },
    ],
    roomImages: [
      { url: 'https://corbett-rajae-relaydesk.vercel.app/rooms/family-room-1.jpg', caption: 'Family 2 Room Set with Private Terrace & Balcony – ₹7,000/night with breakfast (4 guests)' },
      { url: 'https://corbett-rajae-relaydesk.vercel.app/rooms/premium-cozy-room-1.jpg', caption: 'Premium Cozy Room with Balcony – ₹2,500/night with breakfast (2 guests)' },
      { url: 'https://corbett-rajae-relaydesk.vercel.app/rooms/premium-room-1.jpg', caption: 'Premium Spacious Room – ₹3,500/night with breakfast (3 guests)' },
    ],
    businessName: 'The Corbett Rajae Homestay',
    industry: 'Restaurants & Hospitality',
    tagline: 'Peaceful Himalayan forest retreat near Kalagarh Tiger Reserve & Jim Corbett',
    location: '01, Rathuadhab, Kumaldi, Kalagarh Tiger Reserve, Pauri Garhwal, Uttarakhand 246179, India',
    website: 'https://thecorbettrajaehomestay.com/',
    agentName: 'Aarav',
    tone: 'warm',
    primaryLanguage: 'English',
    operatingHours:
      'Inquiries: Daily 7:00 AM – 10:00 PM IST | Summer Check-in 1:00 PM / Out 11:00 AM | Winter Check-in 2:00 PM / Out 12:00 PM',
    greetingMessage:
      'Namaste! Welcome to *The Corbett Rajae Homestay* near Kalagarh Tiger Reserve, Jim Corbett. I can help you with room availability, seasonal rates, home-cooked Pahadi meals, or jungle safari bookings. How can I assist you today?',
    fallbackMessage:
      'Let me connect you directly with our property host on +91 9411561965 so we can confirm exact dates, custom group rates, or safari permits for you.',
    services: [
      {
        id: 'srv-corbett-1',
        name: 'Premium Cozy Room with Balcony',
        price: '₹2,500 / room / night (stay with breakfast, 2 persons)',
        duration: '2 guests',
        description:
          'Premium cozy room with balcony, 2 persons max, stay with breakfast. Extra person or child above 8 years: ₹800/person/room/night (stay only) or ₹1,000/person/room/night (stay with breakfast).',
      },
      {
        id: 'srv-corbett-2',
        name: 'Premium Spacious Room',
        price: '₹3,500 / room / night (stay with breakfast, up to 3 persons)',
        duration: 'Up to 3 guests',
        description:
          'Premium spacious room, 3 persons max, stay with breakfast. Extra person or child above 8 years: ₹800/person/room/night (stay only) or ₹1,000/person/room/night (stay with breakfast).',
      },
      {
        id: 'srv-corbett-3',
        name: 'Family 2 Room Set with Private Terrace & Balcony',
        price: '₹7,000 / set / night (stay with breakfast, 4 persons)',
        duration: '4 guests',
        description:
          'Family set of 2 spacious rooms with private terrace and private balcony, deluxe king/queen-size beds, attached balcony/terrace and private washrooms. 4 persons only, stay with breakfast.',
      },
      {
        id: 'srv-corbett-4',
        name: 'Jim Corbett & Sonanadi Safari Excursion',
        price: 'Custom permit & gypsy quote',
        duration: 'Morning / Evening slot',
        description:
          'Arranged jungle gypsy safaris (Sonanadi / Kalagarh / Corbett zones), guided bird-watching, and KTR waterfall nature walks.',
      },
      {
        id: 'srv-corbett-5',
        name: 'Home-Cooked Pahadi Meals & Bonfire Night',
        price: 'Available on request',
        duration: 'Breakfast / Lunch / Dinner',
        description:
          'Fresh local Uttarakhand vegetarian cuisine prepared by our cook, outdoor bonfire seating, and basic veg/egg kitchen access.',
      },
    ],
    faqs: [
      {
        id: 'faq-corbett-1',
        question: 'What are your check-in and check-out timings?',
        answer:
          'In summer, check-in is 1:00 PM and check-out is 11:00 AM. In winter, check-in is 2:00 PM and check-out is 12:00 PM.',
      },
      {
        id: 'faq-corbett-2',
        question: 'What food options are available at the homestay?',
        answer:
          'We specialize in fresh, home-cooked vegetarian Uttarakhand (Pahadi) dishes and customizable meals. A private kitchen setup is also available for basic veg meals and eggs.',
      },
      {
        id: 'faq-corbett-3',
        question: 'Can you help arrange jungle safaris and local sightseeing?',
        answer:
          'Yes! We arrange gypsy safaris for Jim Corbett / Sonanadi / Kalagarh Tiger Reserve zones as well as guided bird-watching tours, river stream walks, and treks to the KTR waterfall.',
      },
      {
        id: 'faq-corbett-4',
        question: 'Do you have Wi-Fi, parking, and AC?',
        answer:
          'Yes, we provide free Wi-Fi, on-site parking, room service, outdoor terrace/bonfire seating, and AC in select rooms.',
      },
    ],
    knowledgeBase: [
      {
        id: 'kb-corbett-1',
        title: 'Directions & Nearest Transit Hubs',
        category: 'Directions & Access',
        content:
          'Located at 01, Rathuadhab, Kumaldi near the Kalagarh Tiger Reserve / Sonanadi range (Pauri Garhwal, Uttarakhand 246179). Accessible via Kotdwar Railway Station or Ramnagar. Guests traveling in the evening should message the host desk before 5:00 PM for last-mile forest road guidance and parking assistance.',
        sourceType: 'website',
        sourceLabel: 'thecorbettrajaehomestay.com',
        enabled: true,
      },
      {
        id: 'kb-corbett-2',
        title: 'Dining, Kitchen & Bonfire Guidelines',
        category: 'Property & Amenities',
        content:
          'Home-cooked Pahadi vegetarian meals (breakfast, lunch, evening snacks, and dinner) are prepared fresh on order by our in-house cook. Basic vegetarian and egg cooking is allowed in the private kitchen setup. Evening bonfires can be arranged on the outdoor seating terrace weather permitting.',
        sourceType: 'website',
        sourceLabel: 'thecorbettrajaehomestay.com',
        enabled: true,
      },
      {
        id: 'kb-corbett-3',
        title: 'Booking Confirmation & Safari Permits',
        category: 'Policies',
        content:
          'Room bookings require date verification and an advance deposit directly with the host desk (+91 9411561965). For Jim Corbett / Sonanadi / Kalagarh gypsy safaris, guests must share government photo ID details (Aadhaar/Passport) in advance because forest zone permits are issued by quota.',
        sourceType: 'manual',
        sourceLabel: 'Host SOP',
        enabled: true,
      },
    ],
    chatPreferences: {
      replyLength: 'balanced',
      upsellStyle: 'consultative',
      emojiStyle: 'minimal',
      customInstructions:
        'Highlight the peaceful Himalayan forest setting near Kalagarh Tiger Reserve. Ask for check-in/check-out dates and guest count early, and gently mention home-cooked Pahadi meals or a morning Sonanadi safari when guests ask about stays.',
      priorityTopics: [
        'Seasonal Room Rates',
        'Pahadi Home-Cooked Meals',
        'Sonanadi & Corbett Safari',
        'Kotdwar & Ramnagar Route',
      ],
    },
    portalAuth: {
      userId: 'corbett-rajae',
      hasPassword: true,
    },
    escalationTriggers:
      'Exact date availability confirmation, group buyouts (6+ guests), weekend/holiday tariff negotiations, safari permit ID verification, directions from Kotdwar/Ramnagar, or requests to speak directly with the host.',
    escalationContactName: 'Rajae Homestay Host Desk',
    escalationContactPhone: '+91 9411561965',
    escalationContactEmail: 'corbettrajaehomestay@gmail.com',
    bookingInstructions:
      'Ask for check-in date, check-out date, number of adults/children, preferred room tier (Valley View, Terrace Room, or Family Two-Room Set), and whether they need meal plans or a safari excursion. Quote seasonal ranges clearly without guaranteeing unverified availability.',
    whatsappPhoneNumberId: '104829104820999',
    whatsappVerifyToken: 'corbett_rajae_verify_2026',
    samplePrompts: [
      'What are your room rates and options for 4 family members this weekend?',
      'Do you arrange Jim Corbett / Sonanadi safaris and bird-watching walks?',
      'What are the check-in timings and is home-cooked food available?',
    ],
    isBuiltInTemplate: false,
    updatedAt: '2026-11-13T12:28:00.000Z',
  },
];
