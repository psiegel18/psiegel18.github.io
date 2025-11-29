'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

type UserScore = {
  id: string
  game: 'SNAKE' | 'TETRIS'
  score: number
  createdAt: string
}

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const [scores, setScores] = useState<UserScore[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchScores = async () => {
      if (!session?.user?.id) return

      try {
        const response = await fetch(`/api/scores?userId=${session.user.id}&limit=20`)
        if (response.ok) {
          const data = await response.json()
          setScores(data)
        }
      } catch (error) {
        console.error('Failed to fetch scores:', error)
      } finally {
        setLoading(false)
      }
    }

    if (session?.user?.id) {
      fetchScores()
    } else {
      setLoading(false)
    }
  }, [session])

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    )
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card max-w-md w-full p-8 text-center">
          <i className="fas fa-user-lock text-4xl text-gray-600 mb-4" />
          <h1 className="text-2xl font-bold mb-4">Sign In Required</h1>
          <p className="text-gray-400 mb-6">Please sign in to view your profile.</p>
          <Link href="/auth/signin" className="btn-primary">
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  const snakeScores = scores.filter(s => s.game === 'SNAKE')
  const tetrisScores = scores.filter(s => s.game === 'TETRIS')
  const topSnake = snakeScores.length > 0 ? Math.max(...snakeScores.map(s => s.score)) : 0
  const topTetris = tetrisScores.length > 0 ? Math.max(...tetrisScores.map(s => s.score)) : 0

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Profile Header */}
        <div className="card p-8 mb-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {session.user.image ? (
              <Image
                src={session.user.image}
                alt={session.user.name || 'User'}
                width={96}
                height={96}
                className="rounded-full"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-primary flex items-center justify-center text-3xl font-bold">
                {session.user.name?.[0]?.toUpperCase() || 'G'}
              </div>
            )}

            <div className="text-center md:text-left">
              <h1 className="text-3xl font-bold">
                {session.user.name || 'Anonymous'}
              </h1>
              {session.user.email && (
                <p className="text-gray-400">{session.user.email}</p>
              )}
              <div className="flex gap-2 mt-2 justify-center md:justify-start">
                {session.user.isGuest && (
                  <span className="px-3 py-1 rounded-full bg-gray-500/20 text-gray-400 text-sm">
                    Guest Account
                  </span>
                )}
                {session.user.role === 'ADMIN' && (
                  <span className="px-3 py-1 rounded-full bg-primary-500/20 text-primary-400 text-sm">
                    Admin
                  </span>
                )}
              </div>
            </div>

            {session.user.isGuest && (
              <div className="md:ml-auto">
                <Link href="/auth/signin" className="btn-primary">
                  <i className="fas fa-user-plus mr-2" />
                  Create Account
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card p-4 text-center">
            <div className="text-3xl font-bold text-primary-400">{scores.length}</div>
            <div className="text-gray-400 text-sm">Games Played</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-3xl font-bold text-green-400">{topSnake}</div>
            <div className="text-gray-400 text-sm">Best Snake</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-3xl font-bold text-blue-400">{topTetris}</div>
            <div className="text-gray-400 text-sm">Best Tetris</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-3xl font-bold text-yellow-400">
              {Math.max(topSnake, topTetris)}
            </div>
            <div className="text-gray-400 text-sm">Top Score</div>
          </div>
        </div>

        {/* Recent Games */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4">
            <i className="fas fa-history text-primary-400 mr-2" />
            Recent Games
          </h2>

          {scores.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-400 border-b border-dark-100/50">
                  <th className="pb-2">Game</th>
                  <th className="pb-2 text-right">Score</th>
                  <th className="pb-2 text-right hidden sm:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {scores.map((score) => (
                  <tr key={score.id} className="border-b border-dark-100/30">
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        score.game === 'SNAKE'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {score.game}
                      </span>
                    </td>
                    <td className="py-3 text-right font-bold text-primary-400">
                      {score.score.toLocaleString()}
                    </td>
                    <td className="py-3 text-right text-gray-500 hidden sm:table-cell">
                      {new Date(score.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-8">
              <i className="fas fa-gamepad text-4xl text-gray-600 mb-4" />
              <p className="text-gray-400 mb-4">No games played yet</p>
              <div className="flex gap-4 justify-center">
                <Link href="/games/snake" className="btn-primary">
                  Play Snake
                </Link>
                <Link href="/games/tetris" className="btn-secondary">
                  Play Tetris
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
