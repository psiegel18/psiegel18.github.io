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

type AccountConfig = {
  name: string
  token: string
  teamId?: string
}

async function fetchAccountData(config: AccountConfig) {
  const { name, token, teamId } = config

  try {
    // Verify token by getting user info
    const userResponse = await vercelFetch<{
      user: {
        id: string
        email: string
        name: string
        username: string
      }
    }>('/v2/user', token)

    if (userResponse.error) {
      return {
        name,
        configured: false,
        error: `Invalid token for ${name}`,
      }
    }

    // Fetch projects
    const projectsResponse = await vercelFetch<{
      projects: Array<{
        id: string
        name: string
        framework: string | null
        updatedAt: number
        createdAt: number
      }>
    }>('/v9/projects', token, teamId)

    const projects = projectsResponse.projects?.map(project => ({
      id: project.id,
      name: project.name,
      framework: project.framework,
      updatedAt: project.updatedAt,
      createdAt: project.createdAt,
      account: name,
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
    }>('/v6/deployments?limit=10', token, teamId)

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
      account: name,
    })) || []

    // Fetch domains
    const domainsResponse = await vercelFetch<{
      domains: Array<{
        name: string
        apexName: string
        verified: boolean
        createdAt: number
      }>
    }>('/v5/domains', token, teamId)

    const domains = domainsResponse.domains?.map(d => ({
      name: d.name,
      apexName: d.apexName,
      verified: d.verified,
      createdAt: d.createdAt,
      account: name,
    })) || []

    return {
      name,
      configured: true,
      user: {
        email: userResponse.user.email,
        name: userResponse.user.name,
        username: userResponse.user.username,
      },
      projects,
      deployments,
      domains,
    }
  } catch (error) {
    return {
      name,
      configured: false,
      error: `Failed to fetch data for ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

export async function GET() {
  try {
    // Check admin access
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Build list of configured accounts
    const accounts: AccountConfig[] = []

    // Check for multi-account setup first
    if (process.env.VERCEL_WEB_API_TOKEN) {
      accounts.push({
        name: 'Web',
        token: process.env.VERCEL_WEB_API_TOKEN,
        teamId: process.env.VERCEL_WEB_TEAM_ID,
      })
    }

    if (process.env.VERCEL_HOUSE_API_TOKEN) {
      accounts.push({
        name: 'TheHouse',
        token: process.env.VERCEL_HOUSE_API_TOKEN,
        teamId: process.env.VERCEL_HOUSE_TEAM_ID,
      })
    }

    // Fallback to single account setup
    if (accounts.length === 0 && process.env.VERCEL_API_TOKEN) {
      accounts.push({
        name: 'Default',
        token: process.env.VERCEL_API_TOKEN,
        teamId: process.env.VERCEL_TEAM_ID,
      })
    }

    if (accounts.length === 0) {
      return NextResponse.json({
        configured: false,
        message: 'Vercel API not configured. Add VERCEL_WEB_API_TOKEN and/or VERCEL_HOUSE_API_TOKEN environment variables.',
      })
    }

    // Fetch data from all accounts in parallel
    const accountResults = await Promise.all(
      accounts.map(account => fetchAccountData(account))
    )

    // Combine all data
    const allProjects: Array<{
      id: string
      name: string
      framework: string | null
      updatedAt: number
      createdAt: number
      account: string
    }> = []

    const allDeployments: Array<{
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
    }> = []

    const allDomains: Array<{
      name: string
      apexName: string
      verified: boolean
      createdAt: number
      account: string
    }> = []

    const configuredAccounts: Array<{
      name: string
      username: string
      email: string
    }> = []

    for (const result of accountResults) {
      if (result.configured && 'projects' in result) {
        allProjects.push(...(result.projects || []))
        allDeployments.push(...(result.deployments || []))
        allDomains.push(...(result.domains || []))
        if (result.user) {
          configuredAccounts.push({
            name: result.name,
            username: result.user.username,
            email: result.user.email,
          })
        }
      }
    }

    // Sort deployments by createdAt (most recent first)
    allDeployments.sort((a, b) => b.createdAt - a.createdAt)

    // Calculate combined stats
    const now = Date.now()
    const last24h = now - 24 * 60 * 60 * 1000
    const last7d = now - 7 * 24 * 60 * 60 * 1000

    const recentDeployments = allDeployments.filter(d => d.createdAt > last24h)
    const weekDeployments = allDeployments.filter(d => d.createdAt > last7d)

    const successfulDeployments = allDeployments.filter(d =>
      d.readyState === 'READY' || d.state === 'READY'
    ).length

    const failedDeployments = allDeployments.filter(d =>
      d.readyState === 'ERROR' || d.state === 'ERROR'
    ).length

    const buildingDeployments = allDeployments.filter(d =>
      d.readyState === 'BUILDING' || d.state === 'BUILDING'
    ).length

    return NextResponse.json({
      configured: configuredAccounts.length > 0,
      accounts: configuredAccounts,
      summary: {
        totalProjects: allProjects.length,
        totalDomains: allDomains.length,
        deploymentsLast24h: recentDeployments.length,
        deploymentsLast7d: weekDeployments.length,
        successRate: allDeployments.length > 0
          ? Math.round((successfulDeployments / allDeployments.length) * 100)
          : 100,
      },
      projects: allProjects,
      deployments: allDeployments.slice(0, 15), // Last 15 across all accounts
      domains: allDomains,
      stats: {
        successful: successfulDeployments,
        failed: failedDeployments,
        building: buildingDeployments,
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
