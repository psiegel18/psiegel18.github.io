import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// MongoDB Atlas Admin API
const MONGODB_ADMIN_API_BASE = 'https://cloud.mongodb.com/api/atlas/v1.0'

// Parse WWW-Authenticate header for digest auth
function parseDigestHeader(header: string): Record<string, string> {
  const result: Record<string, string> = {}
  const parts = header.replace('Digest ', '').split(',')

  for (const part of parts) {
    const match = part.trim().match(/^(\w+)=(?:"([^"]+)"|([^\s,]+))/)
    if (match) {
      result[match[1]] = match[2] || match[3]
    }
  }

  return result
}

// Generate MD5 hash
function md5(str: string): string {
  return crypto.createHash('md5').update(str).digest('hex')
}

// Perform digest authentication for MongoDB Atlas Admin API
async function mongoAtlasAdminFetch<T>(
  endpoint: string,
  publicKey: string,
  privateKey: string
): Promise<T> {
  const url = `${MONGODB_ADMIN_API_BASE}${endpoint}`
  const method = 'GET'

  // Step 1: Make initial request to get WWW-Authenticate header
  const initialResponse = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  })

  if (initialResponse.status !== 401) {
    // If not 401, either it's an error or no auth needed
    if (!initialResponse.ok) {
      const text = await initialResponse.text()
      throw new Error(`MongoDB Atlas API error: ${initialResponse.status} ${initialResponse.statusText} - ${text}`)
    }
    return initialResponse.json()
  }

  // Step 2: Parse the WWW-Authenticate header
  const wwwAuth = initialResponse.headers.get('WWW-Authenticate')
  if (!wwwAuth || !wwwAuth.startsWith('Digest')) {
    throw new Error('MongoDB Atlas API did not return Digest authentication challenge')
  }

  const digestParams = parseDigestHeader(wwwAuth)
  const { realm, nonce, qop } = digestParams

  if (!realm || !nonce) {
    throw new Error('Missing required digest parameters from MongoDB Atlas')
  }

  // Step 3: Calculate digest response
  const uri = new URL(url).pathname + (new URL(url).search || '')
  const nc = '00000001'
  const cnonce = crypto.randomBytes(8).toString('hex')

  // HA1 = MD5(username:realm:password)
  const ha1 = md5(`${publicKey}:${realm}:${privateKey}`)

  // HA2 = MD5(method:uri)
  const ha2 = md5(`${method}:${uri}`)

  // Response = MD5(HA1:nonce:nc:cnonce:qop:HA2) for qop=auth
  let response: string
  if (qop) {
    response = md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`)
  } else {
    response = md5(`${ha1}:${nonce}:${ha2}`)
  }

  // Step 4: Build Authorization header
  let authHeader = `Digest username="${publicKey}", realm="${realm}", nonce="${nonce}", uri="${uri}", response="${response}"`

  if (qop) {
    authHeader += `, qop=${qop}, nc=${nc}, cnonce="${cnonce}"`
  }

  // Step 5: Make authenticated request
  const authResponse = await fetch(url, {
    method,
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  })

  if (!authResponse.ok) {
    const text = await authResponse.text()
    throw new Error(`MongoDB Atlas API error: ${authResponse.status} ${authResponse.statusText} - ${text}`)
  }

  return authResponse.json()
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const publicKey = process.env.MONGODB_ATLAS_PUBLIC_KEY
    const privateKey = process.env.MONGODB_ATLAS_PRIVATE_KEY
    const orgId = process.env.MONGODB_ATLAS_ORG_ID
    const projectId = process.env.MONGODB_ATLAS_PROJECT_ID

    if (!publicKey || !privateKey) {
      return NextResponse.json({
        configured: false,
        message: 'MongoDB Atlas API keys not configured. Add MONGODB_ATLAS_PUBLIC_KEY and MONGODB_ATLAS_PRIVATE_KEY.',
      })
    }

    // Fetch organization info if orgId provided
    let organization: {
      id: string
      name: string
      isDeleted: boolean
    } | null = null

    if (orgId) {
      try {
        organization = await mongoAtlasAdminFetch(`/orgs/${orgId}`, publicKey, privateKey)
      } catch (e) {
        console.error('Failed to fetch MongoDB organization:', e)
      }
    }

    // Fetch projects (groups in Atlas terminology)
    let projects: Array<{
      id: string
      name: string
      orgId: string
      clusterCount: number
      created: string
    }> = []

    try {
      const projectsResponse = await mongoAtlasAdminFetch<{
        results: Array<{
          id: string
          name: string
          orgId: string
          clusterCount: number
          created: string
        }>
        totalCount: number
      }>(orgId ? `/orgs/${orgId}/groups` : '/groups', publicKey, privateKey)
      projects = projectsResponse.results || []
    } catch (e) {
      console.error('Failed to fetch MongoDB projects:', e)
    }

    // Fetch clusters for each project (or specific project if configured)
    let clusters: Array<{
      id: string
      name: string
      projectId: string
      projectName: string
      clusterType: string
      mongoDBVersion: string
      stateName: string
      paused: boolean
      diskSizeGB: number
      replicationFactor: number
      numShards: number
      providerSettings: {
        providerName: string
        regionName: string
        instanceSizeName: string
      }
      connectionStrings?: {
        standardSrv?: string
      }
      createDate: string
    }> = []

    // Fetch from all projects (no limit) to ensure we get all clusters
    const projectsToFetch = projects.map(p => ({ id: p.id, name: p.name }))

    for (const project of projectsToFetch) {
      try {
        const clustersResponse = await mongoAtlasAdminFetch<{
          results: Array<{
            id: string
            name: string
            clusterType: string
            mongoDBVersion: string
            stateName: string
            paused: boolean
            diskSizeGB: number
            replicationFactor: number
            numShards: number
            providerSettings: {
              providerName: string
              regionName: string
              instanceSizeName: string
            }
            connectionStrings?: {
              standardSrv?: string
            }
            createDate: string
          }>
        }>(`/groups/${project.id}/clusters`, publicKey, privateKey)

        for (const cluster of clustersResponse.results || []) {
          clusters.push({
            ...cluster,
            projectId: project.id,
            projectName: project.name,
          })
        }
      } catch (e) {
        console.error(`Failed to fetch clusters for project ${project.id}:`, e)
      }
    }

    // Fetch database users for each project
    let databaseUsers: Array<{
      username: string
      projectId: string
      projectName: string
      databaseName: string
      roles: Array<{ roleName: string; databaseName: string }>
    }> = []

    for (const project of projectsToFetch) {
      try {
        const usersResponse = await mongoAtlasAdminFetch<{
          results: Array<{
            username: string
            databaseName: string
            roles: Array<{ roleName: string; databaseName: string }>
          }>
        }>(`/groups/${project.id}/databaseUsers`, publicKey, privateKey)

        for (const user of usersResponse.results || []) {
          databaseUsers.push({
            ...user,
            projectId: project.id,
            projectName: project.name,
          })
        }
      } catch (e) {
        console.error(`Failed to fetch database users for project ${project.id}:`, e)
      }
    }

    // Fetch alerts for each project
    let alerts: Array<{
      id: string
      projectId: string
      projectName: string
      alertConfigId: string
      eventTypeName: string
      status: string
      created: string
      resolved?: string
      acknowledgedUntil?: string
      clusterName?: string
      replicaSetName?: string
    }> = []

    for (const project of projectsToFetch) {
      try {
        const alertsResponse = await mongoAtlasAdminFetch<{
          results: Array<{
            id: string
            alertConfigId: string
            eventTypeName: string
            status: string
            created: string
            resolved?: string
            acknowledgedUntil?: string
            clusterName?: string
            replicaSetName?: string
          }>
        }>(`/groups/${project.id}/alerts?status=OPEN`, publicKey, privateKey)

        for (const alert of alertsResponse.results || []) {
          alerts.push({
            ...alert,
            projectId: project.id,
            projectName: project.name,
          })
        }
      } catch (e) {
        console.error(`Failed to fetch alerts for project ${project.id}:`, e)
      }
    }

    // Fetch process metrics and disk usage for clusters
    let clusterMetrics: Array<{
      clusterName: string
      projectName: string
      projectId: string
      diskUsedGB?: number
      diskFreeGB?: number
      diskTotalGB?: number
      connections?: number
      measurements: Array<{
        name: string
        units: string
        dataPoints: Array<{ timestamp: string; value: number }>
      }>
    }> = []

    // Fetch metrics for all active (non-paused) dedicated clusters
    // Note: Shared tier clusters (M0, M2, M5) don't expose process metrics via the API
    const activeClusters = clusters.filter(c => !c.paused && c.stateName === 'IDLE')
    for (const cluster of activeClusters) {
      try {
        const project = projectsToFetch.find(p => p.id === cluster.projectId)

        // Skip metrics for shared tier clusters (they don't have process-level metrics)
        const instanceSize = cluster.providerSettings?.instanceSizeName || ''
        const isSharedTier = instanceSize.startsWith('M0') || instanceSize.startsWith('M2') || instanceSize.startsWith('M5')
        if (isSharedTier) {
          // Add basic info without metrics for shared clusters
          clusterMetrics.push({
            clusterName: cluster.name,
            projectName: project?.name || cluster.projectId,
            projectId: cluster.projectId,
            diskUsedGB: undefined,
            diskFreeGB: undefined,
            diskTotalGB: undefined,
            connections: undefined,
            measurements: [],
          })
          continue
        }

        const processesResponse = await mongoAtlasAdminFetch<{
          results: Array<{
            hostname: string
            processType: string
          }>
        }>(`/groups/${cluster.projectId}/processes`, publicKey, privateKey)

        if (processesResponse.results && processesResponse.results.length > 0) {
          const hostname = processesResponse.results[0].hostname

          // Fetch comprehensive metrics including disk usage
          const metricsResponse = await mongoAtlasAdminFetch<{
            measurements: Array<{
              name: string
              units: string
              dataPoints: Array<{ timestamp: string; value: number }>
            }>
          }>(`/groups/${cluster.projectId}/processes/${hostname}/measurements?granularity=PT1M&period=PT1H&m=CONNECTIONS&m=OPCOUNTER_CMD&m=OPCOUNTER_QUERY&m=OPCOUNTER_INSERT&m=OPCOUNTER_UPDATE&m=OPCOUNTER_DELETE&m=DISK_PARTITION_SPACE_USED&m=DISK_PARTITION_SPACE_FREE&m=SYSTEM_MEMORY_USED&m=SYSTEM_MEMORY_FREE`, publicKey, privateKey)

          // Extract latest disk usage values
          const measurements = metricsResponse.measurements || []
          const getLatestValue = (name: string) => {
            const m = measurements.find(m => m.name === name)
            if (m && m.dataPoints && m.dataPoints.length > 0) {
              return m.dataPoints[m.dataPoints.length - 1].value
            }
            return undefined
          }

          const diskUsed = getLatestValue('DISK_PARTITION_SPACE_USED')
          const diskFree = getLatestValue('DISK_PARTITION_SPACE_FREE')
          const connections = getLatestValue('CONNECTIONS')

          clusterMetrics.push({
            clusterName: cluster.name,
            projectName: project?.name || cluster.projectId,
            projectId: cluster.projectId,
            diskUsedGB: diskUsed ? diskUsed / (1024 * 1024 * 1024) : undefined,
            diskFreeGB: diskFree ? diskFree / (1024 * 1024 * 1024) : undefined,
            diskTotalGB: diskUsed && diskFree ? (diskUsed + diskFree) / (1024 * 1024 * 1024) : undefined,
            connections,
            measurements,
          })
        }
      } catch (e) {
        console.error(`Failed to fetch metrics for cluster ${cluster.name}:`, e)
      }
    }

    // Calculate summary with actual disk usage from metrics
    const totalDiskUsedGB = clusterMetrics.reduce((sum, m) => sum + (m.diskUsedGB || 0), 0)
    const totalDiskFreeGB = clusterMetrics.reduce((sum, m) => sum + (m.diskFreeGB || 0), 0)
    const totalConnections = clusterMetrics.reduce((sum, m) => sum + (m.connections || 0), 0)

    const summary = {
      totalProjects: projects.length,
      totalClusters: clusters.length,
      activeClusters: clusters.filter(c => !c.paused && c.stateName === 'IDLE').length,
      pausedClusters: clusters.filter(c => c.paused).length,
      totalDatabaseUsers: databaseUsers.length,
      openAlerts: alerts.filter(a => a.status === 'OPEN').length,
      totalConfiguredStorageGB: clusters.reduce((sum, c) => sum + (c.diskSizeGB || 0), 0),
      totalDiskUsedGB: Math.round(totalDiskUsedGB * 100) / 100,
      totalDiskFreeGB: Math.round(totalDiskFreeGB * 100) / 100,
      totalConnections,
    }

    return NextResponse.json({
      configured: true,
      organization: organization ? {
        id: organization.id,
        name: organization.name,
      } : null,
      summary,
      projects: projects.map(p => ({
        id: p.id,
        name: p.name,
        clusterCount: p.clusterCount,
        created: p.created,
      })),
      clusters: clusters.map(c => ({
        id: c.id,
        name: c.name,
        projectId: c.projectId,
        projectName: c.projectName,
        clusterType: c.clusterType,
        mongoDBVersion: c.mongoDBVersion,
        stateName: c.stateName,
        paused: c.paused,
        diskSizeGB: c.diskSizeGB,
        provider: c.providerSettings?.providerName,
        region: c.providerSettings?.regionName,
        instanceSize: c.providerSettings?.instanceSizeName,
        connectionString: c.connectionStrings?.standardSrv,
        created: c.createDate,
      })),
      databaseUsers: databaseUsers.map(u => ({
        username: u.username,
        projectName: u.projectName,
        authDatabase: u.databaseName,
        roles: u.roles,
      })),
      alerts: alerts.map(a => ({
        id: a.id,
        projectName: a.projectName,
        eventType: a.eventTypeName,
        status: a.status,
        clusterName: a.clusterName,
        created: a.created,
        resolved: a.resolved,
      })),
      metrics: clusterMetrics,
    })
  } catch (error) {
    console.error('MongoDB Atlas API error:', error)
    return NextResponse.json(
      {
        configured: false,
        error: error instanceof Error ? error.message : 'Failed to fetch MongoDB data',
      },
      { status: 500 }
    )
  }
}
