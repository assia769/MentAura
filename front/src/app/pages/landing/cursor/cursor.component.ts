import { Component, AfterViewInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-cursor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="cursor-spotlight" [style.left.px]="spotX" [style.top.px]="spotY"></div>
    <div class="cursor-ring"
         [class.hovered]="isHovered"
         [class.clicking]="isClicking"
         [style.left.px]="ringX"
         [style.top.px]="ringY">
      <svg class="ring-svg" viewBox="0 0 40 40">
        <circle class="ring-track" cx="20" cy="20" r="18"/>
        <circle class="ring-arc" cx="20" cy="20" r="18"
          [style.stroke-dashoffset]="113 - (113 * arcProgress / 100)"/>
      </svg>
    </div>
    <div class="cursor-dot"
         [class.hovered]="isHovered"
         [style.left.px]="dotX"
         [style.top.px]="dotY">
    </div>
  `,
  styleUrls: ['./cursor.component.scss']
})
export class CursorComponent implements AfterViewInit, OnDestroy {
  dotX = -100; dotY = -100;
  ringX = -100; ringY = -100;
  spotX = -100; spotY = -100;

  isHovered = false;
  isClicking = false;
  arcProgress = 0;

  private mx = 0; private my = 0;
  private rx = 0; private ry = 0;
  private rafId!: number;
  private arcRaf!: number;

  ngAfterViewInit(): void {
    document.addEventListener('mousemove', this.onMove);
    document.addEventListener('mousedown', this.onDown);
    document.addEventListener('mouseup', this.onUp);
    this.attachHoverListeners();
    this.loop();
  }

  ngOnDestroy(): void {
    document.removeEventListener('mousemove', this.onMove);
    document.removeEventListener('mousedown', this.onDown);
    document.removeEventListener('mouseup', this.onUp);
    cancelAnimationFrame(this.rafId);
  }

  private onMove = (e: MouseEvent): void => {
    this.mx = e.clientX;
    this.my = e.clientY;
    this.dotX = this.mx;
    this.dotY = this.my;
    this.spotX = this.mx;
    this.spotY = this.my;
  };

  private onDown = (): void => {
    this.isClicking = true;
    this.arcProgress = 0;
    this.animateArc();
  };

  private onUp = (): void => {
    this.isClicking = false;
    this.arcProgress = 0;
  };

  private animateArc(): void {
    cancelAnimationFrame(this.arcRaf);
    const step = () => {
      if (!this.isClicking) { this.arcProgress = 0; return; }
      this.arcProgress = Math.min(this.arcProgress + 4, 100);
      if (this.arcProgress < 100) this.arcRaf = requestAnimationFrame(step);
    };
    this.arcRaf = requestAnimationFrame(step);
  }

  private loop = (): void => {
    this.rx += (this.mx - this.rx) * 0.12;
    this.ry += (this.my - this.ry) * 0.12;
    this.ringX = this.rx;
    this.ringY = this.ry;
    this.rafId = requestAnimationFrame(this.loop);
  };

  private attachHoverListeners(): void {
    const targets = document.querySelectorAll('button, a, .tag, .feat-card, .nav-cta');
    targets.forEach(el => {
      el.addEventListener('mouseenter', () => this.isHovered = true);
      el.addEventListener('mouseleave', () => this.isHovered = false);
    });
  }
}