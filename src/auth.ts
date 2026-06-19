import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials.email
        const password = credentials.password
        if (
          typeof email !== 'string' ||
          typeof password !== 'string' ||
          email !== process.env.ADMIN_EMAIL ||
          password !== process.env.ADMIN_PASSWORD
        ) {
          return null
        }
        return { id: '1', name: 'Admin', email }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
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
