'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

type Stats = {
  totalUsers: number
  totalScores: number
  snakeScores: number
  tetrisScores: number
  recentUsers: { id: string; name: string | null; createdAt: string; isGuest: boolean }[]
  topSnakeScore: number
  topTetrisScore: number
  pageViews: number
  gameSessions: number
}

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return

    if (!session?.user || session.user.role !== 'ADMIN') {
      router.push('/')
      return
    }

    fetchStats()
  }, [session, status, router])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    )
  }

  if (!session?.user || session.user.role !== 'ADMIN') {
    return null
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">
            <i className="fas fa-cog text-primary-400 mr-3" />
            Admin Dashboard
          </h1>
          <Link href="/admin/house" className="btn-secondary">
            <i className="fas fa-home mr-2" />
            The House
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Users</p>
                <p className="text-3xl font-bold text-primary-400">
                  {stats?.totalUsers || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary-500/20 rounded-lg flex items-center justify-center">
                <i className="fas fa-users text-primary-400 text-xl" />
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Scores</p>
                <p className="text-3xl font-bold text-green-400">
                  {stats?.totalScores || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <i className="fas fa-trophy text-green-400 text-xl" />
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Page Views</p>
                <p className="text-3xl font-bold text-blue-400">
                  {stats?.pageViews || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <i className="fas fa-eye text-blue-400 text-xl" />
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Game Sessions</p>
                <p className="text-3xl font-bold text-yellow-400">
                  {stats?.gameSessions || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <i className="fas fa-gamepad text-yellow-400 text-xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Game Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="card p-6">
            <h2 className="text-xl font-semibold mb-4">
              <i className="fas fa-snake text-green-400 mr-2" />
              Snake Stats
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Scores</span>
                <span className="font-medium">{stats?.snakeScores || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Top Score</span>
                <span className="font-medium text-yellow-400">{stats?.topSnakeScore || 0}</span>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-xl font-semibold mb-4">
              <i className="fas fa-th-large text-blue-400 mr-2" />
              Tetris Stats
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Scores</span>
                <span className="font-medium">{stats?.tetrisScores || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Top Score</span>
                <span className="font-medium text-yellow-400">{stats?.topTetrisScore || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Users */}
        <div className="card p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">
            <i className="fas fa-user-plus text-primary-400 mr-2" />
            Recent Users
          </h2>
          {stats?.recentUsers && stats.recentUsers.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-400 border-b border-dark-100/50">
                  <th className="pb-2">User</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2 text-right">Joined</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentUsers.map(user => (
                  <tr key={user.id} className="border-b border-dark-100/30">
                    <td className="py-3">{user.name || 'Anonymous'}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        user.isGuest
                          ? 'bg-gray-500/20 text-gray-400'
                          : 'bg-green-500/20 text-green-400'
                      }`}>
                        {user.isGuest ? 'Guest' : 'Registered'}
                      </span>
                    </td>
                    <td className="py-3 text-right text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-500">No users yet</p>
          )}
        </div>

        {/* Google Analytics */}
        <div className="card p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">
            <i className="fas fa-chart-line text-orange-400 mr-2" />
            Google Analytics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-gray-400 text-sm mb-2">Property ID</p>
              <code className="bg-dark-400 px-3 py-2 rounded text-primary-400 block">
                G-V3J7C7JJWC
              </code>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-2">Status</p>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-500/20 text-green-400">
                <i className="fas fa-check-circle mr-2" />
                Active
              </span>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="https://analytics.google.com/analytics/web/#/p469893186/reports/intelligenthome"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              <i className="fas fa-external-link-alt mr-2" />
              Open Google Analytics
            </a>
            <a
              href="https://analytics.google.com/analytics/web/#/p469893186/reports/reportinghub"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              <i className="fas fa-chart-bar mr-2" />
              View Reports
            </a>
            <a
              href="https://analytics.google.com/analytics/web/#/p469893186/realtime/overview"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              <i className="fas fa-clock mr-2" />
              Real-Time
            </a>
          </div>
          <p className="text-gray-500 text-sm mt-4">
            <i className="fas fa-info-circle mr-1" />
            Analytics data may take up to 24-48 hours to appear for new properties.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4">
            <i className="fas fa-bolt text-yellow-400 mr-2" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/admin/house" className="btn-secondary text-center">
              <i className="fas fa-home mr-2" />
              The House
            </Link>
            <Link href="/leaderboard" className="btn-secondary text-center">
              <i className="fas fa-trophy mr-2" />
              Leaderboard
            </Link>
            <button
              onClick={fetchStats}
              className="btn-secondary"
            >
              <i className="fas fa-refresh mr-2" />
              Refresh Stats
            </button>
            <a
              href="https://console.neon.tech"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-center"
            >
              <i className="fas fa-database mr-2" />
              Database
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
