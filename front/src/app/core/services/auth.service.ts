import { Injectable, signal } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { firstValueFrom } from 'rxjs'

export interface User {
  id:        string
  prenom:    string
  nom:       string
  email:     string
  role:      'user' | 'admin'
  avatarUrl?: string
}

export interface LoginPayload    { email: string; password: string; captchaToken: string }
export interface RegisterPayload { prenom: string; nom: string; email: string; password: string; captchaToken: string }
export interface LoginResult     { token?: string; requiresMfa?: boolean; tempToken?: string }

const API = '/api/auth'
const TOKEN_KEY = 'mentaura_token'

@Injectable({ providedIn: 'root' })
export class AuthService {

  // Reactive current user
  private _user = signal<User | null>(null)
  readonly user  = this._user.asReadonly()

  get currentUser(): User | null { return this._user() }
  get isLoggedIn():  boolean     { return !!this._user() }

  constructor(private http: HttpClient) {
    this.hydrateFromToken()
  }

  // ── Login ──────────────────────────────────────────────────────────────────
  async login(payload: LoginPayload): Promise<LoginResult> {
    const res = await firstValueFrom(
      this.http.post<LoginResult & { user?: User }>(`${API}/login`, payload)
    )
    if (res.token) {
      localStorage.setItem(TOKEN_KEY, res.token)
      if (res.user) this._user.set(res.user)
    }
    return res
  }

  // ── Register ───────────────────────────────────────────────────────────────
  async register(payload: RegisterPayload): Promise<void> {
    await firstValueFrom(this.http.post(`${API}/register`, payload))
  }

  // ── Logout ─────────────────────────────────────────────────────────────────
  logout(): void {
    localStorage.removeItem(TOKEN_KEY)
    this._user.set(null)
  }

  // ── Token helpers ──────────────────────────────────────────────────────────
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY)
  }

  // Decode JWT payload (no signature verification — server does that)
  private hydrateFromToken(): void {
    const token = this.getToken()
    if (!token) return
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      if (payload.exp * 1000 < Date.now()) { this.logout(); return }
      this._user.set(payload.user ?? null)
    } catch {
      this.logout()
    }
  }
}