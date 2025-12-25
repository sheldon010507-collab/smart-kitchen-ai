import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  // Populate process.env for the API handler
  Object.assign(process.env, env);

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      {
        name: 'configure-server',
        configureServer(server) {
          server.middlewares.use('/api', async (req, res, next) => {
            try {
              // 1. Parse URL to find the handler
              const url = req.url?.split('?')[0] || '';
              // Remove leading slash if present
              const endpoint = url.startsWith('/') ? url.slice(1) : url;

              if (!endpoint) return next();

              // 2. Parse Body using a helper logic
              const buffers: any[] = [];
              for await (const chunk of req) {
                buffers.push(chunk);
              }
              const rawBody = Buffer.concat(buffers).toString();
              (req as any).body = rawBody ? JSON.parse(rawBody) : {};

              // 3. Polyfill Res
              (res as any).status = (statusCode: number) => {
                res.statusCode = statusCode;
                return res;
              };
              (res as any).json = (data: any) => {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
                return res;
              };

              // 4. Dynamic Import
              // Sanitize endpoint to prevent directory traversal
              const safeEndpoint = endpoint.replace(/[^a-zA-Z0-9-_]/g, '');

              try {
                // @ts-ignore
                const handler = (await import(`./api/${safeEndpoint}.ts`)).default;
                await handler(req as any, res as any);
              } catch (e) {
                console.error(`Handler not found for ${safeEndpoint}:`, e);
                res.statusCode = 404;
                res.end(JSON.stringify({ error: 'Endpoint not found or handler error' }));
              }

            } catch (error) {
              console.error('Local API Error:', error);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'Internal Server Error' }));
            }
          });
        }
      }
    ],
    // ✅ 已移除 API Key 暴露 - Key 只存在於服務端 api/gemini.ts
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
