'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

type Post = {
  id: string
  title: string
  slug: string
  excerpt: string | null
  coverImage: string | null
  published: boolean
  createdAt: string
  author: {
    id: string
    name: string | null
    image: string | null
  }
  _count: {
    comments: number
  }
}

export default function BlogPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/posts')
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold mb-4">
            <i className="fas fa-blog text-primary-400 mr-3" aria-hidden="true" />
            Blog
          </h1>
          <p className="text-gray-400 text-lg">
            Thoughts, updates, and stories
          </p>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-16">
            <i className="fas fa-newspaper text-6xl text-gray-600 mb-4" aria-hidden="true" />
            <p className="text-gray-400 text-lg">No posts yet. Check back soon!</p>
          </div>
        ) : (
          <div className="space-y-8">
            {posts.map((post) => (
              <article key={post.id} className="card-hover p-6 group">
                <Link href={`/blog/${post.slug}`}>
                  <div className="flex flex-col md:flex-row gap-6">
                    {post.coverImage && (
                      <div className="md:w-48 flex-shrink-0">
                        <Image
                          src={post.coverImage}
                          alt={post.title}
                          width={192}
                          height={128}
                          className="rounded-lg w-full h-auto group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 768px) 100vw, 192px"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold mb-2 group-hover:text-primary-400 transition-colors">
                        {post.title}
                      </h2>
                      <p className="text-gray-400 mb-4 line-clamp-2">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          {post.author.image ? (
                            <Image
                              src={post.author.image}
                              alt=""
                              width={24}
                              height={24}
                              className="rounded-full"
                              aria-hidden="true"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-primary-500/20 flex items-center justify-center" aria-hidden="true">
                              <span className="text-xs text-primary-400">
                                {post.author.name?.[0]?.toUpperCase() || '?'}
                              </span>
                            </div>
                          )}
                          <span>{post.author.name || 'Anonymous'}</span>
                        </div>
                        <span>
                          <i className="far fa-calendar mr-1" aria-hidden="true" />
                          {formatDate(post.createdAt)}
                        </span>
                        <span>
                          <i className="far fa-comment mr-1" aria-hidden="true" />
                          {post._count.comments} {post._count.comments === 1 ? 'comment' : 'comments'}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
