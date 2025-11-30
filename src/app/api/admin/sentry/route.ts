import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

interface SentryProject {
  id: string
  slug: string
  name: string
  platform: string
  dateCreated: string
  status: string
}

interface SentryIssue {
  id: string
  shortId: string
  title: string
  culprit: string
  permalink: string
  level: string
  status: string
  isUnhandled: boolean
  count: string
  userCount: number
  firstSeen: string
  lastSeen: string
  project: {
    id: string
    name: string
    slug: string
  }
  metadata: {
    type?: string
    value?: string
    filename?: string
    function?: string
  }
}

interface SentryStats {
  start: string
  end: string
  intervals: string[]
  groups: Array<{
    by: Record<string, string>
    series: Record<string, number[]>
    totals: Record<string, number>
  }>
}

async function sentryFetch<T>(
  endpoint: string,
  token: string,
  org: string
): Promise<T> {
  const response = await fetch(`https://sentry.io/api/0/organizations/${org}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Sentry API error: ${response.status} - ${error}`)
  }

  return response.json()
}

async function sentryFetchProjects(
  token: string,
  org: string
): Promise<SentryProject[]> {
  const response = await fetch(`https://sentry.io/api/0/organizations/${org}/projects/`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch projects: ${response.status}`)
  }

  return response.json()
}

function getLevelColor(level: string): string {
  const colors: Record<string, string> = {
    fatal: 'red',
    error: 'red',
    warning: 'yellow',
    info: 'blue',
    debug: 'gray',
  }
  return colors[level] || 'gray'
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    unresolved: 'red',
    resolved: 'green',
    ignored: 'gray',
    muted: 'gray',
  }
  return colors[status] || 'gray'
}

export async function GET() {
  try {
    // Check admin access
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if Sentry is configured
    if (!process.env.SENTRY_AUTH_TOKEN || !process.env.SENTRY_ORG) {
      return NextResponse.json({
        configured: false,
        message: 'Sentry not configured. Add SENTRY_AUTH_TOKEN and SENTRY_ORG environment variables.',
      })
    }

    const token = process.env.SENTRY_AUTH_TOKEN
    const org = process.env.SENTRY_ORG
    const projectFilter = process.env.SENTRY_PROJECT // Optional: filter to specific project

    // Get all projects
    let projects: SentryProject[]
    try {
      projects = await sentryFetchProjects(token, org)
    } catch (error) {
      return NextResponse.json({
        configured: false,
        error: 'Invalid Sentry credentials',
        details: error instanceof Error ? error.message : 'Unknown error',
      }, { status: 401 })
    }

    // Filter to specific project if configured
    if (projectFilter) {
      projects = projects.filter(p => p.slug === projectFilter || p.name === projectFilter)
    }

    const projectSlugs = projects.map(p => p.slug)
    const projectQuery = projectSlugs.map(s => `project:${s}`).join(' OR ')

    // Get unresolved issues (last 24 hours activity)
    const issues = await sentryFetch<SentryIssue[]>(
      `/issues/?query=is:unresolved ${projectQuery}&statsPeriod=24h&limit=20`,
      token,
      org
    )

    const formattedIssues = issues.map(issue => ({
      id: issue.id,
      shortId: issue.shortId,
      title: issue.title,
      culprit: issue.culprit,
      url: issue.permalink,
      level: issue.level,
      levelColor: getLevelColor(issue.level),
      status: issue.status,
      statusColor: getStatusColor(issue.status),
      isUnhandled: issue.isUnhandled,
      count: parseInt(issue.count),
      userCount: issue.userCount,
      firstSeen: issue.firstSeen,
      lastSeen: issue.lastSeen,
      project: issue.project.name,
      projectSlug: issue.project.slug,
      errorType: issue.metadata.type,
      errorValue: issue.metadata.value?.slice(0, 100),
      filename: issue.metadata.filename,
      function: issue.metadata.function,
    }))

    // Get error stats for last 24 hours
    const now = new Date()
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    let errorStats: SentryStats | null = null
    try {
      errorStats = await sentryFetch<SentryStats>(
        `/stats_v2/?field=sum(quantity)&category=error&interval=1h&statsPeriod=24h&${projectSlugs.map(s => `project=${s}`).join('&')}`,
        token,
        org
      )
    } catch {
      // Stats might not be available for all plans
    }

    // Get transaction stats (performance) for last 24 hours
    let transactionStats: SentryStats | null = null
    try {
      transactionStats = await sentryFetch<SentryStats>(
        `/stats_v2/?field=sum(quantity)&category=transaction&interval=1h&statsPeriod=24h&${projectSlugs.map(s => `project=${s}`).join('&')}`,
        token,
        org
      )
    } catch {
      // Performance monitoring might not be enabled
    }

    // Calculate summary
    const unresolvedCount = formattedIssues.filter(i => i.status === 'unresolved').length
    const criticalCount = formattedIssues.filter(i => i.level === 'fatal' || i.level === 'error').length
    const unhandledCount = formattedIssues.filter(i => i.isUnhandled).length
    const totalEvents = formattedIssues.reduce((sum, i) => sum + i.count, 0)
    const uniqueUsers = formattedIssues.reduce((sum, i) => sum + i.userCount, 0)

    // Calculate 24h error trend
    let errors24h = 0
    let errorTrend: number[] = []
    if (errorStats?.groups?.[0]) {
      const series = Object.values(errorStats.groups[0].series)[0] || []
      errors24h = series.reduce((sum, val) => sum + val, 0)
      errorTrend = series
    }

    // Calculate 24h transactions
    let transactions24h = 0
    if (transactionStats?.groups?.[0]) {
      const series = Object.values(transactionStats.groups[0].series)[0] || []
      transactions24h = series.reduce((sum, val) => sum + val, 0)
    }

    return NextResponse.json({
      configured: true,
      organization: org,
      projects: projects.map(p => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        platform: p.platform,
        status: p.status,
      })),
      summary: {
        totalProjects: projects.length,
        unresolvedIssues: unresolvedCount,
        criticalIssues: criticalCount,
        unhandledErrors: unhandledCount,
        totalEvents,
        uniqueUsers,
        errors24h,
        transactions24h,
      },
      errorTrend: {
        intervals: errorStats?.intervals || [],
        values: errorTrend,
      },
      issues: formattedIssues,
    })
  } catch (error) {
    console.error('Sentry API error:', error)
    return NextResponse.json(
      {
        configured: false,
        error: 'Failed to fetch Sentry data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
