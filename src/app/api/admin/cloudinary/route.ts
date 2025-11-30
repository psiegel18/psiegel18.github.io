import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

const CLOUDINARY_API_BASE = 'https://api.cloudinary.com/v1_1'

async function cloudinaryFetch<T>(
  endpoint: string,
  cloudName: string,
  apiKey: string,
  apiSecret: string
): Promise<T> {
  // Generate timestamp and signature for authentication
  const timestamp = Math.floor(Date.now() / 1000)
  const signature = crypto
    .createHash('sha256')
    .update(`timestamp=${timestamp}${apiSecret}`)
    .digest('hex')

  const url = `${CLOUDINARY_API_BASE}/${cloudName}${endpoint}`
  const separator = endpoint.includes('?') ? '&' : '?'

  const response = await fetch(`${url}${separator}timestamp=${timestamp}&api_key=${apiKey}&signature=${signature}`, {
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Cloudinary API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

async function cloudinaryAdminFetch<T>(
  endpoint: string,
  cloudName: string,
  apiKey: string,
  apiSecret: string
): Promise<T> {
  // Admin API uses basic auth
  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')

  const response = await fetch(`${CLOUDINARY_API_BASE}/${cloudName}${endpoint}`, {
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Cloudinary Admin API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({
        configured: false,
        message: 'Cloudinary credentials not configured',
      })
    }

    // Fetch usage data
    let usage: {
      plan: string
      last_updated: string
      transformations: { usage: number; credits_usage: number }
      objects: { usage: number }
      bandwidth: { usage: number; credits_usage: number }
      storage: { usage: number; credits_usage: number }
      credits: { usage: number; limit: number; used_percent: number }
      requests: number
      resources: number
      derived_resources: number
    } | null = null

    try {
      usage = await cloudinaryAdminFetch('/usage', cloudName, apiKey, apiSecret)
    } catch (e) {
      console.error('Failed to fetch Cloudinary usage:', e)
    }

    // Fetch recent resources
    let resources: Array<{
      public_id: string
      format: string
      version: number
      resource_type: string
      type: string
      created_at: string
      bytes: number
      width?: number
      height?: number
      url: string
      secure_url: string
      folder: string
    }> = []

    try {
      const resourcesResponse = await cloudinaryAdminFetch<{
        resources: typeof resources
        next_cursor?: string
        rate_limit_allowed: number
        rate_limit_remaining: number
        rate_limit_reset_at: string
      }>('/resources/image?max_results=20', cloudName, apiKey, apiSecret)
      resources = resourcesResponse.resources || []
    } catch (e) {
      console.error('Failed to fetch Cloudinary resources:', e)
    }

    // Fetch folders
    let folders: Array<{ name: string; path: string }> = []
    try {
      const foldersResponse = await cloudinaryAdminFetch<{
        folders: Array<{ name: string; path: string }>
      }>('/folders', cloudName, apiKey, apiSecret)
      folders = foldersResponse.folders || []
    } catch (e) {
      console.error('Failed to fetch Cloudinary folders:', e)
    }

    // Calculate summary
    const summary = {
      totalResources: usage?.resources || resources.length,
      totalStorage: usage?.storage?.usage || 0,
      totalBandwidth: usage?.bandwidth?.usage || 0,
      totalTransformations: usage?.transformations?.usage || 0,
      creditsUsed: usage?.credits?.usage || 0,
      creditsLimit: usage?.credits?.limit || 0,
      creditsUsedPercent: usage?.credits?.used_percent || 0,
      plan: usage?.plan || 'Unknown',
    }

    // Format resources for display
    const formattedResources = resources.map(r => ({
      publicId: r.public_id,
      format: r.format,
      resourceType: r.resource_type,
      createdAt: r.created_at,
      bytes: r.bytes,
      width: r.width,
      height: r.height,
      url: r.secure_url,
      folder: r.folder || '/',
    }))

    // Group by resource type
    const byType: Record<string, { count: number; bytes: number }> = {}
    for (const r of resources) {
      const type = r.resource_type || 'unknown'
      if (!byType[type]) {
        byType[type] = { count: 0, bytes: 0 }
      }
      byType[type].count++
      byType[type].bytes += r.bytes || 0
    }

    // Group by format
    const byFormat: Record<string, { count: number; bytes: number }> = {}
    for (const r of resources) {
      const format = r.format || 'unknown'
      if (!byFormat[format]) {
        byFormat[format] = { count: 0, bytes: 0 }
      }
      byFormat[format].count++
      byFormat[format].bytes += r.bytes || 0
    }

    return NextResponse.json({
      configured: true,
      cloudName,
      summary,
      usage: usage ? {
        plan: usage.plan,
        lastUpdated: usage.last_updated,
        transformations: usage.transformations?.usage || 0,
        bandwidth: usage.bandwidth?.usage || 0,
        storage: usage.storage?.usage || 0,
        requests: usage.requests || 0,
        derivedResources: usage.derived_resources || 0,
      } : null,
      resources: formattedResources,
      folders: folders.map(f => ({ name: f.name, path: f.path })),
      byType: Object.entries(byType).map(([type, data]) => ({
        type,
        count: data.count,
        bytes: data.bytes,
      })),
      byFormat: Object.entries(byFormat).map(([format, data]) => ({
        format,
        count: data.count,
        bytes: data.bytes,
      })),
    })
  } catch (error) {
    console.error('Cloudinary API error:', error)
    return NextResponse.json(
      {
        configured: false,
        error: error instanceof Error ? error.message : 'Failed to fetch Cloudinary data',
      },
      { status: 500 }
    )
  }
}
