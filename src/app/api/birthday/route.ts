import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const ZODIAC_SIGNS = [
  { name: 'Capricorn', symbol: '♑', start: [12, 22], end: [1, 19], element: 'Earth' },
  { name: 'Aquarius', symbol: '♒', start: [1, 20], end: [2, 18], element: 'Air' },
  { name: 'Pisces', symbol: '♓', start: [2, 19], end: [3, 20], element: 'Water' },
  { name: 'Aries', symbol: '♈', start: [3, 21], end: [4, 19], element: 'Fire' },
  { name: 'Taurus', symbol: '♉', start: [4, 20], end: [5, 20], element: 'Earth' },
  { name: 'Gemini', symbol: '♊', start: [5, 21], end: [6, 20], element: 'Air' },
  { name: 'Cancer', symbol: '♋', start: [6, 21], end: [7, 22], element: 'Water' },
  { name: 'Leo', symbol: '♌', start: [7, 23], end: [8, 22], element: 'Fire' },
  { name: 'Virgo', symbol: '♍', start: [8, 23], end: [9, 22], element: 'Earth' },
  { name: 'Libra', symbol: '♎', start: [9, 23], end: [10, 22], element: 'Air' },
  { name: 'Scorpio', symbol: '♏', start: [10, 23], end: [11, 21], element: 'Water' },
  { name: 'Sagittarius', symbol: '♐', start: [11, 22], end: [12, 21], element: 'Fire' },
]

const BIRTHSTONES: Record<number, { name: string; color: string; meaning: string }> = {
  1: { name: 'Garnet', color: 'Deep Red', meaning: 'Protection and friendship' },
  2: { name: 'Amethyst', color: 'Purple', meaning: 'Wisdom and spirituality' },
  3: { name: 'Aquamarine', color: 'Light Blue', meaning: 'Courage and tranquility' },
  4: { name: 'Diamond', color: 'Clear/White', meaning: 'Eternal love and strength' },
  5: { name: 'Emerald', color: 'Green', meaning: 'Rebirth and love' },
  6: { name: 'Pearl', color: 'White/Cream', meaning: 'Purity and innocence' },
  7: { name: 'Ruby', color: 'Red', meaning: 'Passion and vitality' },
  8: { name: 'Peridot', color: 'Light Green', meaning: 'Strength and balance' },
  9: { name: 'Sapphire', color: 'Blue', meaning: 'Wisdom and loyalty' },
  10: { name: 'Opal', color: 'Multicolor', meaning: 'Hope and creativity' },
  11: { name: 'Topaz', color: 'Yellow/Orange', meaning: 'Joy and abundance' },
  12: { name: 'Turquoise', color: 'Blue-Green', meaning: 'Good fortune and success' },
}

const CHINESE_ZODIAC = [
  { animal: 'Rat', element: 'Water', traits: 'Quick-witted, resourceful, versatile' },
  { animal: 'Ox', element: 'Earth', traits: 'Diligent, dependable, strong' },
  { animal: 'Tiger', element: 'Wood', traits: 'Brave, confident, competitive' },
  { animal: 'Rabbit', element: 'Wood', traits: 'Quiet, elegant, kind' },
  { animal: 'Dragon', element: 'Earth', traits: 'Confident, intelligent, enthusiastic' },
  { animal: 'Snake', element: 'Fire', traits: 'Enigmatic, intelligent, wise' },
  { animal: 'Horse', element: 'Fire', traits: 'Animated, active, energetic' },
  { animal: 'Goat', element: 'Earth', traits: 'Calm, gentle, sympathetic' },
  { animal: 'Monkey', element: 'Metal', traits: 'Sharp, smart, curious' },
  { animal: 'Rooster', element: 'Metal', traits: 'Observant, hardworking, courageous' },
  { animal: 'Dog', element: 'Earth', traits: 'Loyal, honest, prudent' },
  { animal: 'Pig', element: 'Water', traits: 'Compassionate, generous, diligent' },
]

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate()
}

function getZodiacSign(month: number, day: number) {
  for (const sign of ZODIAC_SIGNS) {
    const [startMonth, startDay] = sign.start
    const [endMonth, endDay] = sign.end

    if (startMonth === 12 && endMonth === 1) {
      // Capricorn spans year boundary
      if ((month === 12 && day >= startDay) || (month === 1 && day <= endDay)) {
        return sign
      }
    } else if (
      (month === startMonth && day >= startDay) ||
      (month === endMonth && day <= endDay)
    ) {
      return sign
    }
  }
  return ZODIAC_SIGNS[0] // Default to Capricorn
}

function getChineseZodiac(year: number) {
  const index = (year - 4) % 12
  return CHINESE_ZODIAC[index >= 0 ? index : index + 12]
}

