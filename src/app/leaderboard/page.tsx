'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

type Score = {
  id: string
  game: 'SNAKE' | 'TETRIS'
  score: number
  createdAt: string
  user: {
    id: string
    name: string | null
    image: string | null
    isGuest: boolean
  }
}

export default function LeaderboardPage() {
  const [activeGame, setActiveGame] = useState<'SNAKE' | 'TETRIS' | 'ALL'>('ALL')
  const [scores, setScores] = useState<Score[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchScores = async () => {
      setLoading(true)
      try {
        const url = activeGame === 'ALL'
          ? '/api/scores?limit=50'
          : `/api/scores?game=${activeGame}&limit=50`
        const response = await fetch(url)
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

    fetchScores()
  }, [activeGame])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getRankIcon = (index: number) => {
    if (index === 0) return '🥇'
    if (index === 1) return '🥈'
    if (index === 2) return '🥉'
    return `#${index + 1}`
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">
          <i className="fas fa-trophy text-yellow-400 mr-3" aria-hidden="true" />
          Global Leaderboard
        </h1>

        {/* Game Filter */}
        <div className="flex justify-center gap-2 mb-8">
          {(['ALL', 'SNAKE', 'TETRIS'] as const).map((game) => (
            <button
              key={game}
              onClick={() => setActiveGame(game)}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                activeGame === game
                  ? 'bg-gradient-primary text-white'
                  : 'bg-dark-300 text-gray-400 hover:bg-dark-200'
              }`}
            >
              {game === 'ALL' ? 'All Games' : game.charAt(0) + game.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Leaderboard */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto" />
              <p className="mt-4 text-gray-400">Loading scores...</p>
            </div>
          ) : scores.length === 0 ? (
            <div className="p-8 text-center">
              <i className="fas fa-gamepad text-4xl text-gray-600 mb-4" aria-hidden="true" />
              <p className="text-gray-400">No scores yet. Be the first to play!</p>
              <div className="mt-4 flex gap-4 justify-center">
                <Link href="/games/snake" className="btn-primary">
                  Play Snake
                </Link>
                <Link href="/games/tetris" className="btn-secondary">
                  Play Tetris
                </Link>
              </div>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-dark-200 text-left">
                  <th className="px-4 py-3 w-16">Rank</th>
                  <th className="px-4 py-3">Player</th>
                  {activeGame === 'ALL' && <th className="px-4 py-3">Game</th>}
                  <th className="px-4 py-3 text-right">Score</th>
                  <th className="px-4 py-3 text-right hidden sm:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {scores.map((score, index) => (
                  <tr
                    key={score.id}
                    className={`border-t border-dark-100/30 ${
                      index < 3 ? 'bg-dark-300/30' : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-2xl">
                      {getRankIcon(index)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {score.user.image ? (
                          <Image
                            src={score.user.image}
                            alt=""
                            width={32}
                            height={32}
                            className="rounded-full"
                            aria-hidden="true"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-sm" aria-hidden="true">
                            {score.user.name?.[0]?.toUpperCase() || 'G'}
                          </div>
                        )}
                        <div>
                          <div className="font-medium">
                            {score.user.name || 'Anonymous'}
                          </div>
                          {score.user.isGuest && (
                            <div className="text-xs text-gray-500">Guest</div>
                          )}
                        </div>
                      </div>
                    </td>
                    {activeGame === 'ALL' && (
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          score.game === 'SNAKE'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {score.game}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3 text-right">
                      <span className={`text-xl font-bold ${
                        index === 0 ? 'text-yellow-400' :
                        index === 1 ? 'text-gray-300' :
                        index === 2 ? 'text-orange-400' :
                        'text-primary-400'
                      }`}>
                        {score.score.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 hidden sm:table-cell">
                      {formatDate(score.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Play CTA */}
        <div className="mt-8 text-center">
          <p className="text-gray-400 mb-4">Want to climb the leaderboard?</p>
          <div className="flex gap-4 justify-center">
            <Link href="/games/snake" className="btn-primary">
              <i className="fas fa-gamepad mr-2" aria-hidden="true" />
              Play Snake
            </Link>
            <Link href="/games/tetris" className="btn-secondary">
              <i className="fas fa-th-large mr-2" aria-hidden="true" />
              Play Tetris
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
