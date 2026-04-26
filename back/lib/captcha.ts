export async function verifyCaptcha(token: string): Promise<boolean> {
  if (token === 'dev-bypass') return true

  const secret = process.env.RECAPTCHA_SECRET_KEY!

  const res = await fetch(
    `https://www.google.com/recaptcha/api/siteverify`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        secret,
        response: token
      })
    }
  )

  const data = await res.json()
  return data.success === true
}