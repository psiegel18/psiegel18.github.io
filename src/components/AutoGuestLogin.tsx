'use client'

import { useSession, signIn } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

export function AutoGuestLogin() {
  const { status } = useSession()
  const pathname = usePathname()
  const [hasAttempted, setHasAttempted] = useState(false)

  useEffect(() => {
    // Don't auto-login on auth pages (signin, error) to avoid conflicts with OAuth flow
    const isAuthPage = pathname?.startsWith('/auth')

    // Auto-login as guest if not authenticated and not on auth pages
    if (status === 'unauthenticated' && !hasAttempted && !isAuthPage) {
      setHasAttempted(true)
      // Small delay to prevent flash
      const timer = setTimeout(() => {
        signIn('guest', { redirect: false })
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [status, hasAttempted, pathname])

  return null
}
