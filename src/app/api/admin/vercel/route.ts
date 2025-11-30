import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const VERCEL_API_BASE = 'https://api.vercel.com'

type VercelResponse<T> = T & {
  error?: { code: string; message: string }
}

async function vercelFetch<T>(
  endpoint: string,
  apiToken: string,
  teamId?: string
): Promise<VercelResponse<T>> {
  const url = new URL(`${VERCEL_API_BASE}${endpoint}`)
  if (teamId) {
    url.searchParams.set('teamId', teamId)
  }

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
  })
  return response.json()
}

export async function GET() {
  try {
    // Check admin access
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if credentials are configured
    if (!process.env.VERCEL_API_TOKEN) {
      return NextResponse.json({
        configured: false,
        message: 'Vercel API not configured. Add VERCEL_API_TOKEN environment variable.',
      })
    }

    const apiToken = process.env.VERCEL_API_TOKEN
    const teamId = process.env.VERCEL_TEAM_ID

    // Verify token by getting user info
    const userResponse = await vercelFetch<{
      user: {
        id: string
        email: string
        name: string
        username: string
      }
    }>('/v2/user', apiToken)

    if (userResponse.error) {
      return NextResponse.json({
        configured: false,
        error: 'Invalid Vercel API token',
        details: userResponse.error.message,
      }, { status: 401 })
    }

    // Fetch projects
    const projectsResponse = await vercelFetch<{
      projects: Array<{
        id: string
        name: string
        framework: string | null
        latestDeployments?: Array<{
          id: string
          url: string
          createdAt: number
          state: string
          readyState: string
        }>
        updatedAt: number
        createdAt: number
      }>
    }>('/v9/projects', apiToken, teamId)

    const projects = projectsResponse.projects?.map(project => ({
      id: project.id,
      name: project.name,
      framework: project.framework,
      updatedAt: project.updatedAt,
      createdAt: project.createdAt,
    })) || []

    // Fetch recent deployments (last 10)
    const deploymentsResponse = await vercelFetch<{
      deployments: Array<{
        uid: string
        name: string
        url: string
        state: string
        readyState: string
        createdAt: number
        buildingAt?: number
        ready?: number
        source?: string
        meta?: {
          githubCommitMessage?: string
          githubCommitRef?: string
          githubCommitSha?: string
        }
      }>
    }>('/v6/deployments?limit=10', apiToken, teamId)

    const deployments = deploymentsResponse.deployments?.map(d => ({
      id: d.uid,
      name: d.name,
      url: d.url,
      state: d.state,
      readyState: d.readyState,
      createdAt: d.createdAt,
      buildingAt: d.buildingAt,
      ready: d.ready,
      source: d.source,
      commitMessage: d.meta?.githubCommitMessage,
      commitRef: d.meta?.githubCommitRef,
      commitSha: d.meta?.githubCommitSha?.slice(0, 7),
    })) || []

    // Fetch domains
    const domainsResponse = await vercelFetch<{
      domains: Array<{
        name: string
        apexName: string
        verified: boolean
        createdAt: number
        configuredBy?: string
      }>
    }>('/v5/domains', apiToken, teamId)

    const domains = domainsResponse.domains?.map(d => ({
      name: d.name,
      apexName: d.apexName,
      verified: d.verified,
      createdAt: d.createdAt,
    })) || []

    // Calculate deployment stats
    const now = Date.now()
    const last24h = now - 24 * 60 * 60 * 1000
    const last7d = now - 7 * 24 * 60 * 60 * 1000

    const recentDeployments = deployments.filter(d => d.createdAt > last24h)
    const weekDeployments = deployments.filter(d => d.createdAt > last7d)

    const successfulDeployments = deployments.filter(d =>
      d.readyState === 'READY' || d.state === 'READY'
    ).length

    const failedDeployments = deployments.filter(d =>
      d.readyState === 'ERROR' || d.state === 'ERROR'
    ).length

    // Get the current/latest deployment for each project
    const activeDeployments = deployments.filter(d =>
      d.readyState === 'READY' || d.state === 'READY'
    ).slice(0, 5)

    return NextResponse.json({
      configured: true,
      user: {
        email: userResponse.user.email,
        name: userResponse.user.name,
        username: userResponse.user.username,
      },
      teamId: teamId || null,
      summary: {
        totalProjects: projects.length,
        totalDomains: domains.length,
        deploymentsLast24h: recentDeployments.length,
        deploymentsLast7d: weekDeployments.length,
        successRate: deployments.length > 0
          ? Math.round((successfulDeployments / deployments.length) * 100)
          : 100,
      },
      projects,
      deployments,
      domains,
      stats: {
        successful: successfulDeployments,
        failed: failedDeployments,
        building: deployments.filter(d =>
          d.readyState === 'BUILDING' || d.state === 'BUILDING'
        ).length,
      },
    })
  } catch (error) {
    console.error('Vercel API error:', error)
    return NextResponse.json(
      {
        configured: false,
        error: 'Failed to fetch Vercel data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
