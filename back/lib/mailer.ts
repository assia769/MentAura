import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
})

export async function sendVerificationEmail(
  to: string,
  prenom: string,
  token: string
): Promise<void> {
  const link = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`

  await transporter.sendMail({
    from: `"Mentaura" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Confirmez votre adresse email — Mentaura',
    html: `
      <div style="font-family: 'Space Mono', monospace; max-width: 520px; margin: 0 auto; background: #0a0a0a; color: #e0e0e0; padding: 48px 40px; border: 1px solid #2a2a2a; border-radius: 8px;">
        <h1 style="font-family: Georgia, serif; font-weight: 300; font-size: 28px; color: #c9a84c; margin: 0 0 24px;">
          Bienvenue, ${prenom} 👋
        </h1>
        <p style="font-size: 13px; line-height: 1.8; color: #a0a0a0; margin: 0 0 32px;">
          Merci de vous être inscrit sur <strong style="color: #e0e0e0;">Mentaura</strong>.<br>
          Cliquez sur le bouton ci-dessous pour confirmer votre adresse email.
        </p>
        <a href="${link}"
           style="display: inline-block; padding: 16px 32px; background: #c9a84c; color: #0a0a0a; border-radius: 4px; font-size: 11px; font-weight: 700; letter-spacing: 3px; text-decoration: none; text-transform: uppercase;">
          CONFIRMER MON EMAIL
        </a>
        <p style="font-size: 10px; color: #555; margin: 32px 0 0; line-height: 1.6;">
          Ce lien expire dans <strong>24 heures</strong>.<br>
          Si vous n'avez pas créé de compte, ignorez cet email.
        </p>
        <hr style="border: none; border-top: 1px solid #2a2a2a; margin: 32px 0 16px;" />
        <p style="font-size: 9px; color: #444; letter-spacing: 1px;">MENTAURA — PLATEFORME D'APPRENTISSAGE</p>
      </div>
    `
  })
}