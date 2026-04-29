import { inject } from '@angular/core'
import { CanActivateFn, Router } from '@angular/router'
import { AuthService } from '../services/auth.service'

export const authGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService)
  const router = inject(Router)

  const user = auth.currentUser

  // ⛔ Pas encore chargé (évite faux logout pendant init)
  if (user === undefined) {
    return false
  }

  // ❌ Pas connecté
  if (!user) {
    router.navigate(['/'])
    return false
  }

  // 🔐 Check rôle si nécessaire
  const requiredRole = route.data?.['role']

  if (requiredRole && user.role !== requiredRole) {
    router.navigate(['/'])
    return false
  }

  return true
}