function calculateAge(birthDate: Date, today: Date): number {
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

function getDaysUntilNextBirthday(birthDate: Date, today: Date): number {
  const nextBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate())
  if (nextBirthday <= today) {
    nextBirthday.setFullYear(nextBirthday.getFullYear() + 1)
  }
  const diffTime = nextBirthday.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

async function getFamousBirthdays(month: number, day: number): Promise<Array<{
  name: string
  year: number | null
  description: string
}>> {
  try {
    // Use Wikipedia's API to get people born on this day
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December']
    const monthName = monthNames[month - 1]

    const response = await fetch(
      `https://en.wikipedia.org/api/rest_v1/feed/onthisday/births/${month}/${day}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'BirthdayCalculator/1.0 (https://psiegel.org)',
        },
      }
    )

    if (!response.ok) {
      return []
    }

    const data = await response.json()

    // Get notable births and return top 5
    const births = data.births || []
    return births
      .slice(0, 5)
      .map((birth: { text: string; year: number; pages?: Array<{ extract?: string }> }) => ({
        name: birth.text,
        year: birth.year,
        description: birth.pages?.[0]?.extract?.slice(0, 150) || '',
      }))
  } catch {
    return []
  }
}

function getNumberFunFacts(birthDate: Date, today: Date) {
  const diffTime = today.getTime() - birthDate.getTime()
  const daysAlive = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  const weeksAlive = Math.floor(daysAlive / 7)
  const monthsAlive = Math.floor(daysAlive / 30.44) // Average days per month
  const hoursAlive = Math.floor(diffTime / (1000 * 60 * 60))
  const minutesAlive = Math.floor(diffTime / (1000 * 60))

  return {
    daysAlive,
    weeksAlive,
    monthsAlive,
    hoursAlive,
    minutesAlive,
  }
}

function getGenerationName(year: number): string {
  if (year >= 2013) return 'Generation Alpha'
  if (year >= 1997) return 'Generation Z'
  if (year >= 1981) return 'Millennial'
  if (year >= 1965) return 'Generation X'
  if (year >= 1946) return 'Baby Boomer'
  if (year >= 1928) return 'Silent Generation'
  if (year >= 1901) return 'Greatest Generation'
  return 'Lost Generation'
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const dateParam = searchParams.get('date')

    if (!dateParam) {
      return NextResponse.json({
        error: 'Missing date parameter',
        usage: 'GET /api/birthday?date=YYYY-MM-DD',
        example: '/api/birthday?date=1990-05-15',
      }, { status: 400 })
    }

    // Parse the date
    const dateParts = dateParam.split('-')
    if (dateParts.length !== 3) {
      return NextResponse.json({
        error: 'Invalid date format. Use YYYY-MM-DD',
        example: '/api/birthday?date=1990-05-15',
      }, { status: 400 })
    }

    const year = parseInt(dateParts[0])
    const month = parseInt(dateParts[1])
    const day = parseInt(dateParts[2])

    // Validate
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return NextResponse.json({
        error: 'Invalid date values',
      }, { status: 400 })
    }

    if (month < 1 || month > 12) {
      return NextResponse.json({
        error: 'Month must be between 1 and 12',
      }, { status: 400 })
    }

    const daysInMonth = getDaysInMonth(month, year)
    if (day < 1 || day > daysInMonth) {
      return NextResponse.json({
        error: `Day must be between 1 and ${daysInMonth} for this month`,
      }, { status: 400 })
    }

    const birthDate = new Date(year, month - 1, day)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (birthDate > today) {
      return NextResponse.json({
        error: 'Birth date cannot be in the future',
      }, { status: 400 })
    }

    // Calculate day of week
    const dayOfWeek = WEEKDAYS[birthDate.getDay()]
    const dayOfWeekNumber = birthDate.getDay()

    // Calculate age
    const age = calculateAge(birthDate, today)

    // Days until next birthday
    const daysUntilNextBirthday = getDaysUntilNextBirthday(birthDate, today)
    const isBirthdayToday = daysUntilNextBirthday === 365 || daysUntilNextBirthday === 366

    // Zodiac
    const zodiac = getZodiacSign(month, day)

    // Chinese Zodiac
    const chineseZodiac = getChineseZodiac(year)

    // Birthstone
    const birthstone = BIRTHSTONES[month]

    // Leap year
    const bornInLeapYear = isLeapYear(year)
    const bornOnLeapDay = month === 2 && day === 29

    // Number fun facts
    const numbers = getNumberFunFacts(birthDate, today)

    // Generation
    const generation = getGenerationName(year)

    // Famous people (fetch in parallel)
    const famousPeople = await getFamousBirthdays(month, day)

    // Interesting milestone facts
    const milestones = []
    if (numbers.daysAlive >= 10000) {
      milestones.push(`You've lived over ${Math.floor(numbers.daysAlive / 10000) * 10000} days!`)
    }
    if (age === 18) milestones.push("You're now an adult!")
    if (age === 21) milestones.push("You've reached legal drinking age in the US!")
    if (age === 30) milestones.push("Welcome to your thirties!")
    if (age === 40) milestones.push("Welcome to your fabulous forties!")
    if (age === 50) milestones.push("Half a century of wisdom!")
    if (bornOnLeapDay) milestones.push("You're a rare leap day baby!")

    return NextResponse.json({
      date: {
        input: dateParam,
        formatted: birthDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        dayOfWeek,
        dayOfWeekNumber,
      },
      age: {
        years: age,
        nextBirthdayIn: daysUntilNextBirthday,
        isBirthdayToday,
        generation,
      },
      numbers,
      zodiac: {
        western: {
          sign: zodiac.name,
          symbol: zodiac.symbol,
          element: zodiac.element,
        },
        chinese: {
          animal: chineseZodiac.animal,
          element: chineseZodiac.element,
          traits: chineseZodiac.traits,
        },
      },
      birthstone: {
        name: birthstone.name,
        color: birthstone.color,
        meaning: birthstone.meaning,
      },
      leapYear: {
        bornInLeapYear,
        bornOnLeapDay,
      },
      famousBirthdays: famousPeople,
      milestones,
    })
  } catch (error) {
    console.error('Birthday API error:', error)
    return NextResponse.json({
      error: 'Failed to calculate birthday info',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
