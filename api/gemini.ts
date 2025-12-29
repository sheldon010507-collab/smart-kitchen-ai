
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// ============ CONFIGURATION ============
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// ✅ P2 Fix: Restrict CORS to allowed origins
const getAllowedOrigin = (origin: string | undefined): string | null => {
    const allowedOrigins = [
        'https://guka.co.uk',
        'https://www.guka.co.uk',
        'https://smart-kitchen-ai.vercel.app',
        // Allow localhost in development
        ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:5173'] : [])
    ];

    if (origin && allowedOrigins.includes(origin)) {
        return origin;
    }
    // Fallback for Vercel preview deployments
    if (origin && origin.endsWith('.vercel.app')) {
        return origin;
    }
    return null;
};

// ✅ P1 Fix: Simple in-memory rate limiting (per-instance)
// Note: For production, use Upstash or Redis for distributed rate limiting
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 20; // 20 requests per minute per user

const checkRateLimit = (userId: string): { allowed: boolean; remaining: number } => {
    const now = Date.now();
    const record = rateLimitStore.get(userId);

    if (!record || now > record.resetTime) {
        rateLimitStore.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
        return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1 };
    }

    if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
        return { allowed: false, remaining: 0 };
    }

    record.count++;
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - record.count };
};

// ✅ P2 Fix: Validate uploaded image
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const validateImage = (base64: string | undefined, mimeType: string | undefined): string | null => {
    if (!base64 || !mimeType) return null; // No image is OK

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
        return `Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`;
    }

    try {
        const sizeBytes = Buffer.from(base64, 'base64').length;
        if (sizeBytes > MAX_IMAGE_SIZE_BYTES) {
            return `File too large. Maximum size: ${MAX_IMAGE_SIZE_BYTES / 1024 / 1024}MB`;
        }
    } catch {
        return 'Invalid image data';
    }

    return null;
};

// ============ MAIN HANDLER ============
export default async function handler(req: VercelRequest, res: VercelResponse) {
    const origin = req.headers.origin as string | undefined;
    const allowedOrigin = getAllowedOrigin(origin);

    // CORS Handling
    if (req.method === 'OPTIONS') {
        if (allowedOrigin) {
            res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
        }
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        return res.status(200).end();
    }

    // Set CORS for actual requests
    if (allowedOrigin) {
        res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // 1. Auth Verification
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!supabaseUrl || !supabaseAnonKey) {
            console.error('SERVER ERROR: Supabase env vars missing');
            return res.status(500).json({ error: 'Service configuration error' });
        }

        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const token = authHeader.replace('Bearer ', '');

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return res.status(401).json({ error: 'Invalid or expired session' });
        }

        // 2. Rate Limiting
        const { allowed, remaining } = checkRateLimit(user.id);
        res.setHeader('X-RateLimit-Remaining', remaining.toString());

        if (!allowed) {
            return res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
        }

        // 3. Load Gemini API Key
        const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

        if (!apiKey) {
            console.error('SERVER ERROR: GEMINI_API_KEY missing');
            return res.status(500).json({ error: 'AI service not configured' });
        }

        // 4. Validate & Prepare Request
        const { prompt, imageBase64, mimeType, model, config } = req.body;

        // Validate image if provided
        const imageError = validateImage(imageBase64, mimeType);
        if (imageError) {
            return res.status(400).json({ error: imageError });
        }

        // Model Selection
        const modelName = model || process.env.GEMINI_MODEL || process.env.VITE_GEMINI_MODEL || 'gemini-3-flash-preview';

        // 🔍 Debug: Log which model is being used
        console.log(`[Gemini API] Using model: ${modelName}`);

        const parts: any[] = [];
        if (imageBase64 && mimeType) {
            parts.push({
                inlineData: { mimeType, data: imageBase64 }
            });
        }
        if (prompt) {
            parts.push({ text: prompt });
        }

        const payload: any = { contents: [{ parts }] };
        if (config) payload.generationConfig = config;

        // 5. Call Google API
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

        const googleRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!googleRes.ok) {
            const errText = await googleRes.text();
            console.error('Gemini API Error:', errText);
            // ✅ P3 Fix: Hide detailed error from client
            return res.status(502).json({ error: 'AI service temporarily unavailable. Please try again.' });
        }

        const data = await googleRes.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        return res.status(200).json({ text, raw: data });

    } catch (error: any) {
        console.error('API Handler Error:', error);
        // ✅ P3 Fix: Generic error message
        return res.status(500).json({ error: 'An unexpected error occurred' });
    }
}
