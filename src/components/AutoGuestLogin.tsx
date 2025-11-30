'use client'

import { useSession, signIn } from 'next-auth/react'
import { useEffect, useState } from 'react'

export function AutoGuestLogin() {
  const { data: session, status } = useSession()
  const [hasAttempted, setHasAttempted] = useState(false)

  useEffect(() => {
    // Auto-login as guest if not authenticated
    if (status === 'unauthenticated' && !hasAttempted) {
      setHasAttempted(true)
      // Small delay to prevent flash
      const timer = setTimeout(() => {
        signIn('guest', { redirect: false })
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [status, hasAttempted])

  return null
}
