import { Injectable, inject, PLATFORM_ID } from '@angular/core'
import { isPlatformBrowser } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { Router } from '@angular/router'
import { BehaviorSubject, Observable, throwError, tap } from 'rxjs'
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
  private platformId = inject(PLATFORM_ID)
  private api = environment.apiUrl

  private _user$ = new BehaviorSubject<AuthUser | null>(null)
  user$ = this._user$.asObservable()

  constructor() {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem('mentaura_user')
      if (raw) {
        try {
          this._user$.next(JSON.parse(raw))
        } catch {}
      }
    }
  }

  // ========================
  // GETTERS
  // ========================
  get currentUser(): AuthUser | null {
    return this._user$.value
  }

  get accessToken(): string | null {
    return this._user$.value?.accessToken ?? null
  }
  


  get isLoggedIn(): boolean {
    return !!this._user$.value
  }

  get isAdmin(): boolean {
    return this._user$.value?.role === 'admin'
  }

  // ========================
  // AUTH METHODS
  // ========================
  login(email: string, password: string, captchaToken: string) {
    return this.http.post<any>(`${this.api}/api/auth/login`, {
      email,
      password,
      captchaToken
    }).pipe(
      tap(res => {
        if (res.mfaRequired) return
        this.persist(res)
        this.router.navigate(
          res.role === 'admin' ? ['/admin/dashboard'] : ['/user']
        )
      })
    )
  }

  register(
    nom: string,
    prenom: string,
    email: string,
    password: string,
    captchaToken: string
  ) {
    return this.http.post<any>(`${this.api}/api/auth/register`, {
      nom,
      prenom,
      email,
      password,
      captchaToken
    })
  }

  verifyMfa(userId: string, code: string) {
    return this.http.post<any>(`${this.api}/api/auth/mfa/verify`, {
      userId,
      code
    }).pipe(
      tap(res => {
        this.persist(res)
        this.router.navigate(
          res.role === 'admin' ? ['/admin/dashboard'] : ['/user']
        )
      })
    )
  }

  verifyEmail(token: string) {
    return this.http.post<any>(`${this.api}/api/auth/verify-email`, {
      token
    })
  }

  resendVerification(email: string) {
    return this.http.post<any>(`${this.api}/api/auth/resend-verification`, {
      email
    })
  }

  // ========================
  // TOKEN REFRESH
  // ========================
 refreshToken(): Observable<{ accessToken: string }> {
  const user = this._user$.value
  if (!user?.refreshToken) {
    return throwError(() => new Error('No refresh token'))
  }

  return this.http
    .post<{ accessToken: string }>(
      `${this.api}/api/auth/refresh`,
      { refreshToken: user.refreshToken }
    )
    .pipe(
      tap(res => {
        const updatedUser = {
          ...user,
          accessToken: res.accessToken
        }
        this.persist(updatedUser) // ✅ CRUCIAL
      })
    )
}

  // ========================
  // LOGOUT
  // ========================
  logout(): void {
    const user = this._user$.value

    if (user) {
      this.http.post(`${this.api}/api/auth/logout`, {
        refreshToken: user.refreshToken
      }).subscribe()
    }

    if (typeof window !== 'undefined') {
      localStorage.removeItem('mentaura_user')
    }

    this._user$.next(null)
    this.router.navigate(['/'])
  }

  softResetSession(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mentaura_user')
    }
    this._user$.next(null)
  }
 

  // ========================
  // STORAGE
  // ========================
  private persist(user: AuthUser) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mentaura_user', JSON.stringify(user))
    }
    this._user$.next(user)
  }
}