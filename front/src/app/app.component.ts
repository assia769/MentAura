import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { CursorComponent } from './pages/landing/cursor/cursor.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, CursorComponent],
  template: `
    @if (showCursor()) {
      <app-cursor />
    }
    <router-outlet />
  `,
  host: {
    '[class.custom-cursor]': 'showCursor()'
  }
})
export class AppComponent implements OnInit {
  showCursor = signal(false);

  private readonly cursorRoutes = ['', '/', 'verify-email', 'check-email'];

  constructor(private router: Router) {}

  ngOnInit() {
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: NavigationEnd) => {
      const segment = e.urlAfterRedirects.split('/')[1].split('?')[0];
      this.showCursor.set(this.cursorRoutes.includes(segment));
    });
  }
}