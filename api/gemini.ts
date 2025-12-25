
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Init Supabase Client for Auth Verification
// Note: In Vercel, these should be set in Environment Variables.
// Tries standard names and VITE_ prefixed names for compatibility.
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS Handling
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // 1. Auth Verification using Supabase
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'Unauthorized: No token provided' });
        }

        if (!supabaseUrl || !supabaseAnonKey) {
            console.error('SERVER ERROR: Supabase env vars missing');
            return res.status(500).json({ error: 'Server Auth Configuration Error' });
        }

        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const token = authHeader.replace('Bearer ', '');

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }

        // 2. Load Gemini API Key
        // Priority: GEMINI_API_KEY -> VITE_GEMINI_API_KEY (Migration fallback)
        const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

        if (!apiKey) {
            console.error('SERVER ERROR: GEMINI_API_KEY missing');
            return res.status(500).json({ error: 'AI Service Configuration Error' });
        }

        // 3. Prepare Request
        const { prompt, imageBase64, mimeType, model, config } = req.body;

        // Model Selection: Payload -> Env -> Default
        // Supports GEMINI_MODEL or VITE_GEMINI_MODEL fallback
        const modelName = model || process.env.GEMINI_MODEL || process.env.VITE_GEMINI_MODEL || 'gemini-1.5-flash';

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

        // 4. Call Google API
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

        const googleRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!googleRes.ok) {
            const errText = await googleRes.text();
            console.error('Gemini Provider Error:', errText);
            // Hide exact upstream error details in production if preferred, but useful for debugging now
            return res.status(googleRes.status).json({ error: `AI Provider Error: ${errText}` });
        }

        const data = await googleRes.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        return res.status(200).json({ text, raw: data });

    } catch (error: any) {
        console.error('API Handler Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
