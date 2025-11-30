import Link from 'next/link'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-dark-400 border-t border-dark-100/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <span className="text-2xl font-bold text-gradient">Psiegel.org</span>
            </Link>
            <p className="text-gray-400 max-w-md">
              Play games, compete on global leaderboards, and explore various tools and projects.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/games/snake" className="text-gray-400 hover:text-primary-400 transition-colors">
                  <i className="fas fa-gamepad mr-2" />
                  Games
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-gray-400 hover:text-primary-400 transition-colors">
                  <i className="fas fa-blog mr-2" />
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/leaderboard" className="text-gray-400 hover:text-primary-400 transition-colors">
                  <i className="fas fa-trophy mr-2" />
                  Leaderboard
                </Link>
              </li>
              <li>
                <Link href="/roadtrips" className="text-gray-400 hover:text-primary-400 transition-colors">
                  <i className="fas fa-map-marked-alt mr-2" />
                  Roadtrips
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-4">Contact</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/contact" className="text-gray-400 hover:text-primary-400 transition-colors">
                  <i className="fas fa-envelope mr-2" />
                  Contact Us
                </Link>
              </li>
              <li>
                <a
                  href="mailto:admin@psiegel.org"
                  className="text-gray-400 hover:text-primary-400 transition-colors"
                >
                  <i className="fas fa-at mr-2" />
                  admin@psiegel.org
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-dark-100/50">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">
              &copy; {currentYear} Psiegel.org. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link href="/contact" className="text-gray-500 hover:text-gray-400 text-sm transition-colors">
                Contact
              </Link>
              <Link href="/blog" className="text-gray-500 hover:text-gray-400 text-sm transition-colors">
                Blog
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
