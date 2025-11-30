'use client'

import { useState } from 'react'
import Link from 'next/link'

type BirthdayResult = {
  date: {
    input: string
    formatted: string
    dayOfWeek: string
    dayOfWeekNumber: number
  }
  age: {
    years: number
    nextBirthdayIn: number
    isBirthdayToday: boolean
    generation: string
  }
  numbers: {
    daysAlive: number
    weeksAlive: number
    monthsAlive: number
    hoursAlive: number
    minutesAlive: number
  }
  zodiac: {
    western: {
      sign: string
      symbol: string
      element: string
    }
    chinese: {
      animal: string
      element: string
      traits: string
    }
  }
  birthstone: {
    name: string
    color: string
    meaning: string
  }
  leapYear: {
    bornInLeapYear: boolean
    bornOnLeapDay: boolean
  }
  famousBirthdays: Array<{
    name: string
    year: number | null
    description: string
  }>
  milestones: string[]
}

export default function BirthdayAPIPage() {
  const [date, setDate] = useState('')
  const [result, setResult] = useState<BirthdayResult | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const fetchBirthday = async () => {
    if (!date) {
      setError('Please enter a date')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch(`/api/birthday?date=${date}`)
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to fetch birthday info')
        return
      }

      setResult(data)
    } catch {
      setError('Failed to connect to API')
    } finally {
      setLoading(false)
    }
  }

  const copyApiUrl = () => {
    const url = `${window.location.origin}/api/birthday?date=${date || 'YYYY-MM-DD'}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatNumber = (num: number) => num.toLocaleString()

  const setExampleDate = (dateStr: string) => {
    setDate(dateStr)
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="card p-6 md:p-8 mb-8">
          <div className="flex items-center justify-between mb-4">
            <Link href="/tools/birthday" className="text-gray-400 hover:text-white text-sm">
              <i className="fas fa-arrow-left mr-2" />
              Back to Calculator
            </Link>
            <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm">
              Public API
            </span>
          </div>

          <h1 className="text-3xl font-bold text-center mb-4">
            <i className="fas fa-birthday-cake text-primary-400 mr-3" />
            Birthday Information API
          </h1>

          <p className="text-gray-400 text-center mb-6">
            A free public API that returns comprehensive information about any birthdate including
            day of the week, zodiac signs, famous people born on the same day, and more.
          </p>

          {/* API Endpoint Display */}
          <div className="bg-dark-400 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 uppercase tracking-wide">Endpoint</span>
              <button
                onClick={copyApiUrl}
                className="text-xs text-gray-400 hover:text-white"
              >
                {copied ? '✓ Copied!' : 'Copy URL'}
              </button>
            </div>
            <code className="text-green-400 text-sm">
              GET /api/birthday?date=YYYY-MM-DD
            </code>
          </div>

          {/* Try It Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 mb-2">Enter a birthdate</label>
              <div className="flex gap-4">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="flex-1 px-4 py-2 bg-dark-400 border border-dark-100 rounded-lg focus:outline-none focus:border-primary-500"
                />
                <button
                  onClick={fetchBirthday}
                  disabled={loading}
                  className="btn-primary"
                >
                  {loading ? (
                    <i className="fas fa-spinner animate-spin" />
                  ) : (
                    'Try It'
                  )}
                </button>
              </div>
            </div>

            {/* Example Dates */}
            <div className="flex flex-wrap gap-2">
              <span className="text-gray-500 text-sm">Try:</span>
              <button
                onClick={() => setExampleDate('1990-05-15')}
                className="text-xs bg-dark-400 px-2 py-1 rounded hover:bg-dark-300"
              >
                1990-05-15
              </button>
              <button
                onClick={() => setExampleDate('2000-01-01')}
                className="text-xs bg-dark-400 px-2 py-1 rounded hover:bg-dark-300"
              >
                2000-01-01
              </button>
              <button
                onClick={() => setExampleDate('1985-12-25')}
                className="text-xs bg-dark-400 px-2 py-1 rounded hover:bg-dark-300"
              >
                1985-12-25
              </button>
              <button
                onClick={() => setExampleDate('1996-02-29')}
                className="text-xs bg-dark-400 px-2 py-1 rounded hover:bg-dark-300"
              >
                1996-02-29 (Leap Day)
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-4 bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400">
              <i className="fas fa-exclamation-circle mr-2" />
              {error}
            </div>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Main Result Card */}
            <div className="card p-6">
              <h2 className="text-xl font-semibold mb-4">
                <i className="fas fa-calendar-check text-primary-400 mr-2" />
                {result.date.formatted}
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-dark-400/50 rounded-lg p-4 text-center">
                  <p className="text-gray-400 text-sm mb-1">Day of Week</p>
                  <p className="text-2xl font-bold text-primary-400">{result.date.dayOfWeek}</p>
                </div>
                <div className="bg-dark-400/50 rounded-lg p-4 text-center">
                  <p className="text-gray-400 text-sm mb-1">Age</p>
                  <p className="text-2xl font-bold text-green-400">{result.age.years}</p>
                  <p className="text-xs text-gray-500">{result.age.generation}</p>
                </div>
                <div className="bg-dark-400/50 rounded-lg p-4 text-center">
                  <p className="text-gray-400 text-sm mb-1">Next Birthday</p>
                  <p className="text-2xl font-bold text-yellow-400">
                    {result.age.isBirthdayToday ? '🎉 Today!' : `${result.age.nextBirthdayIn} days`}
                  </p>
                </div>
                <div className="bg-dark-400/50 rounded-lg p-4 text-center">
                  <p className="text-gray-400 text-sm mb-1">Days Alive</p>
                  <p className="text-2xl font-bold text-blue-400">{formatNumber(result.numbers.daysAlive)}</p>
                </div>
              </div>

              {/* Milestones */}
              {result.milestones.length > 0 && (
                <div className="bg-gradient-to-r from-primary-500/20 to-purple-500/20 rounded-lg p-4 mb-6">
                  <h3 className="text-sm font-semibold text-gray-400 mb-2">Fun Facts</h3>
                  <ul className="space-y-1">
                    {result.milestones.map((milestone, i) => (
                      <li key={i} className="text-sm">
                        <i className="fas fa-star text-yellow-400 mr-2" />
                        {milestone}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Number Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-gray-500 text-xs">Weeks Alive</p>
                  <p className="text-lg font-semibold">{formatNumber(result.numbers.weeksAlive)}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-500 text-xs">Months Alive</p>
                  <p className="text-lg font-semibold">{formatNumber(result.numbers.monthsAlive)}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-500 text-xs">Hours Alive</p>
                  <p className="text-lg font-semibold">{formatNumber(result.numbers.hoursAlive)}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-500 text-xs">Minutes Alive</p>
                  <p className="text-lg font-semibold">{formatNumber(result.numbers.minutesAlive)}</p>
                </div>
              </div>
            </div>

            {/* Zodiac & Birthstone */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Western Zodiac */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold mb-4">
                  <span className="text-2xl mr-2">{result.zodiac.western.symbol}</span>
                  Western Zodiac
                </h3>
                <div className="space-y-2">
                  <p><span className="text-gray-400">Sign:</span> {result.zodiac.western.sign}</p>
                  <p><span className="text-gray-400">Element:</span> {result.zodiac.western.element}</p>
                </div>
              </div>

              {/* Chinese Zodiac */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold mb-4">
                  <i className="fas fa-yin-yang text-red-400 mr-2" />
                  Chinese Zodiac
                </h3>
                <div className="space-y-2">
                  <p><span className="text-gray-400">Animal:</span> {result.zodiac.chinese.animal}</p>
                  <p><span className="text-gray-400">Element:</span> {result.zodiac.chinese.element}</p>
                  <p className="text-sm text-gray-500">{result.zodiac.chinese.traits}</p>
                </div>
              </div>

              {/* Birthstone */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold mb-4">
                  <i className="fas fa-gem text-purple-400 mr-2" />
                  Birthstone
                </h3>
                <div className="space-y-2">
                  <p><span className="text-gray-400">Stone:</span> {result.birthstone.name}</p>
                  <p><span className="text-gray-400">Color:</span> {result.birthstone.color}</p>
                  <p className="text-sm text-gray-500">{result.birthstone.meaning}</p>
                </div>
              </div>
            </div>

            {/* Famous Birthdays */}
            {result.famousBirthdays.length > 0 && (
              <div className="card p-6">
                <h3 className="text-lg font-semibold mb-4">
                  <i className="fas fa-users text-blue-400 mr-2" />
                  Famous People Born on This Day
                </h3>
                <div className="space-y-4">
                  {result.famousBirthdays.map((person, i) => (
                    <div key={i} className="bg-dark-400/30 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{person.name}</span>
                        {person.year && (
                          <span className="text-xs text-gray-500">{person.year}</span>
                        )}
                      </div>
                      {person.description && (
                        <p className="text-sm text-gray-400">{person.description}...</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Leap Year Info */}
            {(result.leapYear.bornInLeapYear || result.leapYear.bornOnLeapDay) && (
              <div className="card p-6">
                <h3 className="text-lg font-semibold mb-4">
                  <i className="fas fa-calendar-alt text-green-400 mr-2" />
                  Leap Year Facts
                </h3>
                <ul className="space-y-2">
                  {result.leapYear.bornInLeapYear && (
                    <li className="flex items-center">
                      <i className="fas fa-check text-green-400 mr-2" />
                      Born in a leap year
                    </li>
                  )}
                  {result.leapYear.bornOnLeapDay && (
                    <li className="flex items-center">
                      <i className="fas fa-star text-yellow-400 mr-2" />
                      Born on February 29th - a rare leap day baby!
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Raw JSON */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  <i className="fas fa-code text-gray-400 mr-2" />
                  API Response (JSON)
                </h3>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(result, null, 2))
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }}
                  className="btn-secondary text-xs"
                >
                  {copied ? '✓ Copied!' : 'Copy JSON'}
                </button>
              </div>
              <pre className="bg-dark-400 rounded-lg p-4 overflow-x-auto text-xs text-gray-300">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* API Documentation */}
        <div className="card p-6 mt-8">
          <h2 className="text-xl font-semibold mb-6">
            <i className="fas fa-book text-blue-400 mr-2" />
            API Documentation
          </h2>

          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-primary-400 mb-2">Request</h3>
              <code className="block bg-dark-400 rounded p-3 text-sm">
                GET /api/birthday?date=YYYY-MM-DD
              </code>
            </div>

            <div>
              <h3 className="font-semibold text-primary-400 mb-2">Parameters</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-dark-100">
                    <th className="pb-2">Name</th>
                    <th className="pb-2">Type</th>
                    <th className="pb-2">Required</th>
                    <th className="pb-2">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-2"><code>date</code></td>
                    <td className="py-2">string</td>
                    <td className="py-2">Yes</td>
                    <td className="py-2">Birth date in YYYY-MM-DD format</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <h3 className="font-semibold text-primary-400 mb-2">Response Fields</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li><code className="text-green-400">date</code> - Date info including day of week</li>
                <li><code className="text-green-400">age</code> - Age, next birthday countdown, generation</li>
                <li><code className="text-green-400">numbers</code> - Days/weeks/hours/minutes alive</li>
                <li><code className="text-green-400">zodiac.western</code> - Western zodiac sign, symbol, element</li>
                <li><code className="text-green-400">zodiac.chinese</code> - Chinese zodiac animal, element, traits</li>
                <li><code className="text-green-400">birthstone</code> - Monthly birthstone name, color, meaning</li>
                <li><code className="text-green-400">leapYear</code> - Leap year/leap day status</li>
                <li><code className="text-green-400">famousBirthdays</code> - Famous people born on same day</li>
                <li><code className="text-green-400">milestones</code> - Fun milestone facts</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-primary-400 mb-2">Example Usage</h3>
              <pre className="bg-dark-400 rounded p-3 text-sm overflow-x-auto">
{`// JavaScript/TypeScript
const response = await fetch('/api/birthday?date=1990-05-15');
const data = await response.json();
console.log(data.date.dayOfWeek); // "Tuesday"
console.log(data.age.years); // 34
console.log(data.zodiac.western.sign); // "Taurus"`}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold text-primary-400 mb-2">Rate Limits</h3>
              <p className="text-sm text-gray-400">
                This is a free public API with no authentication required.
                Please be respectful with usage - excessive requests may be rate limited.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
