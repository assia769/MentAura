import { Routes } from '@angular/router'
import { authGuard } from './core/guards/auth.guard'

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/landing/landing.component').then(m => m.LandingComponent) },

  {
    path: 'verify-email',
    loadComponent: () => import('./pages/verify-email/verify-email.component').then(m => m.VerifyEmailComponent)
  },
  {
    path: 'check-email',
    loadComponent: () => import('./pages/check-email/check-email.component').then(m => m.CheckEmailComponent)
  },

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
    loadComponent: () => import('./pages/user/shell/user-shell.component').then(m => m.UserShellComponent),
    children: [
      // ✅ Redirige /user vers /user/profile par défaut
      { path: '', redirectTo: 'profile', pathMatch: 'full' },

      // ✅ OMAIMA — Module 02
      { path: 'profile', loadComponent: () => import('./pages/Omaima/profile/profile-view/profile-view.component').then(m => m.ProfileViewComponent) },
      { path: 'dashboard', redirectTo: 'profile', pathMatch: 'full' },
      { path: 'profile/edit', loadComponent: () => import('./pages/Omaima/profile/profile-edit/profile-edit.component').then(m => m.ProfileEditComponent) },
      { path: 'groups', loadComponent: () => import('./pages/Omaima/groups/groups-list/groups-list.component').then(m => m.GroupsListComponent) },
      { path: 'groups/create', loadComponent: () => import('./pages/Omaima/groups/group-create/group-create.component').then(m => m.GroupCreateComponent) },
      { path: 'groups/:id', loadComponent: () => import('./pages/Omaima/groups/group-detail/group-detail.component').then(m => m.GroupDetailComponent) },
      { path: 'groups/:id/invite', loadComponent: () => import('./pages/Omaima/groups/group-invite/group-invite.component').then(m => m.GroupInviteComponent) },
{ 
  path: 'invitations', 
  loadComponent: () => import('./pages/Omaima/invitations/invitations-list/invitations-list.component')
    .then(m => m.InvitationsListComponent) 
},      { path: 'analytics', loadComponent: () => import('./pages/Omaima/analytics/analytics-dashboard/analytics-dashboard.component').then(m => m.AnalyticsDashboardComponent) },
      { path: 'planning', loadComponent: () => import('./pages/planning/planning.component').then(m => m.PlanningComponent) },
    ]
  },

  { path: '**', redirectTo: '' }
]