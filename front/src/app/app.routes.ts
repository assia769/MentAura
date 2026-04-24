import { Routes } from '@angular/router'
import { authGuard } from './core/guards/auth.guard'

export const routes: Routes = [
  // ── Public ─────────────────────────────────────────────────────────────────
  {
    path: '',
    loadComponent: () =>
      import('./pages/landing/landing.component').then(m => m.LandingComponent)
  },
  // {
  //   path: 'mfa',
  //   loadComponent: () =>
  //     import('./pages/auth/mfa/mfa.component').then(m => m.MfaComponent)
  // },

  // // ── Admin (protected) ───────────────────────────────────────────────────────
  // {
  //   path: 'admin',
  //   canActivate: [authGuard],
  //   data: { role: 'admin' },
  //   children: [
  //     {
  //       path: 'dashboard',
  //       loadComponent: () =>
  //         import('./pages/admin/dashboard/admin-dashboard.component')
  //           .then(m => m.AdminDashboardComponent)
  //     },
  //     { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
  //   ]
  // },

  // // ── User (protected) ────────────────────────────────────────────────────────
  // {
  //   path: 'user',
  //   canActivate: [authGuard],
  //   loadComponent: () =>
  //     import('./pages/user/shell/user-shell.component').then(m => m.UserShellComponent),
  //   children: [
  //     // Khadija
  //     {
  //       path: 'sessions',
  //       loadComponent: () =>
  //         import('./pages/user/khadija/sessions/sessions.component')
  //           .then(m => m.SessionsComponent)
  //     },
  //     {
  //       path: 'notifications',
  //       loadComponent: () =>
  //         import('./pages/user/khadija/notifications/notifications.component')
  //           .then(m => m.NotificationsComponent)
  //     },
  //     {
  //       path: 'settings',
  //       loadComponent: () =>
  //         import('./pages/user/khadija/settings/settings.component')
  //           .then(m => m.SettingsComponent)
  //     },
  //     // Omaima
  //     {
  //       path: 'profile',
  //       loadComponent: () =>
  //         import('./pages/user/omaima/profile/profile.component')
  //           .then(m => m.ProfileComponent)
  //     },
  //     {
  //       path: 'groups',
  //       loadComponent: () =>
  //         import('./pages/user/omaima/groups/groups.component')
  //           .then(m => m.GroupsComponent)
  //     },
  //     {
  //       path: 'analytics',
  //       loadComponent: () =>
  //         import('./pages/user/omaima/analytics/analytics.component')
  //           .then(m => m.AnalyticsComponent)
  //     },
  //     { path: '', redirectTo: 'sessions', pathMatch: 'full' }
  //   ]
  // },

  // ── Fallback ────────────────────────────────────────────────────────────────
  { path: '**', redirectTo: '' }
]