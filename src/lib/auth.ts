import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import AzureADProvider from 'next-auth/providers/azure-ad'
import AppleProvider from 'next-auth/providers/apple'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './prisma'
import { v4 as uuidv4 } from 'uuid'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    // Guest login
    CredentialsProvider({
      id: 'guest',
      name: 'Guest',
      credentials: {},
      async authorize() {
        // Create a guest user
        const guestUser = await prisma.user.create({
          data: {
            id: `guest_${uuidv4()}`,
            name: `Guest_${Math.random().toString(36).substring(2, 8)}`,
            isGuest: true,
          },
        })
        return {
          id: guestUser.id,
          name: guestUser.name,
          email: null,
          image: null,
          role: guestUser.role,
          isGuest: true,
        }
      },
    }),
    // OAuth providers
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    AzureADProvider({
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      tenantId: 'common',
    }),
    AppleProvider({
      clientId: process.env.APPLE_CLIENT_ID!,
      clientSecret: process.env.APPLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Check if this is an OAuth sign-in for an existing guest
      if (account?.provider !== 'guest' && user.email) {
        // Check if admin
        const adminEmail = process.env.ADMIN_EMAIL
        if (user.email === adminEmail) {
          await prisma.user.update({
            where: { email: user.email },
            data: { role: 'ADMIN' },
          }).catch(() => {
            // User might not exist yet, will be created with default role
          })
        }
      }
      return true
    },
    async jwt({ token, user, trigger, session }: { token: any; user?: any; trigger?: string; session?: any }) {
      if (user) {
        token.id = user.id
        token.role = user.role || 'USER'
        token.isGuest = user.isGuest || false
      }

      // Handle session update (e.g., guest upgrading to full account)
      if (trigger === 'update' && session) {
        token.role = session.role
        token.isGuest = session.isGuest
      }

      return token
    },
    async session({ session, token }: { session: any; token: any }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role
        session.user.isGuest = token.isGuest
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  events: {
    async signIn({ user, isNewUser }) {
      if (isNewUser && user.email === process.env.ADMIN_EMAIL) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: 'ADMIN' },
        })
      }
    },
  },
}
