import { Component, HostListener, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core'
import { CommonModule } from '@angular/common'

@Component({
  selector: 'app-cursor',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,  // ✅ fix NG0100
  template: `
    <div class="cursor" [style.left.px]="x" [style.top.px]="y"></div>
  `,
  styles: [`
    .cursor {
      position: fixed;
      width: 12px; height: 12px;
      background: white;
      border-radius: 50%;
      pointer-events: none;
      transform: translate(-50%, -50%);
      z-index: 9999;
      transition: left .1s, top .1s;
    }
  `]
})
export class CursorComponent {
  x = -100
  y = -100
  private cdr = inject(ChangeDetectorRef)

  @HostListener('document:mousemove', ['$event'])
  onMove(e: MouseEvent) {
    this.x = e.clientX
    this.y = e.clientY
    this.cdr.markForCheck()  // ✅
  }
}