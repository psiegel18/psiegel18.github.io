import { NextResponse } from 'next/server'

// Parse comma-separated email list from environment variable
function parseEmailList(envVar: string | undefined, fallback: string): string[] {
  const emails = envVar || fallback
  return emails.split(',').map(e => e.trim()).filter(e => e.length > 0)
}

// Spam detection utilities
function isGibberish(text: string): boolean {
  if (!text || text.length < 5) return false

  // Check for excessive consonant clusters (common in random strings)
  const consonantCluster = /[bcdfghjklmnpqrstvwxz]{5,}/i
  if (consonantCluster.test(text)) return true

  // Check for excessive uppercase in mixed case (like "eHGeHVrWkJQbfcpjXcppNMA")
  const words = text.split(/\s+/)
  for (const word of words) {
    if (word.length > 8) {
      const upperCount = (word.match(/[A-Z]/g) || []).length
      const lowerCount = (word.match(/[a-z]/g) || []).length
      // If word has mixed case with high uppercase ratio, likely gibberish
      if (upperCount > 2 && lowerCount > 2 && upperCount / word.length > 0.3) {
        return true
      }
    }
  }

  // Check for very long words without vowels or with very few vowels
  for (const word of words) {
    if (word.length > 10) {
      const vowelCount = (word.match(/[aeiou]/gi) || []).length
      const vowelRatio = vowelCount / word.length
      if (vowelRatio < 0.15) return true
    }
  }

  // Check for random character patterns (no real word structure)
  // Real names/messages typically have vowel-consonant patterns
  const noSpaceText = text.replace(/\s+/g, '')
  if (noSpaceText.length > 15) {
    // Count transitions between vowels and consonants
    let transitions = 0
    const vowels = 'aeiouAEIOU'
    for (let i = 1; i < noSpaceText.length; i++) {
      const prevIsVowel = vowels.includes(noSpaceText[i - 1])
      const currIsVowel = vowels.includes(noSpaceText[i])
      if (prevIsVowel !== currIsVowel) transitions++
    }
    // Very low transition ratio suggests random text
    const transitionRatio = transitions / (noSpaceText.length - 1)
    if (transitionRatio < 0.25) return true
  }

  return false
}

function hasSpamPatterns(text: string): boolean {
  const lowerText = text.toLowerCase()

  // Common spam patterns
  const spamPatterns = [
    /\b(viagra|cialis|casino|lottery|winner|congratulations you)/i,
    /\b(click here|buy now|free money|earn \$|make money fast)/i,
    /\b(nigerian prince|bank transfer|wire transfer|western union)/i,
    /\b(cryptocurrency|bitcoin|crypto investment)/i,
    /\b(hot singles|dating site|meet singles)/i,
  ]

  return spamPatterns.some(pattern => pattern.test(lowerText))
}

function isSuspiciousEmail(email: string): boolean {
  // Check for emails with excessive dots or numbers in local part
  const localPart = email.split('@')[0]

  // Count dots and numbers
  const dotCount = (localPart.match(/\./g) || []).length
  const numberCount = (localPart.match(/\d/g) || []).length

  // Emails like "e.leme.tak.iv.e.9.0" are suspicious
  if (dotCount >= 4) return true
  if (numberCount >= 3 && dotCount >= 2) return true

  // Check for random-looking local part
  if (isGibberish(localPart.replace(/\./g, ''))) return true

  return false
}

export async function POST(request: Request) {
  try {
    const { name, email, reason, message, website, formLoadTime } = await request.json()

    // Spam check 1: Honeypot field - if filled, it's a bot
    if (website) {
      console.log('Spam detected: honeypot field filled')
      // Return success to not alert the bot, but don't send email
      return NextResponse.json({ success: true })
    }

    // Spam check 2: Form submission timing - bots submit instantly
    if (formLoadTime) {
      const submissionTime = Date.now() - formLoadTime
      // If form was submitted in less than 3 seconds, likely a bot
      if (submissionTime < 3000) {
        console.log('Spam detected: form submitted too quickly', submissionTime, 'ms')
        return NextResponse.json({ success: true })
      }
    }

    // Validate required fields
    if (!name || !email || !reason || !message) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // Validate message length
    if (message.length > 5000) {
      return NextResponse.json(
        { error: 'Message is too long' },
        { status: 400 }
      )
    }

    // Spam check 3: Gibberish detection in name
    if (isGibberish(name)) {
      console.log('Spam detected: gibberish name', name)
      return NextResponse.json({ success: true })
    }

    // Spam check 4: Gibberish detection in message
    if (isGibberish(message)) {
      console.log('Spam detected: gibberish message', message)
      return NextResponse.json({ success: true })
    }

    // Spam check 5: Suspicious email patterns
    if (isSuspiciousEmail(email)) {
      console.log('Spam detected: suspicious email', email)
      return NextResponse.json({ success: true })
    }

    // Spam check 6: Known spam patterns in message
    if (hasSpamPatterns(message)) {
      console.log('Spam detected: spam patterns in message')
      return NextResponse.json({ success: true })
    }

    // Get email configuration from environment variables
    const senderEmail = process.env.SEND_EMAIL || 'admin@psiegel.org'
    const generalRecipients = parseEmailList(process.env.EMAIL, 'admin@psiegel.org')
    const helpdeskRecipients = parseEmailList(process.env.HELPDESK_EMAIL, 'help@psiegel.org')

    // Determine recipients based on reason
    const recipients = reason === 'site-issue' ? helpdeskRecipients : generalRecipients

    // Prepare email content
    const reasonLabels: Record<string, string> = {
      'general': 'General Inquiry',
      'site-issue': 'Site Issue / Bug Report',
      'feedback': 'Feedback',
      'business': 'Business Inquiry',
    }

    const subject = `[Psiegel.org] ${reasonLabels[reason] || 'Contact Form'}: ${name}`
    const body = `
New contact form submission from Psiegel.org

Name: ${name}
Email: ${email}
Reason: ${reasonLabels[reason] || reason}

Message:
${message}

---
This message was sent from the contact form at psiegel.org
    `.trim()

    // If Resend API key is available, send email
    const resendApiKey = process.env.RESEND_API_KEY
    if (resendApiKey) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `Psiegel.org <${senderEmail}>`,
          to: recipients,
          reply_to: email,
          subject,
          text: body,
        }),
      })

      if (!response.ok) {
        console.error('Resend API error:', await response.text())
        return NextResponse.json(
          { error: 'Failed to send email' },
          { status: 500 }
        )
      }
    } else {
      // Log the message if no email service is configured
      console.log('Contact form submission (no email service configured):')
      console.log('To:', recipients.join(', '))
      console.log('Subject:', subject)
      console.log('Body:', body)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
