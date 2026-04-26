import { Component, Input, Output, EventEmitter, inject } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { Router } from '@angular/router'
import { AuthService } from '../../../core/services/auth.service'

declare const grecaptcha: any

@Component({
  selector: 'app-auth-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth-panel.component.html',
  styleUrls: ['./auth-panel.component.scss']
})
export class AuthPanelComponent {
  @Input() currentTab: 'login' | 'register' = 'login'
  @Output() tabChange = new EventEmitter<'login' | 'register'>()

  private auth   = inject(AuthService)
  private router = inject(Router)

  // Champs login
  loginEmail    = ''
  loginPassword = ''

  // Champs register
  regNom      = ''
  regPrenom   = ''
  regEmail    = ''
  regPassword = ''

  // MFA
  showMfa     = false
  mfaCode     = ''
  pendingUser: any = null

  // État UI
  strength   = 0
  loading    = false
  errorMsg   = ''
  successMsg = ''

  // reCAPTCHA widget IDs
  loginCaptchaWidgetId: number | null = null
  registerCaptchaWidgetId: number | null = null

  // ── Tab ──────────────────────────────────────────────────────────────
 switchTab(tab: 'login' | 'register'): void {
  this.currentTab = tab
  this.errorMsg   = ''
  this.successMsg = ''
  this.showMfa    = false
  this.tabChange.emit(tab)
}

  // ── reCAPTCHA ─────────────────────────────────────────────────────────
 ngAfterViewInit(): void {
  this.loadRecaptchaScript().then(() => {
    setTimeout(() => this.renderCaptcha(), 300) // ✅ léger délai de sécurité
  })
}
  loadRecaptchaScript(): Promise<void> {
    return new Promise(resolve => {
      if (typeof grecaptcha !== 'undefined') { resolve(); return }
      const script = document.createElement('script')
      script.src = 'https://www.google.com/recaptcha/api.js?render=explicit'
      script.async = true
      script.defer = true
      script.onload = () => resolve()
      document.head.appendChild(script)
    })
  }

 renderCaptcha(): void {
  if (typeof grecaptcha === 'undefined') return

  const loginEl = document.getElementById('login-captcha')
  const registerEl = document.getElementById('register-captcha')

  // Login captcha
  if (loginEl && loginEl.childElementCount === 0) {
    this.loginCaptchaWidgetId = grecaptcha.render('login-captcha', {
      sitekey: '6LcPZ8ssAAAAAAbua23uESL8vcRVcQFN6zfV4LxT',
      theme: 'light'
    })
  }

  // Register captcha — rendu en avance même si onglet inactif
  if (registerEl && registerEl.childElementCount === 0) {
    this.registerCaptchaWidgetId = grecaptcha.render('register-captcha', {
      sitekey: '6LcPZ8ssAAAAAAbua23uESL8vcRVcQFN6zfV4LxT',
      theme: 'light'
    })
  }
}
  getCaptchaToken(widgetId: number | null): string {
    if (typeof grecaptcha === 'undefined' || widgetId === null) return 'dev-bypass'
    return grecaptcha.getResponse(widgetId) || ''
  }

  resetCaptcha(widgetId: number | null): void {
    if (typeof grecaptcha !== 'undefined' && widgetId !== null) {
      grecaptcha.reset(widgetId)
    }
  }

  // ── Login ─────────────────────────────────────────────────────────────
  onLogin(): void {
    this.errorMsg = ''
    if (!this.loginEmail || !this.loginPassword) {
      this.errorMsg = 'Email et mot de passe requis'
      return
    }

    const captchaToken = this.getCaptchaToken(this.loginCaptchaWidgetId)
    if (!captchaToken) {
      this.errorMsg = 'Veuillez valider le captcha'
      return
    }

    this.loading = true
    this.auth.login(this.loginEmail, this.loginPassword, captchaToken).subscribe({
      next: (res: any) => {
        this.loading = false

        // Si le backend renvoie mfaRequired
        if (res.mfaRequired) {
          this.showMfa    = true
          this.pendingUser = res
          return
        }

        this.router.navigate(res.role === 'admin' ? ['/admin/dashboard'] : ['/user'])
      },
      error: err => {
        this.loading  = false
        this.errorMsg = err.error?.error ?? 'Erreur de connexion'
        this.resetCaptcha(this.loginCaptchaWidgetId)
      }
    })
  }

  // ── MFA ───────────────────────────────────────────────────────────────
  onVerifyMfa(): void {
    if (!this.mfaCode || this.mfaCode.length !== 6) {
      this.errorMsg = 'Code MFA invalide (6 chiffres)'
      return
    }
    this.loading = true
    this.auth.verifyMfa(this.pendingUser.userId, this.mfaCode).subscribe({
      next: (res: any) => {
        this.loading = false
        this.router.navigate(res.role === 'admin' ? ['/admin/dashboard'] : ['/user'])
      },
      error: err => {
        this.loading  = false
        this.errorMsg = err.error?.error ?? 'Code MFA incorrect'
      }
    })
  }

  onRegister(): void {
  this.errorMsg   = ''
  this.successMsg = ''

  if (!this.regNom || !this.regPrenom || !this.regEmail || !this.regPassword) {
    this.errorMsg = 'Tous les champs sont requis'
    return
  }
  if (this.regPassword.length < 8) {
    this.errorMsg = 'Mot de passe trop court (min 8 caractères)'
    return
  }

  const captchaToken = this.getCaptchaToken(this.registerCaptchaWidgetId)
  if (!captchaToken) {
    this.errorMsg = 'Veuillez valider le captcha'
    return
  }

  // ✅ Sauvegarder l'email AVANT de vider les champs
  const emailSaisi = this.regEmail

  this.loading = true
  this.auth.register(
    this.regNom, this.regPrenom, emailSaisi, this.regPassword, captchaToken
  ).subscribe({
    next: () => {
      this.loading = false
      this.resetCaptcha(this.registerCaptchaWidgetId)
      this.regNom = this.regPrenom = this.regEmail = this.regPassword = ''
      this.strength = 0
      // ✅ email passé depuis la variable sauvegardée
      this.router.navigate(['/check-email'], { state: { email: emailSaisi } })
    },
    error: err => {
      this.loading  = false
      this.errorMsg = err.error?.error ?? 'Erreur inscription'
      this.resetCaptcha(this.registerCaptchaWidgetId)
    }
  })
}
  // ── UI helpers ────────────────────────────────────────────────────────
  togglePw(input: HTMLInputElement): void {
    input.type = input.type === 'password' ? 'text' : 'password'
  }

  checkStrength(value: string): void {
    let score = 0
    if (value.length >= 8)           score++
    if (/[A-Z]/.test(value))         score++
    if (/[0-9]/.test(value))         score++
    if (/[^A-Za-z0-9]/.test(value))  score++
    this.strength = score
  }

  getStrengthLabel(): string {
    return ['Faible', 'Passable', 'Bien', 'Fort', 'Très fort'][this.strength] ?? 'Faible'
  }

  getStrengthColor(index: number): string {
    if (this.strength < index) return ''
    if (this.strength <= 1)    return '#c0392b'
    if (this.strength === 2)   return '#e67e22'
    if (this.strength === 3)   return '#2d9e3e'
    return '#c9a84c'
  }
}