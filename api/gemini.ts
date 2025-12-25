import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS (Optional: Vercel usually handles this, but good to have if needed)
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { prompt, imageBase64, mimeType, model, config } = req.body;

    // 1. Get Secret Key from Server Env (with fallbacks for legacy/local VITE_ vars)
    const apiKey =
        process.env.GEMINI_API_KEY ||
        process.env.VITE_GEMINI_API_KEY ||
        process.env.VITE_GOOGLE_API_KEY ||
        process.env.VITE_API_KEY;

    if (!apiKey) {
        console.error('SERVER ERROR: Missing GEMINI_API_KEY (or VITE_GEMINI_API_KEY) in environment variables.');
        return res.status(500).json({ error: 'Server configuration error: Integrity check failed. Please check your .env.local file.' });
    }

    // 2. Select Model
    const modelName = model || process.env.GEMINI_MODEL || process.env.VITE_GEMINI_MODEL || 'gemini-1.5-flash';

    try {
        // 3. Construct Google API Payload
        const parts: any[] = [];

        // Add Image (Multimodal)
        if (imageBase64 && mimeType) {
            parts.push({
                inlineData: {
                    mimeType: mimeType,
                    data: imageBase64
                }
            });
        }

        // Add Prompt
        if (prompt) {
            parts.push({ text: prompt });
        }

        const payload: any = {
            contents: [{ parts }]
        };

        // Add Generation Config (Schema, Temperature, JSON mode etc.)
        if (config) {
            payload.generationConfig = config;
        }

        // 4. Call Google Generative Language API
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

        const googleRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!googleRes.ok) {
            const errorText = await googleRes.text();
            console.error('Gemini API Error:', errorText);
            return res.status(googleRes.status).json({ error: `Gemini Provider Error: ${errorText}` });
        }

        const data = await googleRes.json();

        // 5. Extract and Return Text
        // Response structure: candidates[0].content.parts[0].text
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Also return raw in case frontend needs it, but text is primary
        return res.status(200).json({ text, raw: data });

    } catch (error: any) {
        console.error('Proxy Error:', error);
        return res.status(500).json({ error: `Proxy Error: ${error.message}` });
    }
}
