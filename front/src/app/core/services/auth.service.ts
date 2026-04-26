import { Injectable, inject } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Router } from '@angular/router'
import { BehaviorSubject, Observable, tap } from 'rxjs'
import { environment } from '../../../environments/environment'

export interface AuthUser {
  userId: string
  email: string
  role: 'admin' | 'student'
  accessToken: string
  refreshToken: string
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http   = inject(HttpClient)
  private router = inject(Router)
  private api    = environment.apiUrl

  private _user$ = new BehaviorSubject<AuthUser | null>(this.loadFromStorage())
  user$: Observable<AuthUser | null> = this._user$.asObservable()

  login(email: string, password: string, captchaToken: string): Observable<AuthUser> {
    return this.http
      .post<AuthUser>(`${this.api}/api/auth/login`, { email, password, captchaToken })
      .pipe(
        tap(user => {
          this.persist(user)
          // ── Redirect based on role ──────────────────────────────────
          if (user.role === 'admin') {
            this.router.navigate(['/admin/dashboard'])
          } else {
            this.router.navigate(['/user'])
          }
        })
      )
  }

  register(nom: string, prenom: string, email: string, password: string, captchaToken: string): Observable<AuthUser> {
    return this.http
      .post<AuthUser>(`${this.api}/api/auth/register`, { nom, prenom, email, password, captchaToken })
      .pipe(
        tap(user => {
          this.persist(user)
          this.router.navigate(['/user'])
        })
      )
  }

  logout(): void {
    const user = this._user$.value
    if (user) {
      this.http.post(`${this.api}/api/auth/logout`, { refreshToken: user.refreshToken }).subscribe()
    }
    localStorage.removeItem('mentaura_user')
    this._user$.next(null)
    this.router.navigate(['/'])
  }

  get currentUser(): AuthUser | null { return this._user$.value }
  get accessToken(): string | null   { return this._user$.value?.accessToken ?? null }
  get isAdmin(): boolean             { return this._user$.value?.role === 'admin' }
  get isLoggedIn(): boolean          { return !!this._user$.value }

  refreshToken(): Observable<{ accessToken: string }> {
    const user = this._user$.value!
    return this.http
      .post<{ accessToken: string }>(`${this.api}/api/auth/refresh`, { refreshToken: user.refreshToken })
      .pipe(tap(res => this.persist({ ...user, accessToken: res.accessToken })))
  }

  private persist(user: AuthUser): void {
    localStorage.setItem('mentaura_user', JSON.stringify(user))
    this._user$.next(user)
  }

  private loadFromStorage(): AuthUser | null {
    try {
      const raw = localStorage.getItem('mentaura_user')
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  }
  // Dans votre AuthService, ajoutez cette méthode :

verifyMfa(userId: string, code: string) {
  return this.http.post<any>(`${this.api}/auth/mfa/verify`, { userId, code }, {
    withCredentials: true
  })
}
}
