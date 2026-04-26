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

  login(email: string, password: string, captchaToken: string): Observable<any> {
    return this.http
      .post<any>(`${this.api}/api/auth/login`, { email, password, captchaToken })
      .pipe(
        tap(res => {
          // Si MFA requis, on ne persiste rien — le composant gère
          if (res.mfaRequired) return

          this.persist(res)
          this.router.navigate(res.role === 'admin' ? ['/admin/dashboard'] : ['/user'])
        })
      )
  }

  // ✅ register ne persist PAS et ne redirige PAS
  register(
    nom: string, prenom: string,
    email: string, password: string,
    captchaToken: string
  ): Observable<any> {
    return this.http.post<any>(
      `${this.api}/api/auth/register`,
      { nom, prenom, email, password, captchaToken }
    )
    // Pas de tap ici — le composant affiche le message et switche vers login
  }

  // ✅ URL corrigée + après vérification MFA on persiste et redirige
  verifyMfa(userId: string, code: string): Observable<any> {
    return this.http
      .post<any>(`${this.api}/api/auth/mfa/verify`, { userId, code })
      .pipe(
        tap(res => {
          this.persist(res)
          this.router.navigate(res.role === 'admin' ? ['/admin/dashboard'] : ['/user'])
        })
      )
  }

  // ✅ Vérification du token email (lien cliqué dans le mail)
  verifyEmail(token: string): Observable<any> {
    return this.http.post<any>(`${this.api}/api/auth/verify-email`, { token })
  }

  // ✅ Renvoyer l'email de vérification
  resendVerification(email: string): Observable<any> {
    return this.http.post<any>(`${this.api}/api/auth/resend-verification`, { email })
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
}