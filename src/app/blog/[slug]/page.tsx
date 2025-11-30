'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

type Comment = {
  id: string
  content: string
  createdAt: string
  author: {
    id: string
    name: string | null
    image: string | null
  }
}

type Post = {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string | null
  coverImage: string | null
  published: boolean
  createdAt: string
  updatedAt: string
  author: {
    id: string
    name: string | null
    image: string | null
  }
  comments: Comment[]
}

export default function BlogPostPage() {
  const { data: session } = useSession()
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [commentContent, setCommentContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (slug) {
      fetchPost()
    }
  }, [slug])

  const fetchPost = async () => {
    try {
      const response = await fetch(`/api/posts/${slug}`)
      if (response.ok) {
        const data = await response.json()
        setPost(data)
      } else if (response.status === 404) {
        router.push('/blog')
      }
    } catch (error) {
      console.error('Failed to fetch post:', error)
    } finally {
      setLoading(false)
    }
  }

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentContent.trim()) return

    setSubmitting(true)
    setError('')

    try {
      const response = await fetch(`/api/posts/${slug}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentContent }),
      })

      if (response.ok) {
        const newComment = await response.json()
        setPost((prev) =>
          prev ? { ...prev, comments: [newComment, ...prev.comments] } : prev
        )
        setCommentContent('')
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to post comment')
      }
    } catch (err) {
      setError('Failed to post comment')
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Post not found</h1>
          <Link href="/blog" className="btn-primary">
            Back to Blog
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Back link */}
        <Link
          href="/blog"
          className="inline-flex items-center text-gray-400 hover:text-white mb-8 transition-colors"
        >
          <i className="fas fa-arrow-left mr-2" />
          Back to Blog
        </Link>

        {/* Cover image */}
        {post.coverImage && (
          <div className="mb-8">
            <Image
              src={post.coverImage}
              alt={post.title}
              width={800}
              height={600}
              className="rounded-xl w-full h-auto"
              priority
            />
          </div>
        )}

        {/* Post header */}
        <header className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{post.title}</h1>
          <div className="flex items-center gap-4 text-gray-400">
            <div className="flex items-center gap-2">
              {post.author.image ? (
                <Image
                  src={post.author.image}
                  alt={post.author.name || 'Author'}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center">
                  <span className="text-sm text-primary-400">
                    {post.author.name?.[0]?.toUpperCase() || '?'}
                  </span>
                </div>
              )}
              <span className="font-medium">{post.author.name || 'Anonymous'}</span>
            </div>
            <span>
              <i className="far fa-calendar mr-1" />
              {formatDate(post.createdAt)}
            </span>
          </div>
        </header>

        {/* Post content */}
        <article className="prose prose-invert prose-lg max-w-none mb-12">
          <div
            className="whitespace-pre-wrap text-gray-300 leading-relaxed"
            style={{ lineHeight: '1.8' }}
          >
            {post.content}
          </div>
        </article>

        {/* Comments section */}
        <section className="border-t border-dark-100/50 pt-8">
          <h2 className="text-2xl font-bold mb-6">
            <i className="far fa-comments text-primary-400 mr-2" />
            Comments ({post.comments.length})
          </h2>

          {/* Comment form */}
          {session ? (
            <form onSubmit={submitComment} className="mb-8">
              <div className="card p-4">
                <div className="flex items-start gap-3">
                  {session.user?.image ? (
                    <Image
                      src={session.user.image}
                      alt={session.user.name || 'You'}
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm text-primary-400">
                        {session.user?.name?.[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                  )}
                  <div className="flex-1">
                    <textarea
                      value={commentContent}
                      onChange={(e) => setCommentContent(e.target.value)}
                      placeholder="Write a comment..."
                      rows={3}
                      className="w-full bg-dark-400 border border-dark-100/50 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 resize-none"
                      maxLength={2000}
                    />
                    {error && (
                      <p className="text-red-400 text-sm mt-2">
                        <i className="fas fa-exclamation-circle mr-1" />
                        {error}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-gray-500">
                        {commentContent.length}/2000
                      </span>
                      <button
                        type="submit"
                        disabled={submitting || !commentContent.trim()}
                        className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting ? (
                          <>
                            <i className="fas fa-spinner fa-spin mr-2" />
                            Posting...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-paper-plane mr-2" />
                            Post Comment
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <div className="card p-6 mb-8 text-center">
              <p className="text-gray-400 mb-4">Sign in to leave a comment</p>
              <Link href="/auth/signin" className="btn-primary">
                <i className="fas fa-sign-in-alt mr-2" />
                Sign In
              </Link>
            </div>
          )}

          {/* Comments list */}
          {post.comments.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No comments yet. Be the first to comment!
            </p>
          ) : (
            <div className="space-y-4">
              {post.comments.map((comment) => (
                <div key={comment.id} className="card p-4">
                  <div className="flex items-start gap-3">
                    {comment.author.image ? (
                      <Image
                        src={comment.author.image}
                        alt={comment.author.name || 'User'}
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-dark-300 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm text-gray-400">
                          {comment.author.name?.[0]?.toUpperCase() || '?'}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">
                          {comment.author.name || 'Anonymous'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDateTime(comment.createdAt)}
                        </span>
                      </div>
                      <p className="text-gray-300 whitespace-pre-wrap break-words">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
