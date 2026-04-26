import { Component, Input, Output, EventEmitter, inject } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { Router } from '@angular/router'
import { AuthService } from '../../../core/services/auth.service'

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

  // État UI
  strength = 0
  loading  = false
  errorMsg = ''

  // ── Tab ──────────────────────────────────────────────────────────────
  switchTab(tab: 'login' | 'register'): void {
    this.currentTab = tab
    this.errorMsg   = ''
    this.tabChange.emit(tab)
  }

  // ── Login ─────────────────────────────────────────────────────────────
  onLogin(): void {
    this.errorMsg = ''
    if (!this.loginEmail || !this.loginPassword) {
      this.errorMsg = 'Email et mot de passe requis'
      return
    }
    this.loading = true
    this.auth.login(this.loginEmail, this.loginPassword, 'dev-bypass').subscribe({
      next: user => {
        this.loading = false
        this.router.navigate(user.role === 'admin' ? ['/admin/dashboard'] : ['/user'])
      },
      error: err => {
        this.loading  = false
        this.errorMsg = err.error?.error ?? 'Erreur de connexion'
        console.error('Login error:', err)
      }
    })
  }

  // ── Register ──────────────────────────────────────────────────────────
  onRegister(): void {
    this.errorMsg = ''
    if (!this.regEmail || !this.regPassword) {
      this.errorMsg = 'Tous les champs sont requis'
      return
    }
    this.loading = true
    this.auth.register(
      this.regNom, this.regPrenom, this.regEmail, this.regPassword, 'dev-bypass'
    ).subscribe({
      next: () => {
        this.loading = false
        this.router.navigate(['/user'])
      },
      error: err => {
        this.loading  = false
        this.errorMsg = err.error?.error ?? 'Erreur inscription'
        console.error('Register error:', err)
      }
    })
  }

  // ── UI helpers ────────────────────────────────────────────────────────
  togglePw(input: HTMLInputElement): void {
    input.type = input.type === 'password' ? 'text' : 'password'
  }

  checkStrength(value: string): void {
    let score = 0
    if (value.length >= 8)        score++
    if (/[A-Z]/.test(value))      score++
    if (/[0-9]/.test(value))      score++
    if (/[^A-Za-z0-9]/.test(value)) score++
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