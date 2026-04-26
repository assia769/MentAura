// pages/verify-email/verify-email.component.ts
import { Component, OnInit, inject } from '@angular/core'
import { CommonModule } from '@angular/common'
import { ActivatedRoute, Router } from '@angular/router'
import { AuthService } from '../../core/services/auth.service'

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="verify-wrap">
      <div class="verify-card">
        <ng-container *ngIf="status === 'loading'">
          <div class="spinner"></div>
          <p>Vérification en cours...</p>
        </ng-container>

        <ng-container *ngIf="status === 'success'">
          <div class="icon success">✓</div>
          <h1>Email confirmé !</h1>
          <p>Votre compte est activé. Vous pouvez maintenant vous connecter.</p>
          <button class="btn-go" (click)="goLogin()">SE CONNECTER</button>
        </ng-container>

        <ng-container *ngIf="status === 'error'">
          <div class="icon error">✕</div>
          <h1>Lien invalide</h1>
          <p>Ce lien est expiré ou invalide.<br>Demandez un nouveau lien de vérification.</p>
          <button class="btn-go" (click)="goLogin()">RETOUR À L'ACCUEIL</button>
        </ng-container>
      </div>
    </div>
  `,
  styles: [`
    .verify-wrap {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg);
    }
    .verify-card {
      max-width: 420px;
      width: 100%;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 64px 48px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
      text-align: center;
    }
    .icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      font-size: 28px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      &.success { background: rgba(45,158,62,0.15); color: #2d9e3e; border: 1px solid #2d9e3e; }
      &.error   { background: rgba(192,57,43,0.15);  color: #c0392b; border: 1px solid #c0392b; }
    }
    h1 {
      font-family: 'Cormorant Garamond', serif;
      font-size: 28px;
      font-weight: 300;
      color: var(--txt);
      margin: 0;
    }
    p {
      font-family: 'Space Mono', monospace;
      font-size: 11px;
      line-height: 1.8;
      color: var(--txt2);
      margin: 0;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 2px solid var(--border);
      border-top-color: var(--gold);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    .btn-go {
      width: 100%;
      padding: 14px;
      background: var(--gold);
      color: var(--bg);
      border: none;
      border-radius: 4px;
      font-family: 'Space Mono', monospace;
      font-size: 10px;
      letter-spacing: 3px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      &:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(201,168,76,0.2); }
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class VerifyEmailComponent implements OnInit {
  private route  = inject(ActivatedRoute)
  private auth   = inject(AuthService)
  private router = inject(Router)

  status: 'loading' | 'success' | 'error' = 'loading'

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token')
    if (!token) { this.status = 'error'; return }

    this.auth.verifyEmail(token).subscribe({
      next:  () => this.status = 'success',
      error: () => this.status = 'error'
    })
  }

  goLogin(): void {
    this.router.navigate(['/'])
  }
}