import { NextResponse } from 'next/server'

const ADMIN_EMAIL = 'admin@psiegel.org'
const HELP_EMAIL = 'help@psiegel.org'

export async function POST(request: Request) {
  try {
    const { name, email, reason, message } = await request.json()

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

    // Determine recipient based on reason
    const recipient = reason === 'site-issue' ? HELP_EMAIL : ADMIN_EMAIL

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
          from: 'Psiegel.org <admin@psiegel.org>',
          to: recipient,
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
      console.log('To:', recipient)
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
