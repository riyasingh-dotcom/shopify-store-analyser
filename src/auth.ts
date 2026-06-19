import { createHmac, timingSafeEqual } from 'crypto'
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { authConfig } from './auth.config'

const secret: string = (() => {
  const s = process.env.AUTH_SECRET
  if (!s) throw new Error('AUTH_SECRET environment variable is required')
  return s
})()

function hmacCompare(a: string, b: string): boolean {
  const key = Buffer.from(secret)
  const hashA = createHmac('sha256', key).update(a).digest()
  const hashB = createHmac('sha256', key).update(b).digest()
  return timingSafeEqual(hashA, hashB)
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials.email
        const password = credentials.password
        if (typeof email !== 'string' || typeof password !== 'string') {
          return null
        }
        const expectedEmail = process.env.ADMIN_EMAIL ?? ''
        const expectedPassword = process.env.ADMIN_PASSWORD ?? ''
        const emailMatch = hmacCompare(email, expectedEmail)
        const passwordMatch = hmacCompare(password, expectedPassword)
        if (!emailMatch || !passwordMatch) return null
        return { id: '1', name: 'Admin', email }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id
      }
      return token
    },
    session({ session, token }) {
      if (typeof token.id === 'string') {
        session.user.id = token.id
      }
      return session
    },
  },
})
