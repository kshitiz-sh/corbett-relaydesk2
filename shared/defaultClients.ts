import type { ClientBotConfig } from './types.ts';

export const DEFAULT_CLIENTS: ClientBotConfig[] = [
  {
    id: 'cli-corbett-rajae-homestay',
    slug: 'corbett-rajae-homestay',
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
        name: 'Cozy Room with Valley View',
        price: '₹2,100 – ₹2,800 / night (seasonal)',
        duration: '2–3 guests',
        description:
          'King bed with panoramic mountain and valley views, free Wi-Fi, daily housekeeping, and quiet forest surroundings.',
      },
      {
        id: 'srv-corbett-2',
        name: 'Premium Spacious Room with Terrace',
        price: '₹2,800 – ₹3,500 / night (seasonal)',
        duration: '2–3 guests',
        description:
          'Spacious room featuring a private attached balcony/terrace overlooking the Himalayan foothills and greenery.',
      },
      {
        id: 'srv-corbett-3',
        name: 'Family Deluxe Room (Two-Room Set)',
        price: '₹3,500 – ₹3,900+ / night (seasonal)',
        duration: '4–6 guests',
        description:
          'Ideal for families or small groups with multiple beds, expansive forest/mountain vistas, and shared lounge access.',
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
  {
    id: 'tpl-brightsmile-dental',
    slug: 'brightsmile-dental',
    businessName: 'BrightSmile Dental Studio',
    industry: 'Healthcare & Clinics',
    tagline: 'Preventive, cosmetic, and family dentistry',
    location: '420 Oakridge Ave, Suite 210, Austin, TX',
    website: 'https://brightsmiledental.example.com',
    agentName: 'Maya',
    tone: 'warm',
    primaryLanguage: 'English',
    operatingHours: 'Mon–Fri 8:00 AM – 6:00 PM, Sat 9:00 AM – 2:00 PM (Closed Sun)',
    greetingMessage:
      'Hello! Welcome to *BrightSmile Dental Studio*. I am Maya, your virtual desk assistant. How can I help with appointments, treatments, or clinic hours today?',
    fallbackMessage:
      'I want to make sure you get accurate clinical guidance. Let me connect you with our front desk coordinator right away.',
    services: [
      {
        id: 'srv-1',
        name: 'New Patient Exam & Digital X-Rays',
        price: '$145',
        duration: '60 mins',
        description: 'Comprehensive oral exam, digital X-rays, and personalized care plan.',
      },
      {
        id: 'srv-2',
        name: 'Routine Cleaning & Polish',
        price: '$120',
        duration: '45 mins',
        description: 'Gentle ultrasonic scaling, plaque removal, and fluoride polish.',
      },
      {
        id: 'srv-3',
        name: 'In-Office LED Teeth Whitening',
        price: '$395',
        duration: '75 mins',
        description: 'Single-visit enamel-safe whitening up to 6 shades brighter.',
      },
      {
        id: 'srv-4',
        name: 'Same-Day Emergency Relief Visit',
        price: '$95',
        duration: '30 mins',
        description: 'Urgent triage for severe toothache, broken crown, or swelling.',
      },
    ],
    faqs: [
      {
        id: 'faq-1',
        question: 'Which dental insurance plans do you accept?',
        answer: 'We accept Delta Dental, Cigna, MetLife, Aetna, and BlueCross PPO plans, and offer 0% APR financing via CareCredit.',
      },
      {
        id: 'faq-2',
        question: 'Is parking available at the clinic?',
        answer: 'Yes, free validated underground parking is available behind Oakridge Plaza.',
      },
    ],
    knowledgeBase: [
      {
        id: 'kb-dental-1',
        title: 'New Patient Intake & Prep',
        category: 'Policies',
        content:
          'New patients should arrive 15 minutes before their appointment with a photo ID and dental insurance card. Digital X-rays from another dentist within the past 6 months can be emailed to care@brightsmiledental.example.com to avoid retakes.',
        sourceType: 'manual',
        sourceLabel: 'Clinic Handbook',
        enabled: true,
      },
    ],
    escalationTriggers:
      'Severe pain, facial swelling, bleeding emergencies, insurance billing disputes, or direct requests to speak with a dentist or receptionist.',
    escalationContactName: 'Elena Brooks (Front Desk Lead)',
    escalationContactPhone: '+1 (512) 555-0194',
    escalationContactEmail: 'care@brightsmiledental.example.com',
    bookingInstructions:
      'Collect the patient full name, preferred day/time window, and whether they are a new or returning patient. Do not confirm an exact calendar slot until the desk verifies.',
    whatsappPhoneNumberId: '104829104820111',
    whatsappVerifyToken: 'brightsmile_verify_2026',
    samplePrompts: [
      'How much is teeth whitening and how long does it take?',
      'Do you take Delta Dental insurance?',
      'I have severe tooth pain right now, can I come in today?',
    ],
    isBuiltInTemplate: true,
    updatedAt: '2026-11-10T10:00:00.000Z',
  },
  {
    id: 'tpl-saffron-oak',
    slug: 'saffron-oak-bistro',
    businessName: 'Saffron & Oak Bistro',
    industry: 'Restaurants & Hospitality',
    tagline: 'Wood-fired seasonal kitchen & private dining',
    location: '88 Market Street, San Francisco, CA',
    website: 'https://saffronandoak.example.com',
    agentName: 'Julian',
    tone: 'friendly',
    primaryLanguage: 'English',
    operatingHours: 'Tue–Thu 5:00 PM – 10:00 PM, Fri–Sun 12:00 PM – 11:00 PM (Closed Mon)',
    greetingMessage:
      'Welcome to *Saffron & Oak Bistro*! I can help you reserve a table, check tonight’s menu highlights, or arrange private dining.',
    fallbackMessage:
      'Let me pass your note to our dining room host so we take great care of your party.',
    services: [
      {
        id: 'srv-1',
        name: 'Main Dining Table Reservation',
        price: 'No deposit (parties up to 6)',
        duration: '90 min seating',
        description: 'Indoor hearth seating or heated garden patio tables.',
      },
      {
        id: 'srv-2',
        name: 'Chef’s 5-Course Tasting Menu',
        price: '$95 / guest',
        duration: '2 hours',
        description: 'Seasonal farm-to-table tasting; optional wine pairing +$55.',
      },
      {
        id: 'srv-3',
        name: 'Private Cellar Room (8–18 Guests)',
        price: '$1,500 minimum spend',
        duration: '3 hours',
        description: 'Dedicated sommelier and custom printed dinner menus.',
      },
    ],
    faqs: [
      {
        id: 'faq-1',
        question: 'Do you accommodate vegan and gluten-free guests?',
        answer: 'Yes, 60% of our menu is naturally gluten-free and we offer a full plant-based tasting option with 24 hours notice.',
      },
      {
        id: 'faq-2',
        question: 'What is the corkage fee?',
        answer: 'Corkage is $35 per 750ml bottle, waived if you purchase a bottle from our cellar list.',
      },
    ],
    knowledgeBase: [
      {
        id: 'kb-bistro-1',
        title: 'Patio Weather & Private Dining Policy',
        category: 'Policies',
        content:
          'Our heated garden patio has overhead awnings for light rain. Private Cellar Room bookings require a signed event sheet and 25% deposit 7 days prior, with final guest count confirmed 48 hours before seating.',
        sourceType: 'manual',
        sourceLabel: 'Host Manual',
        enabled: true,
      },
    ],
    escalationTriggers:
      'Parties larger than 8 guests, severe food allergies, event buyouts, or complaints about a recent visit.',
    escalationContactName: 'Marco Rossi (Maître D’)',
    escalationContactPhone: '+1 (415) 555-0148',
    escalationContactEmail: 'reservations@saffronandoak.example.com',
    bookingInstructions:
      'Ask for party size, desired date and time, patio vs. indoor preference, and any dietary restrictions.',
    whatsappPhoneNumberId: '104829104820222',
    whatsappVerifyToken: 'saffron_oak_verify_2026',
    samplePrompts: [
      'Can I book a patio table for 4 this Friday at 7:30 PM?',
      'Do you have gluten-free or vegan dinner options?',
      'We want to book the private cellar for 14 people next month.',
    ],
    isBuiltInTemplate: true,
    updatedAt: '2026-11-10T10:00:00.000Z',
  },
  {
    id: 'tpl-apex-realty',
    slug: 'apex-realty',
    businessName: 'Apex Realty Partners',
    industry: 'Real Estate',
    tagline: 'Residential sales, rentals & private property tours',
    location: '1200 Brickell Bay Dr, Miami, FL',
    website: 'https://apexrealty.example.com',
    agentName: 'Clara',
    tone: 'executive',
    primaryLanguage: 'English',
    operatingHours: 'Mon–Sat 9:00 AM – 7:00 PM, Sun 11:00 AM – 4:00 PM',
    greetingMessage:
      'Thank you for messaging *Apex Realty Partners*. Share the neighborhood, budget, or listing address you are interested in and I will arrange next steps.',
    fallbackMessage:
      'I am routing your inquiry directly to a licensed senior advisor who can provide detailed comparables and scheduling.',
    services: [
      {
        id: 'srv-1',
        name: 'Private Property Viewing',
        price: 'Complimentary',
        duration: '45 mins',
        description: 'In-person or live FaceTime/WhatsApp video walkthrough with a listing agent.',
      },
      {
        id: 'srv-2',
        name: 'Complimentary Home Valuation',
        price: 'Free market report',
        duration: '24 hr turnaround',
        description: 'Comparative market analysis and net-proceeds breakdown for sellers.',
      },
      {
        id: 'srv-3',
        name: 'Relocation & Rental Concierge',
        price: 'Tenant-free placement',
        duration: 'Custom',
        description: 'Curated shortlist of luxury rentals matching school, commute, and pet needs.',
      },
    ],
    faqs: [
      {
        id: 'faq-1',
        question: 'What documents are needed for a rental application?',
        answer: 'Photo ID, last 2 pay stubs or employment offer letter, and a standard credit/background screening.',
      },
      {
        id: 'faq-2',
        question: 'Do you work with international cash buyers?',
        answer: 'Yes, our advisory team coordinates remote closings, LLC structuring referrals, and escrow guidance.',
      },
    ],
    knowledgeBase: [
      {
        id: 'kb-realty-1',
        title: 'Brickell & Bayshore Viewing Protocol',
        category: 'Directions & Access',
        content:
          'Condo buildings in Brickell require 24-hour advance visitor registration with building concierge. Buyers must bring a government ID for valet check-in; remote clients can request a live WhatsApp video tour.',
        sourceType: 'manual',
        sourceLabel: 'Brokerage SOP',
        enabled: true,
      },
    ],
    escalationTriggers:
      'Offer submissions, contract negotiations, earnest money questions, or requests for a licensed broker call.',
    escalationContactName: 'David Alvarez (Managing Broker)',
    escalationContactPhone: '+1 (305) 555-0172',
    escalationContactEmail: 'advisory@apexrealty.example.com',
    bookingInstructions:
      'Qualify buyer/renter by asking budget range, preferred neighborhood, bedroom count, and target move-in date.',
    whatsappPhoneNumberId: '104829104820333',
    whatsappVerifyToken: 'apex_realty_verify_2026',
    samplePrompts: [
      'I want to schedule a viewing for a 2-bed condo near Brickell around $4,200/mo.',
      'What documents do I need to apply for a rental?',
      'I am ready to submit an offer on 440 Bayshore Unit 18B.',
    ],
    isBuiltInTemplate: true,
    updatedAt: '2026-11-10T10:00:00.000Z',
  },
  {
    id: 'tpl-volt-detailing',
    slug: 'volt-detailing',
    businessName: 'Volt Auto Detailing & PPF',
    industry: 'Automotive Services',
    tagline: 'Ceramic coating, paint protection film & interior restoration',
    location: '740 Industrial Pkwy, Unit B, Denver, CO',
    website: 'https://voltdetailing.example.com',
    agentName: 'Sam',
    tone: 'concise',
    primaryLanguage: 'English',
    operatingHours: 'Mon–Sat 8:00 AM – 5:30 PM (Closed Sun)',
    greetingMessage:
      'Hey! Thanks for texting *Volt Auto Detailing*. Tell us your vehicle year, make, and model plus the service you are looking for.',
    fallbackMessage:
      'Let me have our lead installer review your vehicle photos and send an exact quote shortly.',
    services: [
      {
        id: 'srv-1',
        name: 'Full Interior & Exterior Reset',
        price: '$249 (Sedan) / $299 (SUV)',
        duration: '4 hours',
        description: 'Foam decontamination, clay bar, steam sanitization, and 6-month sealant.',
      },
      {
        id: 'srv-2',
        name: '5-Year Ceramic Coating Package',
        price: 'From $1,150',
        duration: '2 days',
        description: 'Single-stage paint correction plus 9H ceramic protection on paint, glass, and wheel faces.',
      },
      {
        id: 'srv-3',
        name: 'Track Pack PPF (Front End)',
        price: 'From $1,850',
        duration: '2–3 days',
        description: 'Self-healing 8-mil XPEL film on bumper, full hood, fenders, and mirrors.',
      },
    ],
    faqs: [
      {
        id: 'faq-1',
        question: 'Do I need to leave my car overnight for ceramic coating?',
        answer: 'Yes, ceramic coating requires a 24-hour indoor cure window away from moisture.',
      },
      {
        id: 'faq-2',
        question: 'Can you remove pet hair and coffee stains?',
        answer: 'Yes, our Full Interior Reset includes hot-water extraction and pet hair removal (+$45 for heavy buildup).',
      },
    ],
    knowledgeBase: [
      {
        id: 'kb-volt-1',
        title: 'Aftercare for Ceramic & PPF',
        category: 'Policies',
        content:
          'Avoid washing your vehicle for 7 days after ceramic coating or PPF installation so edges and coating cure fully. Hand-wash only using pH-neutral soap; automatic brush washes void coating warranty.',
        sourceType: 'manual',
        sourceLabel: 'Shop Care Guide',
        enabled: true,
      },
    ],
    escalationTriggers:
      'Custom exotic vehicle quotes, insurance claim repairs, warranty claims, or requests to speak with shop manager.',
    escalationContactName: 'Tyler Reed (Shop Manager)',
    escalationContactPhone: '+1 (303) 555-0161',
    escalationContactEmail: 'bookings@voltdetailing.example.com',
    bookingInstructions:
      'Ask for vehicle year/make/model, desired package, and preferred drop-off morning (8 AM – 10 AM).',
    whatsappPhoneNumberId: '104829104820444',
    whatsappVerifyToken: 'volt_detailing_verify_2026',
    samplePrompts: [
      'How much for a full interior reset on a 2024 Model Y?',
      'Do I have to leave my car overnight for ceramic coating?',
      'My bumper was scratched in a parking lot, is that covered under my PPF warranty?',
    ],
    isBuiltInTemplate: true,
    updatedAt: '2026-11-10T10:00:00.000Z',
  },
  {
    id: 'tpl-lumiere-salon',
    slug: 'lumiere-salon',
    businessName: 'Lumière Hair & Botanical Spa',
    industry: 'Beauty & Wellness',
    tagline: 'Precision cuts, balayage & holistic scalp rituals',
    location: '312 Melrose Place, Los Angeles, CA',
    website: 'https://lumieresalon.example.com',
    agentName: 'Chloe',
    tone: 'warm',
    primaryLanguage: 'English',
    operatingHours: 'Tue–Fri 10:00 AM – 7:00 PM, Sat–Sun 9:00 AM – 5:00 PM',
    greetingMessage:
      'Hi there! Welcome to *Lumière Hair & Botanical Spa*. I would love to help you book a stylist, check service pricing, or answer prep questions.',
    fallbackMessage:
      'I will flag your request for our salon coordinator so we match you with the ideal senior stylist.',
    services: [
      {
        id: 'srv-1',
        name: 'Signature Cut & Blowout',
        price: '$110',
        duration: '60 mins',
        description: 'Consultation, botanical wash, precision cut, and styled finish.',
      },
      {
        id: 'srv-2',
        name: 'Custom Dimensional Balayage',
        price: '$285',
        duration: '3 hours',
        description: 'Hand-painted highlights, bond-building gloss, and blowout.',
      },
      {
        id: 'srv-3',
        name: 'Japanese Head Spa & Steam Ritual',
        price: '$165',
        duration: '60 mins',
        description: 'Micro-mist scalp detox, lymphatic massage, and deep hydration mask.',
      },
    ],
    faqs: [
      {
        id: 'faq-1',
        question: 'What is your cancellation policy?',
        answer: 'Please reschedule or cancel at least 24 hours ahead to avoid a 50% late-cancellation fee.',
      },
    ],
    knowledgeBase: [
      {
        id: 'kb-salon-1',
        title: 'Balayage & Color Appointment Prep',
        category: 'Policies',
        content:
          'Arrive with dry, unwashed hair (24–48 hours post-wash is ideal) for dimensional color services. Guests bringing inspiration photos get the fastest shade alignment during consultation.',
        sourceType: 'manual',
        sourceLabel: 'Stylist Guide',
        enabled: true,
      },
    ],
    escalationTriggers:
      'Color correction consultations, bridal party inquiries, or late-fee disputes.',
    escalationContactName: 'Nadia Laurent (Creative Director)',
    escalationContactPhone: '+1 (310) 555-0129',
    escalationContactEmail: 'concierge@lumieresalon.example.com',
    bookingInstructions:
      'Ask for service type, preferred stylist tier, and 2 preferred time windows.',
    whatsappPhoneNumberId: '104829104820555',
    whatsappVerifyToken: 'lumiere_salon_verify_2026',
    samplePrompts: [
      'How long does custom balayage take and what does it cost?',
      'What is your cancellation policy?',
      'I am planning bridal hair and makeup for 6 people in June.',
    ],
    isBuiltInTemplate: true,
    updatedAt: '2026-11-10T10:00:00.000Z',
  },
  {
    id: 'tpl-nordic-thread',
    slug: 'nordic-thread',
    businessName: 'Nordic Thread Apparel',
    industry: 'E-Commerce & Retail',
    tagline: 'Minimalist merino & organic cotton essentials',
    location: 'Online D2C & Flagship at 55 Mercer St, NY',
    website: 'https://nordicthread.example.com',
    agentName: 'Soren',
    tone: 'concise',
    primaryLanguage: 'English',
    operatingHours: 'Support Mon–Sun 8:00 AM – 8:00 PM EST',
    greetingMessage:
      'Hi! You have reached *Nordic Thread Apparel*. Ask me about sizing, fabric care, shipping times, or order returns.',
    fallbackMessage:
      'Let me escalate your order number to a support specialist who can update your shipment directly.',
    services: [
      {
        id: 'srv-1',
        name: 'Heavyweight Merino Crewneck',
        price: '$185',
        duration: 'Ships in 24h',
        description: '100% Australian extra-fine merino wool in Slate, Oat, and Forest.',
      },
      {
        id: 'srv-2',
        name: 'Organic Oxford Overshirt',
        price: '$140',
        duration: 'Ships in 24h',
        description: 'Relaxed boxy fit, 280gsm organic brushed cotton twill.',
      },
      {
        id: 'srv-3',
        name: 'Express 2-Day Courier Upgrade',
        price: '$15 (Free over $200)',
        duration: '2 business days',
        description: 'Tracked doorstep delivery across the US and Canada.',
      },
    ],
    faqs: [
      {
        id: 'faq-1',
        question: 'How do returns and exchanges work?',
        answer: 'Free 30-day returns and instant size exchanges on unworn items with tags attached.',
      },
      {
        id: 'faq-2',
        question: 'How should I wash merino wool?',
        answer: 'Hand wash cold or gentle wool cycle inside a mesh bag, then dry flat.',
      },
    ],
    knowledgeBase: [
      {
        id: 'kb-nordic-1',
        title: 'Sizing & Fit Guide',
        category: 'General Info',
        content:
          'Merino Crewnecks have a tailored standard fit (size up if you prefer a relaxed drape). Organic Oxford Overshirts are cut boxy for layering over tees or knitwear.',
        sourceType: 'manual',
        sourceLabel: 'Catalog Specs',
        enabled: true,
      },
    ],
    escalationTriggers:
      'Damaged items, lost packages, refund status disputes, or order modifications after shipment.',
    escalationContactName: 'Hannah Lindqvist (Customer Experience)',
    escalationContactPhone: '+1 (212) 555-0188',
    escalationContactEmail: 'support@nordicthread.example.com',
    bookingInstructions:
      'If asking about an existing order, ask for their 6-digit order number (e.g. #NT-4821) and email address.',
    whatsappPhoneNumberId: '104829104820666',
    whatsappVerifyToken: 'nordic_thread_verify_2026',
    samplePrompts: [
      'How do I wash the Heavyweight Merino Crewneck?',
      'Do you offer free shipping and returns?',
      'My order #NT-4821 arrived with a torn sleeve, I need a replacement.',
    ],
    isBuiltInTemplate: true,
    updatedAt: '2026-11-10T10:00:00.000Z',
  },
];
