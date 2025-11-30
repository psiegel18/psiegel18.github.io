'use client'

import { SessionProvider } from 'next-auth/react'
import { ReactNode } from 'react'
import { AutoGuestLogin } from './AutoGuestLogin'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AutoGuestLogin />
      {children}
    </SessionProvider>
  )
}
