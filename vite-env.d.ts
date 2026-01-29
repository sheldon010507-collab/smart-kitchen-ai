/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_ANON_KEY: string;
    // Note: GEMINI_API_KEY is server-side only, never expose to frontend
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
