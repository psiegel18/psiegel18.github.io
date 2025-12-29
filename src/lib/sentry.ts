/**
 * Sentry Utility Functions for Custom Tags
 *
 * Custom tags help with issue troubleshooting by providing filterable context:
 * - user_type: Distinguishes between authenticated users, guests, and anonymous visitors
 * - user_role: Identifies admin vs regular users for permission-related issues
 * - auth_provider: Tracks which OAuth provider was used for auth-related bugs
 * - feature_area: Categorizes errors by application feature for faster triage
 * - game_type: Identifies which game is being played for game-specific issues
 */

import * as Sentry from '@sentry/nextjs'

// User type values
export type UserType = 'authenticated' | 'guest' | 'anonymous'

// User role values (matches Prisma schema)
export type UserRole = 'USER' | 'ADMIN'

// Auth provider values
export type AuthProvider = 'google' | 'github' | 'azure-ad' | 'apple' | 'guest' | 'unknown'

// Feature area values for categorizing errors
export type FeatureArea = 'games' | 'blog' | 'admin' | 'api' | 'auth' | 'tools' | 'home'

// Game type values
export type GameType = 'SNAKE' | 'TETRIS'

/**
 * Set user-related Sentry tags based on session data
 * Call this when user session changes (login, logout, session refresh)
 */
export function setSentryUserTags(user: {
  id?: string
  email?: string | null
  role?: UserRole
  isGuest?: boolean
} | null): void {
  if (!user) {
    // Anonymous user (not logged in)
    Sentry.setTag('user_type', 'anonymous')
    Sentry.setTag('user_role', undefined)
    Sentry.setTag('auth_provider', undefined)
    Sentry.setUser(null)
    return
  }

  // Set user type
  const userType: UserType = user.isGuest ? 'guest' : 'authenticated'
  Sentry.setTag('user_type', userType)

  // Set user role
  Sentry.setTag('user_role', user.role || 'USER')

  // Set Sentry user context (for issue assignment and user impact)
  Sentry.setUser({
    id: user.id,
    email: user.email || undefined,
  })
}

/**
 * Set the auth provider tag
 * Call this after successful authentication to track which provider was used
 */
export function setSentryAuthProvider(provider: AuthProvider): void {
  Sentry.setTag('auth_provider', provider)
}

/**
 * Set the feature area tag
 * Call this when entering a specific feature area of the application
 */
export function setSentryFeatureArea(area: FeatureArea): void {
  Sentry.setTag('feature_area', area)
}

/**
 * Set the game type tag
 * Call this when a user starts playing a specific game
 */
export function setSentryGameType(gameType: GameType): void {
  Sentry.setTag('game_type', gameType)
  Sentry.setTag('feature_area', 'games')
}

/**
 * Clear game-specific tags
 * Call this when user leaves a game
 */
export function clearSentryGameTags(): void {
  Sentry.setTag('game_type', undefined)
}

/**
 * Set API-related tags for server-side error tracking
 * Call this in API routes for better error categorization
 */
export function setSentryApiTags(options: {
  endpoint: string
  method: string
  isAdminOnly?: boolean
}): void {
  Sentry.setTag('feature_area', 'api')
  Sentry.setTag('api_endpoint', options.endpoint)
  Sentry.setTag('api_method', options.method)
  if (options.isAdminOnly !== undefined) {
    Sentry.setTag('api_admin_only', options.isAdminOnly ? 'true' : 'false')
  }
}

/**
 * Set integration-related tags for admin dashboard integrations
 * Call this when making external API calls to third-party services
 */
export function setSentryIntegrationTags(options: {
  integrationName: 'sentry' | 'vercel' | 'cloudflare' | 'neon' | 'github' | 'uptimerobot' | 'cloudinary'
  operationType: 'fetch' | 'update' | 'sync' | 'delete'
}): void {
  Sentry.setTag('integration_name', options.integrationName)
  Sentry.setTag('integration_operation', options.operationType)
}
