
// Shared in-memory storage for OTPs. 
// NOTE: In a serverless environment (like Vercel), this memory is not guaranteed to persist 
// between the 'send-code' and 'verify-code' function calls if they run on different instances (cold starts).
// For a production app, YOU MUST replace this with a persistent database like Redis, MongoDB, or Postgres.
export const otpStore = new Map<string, { code: string; expires: number }>();
