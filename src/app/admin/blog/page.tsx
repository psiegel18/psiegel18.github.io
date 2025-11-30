'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'

type Post = {
  id: string
  title: string
  slug: string
  excerpt: string | null
  published: boolean
  createdAt: string
  updatedAt: string
  author: {
    id: string
    name: string | null
  }
  _count: {
    comments: number
  }
}

type R2Image = {
  key: string
  url: string
  size: number
  lastModified: string
  name: string
}

export default function AdminBlogPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditor, setShowEditor] = useState(false)
  const [editingPost, setEditingPost] = useState<Post | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [published, setPublished] = useState(false)
  const [error, setError] = useState('')

  // Image picker state
  const [showImagePicker, setShowImagePicker] = useState(false)
  const [r2Images, setR2Images] = useState<R2Image[]>([])
  const [r2Configured, setR2Configured] = useState(false)
  const [loadingImages, setLoadingImages] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user || session.user.role !== 'ADMIN') {
      router.push('/')
      return
    }
    fetchPosts()
  }, [session, status, router])

  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/posts?all=true')
      if (response.ok) {
        const data = await response.json()
        setPosts(data)
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchR2Images = async () => {
    setLoadingImages(true)
    try {
      const response = await fetch('/api/admin/r2/images')
      const data = await response.json()
      if (data.configured) {
        setR2Configured(true)
        setR2Images(data.images || [])
      } else {
        setR2Configured(false)
      }
    } catch (error) {
      console.error('Failed to fetch R2 images:', error)
    } finally {
      setLoadingImages(false)
    }
  }

  const openImagePicker = () => {
    setShowImagePicker(true)
    setUploadError('')
    fetchR2Images()
  }

  const selectImage = (url: string) => {
    setCoverImage(url)
    setShowImagePicker(false)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadError('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/admin/r2/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setCoverImage(data.url)
        setShowImagePicker(false)
        // Refresh images list
        fetchR2Images()
      } else {
        setUploadError(data.error || 'Failed to upload image')
      }
    } catch (error) {
      setUploadError('Failed to upload image')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const resetForm = () => {
    setTitle('')
    setContent('')
    setExcerpt('')
    setCoverImage('')
    setPublished(false)
    setEditingPost(null)
    setError('')
  }

  const openEditor = (post?: Post) => {
    if (post) {
      setEditingPost(post)
      setTitle(post.title)
      setExcerpt(post.excerpt || '')
      setCoverImage('')
      setPublished(post.published)
      // Fetch full content
      fetch(`/api/posts/${post.slug}`)
        .then((res) => res.json())
        .then((data) => {
          setContent(data.content || '')
          setCoverImage(data.coverImage || '')
        })
    } else {
      resetForm()
    }
    setShowEditor(true)
  }

  const closeEditor = () => {
    setShowEditor(false)
    resetForm()
  }

  const savePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required')
      return
    }

    setSaving(true)
    setError('')

    try {
      const url = editingPost ? `/api/posts/${editingPost.slug}` : '/api/posts'
      const method = editingPost ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          excerpt: excerpt || undefined,
          coverImage: coverImage || undefined,
          published,
        }),
      })

      if (response.ok) {
        closeEditor()
        fetchPosts()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to save post')
      }
    } catch (err) {
      setError('Failed to save post')
    } finally {
      setSaving(false)
    }
  }

  const deletePost = async (slug: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return

    setDeleting(slug)
    try {
      const response = await fetch(`/api/posts/${slug}`, { method: 'DELETE' })
      if (response.ok) {
        fetchPosts()
      }
    } catch (error) {
      console.error('Failed to delete post:', error)
    } finally {
      setDeleting(null)
    }
  }

  const togglePublished = async (post: Post) => {
    try {
      const response = await fetch(`/api/posts/${post.slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !post.published }),
      })
      if (response.ok) {
        fetchPosts()
      }
    } catch (error) {
      console.error('Failed to toggle publish status:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    )
  }

  if (!session?.user || session.user.role !== 'ADMIN') {
    return null
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="text-gray-400 hover:text-white transition-colors"
            >
              <i className="fas fa-arrow-left" />
            </Link>
            <h1 className="text-3xl font-bold">
              <i className="fas fa-blog text-primary-400 mr-3" />
              Blog Management
            </h1>
          </div>
          <button onClick={() => openEditor()} className="btn-primary">
            <i className="fas fa-plus mr-2" />
            New Post
          </button>
        </div>

        {/* Posts list */}
        {posts.length === 0 ? (
          <div className="card p-12 text-center">
            <i className="fas fa-newspaper text-6xl text-gray-600 mb-4" />
            <p className="text-gray-400 text-lg mb-4">No posts yet</p>
            <button onClick={() => openEditor()} className="btn-primary">
              <i className="fas fa-plus mr-2" />
              Create Your First Post
            </button>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-dark-400/50">
                <tr>
                  <th className="text-left px-6 py-4 font-semibold">Title</th>
                  <th className="text-left px-6 py-4 font-semibold hidden md:table-cell">Status</th>
                  <th className="text-left px-6 py-4 font-semibold hidden lg:table-cell">Comments</th>
                  <th className="text-left px-6 py-4 font-semibold hidden lg:table-cell">Date</th>
                  <th className="text-right px-6 py-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-100/50">
                {posts.map((post) => (
                  <tr key={post.id} className="hover:bg-dark-400/30">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium">{post.title}</p>
                        <p className="text-sm text-gray-500 truncate max-w-xs">
                          /blog/{post.slug}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <button
                        onClick={() => togglePublished(post)}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          post.published
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}
                      >
                        {post.published ? 'Published' : 'Draft'}
                      </button>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <span className="text-gray-400">
                        <i className="far fa-comment mr-1" />
                        {post._count.comments}
                      </span>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell text-gray-400">
                      {formatDate(post.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/blog/${post.slug}`}
                          target="_blank"
                          className="btn-secondary text-sm px-3 py-1"
                        >
                          <i className="fas fa-eye" />
                        </Link>
                        <button
                          onClick={() => openEditor(post)}
                          className="btn-secondary text-sm px-3 py-1"
                        >
                          <i className="fas fa-edit" />
                        </button>
                        <button
                          onClick={() => deletePost(post.slug)}
                          disabled={deleting === post.slug}
                          className="btn-secondary text-sm px-3 py-1 text-red-400 hover:bg-red-500/20"
                        >
                          {deleting === post.slug ? (
                            <i className="fas fa-spinner fa-spin" />
                          ) : (
                            <i className="fas fa-trash" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Editor Modal */}
        {showEditor && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-dark-300 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-dark-100/50">
                <h2 className="text-xl font-bold">
                  {editingPost ? 'Edit Post' : 'New Post'}
                </h2>
                <button
                  onClick={closeEditor}
                  className="text-gray-400 hover:text-white"
                >
                  <i className="fas fa-times text-xl" />
                </button>
              </div>

              <form onSubmit={savePost} className="flex-1 overflow-y-auto p-6">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6 text-red-400">
                    <i className="fas fa-exclamation-circle mr-2" />
                    {error}
                  </div>
                )}

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-dark-400 border border-dark-100/50 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                      placeholder="Enter post title"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Cover Image
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={coverImage}
                        onChange={(e) => setCoverImage(e.target.value)}
                        className="flex-1 bg-dark-400 border border-dark-100/50 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                        placeholder="https://example.com/image.jpg"
                      />
                      <button
                        type="button"
                        onClick={openImagePicker}
                        className="btn-secondary whitespace-nowrap"
                      >
                        <i className="fas fa-images mr-2" />
                        Browse R2
                      </button>
                    </div>
                    {coverImage && (
                      <div className="mt-3 relative w-full h-40 rounded-lg overflow-hidden bg-dark-400">
                        <Image
                          src={coverImage}
                          alt="Cover preview"
                          fill
                          className="object-cover"
                          onError={() => setCoverImage('')}
                        />
                        <button
                          type="button"
                          onClick={() => setCoverImage('')}
                          className="absolute top-2 right-2 w-8 h-8 bg-red-500/80 hover:bg-red-500 rounded-full flex items-center justify-center text-white"
                        >
                          <i className="fas fa-times" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Excerpt (optional)
                    </label>
                    <textarea
                      value={excerpt}
                      onChange={(e) => setExcerpt(e.target.value)}
                      rows={2}
                      className="w-full bg-dark-400 border border-dark-100/50 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 resize-none"
                      placeholder="Brief description of the post"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Content *
                    </label>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={15}
                      className="w-full bg-dark-400 border border-dark-100/50 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 resize-none font-mono"
                      placeholder="Write your post content here..."
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="published"
                      checked={published}
                      onChange={(e) => setPublished(e.target.checked)}
                      className="w-5 h-5 rounded border-dark-100 bg-dark-400 text-primary-500 focus:ring-primary-500/50"
                    />
                    <label htmlFor="published" className="text-gray-300">
                      Publish immediately
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-dark-100/50">
                  <button
                    type="button"
                    onClick={closeEditor}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary"
                  >
                    {saving ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save mr-2" />
                        {editingPost ? 'Update Post' : 'Create Post'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Image Picker Modal */}
        {showImagePicker && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
            <div className="bg-dark-300 rounded-xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-dark-100/50">
                <h2 className="text-xl font-bold">
                  <i className="fas fa-images text-primary-400 mr-2" />
                  Select Cover Image
                </h2>
                <button
                  onClick={() => setShowImagePicker(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <i className="fas fa-times text-xl" />
                </button>
              </div>

              <div className="p-6 border-b border-dark-100/50">
                <div className="flex gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className={`btn-primary cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    {uploading ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-upload mr-2" />
                        Upload New Image
                      </>
                    )}
                  </label>
                  <span className="text-gray-500 text-sm self-center">
                    Max 10MB - JPEG, PNG, GIF, WebP, SVG
                  </span>
                </div>
                {uploadError && (
                  <p className="text-red-400 text-sm mt-2">
                    <i className="fas fa-exclamation-circle mr-1" />
                    {uploadError}
                  </p>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {loadingImages ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500" />
                  </div>
                ) : !r2Configured ? (
                  <div className="text-center py-12">
                    <i className="fas fa-cloud text-4xl text-gray-600 mb-4" />
                    <p className="text-gray-400 mb-2">R2 storage not configured</p>
                    <p className="text-gray-500 text-sm">
                      Add R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, CLOUDFLARE_ACCOUNT_ID, and R2_BUCKET_NAME environment variables.
                    </p>
                  </div>
                ) : r2Images.length === 0 ? (
                  <div className="text-center py-12">
                    <i className="fas fa-image text-4xl text-gray-600 mb-4" />
                    <p className="text-gray-400">No images in personalblog folder yet</p>
                    <p className="text-gray-500 text-sm mt-2">Upload an image to get started</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {r2Images.map((image) => (
                      <button
                        key={image.key}
                        onClick={() => selectImage(image.url)}
                        className="group relative aspect-video rounded-lg overflow-hidden bg-dark-400 hover:ring-2 hover:ring-primary-500 transition-all"
                      >
                        <Image
                          src={image.url}
                          alt={image.name}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                          <span className="opacity-0 group-hover:opacity-100 text-white font-medium transition-opacity">
                            <i className="fas fa-check mr-1" />
                            Select
                          </span>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                          <p className="text-xs text-white truncate">{image.name}</p>
                          <p className="text-xs text-gray-400">{formatFileSize(image.size)}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
