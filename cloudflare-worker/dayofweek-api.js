/**
 * Day of Week API - Cloudflare Worker
 * Calculates the day of the week for any date using the Doomsday algorithm
 *
 * API Endpoints:
 * - GET /api/dayofweek/YYYY-MM-DD
 * - GET /api/dayofweek?date=YYYY-MM-DD
 * - GET /api/dayofweek?year=YYYY&month=MM&day=DD
 *
 * Example: https://www.psiegel.org/api/dayofweek/2025-01-15
 */

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // Add CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  }

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(request.url)
    const path = url.pathname

    let year, month, day

    // Parse date from URL path (e.g., /api/dayofweek/2025-01-15)
    if (path.match(/\/api\/dayofweek\/(\d{4})-(\d{1,2})-(\d{1,2})/)) {
      const matches = path.match(/\/api\/dayofweek\/(\d{4})-(\d{1,2})-(\d{1,2})/)
      year = parseInt(matches[1])
      month = parseInt(matches[2])
      day = parseInt(matches[3])
    }
    // Parse from query parameters
    else if (url.searchParams.has('date')) {
      const dateStr = url.searchParams.get('date')
      const parts = dateStr.split('-')
      if (parts.length === 3) {
        year = parseInt(parts[0])
        month = parseInt(parts[1])
        day = parseInt(parts[2])
      }
    }
    else if (url.searchParams.has('year') && url.searchParams.has('month') && url.searchParams.has('day')) {
      year = parseInt(url.searchParams.get('year'))
      month = parseInt(url.searchParams.get('month'))
      day = parseInt(url.searchParams.get('day'))
    }
    else {
      // Show API documentation
      return new Response(JSON.stringify({
        name: 'Day of Week API',
        version: '1.0.0',
        description: 'Calculate the day of the week for any date using the Doomsday algorithm',
        endpoints: [
          {
            method: 'GET',
            path: '/api/dayofweek/YYYY-MM-DD',
            example: '/api/dayofweek/2025-01-15',
            description: 'Get day of week for a specific date'
          },
          {
            method: 'GET',
            path: '/api/dayofweek?date=YYYY-MM-DD',
            example: '/api/dayofweek?date=2025-01-15',
            description: 'Get day of week using query parameter'
          },
          {
            method: 'GET',
            path: '/api/dayofweek?year=YYYY&month=MM&day=DD',
            example: '/api/dayofweek?year=2025&month=1&day=15',
            description: 'Get day of week using separate parameters'
          }
        ],
        response_format: {
          success: {
            dayOfWeek: 'Wednesday',
            date: '2025-01-15',
            year: 2025,
            month: 1,
            day: 15,
            calculation: {
              centuryCode: 2,
              xxYearQuotient: 2,
              xxYearRemainder: 1,
              xxYearRemDiv4Quotient: 0,
              userDoomsday: 1,
              totalResult: 6,
              weekDateValue: 6
            }
          },
          error: {
            error: 'Error message',
            details: 'Additional information'
          }
        }
      }, null, 2), {
        status: 200,
        headers: corsHeaders
      })
    }

    // Validate inputs
    const validation = validateDate(year, month, day)
    if (!validation.valid) {
      return new Response(JSON.stringify({
        error: validation.error,
        input: { year, month, day }
      }, null, 2), {
        status: 400,
        headers: corsHeaders
      })
    }

    // Calculate day of week
    const result = calculateDayOfWeek(year, month, day)

    return new Response(JSON.stringify(result, null, 2), {
      status: 200,
      headers: corsHeaders
    })

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error.message
    }, null, 2), {
      status: 500,
      headers: corsHeaders
    })
  }
}

function validateDate(year, month, day) {
  if (!year || !month || !day) {
    return { valid: false, error: 'Missing required parameters: year, month, and day' }
  }

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return { valid: false, error: 'Year, month, and day must be valid numbers' }
  }

  if (year < 1 || year > 4199) {
    return { valid: false, error: 'Year must be between 1 and 4199' }
  }

  if (month < 1 || month > 12) {
    return { valid: false, error: 'Month must be between 1 and 12' }
  }

  if (day < 1 || day > 31) {
    return { valid: false, error: 'Day must be between 1 and 31' }
  }

  // Month-specific validation
  const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December']
  const monthName = monthNames[month]

  if (day > 30 && ['April', 'June', 'September', 'November'].includes(monthName)) {
    return { valid: false, error: `${monthName} only has 30 days` }
  }

  if (month === 2) { // February
    const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)
    if (day > 29) {
      return { valid: false, error: 'February only has 29 days on a leap year' }
    }
    if (day > 28 && !isLeapYear) {
      return { valid: false, error: 'February only has 28 days on a non-leap year' }
    }
  }

  return { valid: true }
}

function calculateDayOfWeek(year, month, day) {
  // Convert month number to month name for algorithm
  const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December']
  const monthName = monthNames[month]

  // Step 1: Calculate century code
  const centuryCode = getCenturyCode(year)

  // Step 2: Calculate xxYear, quotient, and remainder
  const xxYear = year % 100
  const xxYearQuotient = Math.floor(xxYear / 12)
  const xxYearRemainder = xxYear % 12

  // Step 3: Calculate how many times 4 goes into remainder
  const xxYearRemDiv4Quotient = Math.floor(xxYearRemainder / 4)

  // Step 4: Calculate doomsday for the month
  const monthDoomsday = getMonthDoomsday(monthName, year)
  const userDoomsday = day - monthDoomsday

  // Step 5: Sum all values
  const totalResult = centuryCode + xxYearQuotient + xxYearRemainder + xxYearRemDiv4Quotient + userDoomsday

  // Step 6: Calculate final weekday
  let weekDate = totalResult % 7
  const adjustedWeekDate = weekDate < 0 ? weekDate + 7 : weekDate

  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const dayOfWeek = weekdays[adjustedWeekDate]

  // Format date as YYYY-MM-DD
  const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  return {
    dayOfWeek: dayOfWeek,
    date: formattedDate,
    year: year,
    month: month,
    day: day,
    monthName: monthName,
    calculation: {
      centuryCode: centuryCode,
      xxYearQuotient: xxYearQuotient,
      xxYearRemainder: xxYearRemainder,
      xxYearRemDiv4Quotient: xxYearRemDiv4Quotient,
      monthDoomsday: monthDoomsday,
      userDoomsday: userDoomsday,
      totalResult: totalResult,
      weekDateValue: adjustedWeekDate
    }
  }
}

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
