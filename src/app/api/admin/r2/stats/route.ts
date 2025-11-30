import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { S3Client, ListObjectsV2Command, ListBucketsCommand } from '@aws-sdk/client-s3'

export const dynamic = 'force-dynamic'

const R2_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY

// R2 free tier limits
const R2_FREE_STORAGE_GB = 10 // 10 GB free storage
const R2_FREE_STORAGE_BYTES = R2_FREE_STORAGE_GB * 1024 * 1024 * 1024

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

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function getFileExtension(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase() || ''
  // Return empty string if the "extension" is the same as the full filename (no extension)
  if (ext === key.toLowerCase() || !ext) return '(no extension)'
  return `.${ext}`
}

function getFileType(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase() || ''
  const typeMap: Record<string, string> = {
    // Images
    jpg: 'Images', jpeg: 'Images', png: 'Images', gif: 'Images', webp: 'Images', svg: 'Images', ico: 'Images', bmp: 'Images',
    // Documents
    pdf: 'Documents', doc: 'Documents', docx: 'Documents', txt: 'Documents', md: 'Documents',
    // Videos
    mp4: 'Videos', webm: 'Videos', mov: 'Videos', avi: 'Videos',
    // Audio
    mp3: 'Audio', wav: 'Audio', ogg: 'Audio', flac: 'Audio',
    // Archives
    zip: 'Archives', tar: 'Archives', gz: 'Archives', rar: 'Archives',
    // Code/Data
    json: 'Data', xml: 'Data', csv: 'Data', html: 'Code', css: 'Code', js: 'Code',
  }
  return typeMap[ext] || 'Other'
}

function getDirectory(key: string): string {
  const parts = key.split('/')
  if (parts.length <= 1) return '/'
  return parts.slice(0, -1).join('/') || '/'
}

type BucketStats = {
  name: string
  createdAt?: string
  totalFiles: number
  totalBytes: number
  totalFormatted: string
  byType: Array<{
    type: string
    count: number
    bytes: number
    formatted: string
    percent: string
  }>
  byExtension: Array<{
    extension: string
    type: string
    count: number
    bytes: number
    formatted: string
    percent: string
  }>
  byDirectory: Array<{
    directory: string
    count: number
    bytes: number
    formatted: string
    percent: string
  }>
  recentUploads: Array<{
    key: string
    name: string
    size: string
    lastModified: string
  }>
}

