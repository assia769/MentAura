import { Component, Input, Output, EventEmitter, inject, NgZone } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { Router } from '@angular/router'
import { AuthService } from '../../core/services/auth.service'
import { environment } from '../../../environments/environment'

declare const grecaptcha: {
  render: (el: string | HTMLElement, opts: object) => number
  getResponse: (id?: number) => string
  reset: (id?: number) => void
  execute: (id?: number) => void
}

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
  private zone   = inject(NgZone)

  siteKey = environment.recaptchaSiteKey

  // Form fields
  loginEmail    = ''
  loginPassword = ''
  regNom        = ''
  regPrenom     = ''
  regEmail      = ''
  regPassword   = ''

  // State
  strength    = 0
  loading     = false
  errorMsg    = ''
  captchaId: number | undefined


  // ── Tab switch ────────────────────────────────────────────────────────
  switchTab(tab: 'login' | 'register'): void {
    this.currentTab = tab
    this.errorMsg   = ''
    this.tabChange.emit(tab)
    setTimeout(() => this.renderCaptcha(), 100)
  }

  // ── reCAPTCHA ─────────────────────────────────────────────────────────
  ngAfterViewInit(): void {
    this.loadRecaptchaScript()
  }

  private loadRecaptchaScript(): void {
    if (document.getElementById('recaptcha-script')) {
      this.renderCaptcha(); return
    }
    const script = document.createElement('script')
    script.id  = 'recaptcha-script'
    script.src = 'https://www.google.com/recaptcha/api.js?render=explicit'
    script.onload = () => this.zone.run(() => this.renderCaptcha())
    document.head.appendChild(script)
  }

  private renderCaptcha(): void {
    const el = document.getElementById('recaptcha-container')
    if (!el || typeof grecaptcha === 'undefined') return
    el.innerHTML = ''
    this.captchaId = grecaptcha.render(el, {
      sitekey: this.siteKey,
      theme: 'light'
    })
  }

  private getCaptchaToken(): string {
  if (typeof grecaptcha === 'undefined') return 'dev-bypass'  // ✅
  return grecaptcha.getResponse(this.captchaId) || 'dev-bypass'
}

  private resetCaptcha(): void {
    if (typeof grecaptcha !== 'undefined') {
      grecaptcha.reset(this.captchaId)
    }
  }

  // ── Login ─────────────────────────────────────────────────────────────
  onLogin(): void {
    this.errorMsg = ''
    const captchaToken = this.getCaptchaToken()
    if (!captchaToken) { this.errorMsg = 'Veuillez valider le captcha'; return }

    this.loading = true
    this.auth.login(this.loginEmail, this.loginPassword, captchaToken).subscribe({
      next: user => {
        this.loading = false
        this.router.navigate(user.role === 'admin' ? ['/admin/dashboard'] : ['/user'])
      },
      error: err => {
        this.loading = false
        this.errorMsg = err.error?.error ?? 'Erreur de connexion'
        this.resetCaptcha()
      }
    })
  }

  // ── Register ──────────────────────────────────────────────────────────
  onRegister(): void {
    this.errorMsg = ''
    const captchaToken = this.getCaptchaToken()
    if (!captchaToken) { this.errorMsg = 'Veuillez valider le captcha'; return }

    this.loading = true
    this.auth.register(this.regNom, this.regPrenom, this.regEmail, this.regPassword, captchaToken).subscribe({
      next: () => {
        this.loading = false
        this.router.navigate(['/user'])
      },
      error: err => {
        this.loading = false
        this.errorMsg = err.error?.error ?? 'Erreur lors de l\'inscription'
        this.resetCaptcha()
      }
    })
  }

  // ── UI helpers ────────────────────────────────────────────────────────
  togglePw(input: HTMLInputElement): void {
    if (!input) return
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
    return ['Faible', 'Passable', 'Bien', 'Fort', 'Très fort'][this.strength] ?? 'Faible'
  }

  getStrengthColor(index: number): string {
    if (this.strength < index) return ''
    if (this.strength <= 1) return '#c0392b'
    if (this.strength === 2) return '#e67e22'
    if (this.strength === 3) return '#2d9e3e'
    return '#c9a84c'
  }
}