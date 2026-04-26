import { Routes } from '@angular/router'
import { authGuard } from './core/guards/auth.guard'

// app.routes.ts
export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/landing/landing.component').then(m => m.LandingComponent) },

  // ✅ Pages email
  {
    path: 'verify-email',
    loadComponent: () => import('./pages/verify-email/verify-email.component').then(m => m.VerifyEmailComponent)
  },
  {
    path: 'check-email',
    loadComponent: () => import('./pages/check-email/check-email.component').then(m => m.CheckEmailComponent)
  },

  // Admin & User protégés
  {
    path: 'admin',
    canActivate: [authGuard],
    data: { role: 'admin' },
    children: [
      { path: 'dashboard', loadComponent: () => import('./pages/admin/dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  {
    path: 'user',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/user/shell/user-shell.component').then(m => m.UserShellComponent)
  },

  { path: '**', redirectTo: '' }
]