'use client'

import { useState } from 'react'
import Link from 'next/link'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const CENTURY_CODES = [
  { range: [1, 99], code: 2 },
  { range: [100, 199], code: 0 },
  { range: [200, 299], code: 5 },
  { range: [300, 399], code: 3 },
  { range: [400, 499], code: 2 },
  { range: [500, 599], code: 0 },
  { range: [600, 699], code: 5 },
  { range: [700, 799], code: 3 },
  { range: [800, 899], code: 2 },
  { range: [900, 999], code: 0 },
  { range: [1000, 1099], code: 5 },
  { range: [1100, 1199], code: 3 },
  { range: [1200, 1299], code: 2 },
  { range: [1300, 1399], code: 0 },
  { range: [1400, 1499], code: 5 },
  { range: [1500, 1599], code: 3 },
  { range: [1600, 1699], code: 2 },
  { range: [1700, 1799], code: 0 },
  { range: [1800, 1899], code: 5 },
  { range: [1900, 1999], code: 3 },
  { range: [2000, 2099], code: 2 },
  { range: [2100, 2199], code: 0 },
]

const DOOMSDAYS: Record<string, number | ((isLeap: boolean) => number)> = {
  January: (isLeap) => isLeap ? 4 : 3,
  February: (isLeap) => isLeap ? 29 : 28,
  March: 14,
  April: 4,
  May: 9,
  June: 6,
  July: 11,
  August: 8,
  September: 5,
  October: 10,
  November: 7,
  December: 12
}

type CalculationResult = {
  weekDay: string
  centuryCode: number
  xxYear: number
  xxYearQuotient: number
  xxYearRemainder: number
  xxYearRemDiv4Quotient: number
  monthDoomsday: number
  userDoomsday: number
  totalResult: number
  weekDate: number
  adjustedWeekDate: number
}

