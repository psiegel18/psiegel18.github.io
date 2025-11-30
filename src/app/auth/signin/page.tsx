'use client'

import { signIn, signOut, useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'

function SignInContent() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/'
  const error = searchParams.get('error')
  const [isSigningIn, setIsSigningIn] = useState(false)

  useEffect(() => {
    if (session && !session.user.isGuest) {
      router.push(callbackUrl)
    }
  }, [session, router, callbackUrl])

  const providers = [
    { id: 'google', name: 'Google', icon: 'fa-google', color: 'bg-white text-gray-900 hover:bg-gray-100' },
    { id: 'github', name: 'GitHub', icon: 'fa-github', color: 'bg-gray-800 text-white hover:bg-gray-700' },
    { id: 'azure-ad', name: 'Microsoft', icon: 'fa-microsoft', color: 'bg-blue-600 text-white hover:bg-blue-700' },
    { id: 'apple', name: 'Apple', icon: 'fa-apple', color: 'bg-black text-white hover:bg-gray-900' },
  ]

  // Handle OAuth sign in - sign out guest first to avoid session conflicts
  const handleOAuthSignIn = async (providerId: string) => {
    setIsSigningIn(true)
    try {
      // If user is a guest, sign out first to clear the guest session
      if (session?.user?.isGuest) {
        await signOut({ redirect: false })
      }
      // Then sign in with the OAuth provider
      await signIn(providerId, { callbackUrl })
    } catch (err) {
      console.error('Sign in error:', err)
      setIsSigningIn(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card max-w-md w-full p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {session?.user?.isGuest ? 'Create Account' : 'Sign In'}
          </h1>
          <p className="text-gray-400">
            {session?.user?.isGuest
              ? 'Link your account to save your progress across devices'
              : 'Sign in to track your scores and compete globally'}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6 text-red-400 text-sm">
            <i className="fas fa-exclamation-circle mr-2" />
            {error === 'OAuthSignin' && 'Error starting authentication'}
            {error === 'OAuthCallback' && 'Error during authentication'}
            {error === 'OAuthCreateAccount' && 'Could not create account'}
            {error === 'Callback' && 'Authentication error'}
            {error === 'Default' && 'An error occurred'}
            {!['OAuthSignin', 'OAuthCallback', 'OAuthCreateAccount', 'Callback', 'Default'].includes(error) && error}
          </div>
        )}

        <div className="space-y-3">
          {providers.map((provider) => (
            <button
              key={provider.id}
              onClick={() => handleOAuthSignIn(provider.id)}
              disabled={isSigningIn}
              className={`w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg font-medium transition-colors ${provider.color} ${isSigningIn ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isSigningIn ? (
                <i className="fas fa-spinner fa-spin text-xl" />
              ) : (
                <i className={`fab ${provider.icon} text-xl`} />
              )}
              Continue with {provider.name}
            </button>
          ))}
        </div>

        <div className="mt-8 pt-6 border-t border-dark-100/50 text-center">
          {session?.user?.isGuest ? (
            <p className="text-sm text-gray-500">
              Your guest scores will be linked to your new account
            </p>
          ) : (
            <button
              onClick={() => signIn('guest', { callbackUrl })}
              disabled={isSigningIn}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <i className="fas fa-user-secret mr-2" />
              Continue as Guest
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    }>
      <SignInContent />
    </Suspense>
  )
}
