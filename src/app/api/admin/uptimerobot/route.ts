import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const UPTIMEROBOT_API_BASE = 'https://api.uptimerobot.com/v2'

interface UptimeRobotMonitor {
  id: number
  friendly_name: string
  url: string
  type: number
  status: number
  create_datetime: number
  average_response_time?: string
  uptime_ratio?: string
  custom_uptime_ratio?: string
  logs?: Array<{
    type: number
    datetime: number
    duration: number
    reason?: {
      code: string
      detail: string
    }
  }>
  response_times?: Array<{
    datetime: number
    value: number
  }>
  ssl?: {
    brand: string
    product: string
    expires: number
  }
}

interface UptimeRobotResponse {
  stat: 'ok' | 'fail'
  error?: {
    type: string
    message: string
  }
  pagination?: {
    offset: number
    limit: number
    total: number
  }
  monitors?: UptimeRobotMonitor[]
  account?: {
    email: string
    monitor_limit: number
    monitor_interval: number
    up_monitors: number
    down_monitors: number
    paused_monitors: number
  }
}

async function uptimeRobotFetch(
  endpoint: string,
  apiKey: string,
  extraParams: Record<string, string> = {}
): Promise<UptimeRobotResponse> {
  const params = new URLSearchParams({
    api_key: apiKey,
    format: 'json',
    ...extraParams,
  })

  const response = await fetch(`${UPTIMEROBOT_API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cache-Control': 'no-cache',
    },
    body: params.toString(),
  })

  return response.json()
}

function getMonitorTypeName(type: number): string {
  const types: Record<number, string> = {
    1: 'HTTP(s)',
    2: 'Keyword',
    3: 'Ping',
    4: 'Port',
    5: 'Heartbeat',
  }
  return types[type] || 'Unknown'
}

function getMonitorStatusInfo(status: number): { name: string; color: string } {
  const statuses: Record<number, { name: string; color: string }> = {
    0: { name: 'Paused', color: 'gray' },
    1: { name: 'Not Checked', color: 'gray' },
    2: { name: 'Up', color: 'green' },
    8: { name: 'Seems Down', color: 'yellow' },
    9: { name: 'Down', color: 'red' },
  }
  return statuses[status] || { name: 'Unknown', color: 'gray' }
}

function getLogTypeName(type: number): string {
  const types: Record<number, string> = {
    1: 'Down',
    2: 'Up',
    98: 'Started',
    99: 'Paused',
  }
  return types[type] || 'Unknown'
}

export async function GET() {
  try {
    // Check admin access
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!process.env.UPTIMEROBOT_API_KEY) {
      return NextResponse.json({
        configured: false,
        message: 'UptimeRobot not configured. Add UPTIMEROBOT_API_KEY environment variable.',
      })
    }

    const apiKey = process.env.UPTIMEROBOT_API_KEY

    // Get account details
    const accountResponse = await uptimeRobotFetch('/getAccountDetails', apiKey)

    if (accountResponse.stat !== 'ok') {
      return NextResponse.json({
        configured: false,
        error: 'Invalid UptimeRobot API key',
        details: accountResponse.error?.message,
      }, { status: 401 })
    }

    // Get all monitors with details
    const monitorsResponse = await uptimeRobotFetch('/getMonitors', apiKey, {
      logs: '1',
      logs_limit: '10',
      response_times: '1',
      response_times_limit: '24',
      custom_uptime_ratios: '1-7-30-90',
      ssl: '1',
    })

    if (monitorsResponse.stat !== 'ok') {
      return NextResponse.json({
        configured: true,
        error: 'Failed to fetch monitors',
        details: monitorsResponse.error?.message,
      }, { status: 500 })
    }

    const monitors = (monitorsResponse.monitors || []).map(monitor => {
      const statusInfo = getMonitorStatusInfo(monitor.status)
      const uptimeRatios = monitor.custom_uptime_ratio?.split('-').map(Number) || []

      return {
        id: monitor.id,
        name: monitor.friendly_name,
        url: monitor.url,
        type: getMonitorTypeName(monitor.type),
        status: statusInfo.name,
        statusColor: statusInfo.color,
        createdAt: new Date(monitor.create_datetime * 1000).toISOString(),
        avgResponseTime: monitor.average_response_time ? parseInt(monitor.average_response_time) : null,
        uptime: {
          day: uptimeRatios[0] || null,
          week: uptimeRatios[1] || null,
          month: uptimeRatios[2] || null,
          quarter: uptimeRatios[3] || null,
        },
        ssl: monitor.ssl ? {
          brand: monitor.ssl.brand,
          product: monitor.ssl.product,
          expiresAt: new Date(monitor.ssl.expires * 1000).toISOString(),
          daysUntilExpiry: Math.ceil((monitor.ssl.expires * 1000 - Date.now()) / (1000 * 60 * 60 * 24)),
        } : null,
        recentLogs: (monitor.logs || []).slice(0, 5).map(log => ({
          type: getLogTypeName(log.type),
          datetime: new Date(log.datetime * 1000).toISOString(),
          duration: log.duration,
          reason: log.reason,
        })),
        responseTimes: (monitor.response_times || []).map(rt => ({
          datetime: new Date(rt.datetime * 1000).toISOString(),
          value: rt.value,
        })),
      }
    })

    // Calculate summary stats
    const upCount = monitors.filter(m => m.status === 'Up').length
    const downCount = monitors.filter(m => m.status === 'Down' || m.status === 'Seems Down').length
    const pausedCount = monitors.filter(m => m.status === 'Paused').length
    const avgResponseTime = monitors.reduce((sum, m) => sum + (m.avgResponseTime || 0), 0) / monitors.filter(m => m.avgResponseTime).length || 0
    const avgUptime30d = monitors.reduce((sum, m) => sum + (m.uptime.month || 0), 0) / monitors.filter(m => m.uptime.month).length || 0

    // Check for SSL warnings (expiring within 30 days)
    const sslWarnings = monitors
      .filter(m => m.ssl && m.ssl.daysUntilExpiry <= 30)
      .map(m => ({
        name: m.name,
        daysUntilExpiry: m.ssl!.daysUntilExpiry,
      }))

    return NextResponse.json({
      configured: true,
      account: accountResponse.account ? {
        email: accountResponse.account.email,
        monitorLimit: accountResponse.account.monitor_limit,
        monitorInterval: accountResponse.account.monitor_interval,
      } : null,
      summary: {
        total: monitors.length,
        up: upCount,
        down: downCount,
        paused: pausedCount,
        avgResponseTime: Math.round(avgResponseTime),
        avgUptime30d: avgUptime30d.toFixed(2),
        sslWarnings: sslWarnings.length,
      },
      monitors,
      sslWarnings,
    })
  } catch (error) {
    console.error('UptimeRobot API error:', error)
    return NextResponse.json(
      {
        configured: false,
        error: 'Failed to fetch UptimeRobot data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
