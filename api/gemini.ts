
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
    // ✅ Security Fix: Only allow vercel.app from specific project prefixes
    if (origin && (origin.includes('smart-kitchen') || origin.includes('guka')) && origin.endsWith('.vercel.app')) {
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

        // 3. Load Gemini API Key (server-side only, no VITE_ fallback)
        const apiKey = process.env.GEMINI_API_KEY;

        // 🔍 Debug logging for environment variable diagnosis
        console.log('[Gemini API] Environment check:', {
            hasGeminiKey: !!apiKey,
            nodeEnv: process.env.NODE_ENV,
            availableKeys: Object.keys(process.env).filter(k => k.includes('GEMINI') || k.includes('SUPABASE')),
        });

        if (!apiKey) {
            console.error('SERVER ERROR: GEMINI_API_KEY environment variable is required');
            console.error('Available env vars:', Object.keys(process.env).sort());
            return res.status(500).json({
                error: 'AI service not configured',
                debug: process.env.NODE_ENV === 'development' ? 'GEMINI_API_KEY missing from environment' : undefined
            });
        }

        // 4. Validate & Prepare Request
        const { prompt, imageBase64, mimeType, images, model, config } = req.body;

        // Model Selection - Use gemini-1.5-flash for multi-image support
        // Note: gemini-3-flash-preview may not support multi-image input
        const modelName = 'gemini-1.5-flash';

        // 🔍 Debug: Log which model is being used
        console.log(`[Gemini API] Using model: ${modelName}, images: ${images?.length || (imageBase64 ? 1 : 0)}`);

        const parts: any[] = [];

        // 🆕 Support multi-image array (for multi-angle scanning)
        if (images && Array.isArray(images) && images.length > 0) {
            // Limit to 4 images max to control token usage
            const limitedImages = images.slice(0, 4);

            console.log(`[Gemini API] Multi-image mode: Processing ${limitedImages.length} images`);

            for (let i = 0; i < limitedImages.length; i++) {
                const img = limitedImages[i];

                // 🔍 Debug: Log image details
                console.log(`[Gemini API] Image ${i + 1}:`, {
                    hasBase64: !!img.base64,
                    base64Length: img.base64?.length || 0,
                    mimeType: img.mimeType,
                });

                // Validate each image
                const imgError = validateImage(img.base64, img.mimeType);
                if (imgError) {
                    console.error(`[Gemini API] Image ${i + 1} validation failed:`, imgError);
                    return res.status(400).json({ error: `Image ${i + 1} validation error: ${imgError}` });
                }

                parts.push({
                    inlineData: {
                        mimeType: img.mimeType || 'image/jpeg',
                        data: img.base64
                    }
                });
            }

            console.log(`[Gemini API] Added ${parts.length} image parts to request`);
        }
        // Backward compatible: single image format
        else if (imageBase64 && mimeType) {
            const imageError = validateImage(imageBase64, mimeType);
            if (imageError) {
                return res.status(400).json({ error: imageError });
            }
            parts.push({
                inlineData: { mimeType, data: imageBase64 }
            });
        }

        // Add prompt text
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
            console.error('[Gemini API] Google API Error:', {
                status: googleRes.status,
                statusText: googleRes.statusText,
                error: errText,
                model: modelName,
                imageCount: parts.filter((p: any) => p.inlineData).length,
                hasPrompt: parts.some((p: any) => p.text),
            });

            // Parse error for better debugging
            try {
                const errJson = JSON.parse(errText);
                console.error('[Gemini API] Parsed error:', errJson);

                // Check for specific error types
                if (errJson.error?.message?.includes('API key')) {
                    console.error('[Gemini API] API Key issue detected!');
                }
                if (errJson.error?.message?.includes('model')) {
                    console.error('[Gemini API] Model issue detected! Try different model.');
                }
            } catch { }

            // ✅ P3 Fix: Hide detailed error from client but log it
            // 🔧 Enhanced: Include more debug info in development
            return res.status(502).json({
                error: 'AI service temporarily unavailable. Please try again.',
                // Include debug info in development OR if specifically a 400 error
                ...((process.env.NODE_ENV === 'development' || googleRes.status === 400) && {
                    debug: {
                        status: googleRes.status,
                        model: modelName,
                        imageCount: parts.filter((p: any) => p.inlineData).length,
                        hasPrompt: parts.some((p: any) => p.text),
                        errorPreview: errText.substring(0, 300)
                    }
                })
            });
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
