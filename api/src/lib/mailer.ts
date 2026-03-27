import nodemailer from 'nodemailer'
import { getSettings } from './settings'

const SMTP_KEYS = ['smtp.enabled', 'smtp.host', 'smtp.port', 'smtp.user', 'smtp.pass', 'smtp.from']

export async function sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
  const s = await getSettings(SMTP_KEYS)

  const enabled = s['smtp.enabled'] === 'true'
  const host = s['smtp.host']

  if (!enabled || !host) {
    console.log(`[SMTP disabled] Password reset link for ${to}: ${resetLink}`)
    return
  }

  const transporter = nodemailer.createTransport({
    host,
    port: parseInt(s['smtp.port'] ?? '587', 10),
    secure: parseInt(s['smtp.port'] ?? '587', 10) === 465,
    auth: s['smtp.user'] ? { user: s['smtp.user'], pass: s['smtp.pass'] ?? '' } : undefined,
  })

  const from = s['smtp.from'] || `noreply@${host}`

  await transporter.sendMail({
    from,
    to,
    subject: 'Reset your password',
    text: `You requested a password reset. Click the link below to set a new password:\n\n${resetLink}\n\nThis link expires in 1 hour. If you did not request this, ignore this email.`,
    html: `<p>You requested a password reset. Click the link below to set a new password:</p>
<p><a href="${resetLink}">${resetLink}</a></p>
<p>This link expires in 1 hour. If you did not request this, ignore this email.</p>`,
  })
}
