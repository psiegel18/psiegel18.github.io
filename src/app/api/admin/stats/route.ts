import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all stats in parallel
    const [
      totalUsers,
      totalScores,
      snakeScores,
      tetrisScores,
      recentUsers,
      topSnake,
      topTetris,
      pageViews,
      gameSessions
    ] = await Promise.all([
      prisma.user.count(),
      prisma.score.count(),
      prisma.score.count({ where: { game: 'SNAKE' } }),
      prisma.score.count({ where: { game: 'TETRIS' } }),
      prisma.user.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          createdAt: true,
          isGuest: true,
        }
      }),
      prisma.score.findFirst({
        where: { game: 'SNAKE' },
        orderBy: { score: 'desc' },
        select: { score: true }
      }),
      prisma.score.findFirst({
        where: { game: 'TETRIS' },
        orderBy: { score: 'desc' },
        select: { score: true }
      }),
      prisma.pageView.count(),
      prisma.gameSession.count()
    ])

    return NextResponse.json({
      totalUsers,
      totalScores,
      snakeScores,
      tetrisScores,
      recentUsers,
      topSnakeScore: topSnake?.score || 0,
      topTetrisScore: topTetris?.score || 0,
      pageViews,
      gameSessions
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
