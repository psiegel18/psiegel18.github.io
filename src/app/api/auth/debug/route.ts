import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    const adminEmail = process.env.ADMIN_EMAIL

    return NextResponse.json({
      hasSession: !!session,
      user: session?.user ? {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
        isGuest: session.user.isGuest,
      } : null,
      adminEmailConfigured: !!adminEmail,
      adminEmailLength: adminEmail?.length,
      // Show first and last 3 chars for debugging (without exposing full email)
      adminEmailPreview: adminEmail ? `${adminEmail.slice(0, 3)}...${adminEmail.slice(-3)}` : null,
      userEmailMatch: session?.user?.email?.toLowerCase().trim() === adminEmail?.toLowerCase().trim(),
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get session', details: String(error) }, { status: 500 })
  }
}
