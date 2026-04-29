import {
  Component, HostListener, ChangeDetectionStrategy,
  ChangeDetectorRef, inject, OnInit, OnDestroy, PLATFORM_ID
} from '@angular/core'
import { isPlatformBrowser } from '@angular/common'
import { CommonModule } from '@angular/common'

@Component({
  selector: 'app-cursor',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *ngIf="isBrowser">
      <div class="cursor-aura"  [style.left.px]="ax" [style.top.px]="ay"></div>
      <div class="cursor-glow"  [style.left.px]="gx" [style.top.px]="gy"></div>
      <div class="cursor-ring"
           [class.hovered]="hovered"
           [class.clicking]="clicking"
           [style.left.px]="rx" [style.top.px]="ry">
        <svg class="ring-svg" viewBox="0 0 44 44">
          <circle class="ring-track" cx="22" cy="22" r="18"/>
          <circle class="ring-arc"   cx="22" cy="22" r="18"
                  [style.stroke-dashoffset]="dashOffset"/>
        </svg>
      </div>
      <div class="cursor-dot"
           [class.hovered]="hovered"
           [style.left.px]="x" [style.top.px]="y"></div>
    </ng-container>
  `,
  styles: [`
    :host { pointer-events: none; position: fixed; inset: 0; z-index: 9999; }
    .cursor-aura {
      position: fixed; width: 500px; height: 500px; border-radius: 50%;
      transform: translate(-50%, -50%);
      background: radial-gradient(circle, rgba(201,168,76,.07) 0%, rgba(201,168,76,.03) 35%, transparent 70%);
      pointer-events: none; mix-blend-mode: screen; will-change: left, top;
      transition: left .18s cubic-bezier(.22,1,.36,1), top .18s cubic-bezier(.22,1,.36,1);
    }
    .cursor-glow {
      position: fixed; width: 120px; height: 120px; border-radius: 50%;
      transform: translate(-50%, -50%);
      background: radial-gradient(circle, rgba(201,168,76,.28) 0%, rgba(201,168,76,.10) 40%, transparent 70%);
      pointer-events: none; mix-blend-mode: screen; will-change: left, top;
      filter: blur(8px); transition: left .06s linear, top .06s linear;
    }
    .cursor-ring {
      position: fixed; width: 44px; height: 44px;
      transform: translate(-50%, -50%); pointer-events: none; will-change: left, top;
      transition: left .12s cubic-bezier(.22,1,.36,1), top .12s cubic-bezier(.22,1,.36,1), transform .3s cubic-bezier(.22,1,.36,1);
      &.hovered  { transform: translate(-50%,-50%) scale(1.7); }
      &.clicking { transform: translate(-50%,-50%) scale(.82); }
    }
    .ring-svg { width: 100%; height: 100%; transform: rotate(-90deg); }
    .ring-track { fill: none; stroke: rgba(201,168,76,.18); stroke-width: 1px; }
    .ring-arc {
      fill: none; stroke: url(#goldGrad); stroke-width: 1.8px; stroke-linecap: round;
      stroke-dasharray: 113;
      filter: drop-shadow(0 0 3px rgba(201,168,76,.9)) drop-shadow(0 0 8px rgba(201,168,76,.5));
      transition: stroke-dashoffset .05s linear;
    }
    .cursor-dot {
      position: fixed; width: 5px; height: 5px; border-radius: 50%;
      background: #c9a84c;
      box-shadow: 0 0 4px 1px rgba(201,168,76,.9), 0 0 12px 3px rgba(201,168,76,.5), 0 0 24px 6px rgba(201,168,76,.2);
      transform: translate(-50%, -50%); pointer-events: none; will-change: left, top;
      transition: transform .2s cubic-bezier(.22,1,.36,1), opacity .2s;
      &.hovered { transform: translate(-50%,-50%) scale(0); opacity: 0; }
    }
  `]
})
export class CursorComponent implements OnInit, OnDestroy {
  private cdr        = inject(ChangeDetectorRef)
  private platformId = inject(PLATFORM_ID)

  isBrowser = false

  x = -300; y = -300
  rx = -300; ry = -300
  gx = -300; gy = -300
  ax = -300; ay = -300

  hovered    = false
  clicking   = false
  dashOffset = 28

  private rafId   = 0
  private targetX = -300; private targetY = -300
  private ringX   = -300; private ringY   = -300
  private auraX   = -300; private auraY   = -300

  ngOnInit() {
    this.isBrowser = isPlatformBrowser(this.platformId)
    if (!this.isBrowser) return
    this.injectSvgDefs()
    this.loop()
  }

  ngOnDestroy() {
    if (this.isBrowser) cancelAnimationFrame(this.rafId)
  }

  @HostListener('document:mousemove', ['$event'])
  onMove(e: MouseEvent) {
    if (!this.isBrowser) return
    this.targetX = e.clientX; this.targetY = e.clientY
    this.x = e.clientX; this.y = e.clientY
    this.gx = e.clientX; this.gy = e.clientY
    this.cdr.markForCheck()
  }

  @HostListener('document:mousedown')
  onDown() { if (!this.isBrowser) return; this.clicking = true;  this.cdr.markForCheck() }

  @HostListener('document:mouseup')
  onUp()   { if (!this.isBrowser) return; this.clicking = false; this.cdr.markForCheck() }

  @HostListener('document:mouseover', ['$event'])
  onOver(e: MouseEvent) {
    if (!this.isBrowser) return
    const el = e.target as HTMLElement
    this.hovered = !!(el.closest('a,button,[role=button],[tabindex]'))
    this.cdr.markForCheck()
  }

  private loop() {
    this.rafId = requestAnimationFrame(() => {
      const ease = (from: number, to: number, f: number) => from + (to - from) * f
      this.ringX = ease(this.ringX, this.targetX, .18)
      this.ringY = ease(this.ringY, this.targetY, .18)
      this.auraX = ease(this.auraX, this.targetX, .06)
      this.auraY = ease(this.auraY, this.targetY, .06)
      this.rx = this.ringX; this.ry = this.ringY
      this.ax = this.auraX; this.ay = this.auraY
      const t = Date.now() / 1200
      const pct = (Math.sin(t) * .5 + .5) * .7 + .15
      this.dashOffset = +(113 * (1 - pct)).toFixed(2)
      this.cdr.markForCheck()
      this.loop()
    })
  }

  private injectSvgDefs() {
    if (document.getElementById('cursor-gold-grad')) return
    const ns  = 'http://www.w3.org/2000/svg'
    const svg = document.createElementNS(ns, 'svg')
    svg.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden')
    svg.innerHTML = `<defs><linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#ffe08a"/>
      <stop offset="50%"  stop-color="#c9a84c"/>
      <stop offset="100%" stop-color="#9c6f1e"/>
    </linearGradient></defs>`
    document.body.prepend(svg)
  }
}