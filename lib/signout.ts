'use server'

import { destroySession } from '@/lib/session'
import { redirect } from 'next/navigation'

export async function signOutAction() {
  try {
    await destroySession()
    redirect('/signin')
  } catch (error) {
    // Even if there's an error destroying the session, redirect to signin
    redirect('/signin')
  }
}