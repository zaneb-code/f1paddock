/**
 * Sending the six-digit verification code.
 *
 * Three modes, chosen by MAIL_MODE in .env:
 *
 *   console  (default) - nothing is sent, the code is printed in the server
 *                        terminal. Zero setup, best for developing and demoing.
 *   ethereal           - Nodemailer's fake SMTP service. A real email is
 *                        composed and you get a preview URL in the terminal.
 *                        No account needed, nothing reaches a real inbox.
 *   smtp               - A real SMTP server (Gmail, Mailtrap, Resend...).
 *                        Needs SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS.
 *
 * Having all three behind one function means the route handler just calls
 * sendVerificationEmail() and never cares which is active.
 */

import nodemailer from 'nodemailer'

const MODE = (process.env.MAIL_MODE || 'console').toLowerCase()

let transporterPromise = null

async function getTransporter() {
  if (transporterPromise) return transporterPromise

  if (MODE === 'ethereal') {
    transporterPromise = nodemailer.createTestAccount().then((account) => {
      console.log('[mailer] Ethereal test account created:', account.user)
      return nodemailer.createTransport({
        host: account.smtp.host,
        port: account.smtp.port,
        secure: account.smtp.secure,
        auth: { user: account.user, pass: account.pass },
      })
    })
    return transporterPromise
  }

  if (MODE === 'smtp') {
    transporterPromise = Promise.resolve(
      nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      })
    )
    return transporterPromise
  }

  transporterPromise = Promise.resolve(null) // console mode
  return transporterPromise
}

function buildEmail(to, code) {
  return {
    from: process.env.MAIL_FROM || '"F1Paddock" <no-reply@f1paddock.local>',
    to,
    subject: `${code} is your F1Paddock verification code`,
    text:
      `Your F1Paddock verification code is ${code}\n\n` +
      `It expires in 10 minutes. If you did not create an account, ignore this email.`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#0b0b0f;color:#f4f4f5;border-radius:16px">
        <p style="font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#a1a1aa;margin:0 0 8px">F1Paddock</p>
        <h1 style="font-size:22px;margin:0 0 16px">Confirm your email</h1>
        <p style="color:#a1a1aa;margin:0 0 24px">Enter this code to finish creating your account.</p>
        <p style="font-size:38px;font-weight:700;letter-spacing:.3em;margin:0 0 24px;color:#ff2d20">${code}</p>
        <p style="color:#71717a;font-size:13px;margin:0">This code expires in 10 minutes. If you did not sign up, you can ignore this email.</p>
      </div>`,
  }
}

/**
 * Sends the code. Always resolves — a mail failure must not break signup,
 * because the code is still valid and the user can ask for it again.
 */
export async function sendVerificationEmail(to, code) {
  // Always log in development so you can test without any mail setup at all.
  if (process.env.NODE_ENV !== 'production') {
    console.log(`\n  [verification] ${to} -> code ${code}\n`)
  }

  if (MODE === 'console') {
    return { delivered: false, mode: 'console' }
  }

  try {
    const transporter = await getTransporter()
    const info = await transporter.sendMail(buildEmail(to, code))

    const previewUrl = nodemailer.getTestMessageUrl?.(info)
    if (previewUrl) console.log('  [mailer] preview:', previewUrl)

    return { delivered: true, mode: MODE, previewUrl: previewUrl || null }
  } catch (error) {
    console.error('  [mailer] failed to send:', error.message)
    return { delivered: false, mode: MODE, error: error.message }
  }
}

export const mailMode = MODE
