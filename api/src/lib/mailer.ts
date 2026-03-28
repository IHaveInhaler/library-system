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

export async function sendShelfMigrationReport(
  to: string,
  fromPosition: string,
  toPosition: string,
  changes: { code: string; oldLabel: string; newLabel: string; library: string }[]
): Promise<void> {
  const s = await getSettings(SMTP_KEYS)
  const enabled = s['smtp.enabled'] === 'true'
  const host = s['smtp.host']

  const changeLines = changes.map((c) => `  ${c.library} / ${c.code}: ${c.oldLabel} → ${c.newLabel}`)
  const summary = `Shelf position migration: ${fromPosition} → ${toPosition}\n${changes.length} shelf(s) updated:\n\n${changeLines.join('\n')}\n\nPlease reprint the following labels:\n${changes.map((c) => `  NEW: ${c.newLabel}  (was: ${c.oldLabel})`).join('\n')}`

  if (!enabled || !host) {
    console.log(`[SMTP disabled] Shelf migration report:\n${summary}`)
    return
  }

  const transporter = nodemailer.createTransport({
    host,
    port: parseInt(s['smtp.port'] ?? '587', 10),
    secure: parseInt(s['smtp.port'] ?? '587', 10) === 465,
    auth: s['smtp.user'] ? { user: s['smtp.user'], pass: s['smtp.pass'] ?? '' } : undefined,
  })

  const from = s['smtp.from'] || `noreply@${host}`
  const htmlRows = changes.map((c) =>
    `<tr><td style="padding:4px 8px;border:1px solid #e5e7eb">${c.library}</td><td style="padding:4px 8px;border:1px solid #e5e7eb">${c.code}</td><td style="padding:4px 8px;border:1px solid #e5e7eb;text-decoration:line-through;color:#9ca3af">${c.oldLabel}</td><td style="padding:4px 8px;border:1px solid #e5e7eb;font-weight:bold">${c.newLabel}</td></tr>`
  ).join('')

  await transporter.sendMail({
    from,
    to,
    subject: `Shelf Migration: ${fromPosition} → ${toPosition} (${changes.length} shelves)`,
    text: summary,
    html: `<h2>Shelf Position Migration</h2>
<p><strong>${fromPosition}</strong> → <strong>${toPosition}</strong> — ${changes.length} shelf(s) updated.</p>
<table style="border-collapse:collapse;margin:16px 0">
<thead><tr style="background:#f3f4f6"><th style="padding:6px 8px;border:1px solid #e5e7eb;text-align:left">Library</th><th style="padding:6px 8px;border:1px solid #e5e7eb;text-align:left">Shelf</th><th style="padding:6px 8px;border:1px solid #e5e7eb;text-align:left">Old Label</th><th style="padding:6px 8px;border:1px solid #e5e7eb;text-align:left">New Label</th></tr></thead>
<tbody>${htmlRows}</tbody>
</table>
<p><strong>Action required:</strong> Please reprint labels for the shelves listed above.</p>`,
  })
}
