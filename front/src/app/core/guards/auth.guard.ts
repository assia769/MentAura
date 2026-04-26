import { inject } from '@angular/core'
import { CanActivateFn, Router } from '@angular/router'
import { AuthService } from '../services/auth.service'

export const authGuard: CanActivateFn = (route) => {
  const auth   = inject(AuthService)
  const router = inject(Router)

  if (!auth.isLoggedIn) {
    router.navigate(['/'])
    return false
  }

  const requiredRole = route.data?.['role']
  if (requiredRole && auth.currentUser?.role !== requiredRole) {
    router.navigate(['/'])
    return false
  }

  return true
}