import { MongoClient } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';

const client = new MongoClient(process.env.MONGO_URL);
let db;

async function connectDB() {
  if (!db) {
    await client.connect();
    db = client.db(process.env.DB_NAME || 'workflowstacks');
  }
  return db;
}

// Fail-CLOSED admin guard — destructive seeding must never be public.
function requireAdmin(request) {
  const secret = process.env.ADMIN_SECRET;
  const provided = request.headers.get('x-admin-secret') || new URL(request.url).searchParams.get('secret');
  if (!secret || provided !== secret) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

export async function POST(request) {
  try {
    const denied = requireAdmin(request);
    if (denied) return denied;

    const database = await connectDB();

    // Ecommerce & Marketing Skills
    const ecommerceSkills = [
      {
        id: uuidv4(),
        name: 'Competitor Price Monitor',
        title_human: 'Monitor Competitor Prices & Auto-Suggest Updates for Your Store',
        description: 'Track competitor pricing across marketplaces and get automated recommendations',
        description_human: 'Automatically track competitor prices on Shopify, Amazon & suggest optimal pricing. For ecommerce operators saving 5+ hours/week. Real-time alerts.',
        domain: 'commerce',
        domainLevel: 'practitioner',
        use_case: 'ecommerce_ops',
        audience: 'Founder, Marketer, Operator',
        category: 'ai-tool',
        stackTags: ['Shopify', 'Amazon', 'Google Sheets'],
        price: 0,
        rating: 4.7,
        installs: 3200,
        is_premium: false,
        created_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'Inventory Sync Agent',
        title_human: 'Sync Shopify & Marketplace Inventory Automatically - No More Overselling',
        description: 'Real-time inventory synchronization across Shopify and marketplaces',
        description_human: 'Keep inventory in sync across Shopify, Amazon, eBay automatically. For D2C brands preventing oversells. Updates every 5 minutes. 2k+ users.',
        domain: 'commerce',
        domainLevel: 'practitioner',
        use_case: 'ecommerce_ops',
        audience: 'Shopify Founder, D2C Operator',
        category: 'ai-tool',
        stackTags: ['Shopify', 'Amazon', 'eBay'],
        price: 0,
        rating: 4.8,
        installs: 4100,
        is_premium: false,
        created_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'Review Response Bot',
        title_human: 'Draft Personalized Replies to Product Reviews in 60 Seconds',
        description: 'AI-powered review response generator for ecommerce',
        description_human: 'Auto-draft personalized responses to customer reviews on Shopify, Amazon. For support teams handling 100+ reviews/week. 95% approval rate.',
        domain: 'commerce',
        domainLevel: 'beginner',
        use_case: 'customer_support',
        audience: 'D2C Brand, Support Team',
        category: 'ai-tool',
        stackTags: ['Shopify', 'Amazon', 'Trustpilot'],
        price: 0,
        rating: 4.6,
        installs: 5600,
        is_premium: false,
        created_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'WhatsApp Lead Qualifier',
        title_human: 'Triage WhatsApp Leads by Intent & Route to Right Team Member',
        description: 'Intelligent WhatsApp lead qualification and routing',
        description_human: 'Automatically qualify WhatsApp leads, detect intent, and assign to sales or support. For agencies managing 500+ leads/month. 40% faster response.',
        domain: 'marketing',
        domainLevel: 'practitioner',
        use_case: 'lead_qualification',
        audience: 'Agency, Sales Team',
        category: 'ai-agent',
        stackTags: ['WhatsApp', 'CRM', 'Zapier'],
        price: 0,
        rating: 4.7,
        installs: 2800,
        is_premium: false,
        created_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'SEO Blog Outline Generator',
        title_human: 'Generate SEO-Optimized Blog Outlines That Rank on Page 1',
        description: 'AI-powered SEO content planning and outline generation',
        description_human: 'Create keyword-rich blog outlines, H2/H3 structure, and meta descriptions. For content marketers scaling organic traffic. Based on top-ranking content.',
        domain: 'marketing',
        domainLevel: 'beginner',
        use_case: 'seo_blogs',
        audience: 'Content Marketer, SEO Specialist',
        category: 'prompt',
        stackTags: ['Ahrefs', 'SEMrush', 'Google Docs'],
        price: 0,
        rating: 4.5,
        installs: 7200,
        is_premium: false,
        created_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'Product Description Rewriter',
        title_human: 'Rewrite Product Descriptions for SEO & Higher Conversion Rates',
        description: 'SEO-optimized product description generator',
        description_human: 'Transform bland product descriptions into SEO-rich, conversion-focused copy. For Shopify stores increasing organic traffic. A/B tested templates.',
        domain: 'commerce',
        domainLevel: 'beginner',
        use_case: 'product_copy',
        audience: 'Ecommerce Manager, Copywriter',
        category: 'ai-tool',
        stackTags: ['Shopify', 'WooCommerce', 'BigCommerce'],
        price: 0,
        rating: 4.6,
        installs: 4900,
        is_premium: false,
        created_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'Meta Ads Copy Generator',
        title_human: 'Generate High-Converting Facebook & Instagram Ad Copy in Minutes',
        description: 'AI ad copywriting for Meta platforms',
        description_human: 'Create scroll-stopping Meta ads copy with proven frameworks. For performance marketers scaling campaigns. Includes 50+ templates. 2.5x CTR improvement.',
        domain: 'marketing',
        domainLevel: 'practitioner',
        use_case: 'paid_ads',
        audience: 'Performance Marketer, Agency',
        category: 'ai-tool',
        stackTags: ['Meta Ads', 'Facebook', 'Instagram'],
        price: 0,
        rating: 4.8,
        installs: 6100,
        is_premium: false,
        created_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'Order Status FAQ Bot',
        title_human: 'Auto-Answer "Where Is My Order?" Questions on WhatsApp & Email',
        description: 'Automated order status responses for customer support',
        description_human: 'Instantly answer order tracking questions via WhatsApp, email, chat. For D2C brands reducing support tickets by 60%. Integrates with Shopify.',
        domain: 'commerce',
        domainLevel: 'beginner',
        use_case: 'customer_support',
        audience: 'D2C Brand, Support Team',
        category: 'ai-agent',
        stackTags: ['Shopify', 'WhatsApp', 'Email'],
        price: 0,
        rating: 4.7,
        installs: 3400,
        is_premium: false,
        created_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'Local SEO Agent',
        title_human: 'Optimize for Local Search & Google Business Profile Automatically',
        description: 'Local SEO automation for multi-location businesses',
        description_human: 'Auto-optimize Google Business listings, local citations, and NAP consistency. For agencies managing 10+ locations. Ranks in local pack.',
        domain: 'marketing',
        domainLevel: 'expert',
        use_case: 'local_seo',
        audience: 'Agency Owner, Local Business',
        category: 'ai-tool',
        stackTags: ['Google Business', 'Yelp', 'Local Citations'],
        price: 0,
        rating: 4.9,
        installs: 1800,
        is_premium: false,
        created_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'AEO FAQ Generator',
        title_human: 'Generate Answer Engine Optimized FAQs for Voice & AI Search',
        description: 'AEO content creation for voice search and AI assistants',
        description_human: 'Create FAQ content optimized for ChatGPT, Perplexity, voice search. For brands appearing in AI answers. Schema markup included. Future-proof SEO.',
        domain: 'marketing',
        domainLevel: 'expert',
        use_case: 'aeo_content',
        audience: 'SEO Expert, Content Strategist',
        category: 'ai-tool',
        stackTags: ['ChatGPT', 'Perplexity', 'Schema.org'],
        price: 0,
        rating: 4.8,
        installs: 2100,
        is_premium: false,
        created_at: new Date()
      }
    ];

    // Insert ecommerce skills
    await database.collection('skills').insertMany(ecommerceSkills);

    // Personas
    const personas = [
      {
        id: uuidv4(),
        name: 'Shopify Store Operator',
        description: 'Your AI assistant for running day-to-day Shopify operations - pricing, inventory, and customer support',
        primaryDomain: 'commerce',
        targetAudience: 'Shopify Founder / Operator',
        skillIds: ecommerceSkills.filter(s => 
          ['Competitor Price Monitor', 'Inventory Sync Agent', 'Review Response Bot', 'Product Description Rewriter'].includes(s.name)
        ).map(s => s.id),
        created_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'Performance Marketing Lead',
        description: 'AI-powered performance marketer handling SEO, paid ads, and conversion optimization',
        primaryDomain: 'marketing',
        targetAudience: 'Performance Marketer / Agency',
        skillIds: ecommerceSkills.filter(s => 
          ['SEO Blog Outline Generator', 'Meta Ads Copy Generator', 'AEO FAQ Generator', 'Local SEO Agent'].includes(s.name)
        ).map(s => s.id),
        created_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'Founder Launch Agent',
        description: 'Your AI co-founder for validating ideas, market research, and launching your first customers',
        primaryDomain: 'founder_ops',
        targetAudience: 'Startup Founder',
        skillIds: ecommerceSkills.filter(s => 
          ['SEO Blog Outline Generator', 'WhatsApp Lead Qualifier'].includes(s.name)
        ).map(s => s.id),
        created_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'Customer Support Agent for D2C',
        description: 'AI support agent handling reviews, order questions, and customer inquiries 24/7',
        primaryDomain: 'commerce',
        targetAudience: 'D2C Brand Ops',
        skillIds: ecommerceSkills.filter(s => 
          ['Review Response Bot', 'Order Status FAQ Bot'].includes(s.name)
        ).map(s => s.id),
        created_at: new Date()
      }
    ];

    // Insert personas
    await database.collection('personas').deleteMany({});
    await database.collection('personas').insertMany(personas);

    // OpenClaw-style Playbooks with time saved
    const openclawPlaybooks = [
      {
        id: uuidv4(),
        title: 'Replace Your Shopify VA for Price Monitoring',
        description: 'Automate competitor price tracking and pricing updates - save 5-10 hours per week',
        audience: 'Shopify Founder / Operator',
        useCase: 'ecommerce_ops',
        problem: 'Manually checking competitor prices daily and updating your store takes hours',
        estimatedTimeSavedPerWeek: 8,
        skillIds: ecommerceSkills.filter(s => 
          ['Competitor Price Monitor', 'Product Description Rewriter'].includes(s.name)
        ).map(s => s.id),
        created_at: new Date()
      },
      {
        id: uuidv4(),
        title: 'Respond to All Reviews in 10 Minutes Per Day',
        description: 'AI-powered review response system that maintains your brand voice while saving hours',
        audience: 'D2C Brand Operator',
        useCase: 'customer_support',
        problem: 'Responding to every customer review across platforms takes 30+ minutes daily',
        estimatedTimeSavedPerWeek: 4,
        skillIds: ecommerceSkills.filter(s => 
          s.name === 'Review Response Bot'
        ).map(s => s.id),
        created_at: new Date()
      },
      {
        id: uuidv4(),
        title: 'Local SEO + AEO Agent for Dubai Agency',
        description: 'Comprehensive local SEO and answer engine optimization for agencies managing multiple clients',
        audience: 'Agency Owner',
        useCase: 'marketing',
        problem: 'Managing local SEO for 10+ clients with consistent updates is overwhelming',
        estimatedTimeSavedPerWeek: 6,
        skillIds: ecommerceSkills.filter(s => 
          ['Local SEO Agent', 'AEO FAQ Generator', 'SEO Blog Outline Generator'].includes(s.name)
        ).map(s => s.id),
        created_at: new Date()
      },
      {
        id: uuidv4(),
        title: 'WhatsApp Lead Machine - Qualify & Route 500+ Leads/Month',
        description: 'Automated WhatsApp lead qualification and routing system for high-volume sales teams',
        audience: 'Sales Team / Agency',
        useCase: 'lead_qualification',
        problem: 'Manually qualifying hundreds of WhatsApp leads causes delays and missed opportunities',
        estimatedTimeSavedPerWeek: 10,
        skillIds: ecommerceSkills.filter(s => 
          s.name === 'WhatsApp Lead Qualifier'
        ).map(s => s.id),
        created_at: new Date()
      }
    ];

    // Update playbooks collection
    await database.collection('playbooks').insertMany(openclawPlaybooks);

    return Response.json({ 
      success: true,
      ecommerceSkills: ecommerceSkills.length,
      personas: personas.length,
      playbooks: openclawPlaybooks.length
    });
    
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
