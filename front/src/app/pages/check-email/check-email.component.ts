// pages/check-email/check-email.component.ts
import { Component, inject } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Router } from '@angular/router'
import { AuthService } from '../../core/services/auth.service'

@Component({
  selector: 'app-check-email',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="check-wrap">
      <div class="check-card">
        <div class="icon">✉️</div>
        <h1>Vérifiez votre email</h1>
        <p>
          Un lien de confirmation a été envoyé à <strong>{{ email }}</strong>.<br>
          Cliquez sur ce lien pour activer votre compte.
        </p>
        <div class="steps">
          <div class="step">
            <span class="step-num">1</span>
            <span>Ouvrez votre boîte Gmail</span>
          </div>
          <div class="step">
            <span class="step-num">2</span>
            <span>Cliquez sur le lien de confirmation</span>
          </div>
          <div class="step">
            <span class="step-num">3</span>
            <span>Connectez-vous avec vos identifiants</span>
          </div>
        </div>
        <button class="btn-resend" (click)="resend()" [disabled]="sent || loading">
          {{ sent ? '✓ Email renvoyé' : loading ? 'Envoi...' : 'Renvoyer l\'email' }}
        </button>
        <a class="back-link" (click)="goLogin()">← Retour à la connexion</a>
      </div>
    </div>
  `,
  styles: [`
    .check-wrap {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg);
      padding: 24px;
    }
    .check-card {
      max-width: 480px;
      width: 100%;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 56px 48px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
      text-align: center;
      animation: fadeInUp 0.6s ease both;
    }
    .icon {
      font-size: 56px;
      line-height: 1;
    }
    h1 {
      font-family: 'Cormorant Garamond', serif;
      font-size: 32px;
      font-weight: 300;
      color: var(--txt);
      margin: 0;
    }
    p {
      font-family: 'Space Mono', monospace;
      font-size: 12px;
      line-height: 1.8;
      color: var(--txt2);
      margin: 0;
    }
    strong { color: var(--gold); }
    .steps {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin: 8px 0;
    }
    .step {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 14px 20px;
      background: rgba(255,255,255,0.03);
      border: 1px solid var(--border);
      border-radius: 4px;
      font-family: 'Space Mono', monospace;
      font-size: 11px;
      color: var(--txt2);
    }
    .step-num {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: var(--gold);
      color: var(--bg);
      font-size: 10px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .btn-resend {
      width: 100%;
      padding: 14px;
      background: transparent;
      border: 1px solid var(--gold);
      color: var(--gold);
      border-radius: 4px;
      font-family: 'Space Mono', monospace;
      font-size: 10px;
      letter-spacing: 2.5px;
      text-transform: uppercase;
      cursor: pointer;
      transition: all 0.3s ease;
      &:hover:not(:disabled) {
        background: var(--gold);
        color: var(--bg);
      }
      &:disabled { opacity: 0.4; cursor: not-allowed; }
    }
    .back-link {
      font-family: 'Space Mono', monospace;
      font-size: 9px;
      letter-spacing: 2px;
      color: var(--txt3);
      cursor: pointer;
      text-decoration: none;
      border-bottom: 1px solid var(--border);
      padding-bottom: 2px;
      transition: all 0.25s;
      &:hover { color: var(--txt); border-bottom-color: var(--txt); }
    }
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class CheckEmailComponent {
  private router = inject(Router)
  private auth   = inject(AuthService)

  email   = history.state?.email ?? ''
  loading = false
  sent    = false

  resend(): void {
    if (!this.email) return
    this.loading = true
    this.auth.resendVerification(this.email).subscribe({
      next: () => { this.loading = false; this.sent = true },
      error: () => { this.loading = false }
    })
  }

  goLogin(): void {
    this.router.navigate(['/'])
  }
}