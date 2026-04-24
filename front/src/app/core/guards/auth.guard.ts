import { inject } from '@angular/core'
import { CanActivateFn, Router } from '@angular/router'
import { AuthService } from '../services/auth.service'

export const authGuard: CanActivateFn = (route) => {
  const auth   = inject(AuthService)
  const router = inject(Router)

  if (!auth.isLoggedIn) {
    return router.createUrlTree(['/'])
  }

  const requiredRole = route.data?.['role'] as string | undefined
  if (requiredRole && auth.currentUser?.role !== requiredRole) {
    return router.createUrlTree(['/user'])
  }

  return true
}