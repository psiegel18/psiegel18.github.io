import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'

export const dynamic = 'force-dynamic'

const R2_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'personalblog'
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL // e.g., https://your-bucket.your-domain.com

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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const r2Client = getR2Client()
    if (!r2Client) {
      return NextResponse.json({
        error: 'R2 not configured',
        message: 'Add R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, CLOUDFLARE_ACCOUNT_ID, and R2_BUCKET_NAME environment variables',
      }, { status: 500 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP, SVG' }, { status: 400 })
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large. Max size: 10MB' }, { status: 400 })
    }

    // Get original filename and generate unique key if needed
    const originalName = file.name
    const lastDotIndex = originalName.lastIndexOf('.')
    const baseName = lastDotIndex > 0 ? originalName.substring(0, lastDotIndex) : originalName
    const ext = lastDotIndex > 0 ? originalName.substring(lastDotIndex) : ''

    // Sanitize filename (remove problematic characters)
    const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_')

    // Check for existing files with the same name
    let filename = `personalblog/${sanitizedBaseName}${ext}`
    let counter = 0

    try {
      const existingFiles = await r2Client.send(new ListObjectsV2Command({
        Bucket: R2_BUCKET_NAME,
        Prefix: 'personalblog/',
      }))

      const existingKeys = new Set(existingFiles.Contents?.map(obj => obj.Key) || [])

      // Find a unique filename
      while (existingKeys.has(filename)) {
        counter++
        filename = `personalblog/${sanitizedBaseName}(${counter})${ext}`
      }
    } catch {
      // If listing fails, add timestamp to ensure uniqueness
      filename = `personalblog/${sanitizedBaseName}-${Date.now()}${ext}`
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to R2
    await r2Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: filename,
      Body: buffer,
      ContentType: file.type,
    }))

    // Generate public URL
    // R2 requires either a custom domain or R2.dev public URL to be configured
    if (!R2_PUBLIC_URL) {
      return NextResponse.json({
        error: 'R2_PUBLIC_URL not configured',
        message: 'Set R2_PUBLIC_URL to your R2 public URL (custom domain or r2.dev URL)',
        uploadedKey: filename, // Still return the key so they can configure later
      }, { status: 500 })
    }

    // Ensure URL has protocol prefix
    const baseUrl = R2_PUBLIC_URL.startsWith('http') ? R2_PUBLIC_URL : `https://${R2_PUBLIC_URL}`
    const publicUrl = `${baseUrl}/${filename}`

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename,
    })
  } catch (error) {
    console.error('Failed to upload image:', error)
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
  }
}
