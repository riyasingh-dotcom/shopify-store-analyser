'use server'

import { signIn, signOut } from '@/auth'
import { AuthError } from 'next-auth'

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: '/login' })
}

export type SignInState = {
  error: string | null
}

export async function signInAction(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = formData.get('email')
  const password = formData.get('password')

  if (typeof email !== 'string' || typeof password !== 'string') {
    return { error: 'Invalid form submission.' }
  }

  try {
    await signIn('credentials', { email, password, redirectTo: '/' })
  } catch (err) {
    // NextAuth throws a NEXT_REDIRECT for successful sign-in — re-throw it
    if (err instanceof Error && err.message === 'NEXT_REDIRECT') {
      throw err
    }
    if (err instanceof AuthError) {
      return { error: 'Invalid email or password.' }
    }
    return { error: 'Something went wrong. Please try again.' }
  }

  return { error: null }
}
