import { Component, AfterViewInit, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FloatingOrbComponent } from './floating-orb/floating-orb.component';
import { AuthPanelComponent } from './auth-panel/auth-panel.component';
import { CursorComponent } from './cursor/cursor.component';
import { RouterModule } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    FloatingOrbComponent,
    AuthPanelComponent,
    CursorComponent
  ],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss']
})
export class LandingComponent implements OnInit, AfterViewInit, OnDestroy {

  private sanitizer = inject(DomSanitizer);

  currentTab: 'login' | 'register' = 'login';
  private animationFrameId: number | null = null;
  private scrollListeners: (() => void)[] = [];

  steps: { number: string; title: string; desc: string; icon: SafeHtml }[] = [
    {
      number: '01',
      title: 'Connect Your Mind',
      desc: 'Import your notes, documents, and workflows. Mentaura maps your knowledge graph instantly.',
      icon: ''
    },
    {
      number: '02',
      title: 'AI Learns You',
      desc: 'Over time, the engine adapts to your thinking style, priorities, and patterns.',
      icon: ''
    },
    {
      number: '03',
      title: 'Think at Scale',
      desc: 'Execute complex tasks, research and create — with AI that truly understands context.',
      icon: ''
    }
  ];

  features: { title: string; desc: string; tag: string; svgPath: SafeHtml }[] = [
    {
      title: 'Deep Intelligence',
      desc: 'Research that goes beyond surface level. Synthesize, analyze, and extract meaning in real-time.',
      tag: 'Core',
      svgPath: ''
    },
    {
      title: 'Memory That Persists',
      desc: 'Never lose context. Your memory engine learns from every interaction and adapts to your workflow.',
      tag: 'Pro',
      svgPath: ''
    },
    {
      title: 'Code That Ships',
      desc: 'Agentic code mode. Write, review, test, and deploy — all autonomously. Your IDE meets AI.',
      tag: 'Enterprise',
      svgPath: ''
    }
  ];

  testimonials = [
    {
      quote: 'Mentaura changed how I approach research entirely. It thinks the way I do — and faster.',
      name: 'Sophia M.',
      role: 'Lead Researcher, Nexis AI',
      rating: 5
    },
    {
      quote: "The memory engine is unlike anything I've used. My workflow is now truly frictionless.",
      name: 'James T.',
      role: 'Senior Engineer, Orbit Labs',
      rating: 5
    },
    {
      quote: 'Finally an AI tool built for depth, not just speed. My productivity tripled in a month.',
      name: 'Layla K.',
      role: 'Strategy Director, Verne Capital',
      rating: 5
    }
  ];

  ngOnInit(): void {
    // Initialiser les SVG sanitizés ici
    this.steps[0].icon = this.sanitizer.bypassSecurityTrustHtml(
      `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.2">
        <path d="M10 2a8 8 0 1 0 0 16A8 8 0 0 0 10 2zm0 0v8m0 0l4-4m-4 4l-4-4"/>
      </svg>`
    );
    this.steps[1].icon = this.sanitizer.bypassSecurityTrustHtml(
      `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.2">
        <circle cx="10" cy="10" r="3"/>
        <path d="M10 2v2m0 12v2M2 10h2m12 0h2m-3.17-4.83-1.41 1.41M4.58 15.42l1.41-1.41m0-8.24-1.41-1.41m11.24 11.24-1.41-1.41"/>
      </svg>`
    );
    this.steps[2].icon = this.sanitizer.bypassSecurityTrustHtml(
      `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.2">
        <path d="M3 10l4 4 10-10"/><circle cx="10" cy="10" r="8"/>
      </svg>`
    );

    this.features[0].svgPath = this.sanitizer.bypassSecurityTrustHtml(
      `<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>`
    );
    this.features[1].svgPath = this.sanitizer.bypassSecurityTrustHtml(
      `<path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 6v6l4 2"/><circle cx="18" cy="6" r="3"/>`
    );
    this.features[2].svgPath = this.sanitizer.bypassSecurityTrustHtml(
      `<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>`
    );

    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'register') {
      this.currentTab = 'register';
    }
  }

  ngAfterViewInit(): void {
    if (typeof window === 'undefined') return;
    setTimeout(() => {
      this.initNav();
      this.initScrollReveal();
      this.initCounters();
      this.initMarquee();
      this.initParallax();
    }, 0);
  }

  ngOnDestroy(): void {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    this.scrollListeners.forEach(fn => fn());
  }

  switchTab(tab: 'login' | 'register'): void {
    this.currentTab = tab;
  }

  goToRegisterTop(): void {
    window.location.href = window.location.origin + '/?tab=register';
  }

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
    this.scrollListeners.push(() => window.removeEventListener('scroll', handleScroll));
  }

  private initScrollReveal(): void {
    const items = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
      });
    }, { threshold: 0.1 });
    items.forEach(el => observer.observe(el));
  }

  private initParallax(): void {
    const handleScroll = () => {
      const y = window.scrollY;
      const grid = document.querySelector('.hero-grid-overlay') as HTMLElement;
      if (grid) grid.style.transform = `translateY(${y * 0.15}px)`;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    this.scrollListeners.push(() => window.removeEventListener('scroll', handleScroll));
  }

  private initMarquee(): void {
    const track = document.querySelector('.marquee-track') as HTMLElement;
    if (!track) return;
    let pos = 0;
    const speed = 0.4;
    const animate = () => {
      pos -= speed;
      const half = track.scrollWidth / 2;
      if (Math.abs(pos) >= half) pos = 0;
      track.style.transform = `translateX(${pos}px)`;
      this.animationFrameId = requestAnimationFrame(animate);
    };
    animate();
  }

  private initCounters(): void {
    document.querySelectorAll<HTMLElement>('.stat-n[data-target]').forEach((el) => {
      const target = parseFloat(el.dataset['target'] ?? '0');
      if (isNaN(target)) return;
      let count = 0;
      const update = () => {
        count += target / 80;
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