'use server'

import { headers } from 'next/headers'
import { signIn, signOut } from '@/auth'
import { AuthError } from 'next-auth'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { getLoginRatelimit, getRateLimitIdentifierFromHeaders } from '@/lib/ratelimit'

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

  const requestHeaders = await headers()
  const identifier = getRateLimitIdentifierFromHeaders(requestHeaders)
  const { success } = await getLoginRatelimit().limit(identifier)
  if (!success) {
    return { error: 'Too many sign-in attempts. Please wait a minute and try again.' }
  }

  try {
    await signIn('credentials', { email, password, redirectTo: '/' })
  } catch (err) {
    if (isRedirectError(err)) throw err
    if (err instanceof AuthError) {
      return { error: 'Invalid email or password.' }
    }
    return { error: 'Something went wrong. Please try again.' }
  }

  return { error: null }
}
