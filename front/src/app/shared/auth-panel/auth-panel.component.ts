import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
  NgZone,
  AfterViewInit
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { Router } from '@angular/router'
import { AuthService } from '../../core/services/auth.service'

declare const grecaptcha: any

@Component({
  selector: 'app-auth-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth-panel.component.html',
  styleUrls: ['./auth-panel.component.scss']
})
export class AuthPanelComponent implements AfterViewInit {
  @Input() currentTab: 'login' | 'register' = 'login'
  @Output() tabChange = new EventEmitter<'login' | 'register'>()

  private auth = inject(AuthService)
  private router = inject(Router)
  private zone = inject(NgZone)

  private readonly SITE_KEY =
    '6LcPZ8ssAAAAAAbua23uESL8vcRVcQFN6zfV4LxT'

  // forms
  loginEmail = ''
  loginPassword = ''
  regNom = ''
  regPrenom = ''
  regEmail = ''
  regPassword = ''

  // MFA
  showMfa = false
  mfaCode = ''
  pendingUserId = ''

  // state
  strength = 0
  loading = false
  errorMsg = ''
  successMsg = ''

  // captcha
  private loginCaptchaWidgetId: number | null = null
  private registerCaptchaWidgetId: number | null = null

  // ─────────────────────────────────────────────
  ngAfterViewInit(): void {
    this.loadRecaptchaScript()
  }

  // ─────────────────────────────────────────────
  switchTab(tab: 'login' | 'register'): void {
    this.currentTab = tab
    this.errorMsg = ''
    this.successMsg = ''
    this.showMfa = false
    this.tabChange.emit(tab)

    setTimeout(() => this.renderCaptcha(), 200)
  }

  // ─────────────────────────────────────────────
  private loadRecaptchaScript(): void {
    if (document.getElementById('recaptcha-script')) {
      setTimeout(() => this.renderCaptcha(), 200)
      return
    }

    const script = document.createElement('script')
    script.id = 'recaptcha-script'

    // ✔️ FIX IMPORTANT (v2)
    script.src = 'https://www.google.com/recaptcha/api.js'

    script.async = true
    script.defer = true
    script.onload = () => this.zone.run(() => this.renderCaptcha())

    document.head.appendChild(script)
  }

  // ─────────────────────────────────────────────
  private renderCaptcha(): void {
    if (typeof grecaptcha === 'undefined') return

    // LOGIN
    const loginEl = document.getElementById('login-captcha')
    if (loginEl && !this.loginCaptchaWidgetId) {
      this.loginCaptchaWidgetId = grecaptcha.render('login-captcha', {
        sitekey: this.SITE_KEY,
        theme: 'light'
      })
    }

    // REGISTER
    const regEl = document.getElementById('register-captcha')
    if (regEl && !this.registerCaptchaWidgetId) {
      this.registerCaptchaWidgetId = grecaptcha.render('register-captcha', {
        sitekey: this.SITE_KEY,
        theme: 'light'
      })
    }
  }

  // ─────────────────────────────────────────────
  private getCaptchaToken(widgetId: number | null): string {
    if (!widgetId || typeof grecaptcha === 'undefined') return ''
    return grecaptcha.getResponse(widgetId)
  }

  private resetCaptcha(widgetId: number | null): void {
    if (widgetId !== null && typeof grecaptcha !== 'undefined') {
      grecaptcha.reset(widgetId)
    }
  }

  // ─────────────────────────────────────────────
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

    this.auth.login(
      this.loginEmail,
      this.loginPassword,
      captchaToken
    ).subscribe({
      next: (res: any) => {
        this.loading = false

        if (res.mfaRequired) {
          this.pendingUserId = res.userId
          this.showMfa = true
          return
        }

        this.router.navigate(
          res.role === 'admin' ? ['/admin/dashboard'] : ['/user']
        )
      },
      error: err => {
        this.loading = false
        this.errorMsg = err.error?.error ?? 'Erreur de connexion'
        this.resetCaptcha(this.loginCaptchaWidgetId)
      }
    })
  }

  // ─────────────────────────────────────────────
  onVerifyMfa(): void {
    this.errorMsg = ''

    if (!this.mfaCode || this.mfaCode.length !== 6) {
      this.errorMsg = 'Code à 6 chiffres requis'
      return
    }

    this.loading = true

    this.auth.verifyMfa(this.pendingUserId, this.mfaCode).subscribe({
      next: (res: any) => {
        this.loading = false
        this.router.navigate(
          res.role === 'admin' ? ['/admin/dashboard'] : ['/user']
        )
      },
      error: err => {
        this.loading = false
        this.errorMsg = err.error?.error ?? 'Code MFA incorrect'
        this.mfaCode = ''
      }
    })
  }

  onBackFromMfa(): void {
    this.showMfa = false
    this.mfaCode = ''
    this.pendingUserId = ''
    this.errorMsg = ''

    setTimeout(() => this.renderCaptcha(), 200)
  }

  // ─────────────────────────────────────────────
  onRegister(): void {
    this.errorMsg = ''
    this.successMsg = ''

    if (!this.regNom || !this.regPrenom || !this.regEmail || !this.regPassword) {
      this.errorMsg = 'Tous les champs sont requis'
      return
    }

    if (this.regPassword.length < 8) {
      this.errorMsg = 'Mot de passe trop court'
      return
    }

    const captchaToken = this.getCaptchaToken(this.registerCaptchaWidgetId)
    if (!captchaToken) {
      this.errorMsg = 'Veuillez valider le captcha'
      return
    }

    this.loading = true

    this.auth.register(
      this.regNom,
      this.regPrenom,
      this.regEmail,
      this.regPassword,
      captchaToken
    ).subscribe({
      next: () => {
        this.loading = false
        this.successMsg = 'Compte créé avec succès'

        this.resetCaptcha(this.registerCaptchaWidgetId)

        this.regNom = ''
        this.regPrenom = ''
        this.regEmail = ''
        this.regPassword = ''
        this.strength = 0

        setTimeout(() => this.switchTab('login'), 2000)
      },
      error: err => {
        this.loading = false
        this.errorMsg = err.error?.error ?? 'Erreur inscription'
        this.resetCaptcha(this.registerCaptchaWidgetId)
      }
    })
  }

  // ─────────────────────────────────────────────
  togglePw(input: HTMLInputElement): void {
    input.type = input.type === 'password' ? 'text' : 'password'
  }

  checkStrength(value: string): void {
    let score = 0
    if (value.length >= 8) score++
    if (/[A-Z]/.test(value)) score++
    if (/[0-9]/.test(value)) score++
    if (/[^A-Za-z0-9]/.test(value)) score++
    this.strength = score
  }

  getStrengthLabel(): string {
    return ['Faible', 'Passable', 'Bien', 'Fort', 'Très fort'][this.strength]
  }

  getStrengthColor(i: number): string {
    if (this.strength < i) return ''
    if (this.strength <= 1) return '#c0392b'
    if (this.strength === 2) return '#e67e22'
    if (this.strength === 3) return '#2d9e3e'
    return '#c9a84c'
  }
}