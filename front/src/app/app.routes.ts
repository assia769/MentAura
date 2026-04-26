import { Routes } from '@angular/router'
import { authGuard } from './core/guards/auth.guard'

export const routes: Routes = [
  // ── Public ─────────────────────────────────────────────────────────────
  {
    path: '',
    loadComponent: () =>
      import('./pages/landing/landing.component').then(m => m.LandingComponent)
  },

  // ── Admin (protected) ──────────────────────────────────────────────────
  {
    path: 'admin',
    canActivate: [authGuard],
    data: { role: 'admin' },
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/admin/dashboard/admin-dashboard.component')
            .then(m => m.AdminDashboardComponent)
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },

  // ── User (protected) ───────────────────────────────────────────────────
  {
    path: 'user',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/user/shell/user-shell.component')
        .then(m => m.UserShellComponent),
    // Pas de children pour l'instant — la page shell IS la destination
  },

  // ── Fallback ────────────────────────────────────────────────────────────
  { path: '**', redirectTo: '' }
]