export default function BirthdayPage() {
  const [year, setYear] = useState('')
  const [month, setMonth] = useState('January')
  const [day, setDay] = useState('')
  const [result, setResult] = useState<CalculationResult | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const isLeapYear = (y: number) => y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)

  const calculate = () => {
    setError('')
    setResult(null)

    const yearNum = parseInt(year)
    const dayNum = parseInt(day)

    // Validation
    if (!yearNum || yearNum < 1 || yearNum > 4199) {
      setError('Please enter a valid year (1-4199)')
      return
    }
    if (!dayNum || dayNum < 1 || dayNum > 31) {
      setError('Please enter a valid day (1-31)')
      return
    }
    if (dayNum > 30 && ['April', 'June', 'September', 'November'].includes(month)) {
      setError('This month only has 30 days')
      return
    }
    if (month === 'February') {
      const isLeap = isLeapYear(yearNum)
      if (dayNum > 29 || (dayNum > 28 && !isLeap)) {
        setError(`February ${yearNum} only has ${isLeap ? 29 : 28} days`)
        return
      }
    }

    // Calculate century code
    const century = CENTURY_CODES.find(c => yearNum >= c.range[0] && yearNum <= c.range[1])
    if (!century) {
      setError('Year out of range')
      return
    }
    const centuryCode = century.code

    // Calculate year values
    const xxYear = yearNum % 100
    const xxYearRemainder = xxYear % 12
    const xxYearQuotient = Math.floor(xxYear / 12)
    const xxYearRemDiv4Quotient = Math.floor(xxYearRemainder / 4)

    // Calculate doomsday
    const isLeap = isLeapYear(yearNum)
    const doomsdayValue = DOOMSDAYS[month]
    const monthDoomsday = typeof doomsdayValue === 'function' ? doomsdayValue(isLeap) : doomsdayValue
    const userDoomsday = dayNum - monthDoomsday

    // Calculate total
    const totalResult = centuryCode + xxYearQuotient + xxYearRemainder + xxYearRemDiv4Quotient + userDoomsday
    const weekDate = totalResult % 7
    const adjustedWeekDate = weekDate < 0 ? weekDate + 7 : weekDate
    const weekDay = WEEKDAYS[adjustedWeekDate]

    setResult({
      weekDay,
      centuryCode,
      xxYear,
      xxYearQuotient,
      xxYearRemainder,
      xxYearRemDiv4Quotient,
      monthDoomsday,
      userDoomsday,
      totalResult,
      weekDate,
      adjustedWeekDate
    })
  }

  const setToday = () => {
    const today = new Date()
    setYear(today.getFullYear().toString())
    setMonth(MONTHS[today.getMonth()])
    setDay(today.getDate().toString())
  }

  const setRandom = () => {
    const randomYear = Math.floor(Math.random() * (2024 - 1950 + 1)) + 1950
    const randomMonth = MONTHS[Math.floor(Math.random() * 12)]
    const randomDay = Math.floor(Math.random() * 28) + 1
    setYear(randomYear.toString())
    setMonth(randomMonth)
    setDay(randomDay.toString())
  }

  const copyResult = () => {
    if (result) {
      navigator.clipboard.writeText(`You were born on a: ${result.weekDay}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="card p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl md:text-3xl font-bold">
              Birthdate to Weekday Calculator
            </h1>
            <Link
              href="/tools/birthday/api"
              className="btn-secondary text-sm"
            >
              <i className="fas fa-code mr-2" />
              Public API
            </Link>
          </div>

          {/* Input Form */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-gray-400 mb-2">Year</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="Enter year"
                min={1}
                max={9999}
                className="w-full px-4 py-2 bg-dark-400 border border-dark-100 rounded-lg focus:outline-none focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-gray-400 mb-2">Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full px-4 py-2 bg-dark-400 border border-dark-100 rounded-lg focus:outline-none focus:border-primary-500"
              >
                {MONTHS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-400 mb-2">Day</label>
              <input
                type="number"
                value={day}
                onChange={(e) => setDay(e.target.value)}
                placeholder="Enter day"
                min={1}
                max={31}
                className="w-full px-4 py-2 bg-dark-400 border border-dark-100 rounded-lg focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>

          {/* Quick buttons */}
          <div className="flex flex-wrap gap-2 justify-center mb-6">
            <button onClick={setToday} className="btn-secondary text-sm">
              Today
            </button>
            <button onClick={setRandom} className="btn-secondary text-sm">
              Random Date
            </button>
          </div>

          {/* Submit */}
          <div className="text-center mb-6">
            <button onClick={calculate} className="btn-primary">
              Calculate
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6 text-red-400 text-center">
              {error}
            </div>
          )}

          {/* Result */}
          {result && (
            <>
              <div className="border-t border-dark-100/50 pt-6">
                <h2 className="text-2xl text-center mb-4">
                  You were born on a:{' '}
                  <span className="text-gradient font-bold">{result.weekDay}</span>
                </h2>
                <div className="text-center">
                  <button
                    onClick={copyResult}
                    className="btn-secondary text-sm"
                  >
                    {copied ? '✓ Copied!' : '📋 Copy Result'}
                  </button>
                </div>
              </div>

              {/* Calculation Steps */}
              <div className="border-t border-dark-100/50 mt-6 pt-6">
                <h3 className="text-xl font-semibold mb-4">Calculation Steps (Doomsday Algorithm)</h3>

                <ol className="space-y-4 text-gray-300">
                  <li>
                    <strong>1. Century Code:</strong>{' '}
                    <span className="text-primary-400">[{result.centuryCode}]</span>
                    <p className="text-sm text-gray-500 mt-1">
                      Based on the year {year}, the century code is {result.centuryCode}
                    </p>
                  </li>

                  <li>
                    <strong>2. Year Quotient & Remainder:</strong>
                    <p className="text-sm text-gray-500 mt-1">
                      Last two digits: {result.xxYear}<br />
                      {result.xxYear} ÷ 12 = <span className="text-primary-400">{result.xxYearQuotient}</span> remainder{' '}
                      <span className="text-primary-400">{result.xxYearRemainder}</span>
                    </p>
                  </li>

                  <li>
                    <strong>3. Remainder ÷ 4:</strong>{' '}
                    <span className="text-primary-400">[{result.xxYearRemDiv4Quotient}]</span>
                    <p className="text-sm text-gray-500 mt-1">
                      {result.xxYearRemainder} ÷ 4 = {result.xxYearRemDiv4Quotient}
                    </p>
                  </li>

                  <li>
                    <strong>4. Doomsday Value:</strong>{' '}
                    <span className="text-primary-400">[{result.userDoomsday}]</span>
                    <p className="text-sm text-gray-500 mt-1">
                      {month}'s doomsday: {result.monthDoomsday}<br />
                      {day} - {result.monthDoomsday} = {result.userDoomsday}
                    </p>
                  </li>

                  <li>
                    <strong>5. Total:</strong>{' '}
                    <span className="text-primary-400">[{result.totalResult}]</span>
                    <p className="text-sm text-gray-500 mt-1">
                      {result.centuryCode} + {result.xxYearQuotient} + {result.xxYearRemainder} + {result.xxYearRemDiv4Quotient} + {result.userDoomsday} = {result.totalResult}
                    </p>
                  </li>

                  <li>
                    <strong>6. Final Result:</strong>
                    <p className="text-sm text-gray-500 mt-1">
                      {result.totalResult} mod 7 = {result.weekDate}
                      {result.weekDate < 0 && (
                        <><br />{result.weekDate} + 7 = {result.adjustedWeekDate}</>
                      )}
                      <br />
                      <span className="text-primary-400">{result.adjustedWeekDate} = {result.weekDay}</span>
                    </p>
                  </li>
                </ol>
              </div>

              {/* Reference Tables */}
              <div className="border-t border-dark-100/50 mt-6 pt-6">
                <h3 className="text-xl font-semibold mb-4">Reference Tables</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Weekday Table */}
                  <div>
                    <h4 className="font-semibold mb-2">Weekday Values</h4>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gradient-primary">
                          {WEEKDAYS.map(d => (
                            <th key={d} className="px-2 py-1">{d.slice(0, 3)}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          {WEEKDAYS.map((_, i) => (
                            <td key={i} className="px-2 py-1 text-center border border-dark-100/30">{i}</td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Doomsday Table */}
                  <div>
                    <h4 className="font-semibold mb-2">Month Doomsdays</h4>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gradient-primary">
                          <th className="px-2 py-1">Month</th>
                          <th className="px-2 py-1">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {MONTHS.map(m => {
                          const val = DOOMSDAYS[m]
                          const display = typeof val === 'function'
                            ? `${val(false)}/${val(true)} (non-leap/leap)`
                            : val
                          return (
                            <tr key={m}>
                              <td className="px-2 py-1 border border-dark-100/30">{m}</td>
                              <td className="px-2 py-1 text-center border border-dark-100/30">{display}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
