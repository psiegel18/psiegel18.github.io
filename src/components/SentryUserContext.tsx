'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useRef } from 'react'
import { setSentryUserTags, setSentryAuthProvider, type AuthProvider } from '@/lib/sentry'

/**
 * SentryUserContext - Automatically sets Sentry user tags based on session
 *
 * This component should be placed inside the SessionProvider to automatically
 * update Sentry tags whenever the user's session changes.
 *
 * Tags set:
 * - user_type: 'authenticated' | 'guest' | 'anonymous'
 * - user_role: 'USER' | 'ADMIN'
 * - auth_provider: OAuth provider used for authentication
 */
export function SentryUserContext() {
  const { data: session, status } = useSession()
  const previousSessionId = useRef<string | null>(null)

  useEffect(() => {
    // Skip if session is still loading
    if (status === 'loading') return

    // Get current user ID (or null for unauthenticated)
    const currentUserId = session?.user?.id ?? null

    // Only update if session actually changed
    if (currentUserId === previousSessionId.current) return
    previousSessionId.current = currentUserId

    if (session?.user) {
      // Set user tags
      setSentryUserTags({
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
        isGuest: session.user.isGuest,
      })

      // Determine auth provider from user ID pattern
      // Guest users have IDs like "guest_uuid"
      if (session.user.isGuest) {
        setSentryAuthProvider('guest')
      }
      // For OAuth users, the provider info is not directly available in session
      // It would be set during the sign-in flow
    } else {
      // User is not authenticated
      setSentryUserTags(null)
    }
  }, [session, status])

  // This component doesn't render anything
  return null
}
