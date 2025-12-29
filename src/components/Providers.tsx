'use client'

import { SessionProvider } from 'next-auth/react'
import { ReactNode } from 'react'
import { AutoGuestLogin } from './AutoGuestLogin'
import { SentryUserContext } from './SentryUserContext'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AutoGuestLogin />
      <SentryUserContext />
      {children}
    </SessionProvider>
  )
}
