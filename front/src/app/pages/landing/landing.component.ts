import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FloatingOrbComponent } from './floating-orb/floating-orb.component';
import { AuthPanelComponent } from './auth-panel/auth-panel.component';
import { CursorComponent } from './cursor/cursor.component';
@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FloatingOrbComponent,
    AuthPanelComponent,
    CursorComponent
  ],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss']
})
export class LandingComponent implements AfterViewInit, OnDestroy {

  currentTab: 'login' | 'register' = 'login';
  private animationFrameId: number | null = null;

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initNav();
      this.initScrollReveal();
      this.initCounters();
    }, 0);
  }

  ngOnDestroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  // ── Nav ───────────────────────────────────────────────────────
  private initNav(): void {
    const nav = document.getElementById('mainNav');
    if (!nav) return;

    let lastY = 0;

    const handleScroll = () => {
      const y = window.scrollY;
      nav.classList.toggle('scrolled', y > 20);
      nav.style.transform = (y > lastY && y > 80) ? 'translateY(-100%)' : 'translateY(0)';
      lastY = y;
    };

    window.addEventListener('scroll', handleScroll);
  }

  // ── Tab passthrough (received from AuthPanelComponent) ────────
  switchTab(tab: 'login' | 'register'): void {
    this.currentTab = tab;
  }

  // ── Scroll reveal ─────────────────────────────────────────────
  private initScrollReveal(): void {
    const items = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
      });
    }, { threshold: 0.15 });
    items.forEach(el => observer.observe(el));
  }

  // ── Counters ──────────────────────────────────────────────────
  private initCounters(): void {
    document.querySelectorAll('.stat-n').forEach((el: any) => {
      const target = parseFloat(el.dataset.target);
      if (isNaN(target)) return;
      let count = 0;
      const update = () => {
        count += target / 100;
        if (count < target) {
          el.innerText = Math.round(count).toLocaleString();
          requestAnimationFrame(update);
        } else {
          el.innerText = target.toLocaleString();
        }
      };
      update();
    });
  }
}