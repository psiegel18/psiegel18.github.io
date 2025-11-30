import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'

export const dynamic = 'force-dynamic'

const R2_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'personalblog'
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL

function getR2Client() {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    return null
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  })
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const r2Client = getR2Client()
    if (!r2Client) {
      return NextResponse.json({
        configured: false,
        message: 'R2 not configured. Add R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, CLOUDFLARE_ACCOUNT_ID environment variables.',
      })
    }

    if (!R2_PUBLIC_URL) {
      return NextResponse.json({
        configured: false,
        message: 'R2_PUBLIC_URL not configured. Set it to your R2 public URL (custom domain or r2.dev URL).',
      })
    }

    // List objects in the personalblog directory
    const response = await r2Client.send(new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      Prefix: 'personalblog/',
      MaxKeys: 100,
    }))

    // Ensure URL has protocol prefix
    const baseUrl = R2_PUBLIC_URL.startsWith('http') ? R2_PUBLIC_URL : `https://${R2_PUBLIC_URL}`

    const images = (response.Contents || [])
      .filter(obj => {
        const key = obj.Key || ''
        // Filter to only image files
        return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(key)
      })
      .map(obj => {
        const key = obj.Key || ''
        return {
          key,
          url: `${baseUrl}/${key}`,
          size: obj.Size,
          lastModified: obj.LastModified?.toISOString(),
          name: key.split('/').pop() || key,
        }
      })
      .sort((a, b) => {
        // Sort by lastModified descending (newest first)
        if (!a.lastModified || !b.lastModified) return 0
        return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
      })

    return NextResponse.json({
      configured: true,
      images,
      total: images.length,
    })
  } catch (error) {
    console.error('Failed to list images:', error)
    return NextResponse.json({ error: 'Failed to list images' }, { status: 500 })
  }
}
