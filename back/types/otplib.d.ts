declare module 'otplib' {
  export const authenticator: {
    generateSecret(): string
    generate(secret: string): string
    check(token: string, secret: string): boolean
    verify(options: { token: string; secret: string }): boolean
  }
}