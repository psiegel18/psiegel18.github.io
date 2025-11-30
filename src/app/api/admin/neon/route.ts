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

type ProjectConfig = {
  name: string
  projectId: string
}

async function fetchProjectData(apiKey: string, config: ProjectConfig) {
  const { name, projectId } = config

  try {
    // Get project details
    const project = await neonFetch<{
      project: {
        id: string
        name: string
        region_id: string
        created_at: string
        updated_at: string
        pg_version: number
        active_time_seconds: number
        cpu_used_sec: number
        compute_last_active_at: string
      }
    }>(`/projects/${projectId}`, apiKey)

    // Get branches
    const branchesResponse = await neonFetch<{
      branches: Array<{
        id: string
        name: string
        primary: boolean
        created_at: string
        current_state: string
        logical_size: number
      }>
    }>(`/projects/${projectId}/branches`, apiKey)

    const branches = branchesResponse.branches.map(b => ({
      id: b.id,
      name: b.name,
      primary: b.primary,
      createdAt: b.created_at,
      currentState: b.current_state,
      logicalSize: b.logical_size || 0,
      projectName: name,
    }))

    // Get databases from primary branch
    let databases: Array<{
      id: number
      name: string
      ownerName: string
      branchId: string
      projectName: string
    }> = []

    const mainBranchId = branches.find(b => b.primary)?.id || branches[0]?.id
    if (mainBranchId) {
      try {
        const databasesResponse = await neonFetch<{
          databases: Array<{
            id: number
            name: string
            owner_name: string
            branch_id: string
          }>
        }>(`/projects/${projectId}/branches/${mainBranchId}/databases`, apiKey)

        databases = databasesResponse.databases.map(d => ({
          id: d.id,
          name: d.name,
          ownerName: d.owner_name,
          branchId: d.branch_id,
          projectName: name,
        }))
      } catch (e) {
        console.error(`Failed to fetch databases for ${name}:`, e)
      }
    }

    // Get endpoints
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
    }>(`/projects/${projectId}/endpoints`, apiKey)

    const endpoints = endpointsResponse.endpoints.map(e => ({
      id: e.id,
      branchId: e.branch_id,
      host: e.host,
      type: e.type,
      currentState: e.current_state,
      poolerEnabled: e.pooler_enabled,
      createdAt: e.created_at,
      lastActiveAt: e.last_active,
      projectName: name,
    }))

    // Get recent operations
    let operations: Array<{
      id: string
      action: string
      status: string
      createdAt: string
      updatedAt: string
      projectName: string
    }> = []

    try {
      const operationsResponse = await neonFetch<{
        operations: Array<{
          id: string
          action: string
          status: string
          created_at: string
          updated_at: string
        }>
      }>(`/projects/${projectId}/operations?limit=5`, apiKey)

      operations = operationsResponse.operations.map(o => ({
        id: o.id,
        action: o.action,
        status: o.status,
        createdAt: o.created_at,
        updatedAt: o.updated_at,
        projectName: name,
      }))
    } catch (e) {
      console.error(`Failed to fetch operations for ${name}:`, e)
    }

    return {
      name,
      configured: true,
      project: {
        id: project.project.id,
        name: project.project.name,
        displayName: name,
        region: project.project.region_id,
        pgVersion: project.project.pg_version,
        activeTimeSeconds: project.project.active_time_seconds,
        cpuUsedSeconds: project.project.cpu_used_sec,
        computeLastActiveAt: project.project.compute_last_active_at,
      },
      branches,
      databases,
      endpoints,
      operations,
    }
  } catch (error) {
    console.error(`Failed to fetch Neon data for ${name}:`, error)
    return {
      name,
      configured: false,
      error: error instanceof Error ? error.message : 'Unknown error',
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

    // Check if credentials are configured
    if (!process.env.NEON_API_KEY) {
      return NextResponse.json({
        configured: false,
        message: 'Neon API not configured. Add NEON_API_KEY environment variable.',
      })
    }

    const apiKey = process.env.NEON_API_KEY

    // Build list of configured projects
    const projects: ProjectConfig[] = []

    // Primary project (required)
    if (process.env.NEON_PROJECT_ID) {
      projects.push({
        name: 'Web',
        projectId: process.env.NEON_PROJECT_ID,
      })
    }

    // Additional project (optional)
    if (process.env.NEON_ZERO_PROJECT_ID) {
      projects.push({
        name: 'Zero',
        projectId: process.env.NEON_ZERO_PROJECT_ID,
      })
    }

    // If no projects configured, try to get all projects from the account
    if (projects.length === 0) {
      try {
        const projectsResponse = await neonFetch<{
          projects: Array<{
            id: string
            name: string
          }>
        }>('/projects', apiKey)

        if (projectsResponse.projects.length > 0) {
          // Use first project as default
          projects.push({
            name: projectsResponse.projects[0].name,
            projectId: projectsResponse.projects[0].id,
          })
        }
      } catch (e) {
        console.error('Failed to fetch projects list:', e)
      }
    }

    if (projects.length === 0) {
      return NextResponse.json({
        configured: false,
        message: 'No Neon projects found. Add NEON_PROJECT_ID environment variable.',
      })
    }

    // Get current user
    const currentUser = await neonFetch<{
      id: string
      name: string
      email: string
    }>('/users/me', apiKey)

    // Fetch data from all projects in parallel
    const projectResults = await Promise.all(
      projects.map(project => fetchProjectData(apiKey, project))
    )

    // Combine all data
    const configuredProjects: Array<{
      id: string
      name: string
      displayName: string
      region: string
      pgVersion: number
      activeTimeSeconds: number
      cpuUsedSeconds: number
      computeLastActiveAt: string
    }> = []

    const allBranches: Array<{
      id: string
      name: string
      primary: boolean
      createdAt: string
      currentState: string
      logicalSize: number
      projectName: string
    }> = []

    const allDatabases: Array<{
      id: number
      name: string
      ownerName: string
      branchId: string
      projectName: string
    }> = []

    const allEndpoints: Array<{
      id: string
      branchId: string
      host: string
      type: string
      currentState: string
      poolerEnabled: boolean
      createdAt: string
      lastActiveAt?: string
      projectName: string
    }> = []

    const allOperations: Array<{
      id: string
      action: string
      status: string
      createdAt: string
      updatedAt: string
      projectName: string
    }> = []

    for (const result of projectResults) {
      if (result.configured && 'project' in result && result.project) {
        configuredProjects.push(result.project)
        allBranches.push(...(result.branches || []))
        allDatabases.push(...(result.databases || []))
        allEndpoints.push(...(result.endpoints || []))
        allOperations.push(...(result.operations || []))
      }
    }

    // Sort operations by createdAt (most recent first)
    allOperations.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    // Calculate totals
    const totalStorageBytes = allBranches.reduce((sum, b) => sum + (b.logicalSize || 0), 0)
    const activeEndpoints = allEndpoints.filter(e => e.currentState === 'active').length

    return NextResponse.json({
      configured: configuredProjects.length > 0,
      user: {
        name: currentUser.name,
        email: currentUser.email,
      },
      summary: {
        totalProjects: configuredProjects.length,
        totalBranches: allBranches.length,
        totalDatabases: allDatabases.length,
        totalEndpoints: allEndpoints.length,
        activeEndpoints,
        totalStorageBytes,
      },
      projects: configuredProjects,
      branches: allBranches,
      databases: allDatabases,
      endpoints: allEndpoints,
      operations: allOperations.slice(0, 10), // Last 10 across all projects
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
