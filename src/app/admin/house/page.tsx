'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'

const environments = [
  {
    name: 'Testing',
    href: 'https://testthehouse.psiegel.org',
    icon: 'fa-vial',
    description: 'Test environment for development'
  },
  {
    name: 'Production',
    href: 'https://thehouse.psiegel.org',
    icon: 'fa-globe',
    description: 'Live production environment'
  }
]

const devTools = [
  {
    name: 'GitHub',
    href: 'https://github.com/psiegel18/TheHouseOnline',
    icon: 'fa-brands fa-github',
    description: 'Source code repository'
  },
  {
    name: 'MongoDB',
    href: 'https://cloud.mongodb.com/v2/668caa771b77a8026cbe8ac1#/clusters',
    icon: 'fa-database',
    description: 'Database management'
  },
  {
    name: 'Vercel',
    href: 'https://vercel.com/the-house/user_database',
    icon: 'fa-pager',
    description: 'Deployment platform'
  },
  {
    name: 'Cloudinary',
    href: 'https://console.cloudinary.com/console/c-e9b0009d8f78ba26c60314eaeb5904/media_library/folders/c84e6f531e097ec2c0ebab725de5160bf3',
    icon: 'fa-images',
    description: 'Image hosting & CDN'
  },
  {
    name: 'Claude.AI',
    href: 'https://claude.ai/new',
    icon: 'fa-robot',
    description: 'AI assistant'
  },
  {
    name: 'Cloudflare',
    href: 'https://dash.cloudflare.com/6331ec5e24e1696dd4849b23c16fab5a/workers-and-pages',
    icon: 'fa-brands fa-cloudflare',
    description: 'CDN & Workers'
  },
  {
    name: 'Neon',
    href: 'https://console.neon.tech',
    icon: 'fa-database',
    description: 'Postgres Database'
  }
]

export default function TheHousePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return

    if (!session?.user || session.user.role !== 'ADMIN') {
      router.push('/')
    }
  }, [session, status, router])

  if (status === 'loading') {
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
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">
            <i className="fas fa-home text-primary-400 mr-3" />
            TheHouse Portal
          </h1>
          <Link href="/admin" className="btn-secondary">
            <i className="fas fa-arrow-left mr-2" />
            Back to Admin
          </Link>
        </div>

        {/* Environment Access */}
        <div className="card p-6 mb-8">
          <h2 className="text-xl font-semibold mb-2">Environment Access</h2>
          <p className="text-gray-400 mb-6">Choose your deployment environment</p>

          <div className="grid grid-cols-2 gap-6">
            {environments.map((env) => (
              <a
                key={env.name}
                href={env.href}
                target="_blank"
                rel="noopener noreferrer"
                className="card-hover p-6 text-center group"
              >
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-dark-200 flex items-center justify-center group-hover:bg-primary-500/20 transition-colors">
                  <i className={`fas ${env.icon} text-3xl text-gradient`} />
                </div>
                <h3 className="font-semibold text-lg">{env.name}</h3>
                <p className="text-gray-500 text-sm mt-1">{env.description}</p>
              </a>
            ))}
          </div>
        </div>

        {/* Development Tools */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-2">Development Tools</h2>
          <p className="text-gray-400 mb-6">Quick links to services and resources</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {devTools.map((tool) => (
              <a
                key={tool.name}
                href={tool.href}
                target="_blank"
                rel="noopener noreferrer"
                className="card-hover p-4 text-center group"
              >
                <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-dark-200 flex items-center justify-center group-hover:bg-primary-500/20 transition-colors">
                  <i className={`${tool.icon.includes('fa-brands') ? tool.icon : 'fas ' + tool.icon} text-xl text-gradient`} />
                </div>
                <h3 className="font-medium text-sm">{tool.name}</h3>
                <p className="text-gray-500 text-xs mt-1 hidden sm:block">{tool.description}</p>
              </a>
            ))}
          </div>
        </div>

        {/* Additional Admin Tools */}
        <div className="card p-6 mt-8">
          <h2 className="text-xl font-semibold mb-4">Site Management</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/admin" className="btn-secondary text-center">
              <i className="fas fa-chart-line mr-2" />
              Analytics
            </Link>
            <Link href="/leaderboard" className="btn-secondary text-center">
              <i className="fas fa-trophy mr-2" />
              Leaderboard
            </Link>
            <a
              href="https://vercel.com"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-center"
            >
              <i className="fas fa-rocket mr-2" />
              Deploy
            </a>
            <a
              href="https://console.neon.tech"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-center"
            >
              <i className="fas fa-database mr-2" />
              Database
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
