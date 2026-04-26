import { Component } from '@angular/core'
import { CommonModule } from '@angular/common'

@Component({
  selector: 'app-user-shell',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="user-placeholder">
      <div class="content">
        <div class="badge">Espace étudiant</div>
        <h1>Cette interface est réservée à<br><em>Omaima</em> &amp; <em>Khadija</em></h1>
        <p>Le développement de cette section est en cours.<br>À bientôt ✦</p>
      </div>
      <div class="bg-lines">
        <div class="line" *ngFor="let l of lines; let i = index" [style.animation-delay]="i * 0.15 + 's'"></div>
      </div>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=DM+Mono:wght@400;500&display=swap');

    :host { display: block }

    .user-placeholder {
      min-height: 100vh;
      background: #f9f8f5;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
      font-family: 'Libre Baskerville', Georgia, serif;
    }

    .content {
      position: relative;
      z-index: 2;
      text-align: center;
      max-width: 520px;
      padding: 40px;
    }

    .badge {
      display: inline-block;
      font-family: 'DM Mono', monospace;
      font-size: 10px;
      letter-spacing: .2em;
      text-transform: uppercase;
      color: #888;
      border: 1px solid #ddd;
      padding: 5px 14px;
      border-radius: 99px;
      margin-bottom: 32px;
    }

    h1 {
      font-size: clamp(28px, 5vw, 44px);
      font-weight: 700;
      color: #1a1a1a;
      line-height: 1.3;
      margin-bottom: 20px;

      em {
        font-style: italic;
        color: #b8975a;
      }
    }

    p {
      font-size: 15px;
      color: #888;
      line-height: 1.7;
      font-weight: 400;
    }

    /* Decorative background lines */
    .bg-lines {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }

    .line {
      position: absolute;
      left: 0; right: 0;
      height: 1px;
      background: #e8e6e0;
      opacity: 0;
      animation: fadeInLine 1s ease forwards;
    }

    @for $i from 1 through 12 {
      .line:nth-child(#{$i}) {
        top: calc(#{$i} * 8.3%);
      }
    }

    @keyframes fadeInLine {
      to { opacity: 1 }
    }
  `]
})
export class UserShellComponent {
  lines = Array(12).fill(0)
}