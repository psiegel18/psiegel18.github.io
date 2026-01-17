'use client'

import { useState } from 'react'

type ContactReason = 'general' | 'site-issue' | 'feedback' | 'business'

const reasonLabels: Record<ContactReason, string> = {
  'general': 'General Inquiry',
  'site-issue': 'Site Issue / Bug Report',
  'feedback': 'Feedback',
  'business': 'Business Inquiry',
}

export default function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [reason, setReason] = useState<ContactReason>('general')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  // Honeypot field - bots will fill this, humans won't see it
  const [website, setWebsite] = useState('')
  // Track when form was loaded to detect instant bot submissions
  const [formLoadTime] = useState(() => Date.now())

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, reason, message, website, formLoadTime }),
      })

      if (response.ok) {
        setSubmitted(true)
        setName('')
        setEmail('')
        setReason('general')
        setMessage('')
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to send message')
      }
    } catch {
      setError('Failed to send message. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen py-12 px-4 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="fas fa-check text-4xl text-green-500" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Message Sent!</h1>
          <p className="text-gray-400 mb-8">
            Thank you for reaching out. We'll get back to you as soon as possible.
          </p>
          <button
            onClick={() => setSubmitted(false)}
            className="btn-primary"
          >
            <i className="fas fa-paper-plane mr-2" />
            Send Another Message
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            <i className="fas fa-envelope text-primary-400 mr-3" aria-hidden="true" />
            Contact Us
          </h1>
          <p className="text-gray-400 text-lg">
            Have a question, feedback, or found an issue? We'd love to hear from you.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card p-8">
          <div className="space-y-6">
            {/* Honeypot field - hidden from humans, bots will fill it */}
            <div className="absolute -left-[9999px]" aria-hidden="true">
              <label htmlFor="website">Website</label>
              <input
                type="text"
                id="website"
                name="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-base font-medium text-gray-300 mb-2">
                Your Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-dark-400 border border-dark-100/50 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                placeholder="John Doe"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-base font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-dark-400 border border-dark-100/50 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                placeholder="john@example.com"
              />
            </div>

            {/* Reason */}
            <div>
              <label htmlFor="reason" className="block text-base font-medium text-gray-300 mb-2">
                Reason for Contact
              </label>
              <select
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value as ContactReason)}
                className="w-full bg-dark-400 border border-dark-100/50 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50"
              >
                {Object.entries(reasonLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {reason === 'site-issue' && (
                <p className="mt-2 text-sm text-yellow-400">
                  <i className="fas fa-info-circle mr-1" />
                  Site issues will be sent to our technical support team.
                </p>
              )}
            </div>

            {/* Message */}
            <div>
              <label htmlFor="message" className="block text-base font-medium text-gray-300 mb-2">
                Message
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={6}
                maxLength={5000}
                className="w-full bg-dark-400 border border-dark-100/50 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 resize-none"
                placeholder="How can we help you?"
              />
              <p className="mt-1 text-sm text-gray-500 text-right">
                {message.length}/5000
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
                <p className="text-red-400 text-sm">
                  <i className="fas fa-exclamation-circle mr-2" />
                  {error}
                </p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane mr-2" />
                  Send Message
                </>
              )}
            </button>
          </div>
        </form>

        {/* Contact info */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card p-6 text-center">
            <div className="w-12 h-12 bg-primary-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-envelope text-xl text-primary-400" />
            </div>
            <h3 className="font-semibold mb-2">General Inquiries</h3>
            <a
              href="mailto:admin@psiegel.org"
              className="text-primary-400 hover:text-primary-300 transition-colors"
            >
              admin@psiegel.org
            </a>
          </div>
          <div className="card p-6 text-center">
            <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-bug text-xl text-yellow-400" />
            </div>
            <h3 className="font-semibold mb-2">Technical Support</h3>
            <a
              href="mailto:help@psiegel.org"
              className="text-yellow-400 hover:text-yellow-300 transition-colors"
            >
              help@psiegel.org
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
