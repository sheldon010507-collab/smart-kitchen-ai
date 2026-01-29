
import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Initialize Stripe (Server-side)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    // apiVersion: '2025-01-27.acacia', 
});

// Initialize Supabase (Server-side)
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Helper: CORS - Strict origin validation
const getAllowedOrigin = (origin: string | undefined): string | null => {
    const allowedOrigins = [
        'https://guka.co.uk',
        'https://www.guka.co.uk',
        'https://smart-kitchen-ai.vercel.app',
        // Allow localhost in development
        ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'] : [])
    ];

    if (origin && allowedOrigins.includes(origin)) {
        return origin;
    }
    // Only allow vercel.app from specific project prefixes
    if (origin && (origin.includes('smart-kitchen') || origin.includes('guka')) && origin.endsWith('.vercel.app')) {
        return origin;
    }
    return null;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS
    const origin = req.headers.origin as string | undefined;
    const allowedOrigin = getAllowedOrigin(origin);

    if (req.method === 'OPTIONS') {
        if (allowedOrigin) res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        return res.status(200).end();
    }

    if (allowedOrigin) {
        res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // 1. Auth Check
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'Missing Authorization' });

        const token = authHeader.replace('Bearer ', '');
        const supabase = createClient(supabaseUrl!, supabaseAnonKey!);
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return res.status(401).json({ error: 'Invalid Session' });
        }

        // 2. Get Plan ID from Body
        const { priceId, planId, customerEmail } = req.body;

        if (!priceId && !planId) {
            return res.status(400).json({ error: 'Missing priceId or planId' });
        }

        // Map planId to Stripe Price ID if needed (Hardcoding for demo, normally env vars)
        // PRO_PLAN_PRICE_ID = 'price_1Q...'
        let stripePriceId = priceId;
        if (planId === 'pro') {
            // REPLACE WITH YOUR ACTUAL PRICE ID FROM STRIPE DASHBOARD
            stripePriceId = process.env.STRIPE_PRICE_ID_PRO || 'price_1Qt...';
        }

        // 3. Create Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'subscription',
            customer_email: user.email, // Pre-fill email
            client_reference_id: user.id, // Track which user bought it
            line_items: [
                {
                    price: stripePriceId,
                    quantity: 1,
                },
            ],
            // Redirect URLs
            success_url: `${allowedOrigin || 'https://guka.co.uk'}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${allowedOrigin || 'https://guka.co.uk'}/dashboard?canceled=true`,
            metadata: {
                userId: user.id,
                plan: planId || 'pro'
            }
        });

        return res.status(200).json({ sessionId: session.id, url: session.url });

    } catch (error: any) {
        console.error('Stripe Error:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
