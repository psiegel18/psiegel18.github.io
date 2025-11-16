/**
 * Test script to verify the day of week calculation logic
 * Run with: node test-logic.js
 */

// Copy the core functions from the worker
function getCenturyCode(year) {
  const centuries = [
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
    { range: [2200, 2299], code: 5 },
    { range: [2300, 2399], code: 3 },
    { range: [2400, 2499], code: 2 },
    { range: [2500, 2599], code: 0 },
    { range: [2600, 2699], code: 5 },
    { range: [2700, 2799], code: 3 },
    { range: [2800, 2899], code: 2 },
    { range: [2900, 2999], code: 0 },
    { range: [3000, 3099], code: 5 },
    { range: [3100, 3199], code: 3 },
    { range: [3200, 3299], code: 2 },
    { range: [3300, 3399], code: 0 },
    { range: [3400, 3499], code: 5 },
    { range: [3500, 3599], code: 3 },
    { range: [3600, 3699], code: 2 },
    { range: [3700, 3799], code: 0 },
    { range: [3800, 3899], code: 5 },
    { range: [3900, 3999], code: 3 },
    { range: [4000, 4099], code: 2 },
    { range: [4100, 4199], code: 0 }
  ]

  const century = centuries.find(c => year >= c.range[0] && year <= c.range[1])
  return century ? century.code : null
}

function getMonthDoomsday(monthName, year) {
  // Proper leap year calculation: divisible by 4, except centuries unless divisible by 400
  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)

  const doomsdays = {
    'January': isLeapYear ? 4 : 3,
    'February': isLeapYear ? 29 : 28,
    'March': 14,
    'April': 4,
    'May': 9,
    'June': 6,
    'July': 11,
    'August': 8,
    'September': 5,
    'October': 10,
    'November': 7,
    'December': 12
  }

  return doomsdays[monthName]
}

function calculateDayOfWeek(year, month, day) {
  const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December']
  const monthName = monthNames[month]

  const centuryCode = getCenturyCode(year)
  const xxYear = year % 100
  const xxYearQuotient = Math.floor(xxYear / 12)
  const xxYearRemainder = xxYear % 12
  const xxYearRemDiv4Quotient = Math.floor(xxYearRemainder / 4)
  const monthDoomsday = getMonthDoomsday(monthName, year)
  const userDoomsday = day - monthDoomsday
  const totalResult = centuryCode + xxYearQuotient + xxYearRemainder + xxYearRemDiv4Quotient + userDoomsday

  let weekDate = totalResult % 7
  const adjustedWeekDate = weekDate < 0 ? weekDate + 7 : weekDate

  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const dayOfWeek = weekdays[adjustedWeekDate]

  return dayOfWeek
}

// Test cases with known dates
const testCases = [
  { year: 2000, month: 1, day: 1, expected: 'Saturday' },   // Y2K
  { year: 2025, month: 1, day: 15, expected: 'Wednesday' }, // Test date
  { year: 1969, month: 7, day: 20, expected: 'Sunday' },    // Moon landing
  { year: 2024, month: 12, day: 25, expected: 'Wednesday' }, // Christmas 2024
  { year: 1776, month: 7, day: 4, expected: 'Thursday' },   // Declaration of Independence
  { year: 2000, month: 2, day: 29, expected: 'Tuesday' },   // Leap year test
  { year: 1900, month: 1, day: 1, expected: 'Monday' },     // Not a leap year
  { year: 2020, month: 2, day: 29, expected: 'Saturday' },  // Leap year test 2
]

console.log('Testing Day of Week Calculation\n')
console.log('='.repeat(60))

let passed = 0
let failed = 0

testCases.forEach(test => {
  const result = calculateDayOfWeek(test.year, test.month, test.day)
  const dateStr = `${test.year}-${String(test.month).padStart(2, '0')}-${String(test.day).padStart(2, '0')}`

  if (result === test.expected) {
    console.log(`✓ PASS: ${dateStr} → ${result}`)
    passed++
  } else {
    console.log(`✗ FAIL: ${dateStr} → Got ${result}, Expected ${test.expected}`)
    failed++
  }
})

console.log('='.repeat(60))
console.log(`\nResults: ${passed} passed, ${failed} failed out of ${testCases.length} tests`)

if (failed === 0) {
  console.log('\n🎉 All tests passed! The algorithm is working correctly.')
} else {
  console.log('\n⚠️  Some tests failed. Check the algorithm implementation.')
  process.exit(1)
}