async function getBucketStats(r2Client: S3Client, bucketName: string, createdAt?: Date): Promise<BucketStats> {
  // List all objects in the bucket (paginated)
  let allObjects: { Key?: string; Size?: number; LastModified?: Date }[] = []
  let continuationToken: string | undefined

  try {
    do {
      const response = await r2Client.send(new ListObjectsV2Command({
        Bucket: bucketName,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      }))

      if (response.Contents) {
        allObjects = allObjects.concat(response.Contents)
      }

      continuationToken = response.NextContinuationToken
    } while (continuationToken)
  } catch (error) {
    console.error(`Failed to list objects in bucket ${bucketName}:`, error)
    // Return empty stats if we can't access the bucket
    return {
      name: bucketName,
      createdAt: createdAt?.toISOString(),
      totalFiles: 0,
      totalBytes: 0,
      totalFormatted: '0 B',
      byType: [],
      byExtension: [],
      byDirectory: [],
      recentUploads: [],
    }
  }

  // Calculate total storage used
  const totalBytes = allObjects.reduce((sum, obj) => sum + (obj.Size || 0), 0)

  // Group by file type
  const byType: Record<string, { count: number; bytes: number }> = {}
  for (const obj of allObjects) {
    const type = getFileType(obj.Key || '')
    if (!byType[type]) {
      byType[type] = { count: 0, bytes: 0 }
    }
    byType[type].count++
    byType[type].bytes += obj.Size || 0
  }

  // Group by file extension
  const byExtension: Record<string, { count: number; bytes: number; type: string }> = {}
  for (const obj of allObjects) {
    const ext = getFileExtension(obj.Key || '')
    const type = getFileType(obj.Key || '')
    if (!byExtension[ext]) {
      byExtension[ext] = { count: 0, bytes: 0, type }
    }
    byExtension[ext].count++
    byExtension[ext].bytes += obj.Size || 0
  }

  // Group by directory
  const byDirectory: Record<string, { count: number; bytes: number }> = {}
  for (const obj of allObjects) {
    const dir = getDirectory(obj.Key || '')
    if (!byDirectory[dir]) {
      byDirectory[dir] = { count: 0, bytes: 0 }
    }
    byDirectory[dir].count++
    byDirectory[dir].bytes += obj.Size || 0
  }

  // Sort and format type stats
  const typeStats = Object.entries(byType)
    .map(([type, data]) => ({
      type,
      count: data.count,
      bytes: data.bytes,
      formatted: formatBytes(data.bytes),
      percent: totalBytes > 0 ? ((data.bytes / totalBytes) * 100).toFixed(1) : '0',
    }))
    .sort((a, b) => b.bytes - a.bytes)

  // Sort and format extension stats
  const extensionStats = Object.entries(byExtension)
    .map(([extension, data]) => ({
      extension,
      type: data.type,
      count: data.count,
      bytes: data.bytes,
      formatted: formatBytes(data.bytes),
      percent: totalBytes > 0 ? ((data.bytes / totalBytes) * 100).toFixed(1) : '0',
    }))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 15) // Top 15 extensions

  // Sort and format directory stats
  const directoryStats = Object.entries(byDirectory)
    .map(([directory, data]) => ({
      directory,
      count: data.count,
      bytes: data.bytes,
      formatted: formatBytes(data.bytes),
      percent: totalBytes > 0 ? ((data.bytes / totalBytes) * 100).toFixed(1) : '0',
    }))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 10) // Top 10 directories

  // Get recent uploads (last 10)
  const recentUploads = allObjects
    .filter(obj => obj.LastModified)
    .sort((a, b) => {
      const dateA = a.LastModified?.getTime() || 0
      const dateB = b.LastModified?.getTime() || 0
      return dateB - dateA
    })
    .slice(0, 10)
    .map(obj => ({
      key: obj.Key || '',
      name: obj.Key?.split('/').pop() || obj.Key || '',
      size: formatBytes(obj.Size || 0),
      lastModified: obj.LastModified?.toISOString() || '',
    }))

  return {
    name: bucketName,
    createdAt: createdAt?.toISOString(),
    totalFiles: allObjects.length,
    totalBytes,
    totalFormatted: formatBytes(totalBytes),
    byType: typeStats,
    byExtension: extensionStats,
    byDirectory: directoryStats,
    recentUploads,
  }
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

    // List all buckets
    let bucketList: { Name?: string; CreationDate?: Date }[] = []
    try {
      const listBucketsResponse = await r2Client.send(new ListBucketsCommand({}))
      bucketList = listBucketsResponse.Buckets || []
    } catch (error) {
      console.error('Failed to list buckets:', error)
      return NextResponse.json({
        configured: false,
        message: 'Failed to list R2 buckets. Check your API credentials.',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    if (bucketList.length === 0) {
      return NextResponse.json({
        configured: true,
        buckets: [],
        summary: {
          totalBuckets: 0,
          totalFiles: 0,
          totalBytes: 0,
          totalFormatted: '0 B',
          freeStorageBytes: R2_FREE_STORAGE_BYTES,
          freeStorageFormatted: formatBytes(R2_FREE_STORAGE_BYTES),
          usedPercent: '0',
          remainingBytes: R2_FREE_STORAGE_BYTES,
          remainingFormatted: formatBytes(R2_FREE_STORAGE_BYTES),
        },
        message: 'No buckets found in R2.',
      })
    }

    // Get stats for each bucket
    const bucketStats: BucketStats[] = await Promise.all(
      bucketList.map(bucket =>
        getBucketStats(r2Client, bucket.Name || '', bucket.CreationDate)
      )
    )

    // Calculate totals across all buckets
    const totalFiles = bucketStats.reduce((sum, b) => sum + b.totalFiles, 0)
    const totalBytes = bucketStats.reduce((sum, b) => sum + b.totalBytes, 0)
    const storageUsedPercent = (totalBytes / R2_FREE_STORAGE_BYTES) * 100
    const storageRemaining = R2_FREE_STORAGE_BYTES - totalBytes

    return NextResponse.json({
      configured: true,
      buckets: bucketStats,
      summary: {
        totalBuckets: bucketStats.length,
        totalFiles,
        totalBytes,
        totalFormatted: formatBytes(totalBytes),
        freeStorageBytes: R2_FREE_STORAGE_BYTES,
        freeStorageFormatted: formatBytes(R2_FREE_STORAGE_BYTES),
        usedPercent: storageUsedPercent.toFixed(2),
        remainingBytes: storageRemaining,
        remainingFormatted: formatBytes(storageRemaining),
      },
    })
  } catch (error) {
    console.error('Failed to get R2 stats:', error)
    return NextResponse.json(
      { error: 'Failed to get R2 stats', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
