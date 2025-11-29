import { DefaultSession, DefaultUser } from 'next-auth'
import { Role } from '@prisma/client'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: Role
      isGuest: boolean
    } & DefaultSession['user']
  }

  interface User extends DefaultUser {
    role: Role
    isGuest: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: Role
    isGuest: boolean
  }
}
