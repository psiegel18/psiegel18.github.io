'use client'

import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'

function ErrorContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const error = searchParams.get('error')

  const errorMessages: Record<string, string> = {
    Configuration: 'There is a problem with the server configuration.',
    AccessDenied: 'You do not have access to this resource.',
    Verification: 'The verification link may have expired or already been used.',
    Default: 'An authentication error occurred.',
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <i className="fas fa-exclamation-triangle text-3xl text-red-500" />
        </div>
        <h1 className="text-2xl font-bold mb-4">Authentication Error</h1>
        <p className="text-gray-400 mb-6">
          {errorMessages[error || 'Default'] || errorMessages.Default}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => router.back()}
            className="btn-secondary"
          >
            Go Back
          </button>
          <Link href="/auth/signin" className="btn-primary">
            Try Again
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    }>
      <ErrorContent />
    </Suspense>
  )
}
