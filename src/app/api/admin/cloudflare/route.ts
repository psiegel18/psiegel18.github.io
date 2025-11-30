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
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    if (!zonesResponse.success) {
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

    // Fetch analytics, DNS records, and SSL certificates for each zone
    const zoneAnalytics: Record<string, {
      requests: number
      bandwidth: number
      threats: number
      pageViews: number
    }> = {}

    const zoneDnsRecords: Record<string, Array<{
      id: string
      type: string
      name: string
      content: string
      proxied: boolean
      ttl: number
    }>> = {}

    const zoneSslCerts: Record<string, {
      status: string
      issuer?: string
      expiresOn?: string
      daysUntilExpiry?: number
      hosts?: string[]
    }> = {}

    for (const zone of zones.slice(0, 5)) { // Limit to 5 zones to avoid rate limits
      // Analytics
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

      // DNS Records
      try {
        const dnsResponse = await cfFetch<Array<{
          id: string
          type: string
          name: string
          content: string
          proxied: boolean
          ttl: number
        }>>(`/zones/${zone.id}/dns_records?per_page=100`, apiToken)

        if (dnsResponse.success && Array.isArray(dnsResponse.result)) {
          zoneDnsRecords[zone.id] = dnsResponse.result.map(record => ({
            id: record.id,
            type: record.type,
            name: record.name,
            content: record.content,
            proxied: record.proxied,
            ttl: record.ttl,
          }))
        }
      } catch {
        // DNS may not be accessible
      }

      // SSL Certificates
      try {
        const sslResponse = await cfFetch<{
          certificate_packs?: Array<{
            id: string
            type: string
            status: string
            hosts: string[]
            certificates?: Array<{
              issuer: string
              expires_on: string
            }>
          }>
        }>(`/zones/${zone.id}/ssl/certificate_packs?status=active`, apiToken)

        if (sslResponse.success && sslResponse.result?.certificate_packs?.[0]) {
          const pack = sslResponse.result.certificate_packs[0]
          const cert = pack.certificates?.[0]
          let daysUntilExpiry: number | undefined

          if (cert?.expires_on) {
            const expiryDate = new Date(cert.expires_on)
            const now = new Date()
            daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          }

          zoneSslCerts[zone.id] = {
            status: pack.status,
            issuer: cert?.issuer,
            expiresOn: cert?.expires_on,
            daysUntilExpiry,
            hosts: pack.hosts,
          }
        }
      } catch {
        // SSL info may not be accessible
      }
    }

    // Fetch R2 buckets with usage details (if account ID is provided)
    let r2Buckets: Array<{
      name: string
      creationDate: string
      location: string
      storageClass: string
      objectCount?: number
      storageUsed?: number
    }> = []
    let r2Summary = {
      totalBuckets: 0,
      totalObjects: 0,
      totalStorageUsed: 0,
    }

    if (accountId) {
      try {
        const r2Response = await cfFetch<{
          buckets: Array<{
            name: string
            creation_date: string
            location?: string
            storage_class?: string
          }>
        }>(`/accounts/${accountId}/r2/buckets`, apiToken)

        if (r2Response.success && r2Response.result?.buckets) {
          // Fetch usage details for each bucket (limit to 10 to avoid rate limits)
          const bucketDetails = await Promise.all(
            r2Response.result.buckets.slice(0, 10).map(async (bucket) => {
              let objectCount: number | undefined
              let storageUsed: number | undefined

              try {
                // Fetch bucket usage/metrics
                const usageResponse = await cfFetch<{
                  objectCount?: number
                  payloadSize?: number
                  metadataSize?: number
                  uploadCount?: number
                }>(`/accounts/${accountId}/r2/buckets/${bucket.name}/usage`, apiToken)

                if (usageResponse.success && usageResponse.result) {
                  objectCount = usageResponse.result.objectCount
                  storageUsed = (usageResponse.result.payloadSize || 0) + (usageResponse.result.metadataSize || 0)
                }
              } catch {
                // Usage endpoint may not be available
              }

              return {
                name: bucket.name,
                creationDate: bucket.creation_date,
                location: bucket.location || 'auto',
                storageClass: bucket.storage_class || 'Standard',
                objectCount,
                storageUsed,
              }
            })
          )

          r2Buckets = bucketDetails
          r2Summary = {
            totalBuckets: r2Response.result.buckets.length,
            totalObjects: bucketDetails.reduce((sum, b) => sum + (b.objectCount || 0), 0),
            totalStorageUsed: bucketDetails.reduce((sum, b) => sum + (b.storageUsed || 0), 0),
          }
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

    // Calculate DNS stats
    const totalDnsRecords = Object.values(zoneDnsRecords).reduce((sum, records) => sum + records.length, 0)

    // Calculate SSL warnings (certs expiring within 30 days)
    const sslWarnings = Object.entries(zoneSslCerts)
      .filter(([, cert]) => cert.daysUntilExpiry !== undefined && cert.daysUntilExpiry <= 30)
      .map(([zoneId, cert]) => ({
        zone: zones.find(z => z.id === zoneId)?.name || zoneId,
        daysUntilExpiry: cert.daysUntilExpiry,
        expiresOn: cert.expiresOn,
      }))

    return NextResponse.json({
      configured: true,
      accountId: accountId || null,
      summary: {
        totalZones: zones.length,
        totalWorkers: workers.length,
        totalPages: pages.length,
        totalR2Buckets: r2Summary.totalBuckets,
        totalDnsRecords,
        sslWarningsCount: sslWarnings.length,
        r2Storage: {
          totalObjects: r2Summary.totalObjects,
          totalStorageUsed: r2Summary.totalStorageUsed,
        },
        last24h: {
          requests: totalRequests,
          bandwidth: totalBandwidth,
          threats: totalThreats,
        },
      },
      zones,
      zoneAnalytics,
      zoneDnsRecords,
      zoneSslCerts,
      sslWarnings,
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
