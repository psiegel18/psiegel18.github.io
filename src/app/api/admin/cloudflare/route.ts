import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Cloudflare API base URL
const CF_API_BASE = 'https://api.cloudflare.com/client/v4'

type CloudflareResponse<T> = {
  success: boolean
  errors: { code: number; message: string }[]
  result: T
  result_info?: {
    page: number
    per_page: number
    total_count: number
    total_pages: number
  }
}

async function cfFetch<T>(
  endpoint: string,
  apiToken: string,
  options: RequestInit = {}
): Promise<CloudflareResponse<T>> {
  const response = await fetch(`${CF_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  return response.json()
}

export async function GET() {
  try {
    // Check admin access
    const session = await getServerSession(authOptions)

    // Debug logging for session
    console.log('Cloudflare API: Session check', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userRole: session?.user?.role,
      userEmail: session?.user?.email?.slice(0, 3) + '...',
    })

    if (!session?.user || session.user.role !== 'ADMIN') {
      console.log('Cloudflare API: Unauthorized - session check failed')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if credentials are configured
    const hasToken = !!process.env.CLOUDFLARE_API_TOKEN
    const tokenPreview = process.env.CLOUDFLARE_API_TOKEN?.slice(0, 4) + '...'
    console.log('Cloudflare API: Token check', { hasToken, tokenPreview })

    if (!process.env.CLOUDFLARE_API_TOKEN) {
      return NextResponse.json({
        configured: false,
        message: 'Cloudflare API not configured. Add CLOUDFLARE_API_TOKEN environment variable.',
      })
    }

    const apiToken = process.env.CLOUDFLARE_API_TOKEN
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID

    // Fetch zones (domains) - this also verifies the token is valid
    const zonesResponse = await cfFetch<Array<{
      id: string
      name: string
      status: string
      paused: boolean
      type: string
      development_mode: number
      name_servers: string[]
      created_on: string
      modified_on: string
    }>>('/zones', apiToken)

    console.log('Cloudflare API: Zones response', {
      success: zonesResponse.success,
      zoneCount: zonesResponse.result?.length || 0,
      errors: zonesResponse.errors,
    })

    if (!zonesResponse.success) {
      console.log('Cloudflare API: Token validation failed', zonesResponse.errors)
      return NextResponse.json({
        configured: false,
        error: 'Invalid Cloudflare API token',
        details: zonesResponse.errors.map(e => e.message).join(', '),
      }, { status: 401 })
    }

    const zones = zonesResponse.result.map(zone => ({
      id: zone.id,
      name: zone.name,
      status: zone.status,
      paused: zone.paused,
      type: zone.type,
      developmentMode: zone.development_mode > 0,
      nameServers: zone.name_servers,
      createdOn: zone.created_on,
      modifiedOn: zone.modified_on,
    }))

    // Fetch analytics for each zone (last 24 hours)
    const zoneAnalytics: Record<string, {
      requests: number
      bandwidth: number
      threats: number
      pageViews: number
    }> = {}

    for (const zone of zones.slice(0, 5)) { // Limit to 5 zones to avoid rate limits
      try {
        const analyticsResponse = await cfFetch<{
          totals: {
            requests: { all: number }
            bandwidth: { all: number }
            threats: { all: number }
            pageviews: { all: number }
          }
        }>(`/zones/${zone.id}/analytics/dashboard?since=-1440&continuous=true`, apiToken)

        if (analyticsResponse.success && analyticsResponse.result?.totals) {
          zoneAnalytics[zone.id] = {
            requests: analyticsResponse.result.totals.requests?.all || 0,
            bandwidth: analyticsResponse.result.totals.bandwidth?.all || 0,
            threats: analyticsResponse.result.totals.threats?.all || 0,
            pageViews: analyticsResponse.result.totals.pageviews?.all || 0,
          }
        }
      } catch {
        // Analytics may not be available for all plans
      }
    }

    // Fetch R2 buckets (if account ID is provided)
    let r2Buckets: Array<{ name: string; creationDate: string }> = []
    if (accountId) {
      try {
        const r2Response = await cfFetch<{
          buckets: Array<{ name: string; creation_date: string }>
        }>(`/accounts/${accountId}/r2/buckets`, apiToken)

        if (r2Response.success && r2Response.result?.buckets) {
          r2Buckets = r2Response.result.buckets.map(bucket => ({
            name: bucket.name,
            creationDate: bucket.creation_date,
          }))
        }
      } catch {
        // R2 may not be enabled
      }
    }

    // Fetch Workers (if account ID is provided)
    let workers: Array<{
      id: string
      name: string
      createdOn: string
      modifiedOn: string
    }> = []
    if (accountId) {
      try {
        const workersResponse = await cfFetch<Array<{
          id: string
          name?: string
          created_on: string
          modified_on: string
        }>>(`/accounts/${accountId}/workers/scripts`, apiToken)

        if (workersResponse.success) {
          workers = workersResponse.result.map(worker => ({
            id: worker.id,
            name: worker.name || worker.id,
            createdOn: worker.created_on,
            modifiedOn: worker.modified_on,
          }))
        }
      } catch {
        // Workers may not be enabled
      }
    }

    // Fetch Pages projects (if account ID is provided)
    let pages: Array<{
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
    }> = []
    if (accountId) {
      try {
        const pagesResponse = await cfFetch<Array<{
          name: string
          subdomain: string
          production_branch: string
          created_on: string
          latest_deployment?: {
            id: string
            url: string
            environment: string
            created_on: string
          }
        }>>(`/accounts/${accountId}/pages/projects`, apiToken)

        if (pagesResponse.success) {
          pages = pagesResponse.result.map(project => ({
            name: project.name,
            subdomain: project.subdomain,
            productionBranch: project.production_branch,
            createdOn: project.created_on,
            latestDeployment: project.latest_deployment ? {
              id: project.latest_deployment.id,
              url: project.latest_deployment.url,
              environment: project.latest_deployment.environment,
              createdOn: project.latest_deployment.created_on,
            } : undefined,
          }))
        }
      } catch {
        // Pages may not be enabled
      }
    }

    // Calculate totals
    const totalRequests = Object.values(zoneAnalytics).reduce((sum, z) => sum + z.requests, 0)
    const totalBandwidth = Object.values(zoneAnalytics).reduce((sum, z) => sum + z.bandwidth, 0)
    const totalThreats = Object.values(zoneAnalytics).reduce((sum, z) => sum + z.threats, 0)

    return NextResponse.json({
      configured: true,
      accountId: accountId || null,
      summary: {
        totalZones: zones.length,
        totalWorkers: workers.length,
        totalPages: pages.length,
        totalR2Buckets: r2Buckets.length,
        last24h: {
          requests: totalRequests,
          bandwidth: totalBandwidth,
          threats: totalThreats,
        },
      },
      zones,
      zoneAnalytics,
      workers,
      pages,
      r2Buckets,
    })
  } catch (error) {
    console.error('Cloudflare API error:', error)
    return NextResponse.json(
      {
        configured: false,
        error: 'Failed to fetch Cloudflare data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
