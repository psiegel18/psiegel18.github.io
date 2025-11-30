'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

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
                      Cover Image URL (optional)
                    </label>
                    <input
                      type="url"
                      value={coverImage}
                      onChange={(e) => setCoverImage(e.target.value)}
                      className="w-full bg-dark-400 border border-dark-100/50 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                      placeholder="https://example.com/image.jpg"
                    />
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
      </div>
    </div>
  )
}
