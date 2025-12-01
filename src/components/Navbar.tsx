'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { useState } from 'react'
import Image from 'next/image'

export function Navbar() {
  const { data: session, status } = useSession()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  const isAdmin = session?.user?.role === 'ADMIN'

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 bg-dark-400/95 backdrop-blur-sm border-b border-dark-100/50"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2" aria-label="Psiegel.org Home">
            <Image
              src="/psiegel_frog.png"
              alt=""
              width={40}
              height={40}
              className="rounded-lg"
              aria-hidden="true"
            />
            <span className="text-2xl font-bold text-gradient">Psiegel.org</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <Link href="/games/snake" className="text-gray-300 hover:text-white transition-colors">
              Snake
            </Link>
            <Link href="/games/tetris" className="text-gray-300 hover:text-white transition-colors">
              Tetris
            </Link>
            <Link href="/blog" className="text-gray-300 hover:text-white transition-colors">
              Blog
            </Link>
            <Link href="/leaderboard" className="text-gray-300 hover:text-white transition-colors">
              Leaderboard
            </Link>
            {isAdmin && (
              <>
                <Link href="/admin" className="text-primary-400 hover:text-primary-300 transition-colors">
                  Admin
                </Link>
                <Link href="/admin/blog" className="text-primary-400 hover:text-primary-300 transition-colors">
                  Blog Admin
                </Link>
              </>
            )}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {status === 'loading' ? (
              <div className="w-8 h-8 rounded-full bg-dark-200 animate-pulse" />
            ) : session ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2 text-gray-300 hover:text-white min-h-[44px] px-2"
                  aria-label="User menu"
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="true"
                >
                  {session.user?.image ? (
                    <Image
                      src={session.user.image}
                      alt=""
                      width={32}
                      height={32}
                      className="rounded-full"
                      aria-hidden="true"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center" aria-hidden="true">
                      <span className="text-sm font-medium">
                        {session.user?.name?.[0]?.toUpperCase() || 'G'}
                      </span>
                    </div>
                  )}
                  <span className="hidden sm:block">
                    {session.user?.name || 'Guest'}
                    {session.user?.isGuest && (
                      <span className="text-xs text-gray-500 ml-1">(Guest)</span>
                    )}
                  </span>
                  <i className="fas fa-chevron-down text-xs" aria-hidden="true" />
                </button>

                {isUserMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-48 bg-dark-300 rounded-lg shadow-lg border border-dark-100/50 py-1"
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="user-menu"
                  >
                    {session.user?.isGuest && (
                      <Link
                        href="/auth/signin"
                        className="block px-4 py-3 text-sm text-primary-400 hover:bg-dark-200"
                        onClick={() => setIsUserMenuOpen(false)}
                        role="menuitem"
                      >
                        <i className="fas fa-user-plus mr-2" aria-hidden="true" />
                        Create Account
                      </Link>
                    )}
                    <Link
                      href="/profile"
                      className="block px-4 py-3 text-sm text-gray-300 hover:bg-dark-200"
                      onClick={() => setIsUserMenuOpen(false)}
                      role="menuitem"
                    >
                      <i className="fas fa-user mr-2" aria-hidden="true" />
                      Profile
                    </Link>
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false)
                        signOut()
                      }}
                      className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-dark-200"
                      role="menuitem"
                    >
                      <i className="fas fa-sign-out-alt mr-2" aria-hidden="true" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/auth/signin" className="btn-primary text-sm">
                Sign In
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden text-gray-300 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu"
            >
              <i className={`fas ${isMenuOpen ? 'fa-times' : 'fa-bars'} text-xl`} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div
            id="mobile-menu"
            className="md:hidden py-4 border-t border-dark-100/50"
            role="menu"
            aria-label="Mobile navigation"
          >
            <div className="flex flex-col space-y-1">
              <Link
                href="/games/snake"
                className="text-gray-300 hover:text-white transition-colors py-3 px-2"
                onClick={() => setIsMenuOpen(false)}
                role="menuitem"
              >
                <i className="fas fa-gamepad mr-2" aria-hidden="true" /> Snake
              </Link>
              <Link
                href="/games/tetris"
                className="text-gray-300 hover:text-white transition-colors py-3 px-2"
                onClick={() => setIsMenuOpen(false)}
                role="menuitem"
              >
                <i className="fas fa-th-large mr-2" aria-hidden="true" /> Tetris
              </Link>
              <Link
                href="/blog"
                className="text-gray-300 hover:text-white transition-colors py-3 px-2"
                onClick={() => setIsMenuOpen(false)}
                role="menuitem"
              >
                <i className="fas fa-blog mr-2" aria-hidden="true" /> Blog
              </Link>
              <Link
                href="/tools/birthday"
                className="text-gray-300 hover:text-white transition-colors py-3 px-2"
                onClick={() => setIsMenuOpen(false)}
                role="menuitem"
              >
                <i className="fas fa-birthday-cake mr-2" aria-hidden="true" /> Birthday Calculator
              </Link>
              <Link
                href="/leaderboard"
                className="text-gray-300 hover:text-white transition-colors py-3 px-2"
                onClick={() => setIsMenuOpen(false)}
                role="menuitem"
              >
                <i className="fas fa-trophy mr-2" aria-hidden="true" /> Leaderboard
              </Link>
              {isAdmin && (
                <>
                  <Link
                    href="/admin"
                    className="text-primary-400 hover:text-primary-300 transition-colors py-3 px-2"
                    onClick={() => setIsMenuOpen(false)}
                    role="menuitem"
                  >
                    <i className="fas fa-cog mr-2" aria-hidden="true" /> Admin
                  </Link>
                  <Link
                    href="/admin/blog"
                    className="text-primary-400 hover:text-primary-300 transition-colors py-3 px-2"
                    onClick={() => setIsMenuOpen(false)}
                    role="menuitem"
                  >
                    <i className="fas fa-edit mr-2" aria-hidden="true" /> Blog Admin
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
