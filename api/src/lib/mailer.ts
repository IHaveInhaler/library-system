import nodemailer from 'nodemailer'
import { getSettings } from './settings'

const SMTP_KEYS = ['smtp.enabled', 'smtp.host', 'smtp.port', 'smtp.user', 'smtp.pass', 'smtp.from']

export async function sendAccountCreatedEmail(to: string, setPasswordLink: string, requires2FA = false): Promise<void> {
  const s = await getSettings(SMTP_KEYS)

  const enabled = s['smtp.enabled'] === 'true'
  const host = s['smtp.host']

  if (!enabled || !host) {
    console.log(`[SMTP disabled] Set password link for ${to}: ${setPasswordLink}${requires2FA ? ' (2FA setup required)' : ''}`)
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
    subject: 'Your account has been created',
    text: `An account has been created for you on Library Portal. Click the link below to set your password:\n\n${setPasswordLink}\n\nThis link expires in 24 hours.${requires2FA ? '\n\nNote: Two-factor authentication is required for your role. You will be asked to set it up after logging in.' : ''}`,
    html: `<p>An account has been created for you on Library Portal.</p>
<p>Click the link below to set your password:</p>
<p><a href="${setPasswordLink}">${setPasswordLink}</a></p>
<p>This link expires in 24 hours.</p>${requires2FA ? '<p><strong>Note:</strong> Two-factor authentication is required for your role. You will be asked to set it up after logging in.</p>' : ''}`,
  })
}

export async function sendEmailVerificationCode(to: string, code: string): Promise<void> {
  const s = await getSettings(SMTP_KEYS)

  const enabled = s['smtp.enabled'] === 'true'
  const host = s['smtp.host']

  if (!enabled || !host) {
    console.log(`[SMTP disabled] Email verification code for ${to}: ${code}`)
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
    subject: 'Verify your email',
    text: `Your email verification code is: ${code}\n\nThis code expires in 15 minutes.`,
    html: `<p>Your email verification code is:</p>
<p style="font-size: 32px; font-weight: bold; letter-spacing: 0.3em; font-family: monospace;">${code}</p>
<p>This code expires in 15 minutes.</p>`,
  })
}

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
