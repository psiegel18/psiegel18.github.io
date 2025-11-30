import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { BetaAnalyticsDataClient } from '@google-analytics/data'

const GA_PROPERTY_ID = '469893186'

export async function GET() {
  try {
    // Check admin access
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if credentials are configured
    if (!process.env.GOOGLE_ANALYTICS_CREDENTIALS) {
      return NextResponse.json({
        configured: false,
        message: 'Google Analytics API not configured. Add GOOGLE_ANALYTICS_CREDENTIALS environment variable.',
      })
    }

    // Parse credentials from environment variable
    const credentials = JSON.parse(process.env.GOOGLE_ANALYTICS_CREDENTIALS)

    // Initialize the Analytics Data client
    const analyticsDataClient = new BetaAnalyticsDataClient({
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key,
      },
    })

    // Fetch various metrics
    const [realtimeResponse] = await analyticsDataClient.runRealtimeReport({
      property: `properties/${GA_PROPERTY_ID}`,
      metrics: [{ name: 'activeUsers' }],
    })

    const [last7DaysResponse] = await analyticsDataClient.runReport({
      property: `properties/${GA_PROPERTY_ID}`,
      dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'averageSessionDuration' },
        { name: 'bounceRate' },
      ],
    })

    const [last30DaysResponse] = await analyticsDataClient.runReport({
      property: `properties/${GA_PROPERTY_ID}`,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
      ],
    })

    // Fetch top pages
    const [topPagesResponse] = await analyticsDataClient.runReport({
      property: `properties/${GA_PROPERTY_ID}`,
      dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 10,
    })

    // Fetch traffic sources
    const [sourcesResponse] = await analyticsDataClient.runReport({
      property: `properties/${GA_PROPERTY_ID}`,
      dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'sessionSource' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 5,
    })

    // Fetch daily visitors for chart
    const [dailyResponse] = await analyticsDataClient.runReport({
      property: `properties/${GA_PROPERTY_ID}`,
      dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    })

    // Parse the responses
    const realtime = {
      activeUsers: parseInt(realtimeResponse.rows?.[0]?.metricValues?.[0]?.value || '0'),
    }

    const last7Days = {
      users: parseInt(last7DaysResponse.rows?.[0]?.metricValues?.[0]?.value || '0'),
      sessions: parseInt(last7DaysResponse.rows?.[0]?.metricValues?.[1]?.value || '0'),
      pageViews: parseInt(last7DaysResponse.rows?.[0]?.metricValues?.[2]?.value || '0'),
      avgSessionDuration: parseFloat(last7DaysResponse.rows?.[0]?.metricValues?.[3]?.value || '0'),
      bounceRate: parseFloat(last7DaysResponse.rows?.[0]?.metricValues?.[4]?.value || '0'),
    }

    const last30Days = {
      users: parseInt(last30DaysResponse.rows?.[0]?.metricValues?.[0]?.value || '0'),
      sessions: parseInt(last30DaysResponse.rows?.[0]?.metricValues?.[1]?.value || '0'),
      pageViews: parseInt(last30DaysResponse.rows?.[0]?.metricValues?.[2]?.value || '0'),
    }

    const topPages = topPagesResponse.rows?.map(row => ({
      path: row.dimensionValues?.[0]?.value || '',
      views: parseInt(row.metricValues?.[0]?.value || '0'),
    })) || []

    const sources = sourcesResponse.rows?.map(row => ({
      source: row.dimensionValues?.[0]?.value || 'direct',
      sessions: parseInt(row.metricValues?.[0]?.value || '0'),
    })) || []

    const dailyData = dailyResponse.rows?.map(row => ({
      date: row.dimensionValues?.[0]?.value || '',
      users: parseInt(row.metricValues?.[0]?.value || '0'),
      sessions: parseInt(row.metricValues?.[1]?.value || '0'),
    })) || []

    return NextResponse.json({
      configured: true,
      realtime,
      last7Days,
      last30Days,
      topPages,
      sources,
      dailyData,
    })
  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      {
        configured: false,
        error: 'Failed to fetch analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
