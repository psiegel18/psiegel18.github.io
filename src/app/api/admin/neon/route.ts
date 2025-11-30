import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const NEON_API_BASE = 'https://console.neon.tech/api/v2'

async function neonFetch<T>(
  endpoint: string,
  apiKey: string
): Promise<T> {
  const response = await fetch(`${NEON_API_BASE}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Neon API error: ${response.status} ${response.statusText}`)
  }

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
    if (!process.env.NEON_API_KEY) {
      return NextResponse.json({
        configured: false,
        message: 'Neon API not configured. Add NEON_API_KEY environment variable.',
      })
    }

    const apiKey = process.env.NEON_API_KEY
    const projectId = process.env.NEON_PROJECT_ID

    // Get current user to verify API key
    const currentUser = await neonFetch<{
      id: string
      name: string
      email: string
      image: string
    }>('/users/me', apiKey)

    // Get all projects
    const projectsResponse = await neonFetch<{
      projects: Array<{
        id: string
        name: string
        region_id: string
        created_at: string
        updated_at: string
        pg_version: number
        proxy_host: string
        branch_logical_size_limit: number
        branch_logical_size_limit_bytes: number
        store_passwords: boolean
        active_time_seconds: number
        cpu_used_sec: number
        provisioner: string
        compute_last_active_at: string
      }>
    }>('/projects', apiKey)

    const projects = projectsResponse.projects.map(p => ({
      id: p.id,
      name: p.name,
      region: p.region_id,
      pgVersion: p.pg_version,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      activeTimeSeconds: p.active_time_seconds,
      cpuUsedSeconds: p.cpu_used_sec,
      computeLastActiveAt: p.compute_last_active_at,
    }))

    // If we have a project ID, get more details about that specific project
    let projectDetails = null
    let branches: Array<{
      id: string
      name: string
      primary: boolean
      createdAt: string
      currentState: string
      logicalSize: number
    }> = []
    let databases: Array<{
      id: number
      name: string
      ownerName: string
      branchId: string
    }> = []
    let endpoints: Array<{
      id: string
      branchId: string
      host: string
      type: string
      currentState: string
      poolerEnabled: boolean
      createdAt: string
      lastActiveAt?: string
    }> = []
    let operations: Array<{
      id: string
      action: string
      status: string
      createdAt: string
      updatedAt: string
    }> = []

    const targetProjectId = projectId || (projects.length > 0 ? projects[0].id : null)

    if (targetProjectId) {
      // Get branches
      try {
        const branchesResponse = await neonFetch<{
          branches: Array<{
            id: string
            name: string
            primary: boolean
            created_at: string
            current_state: string
            logical_size: number
          }>
        }>(`/projects/${targetProjectId}/branches`, apiKey)

        branches = branchesResponse.branches.map(b => ({
          id: b.id,
          name: b.name,
          primary: b.primary,
          createdAt: b.created_at,
          currentState: b.current_state,
          logicalSize: b.logical_size || 0,
        }))
      } catch (e) {
        console.error('Failed to fetch branches:', e)
      }

      // Get databases
      try {
        const mainBranchId = branches.find(b => b.primary)?.id || branches[0]?.id
        if (mainBranchId) {
          const databasesResponse = await neonFetch<{
            databases: Array<{
              id: number
              name: string
              owner_name: string
              branch_id: string
            }>
          }>(`/projects/${targetProjectId}/branches/${mainBranchId}/databases`, apiKey)

          databases = databasesResponse.databases.map(d => ({
            id: d.id,
            name: d.name,
            ownerName: d.owner_name,
            branchId: d.branch_id,
          }))
        }
      } catch (e) {
        console.error('Failed to fetch databases:', e)
      }

      // Get endpoints (compute instances)
      try {
        const endpointsResponse = await neonFetch<{
          endpoints: Array<{
            id: string
            branch_id: string
            host: string
            type: string
            current_state: string
            pooler_enabled: boolean
            created_at: string
            last_active: string
          }>
        }>(`/projects/${targetProjectId}/endpoints`, apiKey)

        endpoints = endpointsResponse.endpoints.map(e => ({
          id: e.id,
          branchId: e.branch_id,
          host: e.host,
          type: e.type,
          currentState: e.current_state,
          poolerEnabled: e.pooler_enabled,
          createdAt: e.created_at,
          lastActiveAt: e.last_active,
        }))
      } catch (e) {
        console.error('Failed to fetch endpoints:', e)
      }

      // Get recent operations
      try {
        const operationsResponse = await neonFetch<{
          operations: Array<{
            id: string
            action: string
            status: string
            created_at: string
            updated_at: string
          }>
        }>(`/projects/${targetProjectId}/operations?limit=10`, apiKey)

        operations = operationsResponse.operations.map(o => ({
          id: o.id,
          action: o.action,
          status: o.status,
          createdAt: o.created_at,
          updatedAt: o.updated_at,
        }))
      } catch (e) {
        console.error('Failed to fetch operations:', e)
      }

      // Find project details
      projectDetails = projects.find(p => p.id === targetProjectId) || null
    }

    // Calculate totals
    const totalStorageBytes = branches.reduce((sum, b) => sum + (b.logicalSize || 0), 0)
    const activeEndpoints = endpoints.filter(e => e.currentState === 'active').length

    return NextResponse.json({
      configured: true,
      user: {
        name: currentUser.name,
        email: currentUser.email,
      },
      summary: {
        totalProjects: projects.length,
        totalBranches: branches.length,
        totalDatabases: databases.length,
        totalEndpoints: endpoints.length,
        activeEndpoints,
        totalStorageBytes,
      },
      currentProject: projectDetails ? {
        id: projectDetails.id,
        name: projectDetails.name,
        region: projectDetails.region,
        pgVersion: projectDetails.pgVersion,
        activeTimeSeconds: projectDetails.activeTimeSeconds,
        cpuUsedSeconds: projectDetails.cpuUsedSeconds,
        computeLastActiveAt: projectDetails.computeLastActiveAt,
      } : null,
      projects,
      branches,
      databases,
      endpoints,
      operations,
    })
  } catch (error) {
    console.error('Neon API error:', error)
    return NextResponse.json(
      {
        configured: false,
        error: 'Failed to fetch Neon data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
