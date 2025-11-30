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

type AnalyticsData = {
  configured: boolean
  message?: string
  error?: string
  realtime?: {
    activeUsers: number
  }
  last7Days?: {
    users: number
    sessions: number
    pageViews: number
    avgSessionDuration: number
    bounceRate: number
  }
  last30Days?: {
    users: number
    sessions: number
    pageViews: number
  }
  topPages?: { path: string; views: number }[]
  sources?: { source: string; sessions: number }[]
  dailyData?: { date: string; users: number; sessions: number }[]
}

type CloudflareData = {
  configured: boolean
  message?: string
  error?: string
  accountId?: string | null
  user?: {
    email: string
  }
  summary?: {
    totalZones: number
    totalWorkers: number
    totalPages: number
    totalR2Buckets: number
    last24h: {
      requests: number
      bandwidth: number
      threats: number
    }
  }
  zones?: Array<{
    id: string
    name: string
    status: string
    paused: boolean
    type: string
    developmentMode: boolean
    nameServers: string[]
    createdOn: string
    modifiedOn: string
  }>
  zoneAnalytics?: Record<string, {
    requests: number
    bandwidth: number
    threats: number
    pageViews: number
  }>
  workers?: Array<{
    id: string
    name: string
    createdOn: string
    modifiedOn: string
  }>
  pages?: Array<{
    name: string
    subdomain: string
    productionBranch: string
    createdOn: string
    latestDeployment?: {
      id: string
      url: string
      environment: string
      createdOn: string
    }
  }>
  r2Buckets?: Array<{
    name: string
    creationDate: string
  }>
}

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [cloudflare, setCloudflare] = useState<CloudflareData | null>(null)
  const [cloudflareLoading, setCloudflareLoading] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return

    if (!session?.user || session.user.role !== 'ADMIN') {
      router.push('/')
      return
    }

    fetchStats()
    fetchAnalytics()
    fetchCloudflare()
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

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/admin/analytics')
      const data = await response.json()
      setAnalytics(data)
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
      setAnalytics({ configured: false, error: 'Failed to fetch analytics' })
    } finally {
      setAnalyticsLoading(false)
    }
  }

  const fetchCloudflare = async () => {
    setCloudflareLoading(true)
    try {
      const response = await fetch('/api/admin/cloudflare')
      const data = await response.json()
      setCloudflare(data)
    } catch (error) {
      console.error('Failed to fetch Cloudflare data:', error)
      setCloudflare({ configured: false, error: 'Failed to fetch Cloudflare data' })
    } finally {
      setCloudflareLoading(false)
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}m ${secs}s`
  }

  const formatDate = (dateStr: string) => {
    // Format: YYYYMMDD to readable date
    const year = dateStr.slice(0, 4)
    const month = dateStr.slice(4, 6)
    const day = dateStr.slice(6, 8)
    return `${month}/${day}`
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              <i className="fas fa-chart-line text-orange-400 mr-2" />
              Google Analytics
            </h2>
            <button
              onClick={fetchAnalytics}
              className="btn-secondary text-sm"
              disabled={analyticsLoading}
            >
              <i className={`fas fa-sync-alt mr-2 ${analyticsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {analyticsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-400" />
            </div>
          ) : !analytics?.configured ? (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
              <p className="text-yellow-400">
                <i className="fas fa-exclamation-triangle mr-2" />
                {analytics?.message || analytics?.error || 'Analytics API not configured'}
              </p>
              <p className="text-gray-400 text-sm mt-2">
                To enable live analytics, add the <code className="bg-dark-400 px-1 rounded">GOOGLE_ANALYTICS_CREDENTIALS</code> environment variable in Vercel with your service account JSON.
              </p>
            </div>
          ) : (
            <>
              {/* Real-time Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-dark-400/50 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2" />
                    <span className="text-gray-400 text-sm">Active Now</span>
                  </div>
                  <p className="text-3xl font-bold text-green-400">
                    {analytics.realtime?.activeUsers || 0}
                  </p>
                </div>
                <div className="bg-dark-400/50 rounded-lg p-4 text-center">
                  <p className="text-gray-400 text-sm mb-2">7-Day Users</p>
                  <p className="text-3xl font-bold text-blue-400">
                    {analytics.last7Days?.users || 0}
                  </p>
                </div>
                <div className="bg-dark-400/50 rounded-lg p-4 text-center">
                  <p className="text-gray-400 text-sm mb-2">7-Day Sessions</p>
                  <p className="text-3xl font-bold text-purple-400">
                    {analytics.last7Days?.sessions || 0}
                  </p>
                </div>
                <div className="bg-dark-400/50 rounded-lg p-4 text-center">
                  <p className="text-gray-400 text-sm mb-2">7-Day Page Views</p>
                  <p className="text-3xl font-bold text-orange-400">
                    {analytics.last7Days?.pageViews || 0}
                  </p>
                </div>
              </div>

              {/* Additional Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-dark-400/50 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-1">Avg Session Duration</p>
                  <p className="text-xl font-semibold">
                    {formatDuration(analytics.last7Days?.avgSessionDuration || 0)}
                  </p>
                </div>
                <div className="bg-dark-400/50 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-1">Bounce Rate</p>
                  <p className="text-xl font-semibold">
                    {((analytics.last7Days?.bounceRate || 0) * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="bg-dark-400/50 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-1">30-Day Users</p>
                  <p className="text-xl font-semibold">
                    {analytics.last30Days?.users || 0}
                  </p>
                </div>
              </div>

              {/* Top Pages & Sources */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Top Pages */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-3">Top Pages (7 days)</h3>
                  <div className="space-y-2">
                    {analytics.topPages?.slice(0, 5).map((page, i) => (
                      <div key={i} className="flex justify-between items-center bg-dark-400/30 rounded px-3 py-2">
                        <span className="text-sm truncate flex-1 mr-2">{page.path}</span>
                        <span className="text-sm text-gray-400">{page.views}</span>
                      </div>
                    ))}
                    {(!analytics.topPages || analytics.topPages.length === 0) && (
                      <p className="text-gray-500 text-sm">No data yet</p>
                    )}
                  </div>
                </div>

                {/* Traffic Sources */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-3">Traffic Sources (7 days)</h3>
                  <div className="space-y-2">
                    {analytics.sources?.map((source, i) => (
                      <div key={i} className="flex justify-between items-center bg-dark-400/30 rounded px-3 py-2">
                        <span className="text-sm capitalize">{source.source || 'direct'}</span>
                        <span className="text-sm text-gray-400">{source.sessions} sessions</span>
                      </div>
                    ))}
                    {(!analytics.sources || analytics.sources.length === 0) && (
                      <p className="text-gray-500 text-sm">No data yet</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Daily Chart (Simple) */}
              {analytics.dailyData && analytics.dailyData.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-400 mb-3">Daily Users (7 days)</h3>
                  <div className="flex items-end justify-between h-24 gap-1">
                    {analytics.dailyData.map((day, i) => {
                      const maxUsers = Math.max(...analytics.dailyData!.map(d => d.users), 1)
                      const height = (day.users / maxUsers) * 100
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center">
                          <div
                            className="w-full bg-orange-400/60 rounded-t hover:bg-orange-400 transition-colors"
                            style={{ height: `${Math.max(height, 5)}%` }}
                            title={`${day.users} users`}
                          />
                          <span className="text-xs text-gray-500 mt-1">{formatDate(day.date)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Property Info & Links */}
          <div className="border-t border-dark-100/50 pt-4 mt-4">
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <div>
                <span className="text-gray-400 text-sm">Property ID: </span>
                <code className="bg-dark-400 px-2 py-1 rounded text-primary-400 text-sm">
                  G-V3J7C7JJWC
                </code>
              </div>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400">
                <i className="fas fa-check-circle mr-1" />
                Active
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://analytics.google.com/analytics/web/#/p469893186/reports/intelligenthome"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-sm"
              >
                <i className="fas fa-external-link-alt mr-2" />
                Open GA Dashboard
              </a>
              <a
                href="https://analytics.google.com/analytics/web/#/p469893186/realtime/overview"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-sm"
              >
                <i className="fas fa-clock mr-2" />
                Real-Time View
              </a>
            </div>
          </div>
        </div>

        {/* Cloudflare */}
        <div className="card p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              <i className="fas fa-cloud text-orange-500 mr-2" />
              Cloudflare
            </h2>
            <button
              onClick={fetchCloudflare}
              className="btn-secondary text-sm"
              disabled={cloudflareLoading}
            >
              <i className={`fas fa-sync-alt mr-2 ${cloudflareLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {cloudflareLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500" />
            </div>
          ) : !cloudflare?.configured ? (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
              <p className="text-yellow-400">
                <i className="fas fa-exclamation-triangle mr-2" />
                {cloudflare?.message || cloudflare?.error || 'Cloudflare API not configured'}
              </p>
              <p className="text-gray-400 text-sm mt-2">
                To enable Cloudflare integration, add the following environment variables in Vercel:
              </p>
              <ul className="text-gray-400 text-sm mt-2 space-y-1">
                <li><code className="bg-dark-400 px-1 rounded">CLOUDFLARE_API_TOKEN</code> - Your API token with Zone, Workers, R2, and Pages read permissions</li>
                <li><code className="bg-dark-400 px-1 rounded">CLOUDFLARE_ACCOUNT_ID</code> - Your account ID (for Workers, Pages, and R2)</li>
              </ul>
            </div>
          ) : (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-dark-400/50 rounded-lg p-4 text-center">
                  <p className="text-gray-400 text-sm mb-2">Domains</p>
                  <p className="text-3xl font-bold text-orange-400">
                    {cloudflare.summary?.totalZones || 0}
                  </p>
                </div>
                <div className="bg-dark-400/50 rounded-lg p-4 text-center">
                  <p className="text-gray-400 text-sm mb-2">Workers</p>
                  <p className="text-3xl font-bold text-blue-400">
                    {cloudflare.summary?.totalWorkers || 0}
                  </p>
                </div>
                <div className="bg-dark-400/50 rounded-lg p-4 text-center">
                  <p className="text-gray-400 text-sm mb-2">Pages Projects</p>
                  <p className="text-3xl font-bold text-green-400">
                    {cloudflare.summary?.totalPages || 0}
                  </p>
                </div>
                <div className="bg-dark-400/50 rounded-lg p-4 text-center">
                  <p className="text-gray-400 text-sm mb-2">R2 Buckets</p>
                  <p className="text-3xl font-bold text-purple-400">
                    {cloudflare.summary?.totalR2Buckets || 0}
                  </p>
                </div>
              </div>

              {/* 24h Traffic Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-dark-400/50 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-1">24h Requests</p>
                  <p className="text-xl font-semibold">
                    {formatNumber(cloudflare.summary?.last24h?.requests || 0)}
                  </p>
                </div>
                <div className="bg-dark-400/50 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-1">24h Bandwidth</p>
                  <p className="text-xl font-semibold">
                    {formatBytes(cloudflare.summary?.last24h?.bandwidth || 0)}
                  </p>
                </div>
                <div className="bg-dark-400/50 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-1">24h Threats Blocked</p>
                  <p className="text-xl font-semibold text-red-400">
                    {formatNumber(cloudflare.summary?.last24h?.threats || 0)}
                  </p>
                </div>
              </div>

              {/* Domains */}
              {cloudflare.zones && cloudflare.zones.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-400 mb-3">Domains</h3>
                  <div className="space-y-2">
                    {cloudflare.zones.map((zone) => (
                      <div key={zone.id} className="flex justify-between items-center bg-dark-400/30 rounded px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${zone.status === 'active' ? 'bg-green-400' : 'bg-yellow-400'}`} />
                          <span className="text-sm font-medium">{zone.name}</span>
                          {zone.developmentMode && (
                            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">Dev Mode</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          {cloudflare.zoneAnalytics?.[zone.id] && (
                            <span>{formatNumber(cloudflare.zoneAnalytics[zone.id].requests)} req/24h</span>
                          )}
                          <span className="capitalize">{zone.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Workers & Pages */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Workers */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-3">Workers</h3>
                  <div className="space-y-2">
                    {cloudflare.workers?.map((worker) => (
                      <div key={worker.id} className="flex justify-between items-center bg-dark-400/30 rounded px-3 py-2">
                        <span className="text-sm">{worker.name}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(worker.modifiedOn).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                    {(!cloudflare.workers || cloudflare.workers.length === 0) && (
                      <p className="text-gray-500 text-sm">No workers found</p>
                    )}
                  </div>
                </div>

                {/* Pages */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-3">Pages Projects</h3>
                  <div className="space-y-2">
                    {cloudflare.pages?.map((project) => (
                      <div key={project.name} className="bg-dark-400/30 rounded px-3 py-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">{project.name}</span>
                          <span className="text-xs text-gray-500">{project.productionBranch}</span>
                        </div>
                        {project.latestDeployment && (
                          <div className="text-xs text-gray-500 mt-1">
                            Last deployed: {new Date(project.latestDeployment.createdOn).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ))}
                    {(!cloudflare.pages || cloudflare.pages.length === 0) && (
                      <p className="text-gray-500 text-sm">No pages projects found</p>
                    )}
                  </div>
                </div>
              </div>

              {/* R2 Buckets */}
              {cloudflare.r2Buckets && cloudflare.r2Buckets.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-400 mb-3">R2 Buckets</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {cloudflare.r2Buckets.map((bucket) => (
                      <div key={bucket.name} className="bg-dark-400/30 rounded px-3 py-2">
                        <div className="flex items-center gap-2">
                          <i className="fas fa-database text-purple-400 text-xs" />
                          <span className="text-sm">{bucket.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Links */}
          <div className="border-t border-dark-100/50 pt-4 mt-4">
            <div className="flex flex-wrap items-center gap-4 mb-4">
              {cloudflare?.user?.email && (
                <div>
                  <span className="text-gray-400 text-sm">Account: </span>
                  <code className="bg-dark-400 px-2 py-1 rounded text-primary-400 text-sm">
                    {cloudflare.user.email}
                  </code>
                </div>
              )}
              {cloudflare?.configured && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400">
                  <i className="fas fa-check-circle mr-1" />
                  Connected
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://dash.cloudflare.com"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-sm"
              >
                <i className="fas fa-external-link-alt mr-2" />
                Cloudflare Dashboard
              </a>
              <a
                href="https://dash.cloudflare.com/?to=/:account/workers-and-pages"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-sm"
              >
                <i className="fas fa-code mr-2" />
                Workers & Pages
              </a>
              <a
                href="https://dash.cloudflare.com/?to=/:account/r2"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-sm"
              >
                <i className="fas fa-database mr-2" />
                R2 Storage
              </a>
            </div>
          </div>
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
