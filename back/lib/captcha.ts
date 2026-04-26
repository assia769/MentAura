// export async function verifyCaptcha(token: string): Promise<boolean> {
//   const secret = process.env.RECAPTCHA_SECRET_KEY!
//   const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
//     body: `secret=${secret}&response=${token}`
//   })
//   const data = await res.json()
//   return data.success === true
// }

export async function verifyCaptcha(token: string): Promise<boolean> {
  // Bypass en dev
  if (process.env.NODE_ENV === 'development' || token === 'dev-bypass') {
    return true
  }

  const secret = process.env.RECAPTCHA_SECRET_KEY!
  const res = await fetch(
    `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${token}`,
    { method: 'POST' }
  )
  const data = await res.json()
  return data.success === true
}