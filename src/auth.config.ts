import type { NextAuthConfig } from 'next-auth'

// Edge-safe config — no Node.js built-ins. Imported by middleware (Edge Runtime)
// and merged into the full auth config (Node.js runtime) in auth.ts.
export const authConfig = {
  secret: process.env.AUTH_SECRET,
  session: { strategy: 'jwt' as const },
  pages: { signIn: '/login' },
  providers: [],
} satisfies NextAuthConfig
