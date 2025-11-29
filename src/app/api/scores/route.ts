import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { game, score, metadata } = body

    if (!game || typeof score !== 'number') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    if (!['SNAKE', 'TETRIS'].includes(game)) {
      return NextResponse.json({ error: 'Invalid game' }, { status: 400 })
    }

    const newScore = await prisma.score.create({
      data: {
        userId: session.user.id,
        game,
        score,
        metadata: metadata || null,
      },
    })

    return NextResponse.json({ success: true, score: newScore })
  } catch (error) {
    console.error('Score submission error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const game = searchParams.get('game')
    const limit = parseInt(searchParams.get('limit') || '10')
    const userId = searchParams.get('userId')

    const where: any = {}
    if (game && ['SNAKE', 'TETRIS'].includes(game)) {
      where.game = game
    }
    if (userId) {
      where.userId = userId
    }

    const scores = await prisma.score.findMany({
      where,
      orderBy: { score: 'desc' },
      take: Math.min(limit, 100),
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            isGuest: true,
          },
        },
      },
    })

    return NextResponse.json(scores)
  } catch (error) {
    console.error('Score fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
