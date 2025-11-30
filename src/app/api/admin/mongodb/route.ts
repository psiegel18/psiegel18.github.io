import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// MongoDB Atlas Data API
const MONGODB_DATA_API_BASE = 'https://data.mongodb-api.com/app'

// MongoDB Atlas Admin API
const MONGODB_ADMIN_API_BASE = 'https://cloud.mongodb.com/api/atlas/v1.0'

async function mongoAtlasAdminFetch<T>(
  endpoint: string,
  publicKey: string,
  privateKey: string
): Promise<T> {
  // Atlas Admin API uses digest auth, but we'll use the simpler API key approach
  const auth = Buffer.from(`${publicKey}:${privateKey}`).toString('base64')

  const response = await fetch(`${MONGODB_ADMIN_API_BASE}${endpoint}`, {
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`MongoDB Atlas API error: ${response.status} ${response.statusText} - ${text}`)
  }

  return response.json()
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

    const projectsToFetch = projectId
      ? [{ id: projectId, name: projects.find(p => p.id === projectId)?.name || projectId }]
      : projects.slice(0, 5) // Limit to 5 projects

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

    // Fetch process metrics for clusters (recent performance data)
    let clusterMetrics: Array<{
      clusterName: string
      projectName: string
      measurements: Array<{
        name: string
        units: string
        dataPoints: Array<{ timestamp: string; value: number }>
      }>
    }> = []

    // Only fetch metrics for active (non-paused) clusters
    const activeClusters = clusters.filter(c => !c.paused && c.stateName === 'IDLE')
    for (const cluster of activeClusters.slice(0, 3)) { // Limit to 3 clusters for performance
      try {
        const project = projectsToFetch.find(p => p.id === cluster.projectId)
        // Get the last hour of metrics
        const end = new Date()
        const start = new Date(end.getTime() - 60 * 60 * 1000)

        const processesResponse = await mongoAtlasAdminFetch<{
          results: Array<{
            hostname: string
            processType: string
          }>
        }>(`/groups/${cluster.projectId}/processes`, publicKey, privateKey)

        if (processesResponse.results && processesResponse.results.length > 0) {
          const hostname = processesResponse.results[0].hostname

          const metricsResponse = await mongoAtlasAdminFetch<{
            measurements: Array<{
              name: string
              units: string
              dataPoints: Array<{ timestamp: string; value: number }>
            }>
          }>(`/groups/${cluster.projectId}/processes/${hostname}/measurements?granularity=PT1M&period=PT1H&m=CONNECTIONS&m=OPCOUNTER_CMD&m=OPCOUNTER_QUERY&m=OPCOUNTER_INSERT&m=OPCOUNTER_UPDATE&m=OPCOUNTER_DELETE`, publicKey, privateKey)

          clusterMetrics.push({
            clusterName: cluster.name,
            projectName: project?.name || cluster.projectId,
            measurements: metricsResponse.measurements || [],
          })
        }
      } catch (e) {
        console.error(`Failed to fetch metrics for cluster ${cluster.name}:`, e)
      }
    }

    // Calculate summary
    const summary = {
      totalProjects: projects.length,
      totalClusters: clusters.length,
      activeClusters: clusters.filter(c => !c.paused && c.stateName === 'IDLE').length,
      pausedClusters: clusters.filter(c => c.paused).length,
      totalDatabaseUsers: databaseUsers.length,
      openAlerts: alerts.filter(a => a.status === 'OPEN').length,
      totalStorageGB: clusters.reduce((sum, c) => sum + (c.diskSizeGB || 0), 0),
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
