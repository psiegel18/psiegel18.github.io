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

type VercelData = {
  configured: boolean
  message?: string
  error?: string
  accounts?: Array<{
    name: string
    username: string
    email: string
  }>
  summary?: {
    totalProjects: number
    totalDomains: number
    deploymentsLast24h: number
    deploymentsLast7d: number
    successRate: number
  }
  projects?: Array<{
    id: string
    name: string
    framework: string | null
    updatedAt: number
    createdAt: number
    account: string
  }>
  deployments?: Array<{
    id: string
    name: string
    url: string
    state: string
    readyState: string
    createdAt: number
    buildingAt?: number
    ready?: number
    source?: string
    commitMessage?: string
    commitRef?: string
    commitSha?: string
    account: string
  }>
  domains?: Array<{
    name: string
    apexName: string
    verified: boolean
    createdAt: number
    account: string
  }>
  stats?: {
    successful: number
    failed: number
    building: number
  }
}

type NeonData = {
  configured: boolean
  message?: string
  error?: string
  user?: {
    name: string
    email: string
  }
  summary?: {
    totalProjects: number
    totalBranches: number
    totalDatabases: number
    totalEndpoints: number
    activeEndpoints: number
    totalStorageBytes: number
  }
  projects?: Array<{
    id: string
    name: string
    displayName: string
    region: string
    pgVersion: number
    activeTimeSeconds: number
    cpuUsedSeconds: number
    computeLastActiveAt: string
  }>
  branches?: Array<{
    id: string
    name: string
    primary: boolean
    createdAt: string
    currentState: string
    logicalSize: number
    projectName: string
  }>
  databases?: Array<{
    id: number
    name: string
    ownerName: string
    branchId: string
    projectName: string
  }>
  endpoints?: Array<{
    id: string
    branchId: string
    host: string
    type: string
    currentState: string
    poolerEnabled: boolean
    createdAt: string
    lastActiveAt?: string
    projectName: string
  }>
  operations?: Array<{
    id: string
    action: string
    status: string
    createdAt: string
    updatedAt: string
    projectName: string
  }>
}

type GitHubData = {
  configured: boolean
  message?: string
  error?: string
  user?: {
    login: string
    name: string
    email: string
    avatarUrl: string
    followers: number
    following: number
  }
  summary?: {
    totalRepos: number
    publicRepos: number
    privateRepos: number
    totalStars: number
    totalForks: number
    openIssues: number
    openPRs: number
    languages: string[]
  }
  repos?: Array<{
    id: number
    name: string
    fullName: string
    private: boolean
    url: string
    description: string | null
    fork: boolean
    language: string | null
    stars: number
    forks: number
    openIssues: number
    defaultBranch: string
    pushedAt: string
    updatedAt: string
  }>
  events?: Array<{
    id: string
    type: string
    repo: string
    createdAt: string
    action?: string
    ref?: string
    refType?: string
    commits?: Array<{ sha: string; message: string }>
    pullRequest?: { title: string; number: number }
    issue?: { title: string; number: number }
  }>
  issues?: Array<{
    id: number
    title: string
    number: number
    state: string
    url: string
    repo: string
    createdAt: string
    updatedAt: string
    labels: Array<{ name: string; color: string }>
  }>
  pullRequests?: Array<{
    id: number
    title: string
    number: number
    state: string
    url: string
    repo: string
    createdAt: string
    updatedAt: string
    draft: boolean
  }>
  workflowRuns?: Array<{
    id: number
    name: string
    status: string
    conclusion: string | null
    repo: string
    branch: string
    event: string
    createdAt: string
    url: string
  }>
}

type UptimeRobotData = {
  configured: boolean
  message?: string
  error?: string
  account?: {
    email: string
    monitorLimit: number
    monitorInterval: number
  }
  summary?: {
    total: number
    up: number
    down: number
    paused: number
    avgResponseTime: number
    avgUptime30d: string
    sslWarnings: number
  }
  monitors?: Array<{
    id: number
    name: string
    url: string
    type: string
    status: string
    statusColor: string
    createdAt: string
    avgResponseTime: number | null
    uptime: {
      day: number | null
      week: number | null
      month: number | null
      quarter: number | null
    }
    ssl: {
      brand: string
      product: string
      expiresAt: string
      daysUntilExpiry: number
    } | null
    recentLogs: Array<{
      type: string
      datetime: string
      duration: number
      reason?: { code: string; detail: string }
    }>
    responseTimes: Array<{
      datetime: string
      value: number
    }>
  }>
  sslWarnings?: Array<{
    name: string
    daysUntilExpiry: number
  }>
}

type SentryData = {
  configured: boolean
  message?: string
  error?: string
  organization?: string
  projects?: Array<{
    id: string
    slug: string
    name: string
    platform: string
    status: string
    issueCount: number
    criticalCount: number
    issues: Array<{
      id: string
      shortId: string
      title: string
      level: string
      count: number
      lastSeen: string
      url: string
    }>
  }>
  summary?: {
    totalProjects: number
    unresolvedIssues: number
    criticalIssues: number
    unhandledErrors: number
    totalEvents: number
    uniqueUsers: number
    errors24h: number
    transactions24h: number
  }
  errorTrend?: {
    intervals: string[]
    values: number[]
  }
  issues?: Array<{
    id: string
    shortId: string
    title: string
    culprit: string
    url: string
    level: string
    levelColor: string
    status: string
    statusColor: string
    isUnhandled: boolean
    count: number
    userCount: number
    firstSeen: string
    lastSeen: string
    project: string
    projectSlug: string
    errorType?: string
    errorValue?: string
    filename?: string
    function?: string
  }>
}

// Tab definitions
type TabId = 'metrics' | 'monitoring' | 'analytics' | 'infrastructure' | 'development'
type InfraTabId = 'cloudflare' | 'vercel' | 'neon'

