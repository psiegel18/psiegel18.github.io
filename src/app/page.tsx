import Link from 'next/link'
import Image from 'next/image'
import { AutoGuestLogin } from '@/components/AutoGuestLogin'

const features = [
  {
    title: 'Snake',
    description: 'Classic snake game with global leaderboards',
    icon: 'fa-gamepad',
    href: '/games/snake',
    color: 'from-green-500 to-emerald-600',
  },
  {
    title: 'Tetris',
    description: 'Stack blocks and compete for high scores',
    icon: 'fa-th-large',
    href: '/games/tetris',
    color: 'from-blue-500 to-cyan-600',
  },
  {
    title: 'Birthday Calculator',
    description: 'Find out what day of the week you were born',
    icon: 'fa-birthday-cake',
    href: '/tools/birthday',
    color: 'from-pink-500 to-rose-600',
  },
  {
    title: 'Leaderboard',
    description: 'See top players across all games',
    icon: 'fa-trophy',
    href: '/leaderboard',
    color: 'from-yellow-500 to-orange-600',
  },
  {
    title: 'My Roadtrips',
    description: 'View my travel mapping adventures',
    icon: 'fa-map-marked-alt',
    href: '/roadtrips',
    color: 'from-purple-500 to-violet-600',
  },
  {
    title: 'PRCT Dashboard',
    description: 'Project resource control terminal',
    icon: 'fa-chart-line',
    href: 'https://prct.psiegel.org',
    external: true,
    color: 'from-red-500 to-pink-600',
  },
]

export default function Home() {
  return (
    <>
      <AutoGuestLogin />
      <div className="min-h-screen">
        {/* Hero Section */}
        <section className="relative py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto text-center">
            <div className="flex justify-center mb-6">
              <Image
                src="/psiegel_frog.png"
                alt="Psiegel Logo"
                width={120}
                height={120}
                className="rounded-full"
                priority
              />
            </div>
            <h1 className="text-5xl sm:text-6xl font-bold mb-6">
              Welcome to{' '}
              <span className="text-gradient">Psiegel.org</span>
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
              Play games, compete on global leaderboards, and explore various tools and projects.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/games/snake" className="btn-primary">
                <i className="fas fa-play mr-2" />
                Play Games
              </Link>
              <Link href="/leaderboard" className="btn-secondary">
                <i className="fas fa-trophy mr-2" />
                View Leaderboard
              </Link>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              Explore
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature) => (
                <Link
                  key={feature.title}
                  href={feature.href}
                  target={feature.external ? '_blank' : undefined}
                  rel={feature.external ? 'noopener noreferrer' : undefined}
                  className="card-hover p-6 group"
                >
                  <div className={`w-14 h-14 rounded-lg bg-gradient-to-r ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <i className={`fas ${feature.icon} text-2xl text-white`} />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 flex items-center">
                    {feature.title}
                    {feature.external && (
                      <i className="fas fa-external-link-alt text-sm ml-2 text-gray-500" />
                    )}
                  </h3>
                  <p className="text-gray-400">{feature.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-dark-300/30">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold text-gradient mb-2">2</div>
                <div className="text-gray-400">Games</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-gradient mb-2">∞</div>
                <div className="text-gray-400">High Scores</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-gradient mb-2">24/7</div>
                <div className="text-gray-400">Available</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-gradient mb-2">🌍</div>
                <div className="text-gray-400">Global</div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 px-4 sm:px-6 lg:px-8 border-t border-dark-100/50">
          <div className="max-w-7xl mx-auto text-center text-gray-500">
            <p>&copy; {new Date().getFullYear()} Psiegel.org. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </>
  )
}
