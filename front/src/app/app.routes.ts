import { Routes } from '@angular/router'
import { authGuard } from './core/guards/auth.guard'

export const routes: Routes = [
  // ── Public ─────────────────────────────────────────────────────────────
  {
    path: '',
    loadComponent: () =>
      import('./pages/landing/landing.component').then(m => m.LandingComponent)
  },

  // ── MFA ────────────────────────────────────────────────────────────────
  // {
  //   path: 'mfa',
  //   loadComponent: () =>
  //     import('./pages/auth/mfa/mfa.component').then(m => m.MfaComponent)
  // },

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

  // ── User — placeholder Omaima & Khadija ───────────────────────────────
  // {
  //   path: 'user',
  //   canActivate: [authGuard],
  //   loadComponent: () =>
  //     import('./pages/user/shell/user-shell.component').then(m => m.UserShellComponent),
  //   children: [
  //     // Khadija
  //     // { path: 'sessions', ... }
  //     // { path: 'notifications', ... }
  //     // { path: 'settings', ... }
  //     // Omaima
  //     // { path: 'profile', ... }
  //     // { path: 'groups', ... }
  //     // { path: 'analytics', ... }
  //     { path: '', pathMatch: 'full', component: undefined as any }
  //   ]
  // },
{
  path: 'user',
  canActivate: [authGuard],
  loadComponent: () =>
    import('./pages/user/shell/user-shell.component').then(m => m.UserShellComponent),
  children: [
    // Khadija
    // { path: 'sessions', ... }
    // Omaima
    // { path: 'profile', ... }
    { path: '', redirectTo: '/user/dashboard', pathMatch: 'full' }  // ✅ Fix
  ]
},
  // ── Fallback ────────────────────────────────────────────────────────────
  { path: '**', redirectTo: '' }
]