const tabs: { id: TabId; title: string; icon: string; iconColor: string }[] = [
  { id: 'metrics', title: 'Site Metrics', icon: 'fas fa-chart-pie', iconColor: 'text-primary-400' },
  { id: 'monitoring', title: 'Monitoring', icon: 'fas fa-heartbeat', iconColor: 'text-green-400' },
  { id: 'analytics', title: 'Analytics', icon: 'fas fa-chart-line', iconColor: 'text-orange-400' },
  { id: 'infrastructure', title: 'Infrastructure', icon: 'fas fa-server', iconColor: 'text-blue-400' },
  { id: 'development', title: 'Development', icon: 'fab fa-github', iconColor: 'text-white' },
]

const infraTabs: { id: InfraTabId; title: string; icon: string; iconColor: string }[] = [
  { id: 'cloudflare', title: 'Cloudflare', icon: 'fas fa-cloud', iconColor: 'text-orange-500' },
  { id: 'vercel', title: 'Vercel', icon: 'fas fa-triangle', iconColor: 'text-white' },
  { id: 'neon', title: 'Neon', icon: 'fas fa-database', iconColor: 'text-green-400' },
]

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [cloudflare, setCloudflare] = useState<CloudflareData | null>(null)
  const [cloudflareLoading, setCloudflareLoading] = useState(true)
  const [vercel, setVercel] = useState<VercelData | null>(null)
  const [vercelLoading, setVercelLoading] = useState(true)
  const [neon, setNeon] = useState<NeonData | null>(null)
  const [neonLoading, setNeonLoading] = useState(true)
  const [github, setGithub] = useState<GitHubData | null>(null)
  const [githubLoading, setGithubLoading] = useState(true)
  const [uptime, setUptime] = useState<UptimeRobotData | null>(null)
  const [uptimeLoading, setUptimeLoading] = useState(true)
  const [sentry, setSentry] = useState<SentryData | null>(null)
  const [sentryLoading, setSentryLoading] = useState(true)
  const [loading, setLoading] = useState(true)

  // Active tab state
  const [activeTab, setActiveTab] = useState<TabId>('metrics')
  const [activeInfraTab, setActiveInfraTab] = useState<InfraTabId>('cloudflare')

  useEffect(() => {
    if (status === 'loading') return

    if (!session?.user || session.user.role !== 'ADMIN') {
      router.push('/')
      return
    }

    // Stagger API requests to avoid race conditions in serverless environment
    // When many functions try to verify the same session simultaneously, some may fail
    const loadData = async () => {
      // First batch - core data
      fetchStats()
      fetchAnalytics()

      // Small delay before second batch
      await new Promise(resolve => setTimeout(resolve, 100))
      fetchCloudflare()
      fetchVercel()

      // Small delay before third batch
      await new Promise(resolve => setTimeout(resolve, 100))
      fetchNeon()
      fetchGithub()

      // Small delay before fourth batch
      await new Promise(resolve => setTimeout(resolve, 100))
      fetchUptime()
      fetchSentry()
    }

    loadData()
  }, [session, status, router])

  // Helper to fetch with retry on 401 (handles race condition with session verification)
  const fetchWithRetry = async (url: string, retries = 2): Promise<Response> => {
    let lastResponse: Response | null = null
    for (let i = 0; i < retries; i++) {
      const response = await fetch(url)
      if (response.status !== 401 || i === retries - 1) {
        return response
      }
      lastResponse = response
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 200 * (i + 1)))
    }
    return lastResponse!
  }

  const fetchStats = async () => {
    try {
      const response = await fetchWithRetry('/api/admin/stats')
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
      const response = await fetchWithRetry('/api/admin/analytics')
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
      const response = await fetchWithRetry('/api/admin/cloudflare')
      const data = await response.json()
      setCloudflare(data)
    } catch (error) {
      console.error('Failed to fetch Cloudflare data:', error)
      setCloudflare({ configured: false, error: 'Failed to fetch Cloudflare data' })
    } finally {
      setCloudflareLoading(false)
    }
  }

  const fetchVercel = async () => {
    setVercelLoading(true)
    try {
      const response = await fetchWithRetry('/api/admin/vercel')
      const data = await response.json()
      setVercel(data)
    } catch (error) {
      console.error('Failed to fetch Vercel data:', error)
      setVercel({ configured: false, error: 'Failed to fetch Vercel data' })
    } finally {
      setVercelLoading(false)
    }
  }

  const fetchNeon = async () => {
    setNeonLoading(true)
    try {
      const response = await fetchWithRetry('/api/admin/neon')
      const data = await response.json()
      setNeon(data)
    } catch (error) {
      console.error('Failed to fetch Neon data:', error)
      setNeon({ configured: false, error: 'Failed to fetch Neon data' })
    } finally {
      setNeonLoading(false)
    }
  }

  const fetchGithub = async () => {
    setGithubLoading(true)
    try {
      const response = await fetchWithRetry('/api/admin/github')
      const data = await response.json()
      setGithub(data)
    } catch (error) {
      console.error('Failed to fetch GitHub data:', error)
      setGithub({ configured: false, error: 'Failed to fetch GitHub data' })
    } finally {
      setGithubLoading(false)
    }
  }

  const fetchUptime = async () => {
    setUptimeLoading(true)
    try {
      const response = await fetchWithRetry('/api/admin/uptimerobot')
      const data = await response.json()
      setUptime(data)
    } catch (error) {
      console.error('Failed to fetch UptimeRobot data:', error)
      setUptime({ configured: false, error: 'Failed to fetch UptimeRobot data' })
    } finally {
      setUptimeLoading(false)
    }
  }

  const fetchSentry = async () => {
    setSentryLoading(true)
    try {
      const response = await fetchWithRetry('/api/admin/sentry')
      const data = await response.json()
      setSentry(data)
    } catch (error) {
      console.error('Failed to fetch Sentry data:', error)
      setSentry({ configured: false, error: 'Failed to fetch Sentry data' })
    } finally {
      setSentryLoading(false)
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

  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return new Date(timestamp).toLocaleDateString()
  }

  const getDeploymentStatusColor = (state: string) => {
    switch (state.toUpperCase()) {
      case 'READY': return 'bg-green-400'
      case 'BUILDING': return 'bg-yellow-400 animate-pulse'
      case 'ERROR': return 'bg-red-400'
      case 'CANCELED': return 'bg-gray-400'
      case 'QUEUED': return 'bg-blue-400'
      default: return 'bg-gray-400'
    }
  }

  const getDeploymentStatusText = (state: string) => {
    switch (state.toUpperCase()) {
      case 'READY': return 'text-green-400'
      case 'BUILDING': return 'text-yellow-400'
      case 'ERROR': return 'text-red-400'
      case 'CANCELED': return 'text-gray-400'
      case 'QUEUED': return 'text-blue-400'
      default: return 'text-gray-400'
    }
  }

  const getAccountBadgeColor = (account: string) => {
    switch (account) {
      case 'Web': return 'bg-blue-500/20 text-blue-400'
      case 'TheHouse': return 'bg-purple-500/20 text-purple-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  const getEndpointStatusColor = (state: string) => {
    switch (state) {
      case 'active': return 'bg-green-400'
      case 'idle': return 'bg-yellow-400'
      case 'init': return 'bg-blue-400 animate-pulse'
      default: return 'bg-gray-400'
    }
  }

  const getNeonProjectBadgeColor = (projectName: string) => {
    switch (projectName) {
      case 'Web': return 'bg-green-500/20 text-green-400'
      case 'Zero': return 'bg-cyan-500/20 text-cyan-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  const getWorkflowStatusColor = (status: string, conclusion: string | null) => {
    if (status === 'completed') {
      switch (conclusion) {
        case 'success': return 'bg-green-400'
        case 'failure': return 'bg-red-400'
        case 'cancelled': return 'bg-gray-400'
        case 'skipped': return 'bg-gray-400'
        default: return 'bg-yellow-400'
      }
    }
    if (status === 'in_progress') return 'bg-yellow-400 animate-pulse'
    if (status === 'queued') return 'bg-blue-400'
    return 'bg-gray-400'
  }

  const formatEventType = (type: string) => {
    const eventMap: Record<string, string> = {
      'PushEvent': 'pushed to',
      'PullRequestEvent': 'PR',
      'IssuesEvent': 'issue',
      'CreateEvent': 'created',
      'DeleteEvent': 'deleted',
      'WatchEvent': 'starred',
      'ForkEvent': 'forked',
      'IssueCommentEvent': 'commented on',
      'PullRequestReviewEvent': 'reviewed',
      'PullRequestReviewCommentEvent': 'commented on PR',
      'ReleaseEvent': 'released',
    }
    return eventMap[type] || type.replace('Event', '')
  }

  const formatComputeTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    return `${(seconds / 3600).toFixed(1)}h`
  }

  const getUptimeStatusColor = (status: string) => {
    switch (status) {
      case 'Up': return 'bg-green-400'
      case 'Down': return 'bg-red-400'
      case 'Seems Down': return 'bg-yellow-400'
      case 'Paused': return 'bg-gray-400'
      default: return 'bg-gray-400'
    }
  }

  const getUptimeStatusTextColor = (status: string) => {
    switch (status) {
      case 'Up': return 'text-green-400'
      case 'Down': return 'text-red-400'
      case 'Seems Down': return 'text-yellow-400'
      case 'Paused': return 'text-gray-400'
      default: return 'text-gray-400'
    }
  }

  const getSentryLevelColor = (level: string) => {
    switch (level) {
      case 'fatal': return 'bg-red-500'
      case 'error': return 'bg-red-400'
      case 'warning': return 'bg-yellow-400'
      case 'info': return 'bg-blue-400'
      default: return 'bg-gray-400'
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

  // Get badge content for each tab
  const getTabBadge = (tabId: TabId) => {
    switch (tabId) {
      case 'monitoring':
        return (
          <div className="flex items-center gap-2">
            {uptime?.configured && uptime.summary && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${uptime.summary.down > 0 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                {uptime.summary.up}/{uptime.summary.total}
              </span>
            )}
            {sentry?.configured && sentry.summary && sentry.summary.criticalIssues > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400">
                {sentry.summary.criticalIssues}
              </span>
            )}
          </div>
        )
      case 'analytics':
        return analytics?.configured && analytics.realtime && (
          <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse inline-block mr-1" />
            {analytics.realtime.activeUsers}
          </span>
        )
      case 'infrastructure':
        return (
          <div className="flex items-center gap-1">
            {cloudflare?.configured && <span className="px-2 py-0.5 rounded-full text-xs bg-orange-500/20 text-orange-400">{cloudflare.summary?.totalZones || 0}</span>}
            {vercel?.configured && <span className="px-2 py-0.5 rounded-full text-xs bg-white/20 text-white">{vercel.summary?.totalProjects || 0}</span>}
          </div>
        )
      case 'development':
        return github?.configured && github.summary && (
          <div className="flex items-center gap-1">
            <span className="px-2 py-0.5 rounded-full text-xs bg-white/20 text-white">{github.summary.totalRepos}</span>
            {github.summary.openPRs > 0 && <span className="px-2 py-0.5 rounded-full text-xs bg-purple-500/20 text-purple-400">{github.summary.openPRs}</span>}
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">
            <i className="fas fa-cog text-primary-400 mr-3" />
            Admin Dashboard
          </h1>
          <Link href="/admin/house" className="btn-secondary">
            <i className="fas fa-home mr-2" />
            The House
          </Link>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-8 p-1 bg-dark-300/50 rounded-lg">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-dark-200 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-dark-200/50'
              }`}
            >
              <i className={`${tab.icon} ${activeTab === tab.id ? tab.iconColor : ''}`} />
              <span className="hidden sm:inline">{tab.title}</span>
              {getTabBadge(tab.id)}
            </button>
          ))}
        </div>

        {/* ==================== SITE METRICS TAB ==================== */}
        {activeTab === 'metrics' && (
          <div>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
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
          </div>
        )}

        {/* ==================== MONITORING TAB ==================== */}
        {activeTab === 'monitoring' && (
          <div>
          {/* UptimeRobot */}
          <div className="card p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                <i className="fas fa-signal text-green-400 mr-2" />
                UptimeRobot
              </h3>
              <button onClick={fetchUptime} className="btn-secondary text-sm" disabled={uptimeLoading}>
                <i className={`fas fa-sync-alt mr-2 ${uptimeLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
            {uptimeLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-400" />
              </div>
            ) : !uptime?.configured ? (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <p className="text-yellow-400"><i className="fas fa-exclamation-triangle mr-2" />{uptime?.message || 'UptimeRobot not configured'}</p>
                <p className="text-gray-400 text-sm mt-2">Add <code className="bg-dark-400 px-1 rounded">UPTIMEROBOT_API_KEY</code> to enable.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-dark-400/50 rounded-lg p-3 text-center">
                    <p className="text-gray-400 text-xs mb-1">Monitors</p>
                    <p className="text-2xl font-bold">{uptime.summary?.total || 0}</p>
                  </div>
                  <div className="bg-dark-400/50 rounded-lg p-3 text-center">
                    <p className="text-gray-400 text-xs mb-1">Up</p>
                    <p className="text-2xl font-bold text-green-400">{uptime.summary?.up || 0}</p>
                  </div>
                  <div className="bg-dark-400/50 rounded-lg p-3 text-center">
                    <p className="text-gray-400 text-xs mb-1">Down</p>
                    <p className="text-2xl font-bold text-red-400">{uptime.summary?.down || 0}</p>
                  </div>
                  <div className="bg-dark-400/50 rounded-lg p-3 text-center">
                    <p className="text-gray-400 text-xs mb-1">Avg Response</p>
                    <p className="text-2xl font-bold text-blue-400">{uptime.summary?.avgResponseTime || 0}<span className="text-sm">ms</span></p>
                  </div>
                </div>
                {uptime.monitors && uptime.monitors.length > 0 && (
                  <div className="space-y-2">
                    {uptime.monitors.map((monitor) => (
                      <div key={monitor.id} className="flex items-center justify-between bg-dark-400/30 rounded-lg px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className={`w-3 h-3 rounded-full ${monitor.status === 'Up' ? 'bg-green-400' : monitor.status === 'Down' ? 'bg-red-400' : 'bg-gray-400'}`} />
                          <span className="font-medium">{monitor.name}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-400">{monitor.avgResponseTime || '-'}ms</span>
                          <span className="text-gray-400">{monitor.uptime.month?.toFixed(1) || '-'}%</span>
                          <span className={monitor.status === 'Up' ? 'text-green-400' : 'text-red-400'}>{monitor.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-3 mt-4">
                  <a href="https://uptimerobot.com/dashboard" target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm">
                    <i className="fas fa-external-link-alt mr-2" />Dashboard
                  </a>
                </div>
              </>
            )}
          </div>

          {/* Sentry */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                <i className="fas fa-bug text-purple-400 mr-2" />
                Sentry
              </h3>
              <button onClick={fetchSentry} className="btn-secondary text-sm" disabled={sentryLoading}>
                <i className={`fas fa-sync-alt mr-2 ${sentryLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
            {sentryLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-400" />
              </div>
            ) : !sentry?.configured ? (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <p className="text-yellow-400"><i className="fas fa-exclamation-triangle mr-2" />{sentry?.message || 'Sentry not configured'}</p>
                <p className="text-gray-400 text-sm mt-2">Add <code className="bg-dark-400 px-1 rounded">SENTRY_AUTH_TOKEN</code> and <code className="bg-dark-400 px-1 rounded">SENTRY_ORG</code> to enable.</p>
              </div>
            ) : (
              <>
                {/* Summary stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-dark-400/50 rounded-lg p-3 text-center">
                    <p className="text-gray-400 text-xs mb-1">Total Unresolved</p>
                    <p className="text-2xl font-bold text-orange-400">{sentry.summary?.unresolvedIssues || 0}</p>
                  </div>
                  <div className="bg-dark-400/50 rounded-lg p-3 text-center">
                    <p className="text-gray-400 text-xs mb-1">Critical</p>
                    <p className="text-2xl font-bold text-red-400">{sentry.summary?.criticalIssues || 0}</p>
                  </div>
                  <div className="bg-dark-400/50 rounded-lg p-3 text-center">
                    <p className="text-gray-400 text-xs mb-1">Errors (24h)</p>
                    <p className="text-2xl font-bold text-yellow-400">{sentry.summary?.errors24h || 0}</p>
                  </div>
                  <div className="bg-dark-400/50 rounded-lg p-3 text-center">
                    <p className="text-gray-400 text-xs mb-1">Projects</p>
                    <p className="text-2xl font-bold text-blue-400">{sentry.summary?.totalProjects || 0}</p>
                  </div>
                </div>

                {/* Per-project breakdown */}
                {sentry.projects && sentry.projects.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Issues by Project</h4>
                    {sentry.projects.map((project) => (
                      <div key={project.id} className="bg-dark-400/30 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{project.name}</span>
                            <span className="text-xs px-2 py-0.5 bg-dark-300 rounded text-gray-400">{project.platform}</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <span className="text-orange-400">{project.issueCount} issues</span>
                            {project.criticalCount > 0 && (
                              <span className="text-red-400">{project.criticalCount} critical</span>
                            )}
                          </div>
                        </div>
                        {project.issues.length > 0 ? (
                          <div className="space-y-2">
                            {project.issues.map((issue) => (
                              <a
                                key={issue.id}
                                href={issue.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between bg-dark-500/50 rounded px-3 py-2 hover:bg-dark-500 transition-colors"
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${issue.level === 'error' || issue.level === 'fatal' ? 'bg-red-400' : 'bg-yellow-400'}`} />
                                  <span className="text-sm truncate">{issue.title}</span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-gray-500 flex-shrink-0 ml-2">
                                  <span>{issue.count} events</span>
                                  <span>{new Date(issue.lastSeen).toLocaleDateString()}</span>
                                </div>
                              </a>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 text-center py-2">No unresolved issues</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3 mt-4">
                  <a href={`https://${sentry.organization}.sentry.io/issues/`} target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm">
                    <i className="fas fa-external-link-alt mr-2" />View All in Sentry
                  </a>
                </div>
              </>
            )}
          </div>
          </div>
        )}

        {/* ==================== ANALYTICS TAB ==================== */}
        {activeTab === 'analytics' && (
          <div>
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
          </div>
        )}

        {/* ==================== INFRASTRUCTURE TAB ==================== */}
        {activeTab === 'infrastructure' && (
          <div>
          {/* Infrastructure Sub-tabs */}
          <div className="flex gap-2 mb-6 p-1 bg-dark-400/50 rounded-lg w-fit">
            {infraTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveInfraTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all ${
                  activeInfraTab === tab.id
                    ? 'bg-dark-300 text-white shadow'
                    : 'text-gray-400 hover:text-white hover:bg-dark-300/50'
                }`}
              >
                <i className={`${tab.icon} ${activeInfraTab === tab.id ? tab.iconColor : ''}`} />
                {tab.title}
              </button>
            ))}
          </div>

          {/* Cloudflare */}
          {activeInfraTab === 'cloudflare' && (
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
          )}

          {/* Vercel */}
          {activeInfraTab === 'vercel' && (
        <div className="card p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              <i className="fas fa-triangle text-white mr-2" />
              Vercel
            </h2>
            <button
              onClick={fetchVercel}
              className="btn-secondary text-sm"
              disabled={vercelLoading}
            >
              <i className={`fas fa-sync-alt mr-2 ${vercelLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {vercelLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white" />
            </div>
          ) : !vercel?.configured ? (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
              <p className="text-yellow-400">
                <i className="fas fa-exclamation-triangle mr-2" />
                {vercel?.message || vercel?.error || 'Vercel API not configured'}
              </p>
              <p className="text-gray-400 text-sm mt-2">
                To enable Vercel integration, add the following environment variables:
              </p>
              <ul className="text-gray-400 text-sm mt-2 space-y-1">
                <li><code className="bg-dark-400 px-1 rounded">VERCEL_API_TOKEN</code> - Your Vercel API token (Account Settings → Tokens)</li>
                <li><code className="bg-dark-400 px-1 rounded">VERCEL_TEAM_ID</code> - (Optional) Team ID for team accounts</li>
              </ul>
            </div>
          ) : (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-dark-400/50 rounded-lg p-4 text-center">
                  <p className="text-gray-400 text-sm mb-2">Projects</p>
                  <p className="text-3xl font-bold text-white">
                    {vercel.summary?.totalProjects || 0}
                  </p>
                </div>
                <div className="bg-dark-400/50 rounded-lg p-4 text-center">
                  <p className="text-gray-400 text-sm mb-2">Domains</p>
                  <p className="text-3xl font-bold text-blue-400">
                    {vercel.summary?.totalDomains || 0}
                  </p>
                </div>
                <div className="bg-dark-400/50 rounded-lg p-4 text-center">
                  <p className="text-gray-400 text-sm mb-2">Deploys (24h)</p>
                  <p className="text-3xl font-bold text-green-400">
                    {vercel.summary?.deploymentsLast24h || 0}
                  </p>
                </div>
                <div className="bg-dark-400/50 rounded-lg p-4 text-center">
                  <p className="text-gray-400 text-sm mb-2">Success Rate</p>
                  <p className="text-3xl font-bold text-green-400">
                    {vercel.summary?.successRate || 100}%
                  </p>
                </div>
              </div>

              {/* Recent Deployments */}
              {vercel.deployments && vercel.deployments.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-400 mb-3">Recent Deployments</h3>
                  <div className="space-y-2">
                    {vercel.deployments.slice(0, 5).map((deployment) => (
                      <div key={deployment.id} className="flex justify-between items-center bg-dark-400/30 rounded px-3 py-2">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${getDeploymentStatusColor(deployment.readyState || deployment.state)}`} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium truncate">{deployment.name}</span>
                              {deployment.account && (
                                <span className={`text-xs px-1.5 py-0.5 rounded ${getAccountBadgeColor(deployment.account)}`}>
                                  {deployment.account}
                                </span>
                              )}
                              {deployment.commitSha && (
                                <code className="text-xs bg-dark-400 px-1.5 py-0.5 rounded text-gray-400">
                                  {deployment.commitSha}
                                </code>
                              )}
                            </div>
                            {deployment.commitMessage && (
                              <p className="text-xs text-gray-500 truncate">{deployment.commitMessage}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-sm flex-shrink-0">
                          <span className={`capitalize text-xs ${getDeploymentStatusText(deployment.readyState || deployment.state)}`}>
                            {(deployment.readyState || deployment.state).toLowerCase()}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatRelativeTime(deployment.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Projects & Domains */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Projects */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-3">Projects</h3>
                  <div className="space-y-2">
                    {vercel.projects?.slice(0, 5).map((project) => (
                      <div key={project.id} className="flex justify-between items-center bg-dark-400/30 rounded px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{project.name}</span>
                          {project.account && (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${getAccountBadgeColor(project.account)}`}>
                              {project.account}
                            </span>
                          )}
                          {project.framework && (
                            <span className="text-xs bg-dark-400 px-1.5 py-0.5 rounded text-gray-400">
                              {project.framework}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {(!vercel.projects || vercel.projects.length === 0) && (
                      <p className="text-gray-500 text-sm">No projects found</p>
                    )}
                  </div>
                </div>

                {/* Domains */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-3">Domains</h3>
                  <div className="space-y-2">
                    {vercel.domains?.slice(0, 5).map((domain) => (
                      <div key={domain.name} className="flex justify-between items-center bg-dark-400/30 rounded px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${domain.verified ? 'bg-green-400' : 'bg-yellow-400'}`} />
                          <span className="text-sm">{domain.name}</span>
                          {domain.account && (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${getAccountBadgeColor(domain.account)}`}>
                              {domain.account}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {domain.verified ? 'Verified' : 'Pending'}
                        </span>
                      </div>
                    ))}
                    {(!vercel.domains || vercel.domains.length === 0) && (
                      <p className="text-gray-500 text-sm">No domains found</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Deployment Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-dark-400/50 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-green-400" />
                    <p className="text-gray-400 text-sm">Successful</p>
                  </div>
                  <p className="text-xl font-semibold text-green-400">
                    {vercel.stats?.successful || 0}
                  </p>
                </div>
                <div className="bg-dark-400/50 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-yellow-400" />
                    <p className="text-gray-400 text-sm">Building</p>
                  </div>
                  <p className="text-xl font-semibold text-yellow-400">
                    {vercel.stats?.building || 0}
                  </p>
                </div>
                <div className="bg-dark-400/50 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-red-400" />
                    <p className="text-gray-400 text-sm">Failed</p>
                  </div>
                  <p className="text-xl font-semibold text-red-400">
                    {vercel.stats?.failed || 0}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Links */}
          <div className="border-t border-dark-100/50 pt-4 mt-4">
            <div className="flex flex-wrap items-center gap-4 mb-4">
              {vercel?.accounts && vercel.accounts.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm">Accounts: </span>
                  {vercel.accounts.map((account) => (
                    <code key={account.name} className={`px-2 py-1 rounded text-sm ${getAccountBadgeColor(account.name)}`}>
                      @{account.username}
                    </code>
                  ))}
                </div>
              )}
              {vercel?.configured && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400">
                  <i className="fas fa-check-circle mr-1" />
                  {vercel.accounts?.length || 0} Connected
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://vercel.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-sm"
              >
                <i className="fas fa-external-link-alt mr-2" />
                Vercel Dashboard
              </a>
              <a
                href="https://vercel.com/dashboard/deployments"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-sm"
              >
                <i className="fas fa-rocket mr-2" />
                All Deployments
              </a>
              <a
                href="https://vercel.com/dashboard/domains"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-sm"
              >
                <i className="fas fa-globe mr-2" />
                Domains
              </a>
            </div>
          </div>
        </div>
          )}

          {/* Neon Postgres */}
          {activeInfraTab === 'neon' && (
        <div className="card p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              <i className="fas fa-database text-green-400 mr-2" />
              Neon Postgres
            </h2>
            <button
              onClick={fetchNeon}
              className="btn-secondary text-sm"
              disabled={neonLoading}
            >
              <i className={`fas fa-sync-alt mr-2 ${neonLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {neonLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-400" />
            </div>
          ) : !neon?.configured ? (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
              <p className="text-yellow-400">
                <i className="fas fa-exclamation-triangle mr-2" />
                {neon?.message || neon?.error || 'Neon API not configured'}
              </p>
              <p className="text-gray-400 text-sm mt-2">
                To enable Neon integration, add the following environment variables:
              </p>
              <ul className="text-gray-400 text-sm mt-2 space-y-1">
                <li><code className="bg-dark-400 px-1 rounded">NEON_API_KEY</code> - Your API key from Neon console</li>
                <li><code className="bg-dark-400 px-1 rounded">NEON_PROJECT_ID</code> - (Optional) Specific project to monitor</li>
              </ul>
            </div>
          ) : (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-dark-400/50 rounded-lg p-4 text-center">
                  <p className="text-gray-400 text-sm mb-2">Projects</p>
                  <p className="text-3xl font-bold text-green-400">
                    {neon.summary?.totalProjects || 0}
                  </p>
                </div>
                <div className="bg-dark-400/50 rounded-lg p-4 text-center">
                  <p className="text-gray-400 text-sm mb-2">Branches</p>
                  <p className="text-3xl font-bold text-blue-400">
                    {neon.summary?.totalBranches || 0}
                  </p>
                </div>
                <div className="bg-dark-400/50 rounded-lg p-4 text-center">
                  <p className="text-gray-400 text-sm mb-2">Databases</p>
                  <p className="text-3xl font-bold text-purple-400">
                    {neon.summary?.totalDatabases || 0}
                  </p>
                </div>
                <div className="bg-dark-400/50 rounded-lg p-4 text-center">
                  <p className="text-gray-400 text-sm mb-2">Storage</p>
                  <p className="text-3xl font-bold text-orange-400">
                    {formatBytes(neon.summary?.totalStorageBytes || 0)}
                  </p>
                </div>
              </div>

              {/* Projects */}
              {neon.projects && neon.projects.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-400 mb-3">Projects</h3>
                  <div className="space-y-3">
                    {neon.projects.map((project) => (
                      <div key={project.id} className="bg-dark-400/50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{project.name}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${getNeonProjectBadgeColor(project.displayName)}`}>
                              {project.displayName}
                            </span>
                          </div>
                          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                            PostgreSQL {project.pgVersion}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs text-gray-500">Region</p>
                            <p className="text-sm font-medium">{project.region}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Compute Time</p>
                            <p className="text-sm font-medium">{formatComputeTime(project.activeTimeSeconds || 0)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">CPU Used</p>
                            <p className="text-sm font-medium">{formatComputeTime(project.cpuUsedSeconds || 0)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Last Active</p>
                            <p className="text-sm font-medium">
                              {project.computeLastActiveAt
                                ? formatRelativeTime(new Date(project.computeLastActiveAt).getTime())
                                : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Branches & Endpoints */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Branches */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-3">Branches</h3>
                  <div className="space-y-2">
                    {neon.branches?.slice(0, 8).map((branch) => (
                      <div key={branch.id} className="flex justify-between items-center bg-dark-400/30 rounded px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${branch.currentState === 'ready' ? 'bg-green-400' : 'bg-yellow-400'}`} />
                          <span className="text-sm font-medium">{branch.name}</span>
                          {branch.projectName && (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${getNeonProjectBadgeColor(branch.projectName)}`}>
                              {branch.projectName}
                            </span>
                          )}
                          {branch.primary && (
                            <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">primary</span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatBytes(branch.logicalSize || 0)}
                        </span>
                      </div>
                    ))}
                    {(!neon.branches || neon.branches.length === 0) && (
                      <p className="text-gray-500 text-sm">No branches found</p>
                    )}
                  </div>
                </div>

                {/* Endpoints */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-3">Compute Endpoints</h3>
                  <div className="space-y-2">
                    {neon.endpoints?.slice(0, 8).map((endpoint) => (
                      <div key={endpoint.id} className="bg-dark-400/30 rounded px-3 py-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${getEndpointStatusColor(endpoint.currentState)}`} />
                            <span className="text-sm font-mono truncate max-w-[140px]">{endpoint.host.split('.')[0]}</span>
                            {endpoint.projectName && (
                              <span className={`text-xs px-1.5 py-0.5 rounded ${getNeonProjectBadgeColor(endpoint.projectName)}`}>
                                {endpoint.projectName}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500 capitalize">{endpoint.currentState}</span>
                        </div>
                        {endpoint.poolerEnabled && (
                          <div className="text-xs text-gray-500 mt-1">Pooler enabled</div>
                        )}
                      </div>
                    ))}
                    {(!neon.endpoints || neon.endpoints.length === 0) && (
                      <p className="text-gray-500 text-sm">No endpoints found</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Recent Operations */}
              {neon.operations && neon.operations.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-400 mb-3">Recent Operations</h3>
                  <div className="space-y-2">
                    {neon.operations.slice(0, 8).map((op) => (
                      <div key={op.id} className="flex justify-between items-center bg-dark-400/30 rounded px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            op.status === 'finished' ? 'bg-green-400' :
                            op.status === 'running' ? 'bg-yellow-400 animate-pulse' :
                            op.status === 'error' ? 'bg-red-400' : 'bg-gray-400'
                          }`} />
                          <span className="text-sm">{op.action.replace(/_/g, ' ')}</span>
                          {op.projectName && (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${getNeonProjectBadgeColor(op.projectName)}`}>
                              {op.projectName}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs capitalize ${
                            op.status === 'finished' ? 'text-green-400' :
                            op.status === 'running' ? 'text-yellow-400' :
                            op.status === 'error' ? 'text-red-400' : 'text-gray-400'
                          }`}>{op.status}</span>
                          <span className="text-xs text-gray-500">
                            {formatRelativeTime(new Date(op.createdAt).getTime())}
                          </span>
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
              {neon?.user?.email && (
                <div>
                  <span className="text-gray-400 text-sm">Account: </span>
                  <code className="bg-dark-400 px-2 py-1 rounded text-primary-400 text-sm">
                    {neon.user.email}
                  </code>
                </div>
              )}
              {neon?.projects && neon.projects.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm">Projects: </span>
                  {neon.projects.map((project) => (
                    <span key={project.id} className={`text-xs px-2 py-1 rounded ${getNeonProjectBadgeColor(project.displayName)}`}>
                      {project.displayName}
                    </span>
                  ))}
                </div>
              )}
              {neon?.configured && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400">
                  <i className="fas fa-check-circle mr-1" />
                  {neon.summary?.totalProjects || 0} Connected
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://console.neon.tech"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-sm"
              >
                <i className="fas fa-external-link-alt mr-2" />
                Neon Console
              </a>
              <a
                href="https://console.neon.tech/app/projects"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-sm"
              >
                <i className="fas fa-folder mr-2" />
                Projects
              </a>
              <a
                href="https://neon.tech/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-sm"
              >
                <i className="fas fa-book mr-2" />
                Documentation
              </a>
            </div>
          </div>
        </div>
          )}
          </div>
        )}

        {/* ==================== DEVELOPMENT TAB ==================== */}
        {activeTab === 'development' && (
          <div>
          {/* GitHub */}
        <div className="card p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              <i className="fab fa-github text-white mr-2" />
              GitHub
            </h2>
            <button
              onClick={fetchGithub}
              className="btn-secondary text-sm"
              disabled={githubLoading}
            >
              <i className={`fas fa-sync-alt mr-2 ${githubLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {githubLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white" />
            </div>
          ) : !github?.configured ? (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
              <p className="text-yellow-400">
                <i className="fas fa-exclamation-triangle mr-2" />
                {github?.message || github?.error || 'GitHub API not configured'}
              </p>
              <p className="text-gray-400 text-sm mt-2">
                To enable GitHub integration, add the following environment variables:
              </p>
              <ul className="text-gray-400 text-sm mt-2 space-y-1">
                <li><code className="bg-dark-400 px-1 rounded">GITHUB_ACCESS_TOKEN</code> - Personal access token with repo, read:org, read:user, workflow scopes</li>
                <li><code className="bg-dark-400 px-1 rounded">GITHUB_USERNAME</code> - (Optional) Your GitHub username</li>
              </ul>
            </div>
          ) : (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-dark-400/50 rounded-lg p-4 text-center">
                  <p className="text-gray-400 text-sm mb-2">Repositories</p>
                  <p className="text-3xl font-bold text-white">
                    {github.summary?.totalRepos || 0}
                  </p>
                  <p className="text-xs text-gray-500">
                    {github.summary?.publicRepos || 0} public / {github.summary?.privateRepos || 0} private
                  </p>
                </div>
                <div className="bg-dark-400/50 rounded-lg p-4 text-center">
                  <p className="text-gray-400 text-sm mb-2">Total Stars</p>
                  <p className="text-3xl font-bold text-yellow-400">
                    {github.summary?.totalStars || 0}
                  </p>
                </div>
                <div className="bg-dark-400/50 rounded-lg p-4 text-center">
                  <p className="text-gray-400 text-sm mb-2">Open Issues</p>
                  <p className="text-3xl font-bold text-orange-400">
                    {github.summary?.openIssues || 0}
                  </p>
                </div>
                <div className="bg-dark-400/50 rounded-lg p-4 text-center">
                  <p className="text-gray-400 text-sm mb-2">Open PRs</p>
                  <p className="text-3xl font-bold text-purple-400">
                    {github.summary?.openPRs || 0}
                  </p>
                </div>
              </div>

              {/* Recent Repositories */}
              {github.repos && github.repos.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-400 mb-3">Recent Repositories</h3>
                  <div className="space-y-2">
                    {github.repos.slice(0, 6).map((repo) => (
                      <div key={repo.id} className="flex justify-between items-center bg-dark-400/30 rounded px-3 py-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <i className={`fas ${repo.private ? 'fa-lock text-yellow-400' : 'fa-book text-gray-400'} text-xs`} />
                          <a
                            href={repo.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium hover:text-primary-400 truncate"
                          >
                            {repo.name}
                          </a>
                          {repo.language && (
                            <span className="text-xs bg-dark-400 px-1.5 py-0.5 rounded text-gray-400">
                              {repo.language}
                            </span>
                          )}
                          {repo.fork && (
                            <span className="text-xs text-gray-500">
                              <i className="fas fa-code-branch mr-1" />
                              fork
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          {repo.stars > 0 && (
                            <span><i className="fas fa-star text-yellow-400 mr-1" />{repo.stars}</span>
                          )}
                          <span>{formatRelativeTime(new Date(repo.pushedAt).getTime())}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Activity & Workflow Runs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Recent Activity */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-3">Recent Activity</h3>
                  <div className="space-y-2">
                    {github.events?.slice(0, 6).map((event) => (
                      <div key={event.id} className="bg-dark-400/30 rounded px-3 py-2">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-400">{formatEventType(event.type)}</span>
                          <span className="font-medium truncate">{event.repo.split('/')[1]}</span>
                        </div>
                        {event.commits && event.commits.length > 0 && (
                          <p className="text-xs text-gray-500 truncate mt-1">
                            {event.commits[0].message}
                          </p>
                        )}
                        <span className="text-xs text-gray-500">
                          {formatRelativeTime(new Date(event.createdAt).getTime())}
                        </span>
                      </div>
                    ))}
                    {(!github.events || github.events.length === 0) && (
                      <p className="text-gray-500 text-sm">No recent activity</p>
                    )}
                  </div>
                </div>

                {/* Workflow Runs */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-3">Workflow Runs</h3>
                  <div className="space-y-2">
                    {github.workflowRuns?.slice(0, 6).map((run) => (
                      <div key={run.id} className="flex justify-between items-center bg-dark-400/30 rounded px-3 py-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className={`w-2 h-2 rounded-full ${getWorkflowStatusColor(run.status, run.conclusion)}`} />
                          <span className="text-sm truncate">{run.name}</span>
                          <span className="text-xs bg-dark-400 px-1.5 py-0.5 rounded text-gray-400">
                            {run.repo}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatRelativeTime(new Date(run.createdAt).getTime())}
                        </span>
                      </div>
                    ))}
                    {(!github.workflowRuns || github.workflowRuns.length === 0) && (
                      <p className="text-gray-500 text-sm">No workflow runs found</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Open Issues & PRs */}
              {((github.issues && github.issues.length > 0) || (github.pullRequests && github.pullRequests.length > 0)) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Open Issues */}
                  {github.issues && github.issues.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-400 mb-3">Assigned Issues</h3>
                      <div className="space-y-2">
                        {github.issues.slice(0, 4).map((issue) => (
                          <a
                            key={issue.id}
                            href={issue.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block bg-dark-400/30 rounded px-3 py-2 hover:bg-dark-400/50"
                          >
                            <div className="flex items-center gap-2">
                              <i className="fas fa-dot-circle text-green-400 text-xs" />
                              <span className="text-sm truncate">{issue.title}</span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {issue.repo?.split('/')[1]} #{issue.number}
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Open PRs */}
                  {github.pullRequests && github.pullRequests.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-400 mb-3">Your Pull Requests</h3>
                      <div className="space-y-2">
                        {github.pullRequests.slice(0, 4).map((pr) => (
                          <a
                            key={pr.id}
                            href={pr.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block bg-dark-400/30 rounded px-3 py-2 hover:bg-dark-400/50"
                          >
                            <div className="flex items-center gap-2">
                              <i className="fas fa-code-pull-request text-purple-400 text-xs" />
                              <span className="text-sm truncate">{pr.title}</span>
                              {pr.draft && (
                                <span className="text-xs bg-gray-500/20 text-gray-400 px-1.5 py-0.5 rounded">draft</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {pr.repo?.split('/')[1]} #{pr.number}
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Links */}
          <div className="border-t border-dark-100/50 pt-4 mt-4">
            <div className="flex flex-wrap items-center gap-4 mb-4">
              {github?.user?.login && (
                <div className="flex items-center gap-2">
                  {github.user.avatarUrl && (
                    <img src={github.user.avatarUrl} alt="" className="w-6 h-6 rounded-full" />
                  )}
                  <code className="bg-dark-400 px-2 py-1 rounded text-primary-400 text-sm">
                    @{github.user.login}
                  </code>
                </div>
              )}
              {github?.summary?.languages && github.summary.languages.length > 0 && (
                <div className="flex items-center gap-2">
                  {github.summary.languages.slice(0, 4).map((lang) => (
                    <span key={lang} className="text-xs bg-dark-400 px-1.5 py-0.5 rounded text-gray-400">
                      {lang}
                    </span>
                  ))}
                </div>
              )}
              {github?.configured && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400">
                  <i className="fas fa-check-circle mr-1" />
                  Connected
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-sm"
              >
                <i className="fab fa-github mr-2" />
                GitHub
              </a>
              <a
                href="https://github.com/pulls"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-sm"
              >
                <i className="fas fa-code-pull-request mr-2" />
                Pull Requests
              </a>
              <a
                href="https://github.com/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-sm"
              >
                <i className="fas fa-circle-dot mr-2" />
                Issues
              </a>
              <a
                href="https://github.com/notifications"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-sm"
              >
                <i className="fas fa-bell mr-2" />
                Notifications
              </a>
            </div>
          </div>
        </div>
          </div>
        )}

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
