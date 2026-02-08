import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      configureServer: (server) => {
        // Mock Vercel API for Local Development
        server.middlewares.use('/api/gemini', async (req, res, next) => {
          if (req.method !== 'POST') {
            next();
            return;
          }

          try {
            // 1. Read Body
            const buffers = [];
            for await (const chunk of req) {
              buffers.push(chunk);
            }
            const data = Buffer.concat(buffers).toString();

            let body;
            try {
              body = JSON.parse(data);
            } catch (e) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Invalid JSON body' }));
              return;
            }

            // 2. Check API Key
            const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
            if (!apiKey) {
              console.error('❌ Missing GEMINI_API_KEY in .env');
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'Server misconfiguration: Missing API Key' }));
              return;
            }

            // 3. Prepare Google API Request
            // Use gemini-1.5-flash for speed and stability
            const modelName = 'gemini-1.5-flash';
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

            const { prompt, imageBase64, mimeType, images, config } = body;

            const parts: any[] = [];

            // Handle multiple images
            if (images && Array.isArray(images)) {
              images.forEach(img => {
                if (img.base64 && img.mimeType) {
                  parts.push({
                    inlineData: { mimeType: img.mimeType, data: img.base64 }
                  });
                }
              });
            } else if (imageBase64 && mimeType) {
              parts.push({
                inlineData: { mimeType, data: imageBase64 }
              });
            }

            if (prompt) {
              parts.push({ text: prompt });
            }

            const payload = {
              contents: [{ parts }],
              generationConfig: {
                temperature: 0.2,
                topP: 0.8,
                topK: 40,
                maxOutputTokens: 8192,
                responseMimeType: "application/json",
                ...config
              }

            };

            console.log(`🤖 Local API: Calling ${modelName}...`);

            // 4. Call Google
            const googleRes = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });

            if (!googleRes.ok) {
              const errText = await googleRes.text();
              console.error('❌ Google API Error:', errText);
              res.statusCode = 502;
              res.end(JSON.stringify({ error: 'AI Service Error', details: errText }));
              return;
            }

            const googleData = await googleRes.json();
            const text = googleData.candidates?.[0]?.content?.parts?.[0]?.text || '';

            console.log('✅ Local API: Success');

            // 5. Respond
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ text, raw: googleData }));

          } catch (err: any) {
            console.error('❌ Local API Warning:', err);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Internal Server Error', message: err.message }));
          }
        });
      }
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
