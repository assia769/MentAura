import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http'
import { inject } from '@angular/core'
import { catchError, switchMap, throwError } from 'rxjs'
import { AuthService } from '../services/auth.service'

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService)
  const token = auth.accessToken

  // ✅ Ajouter token à la requête
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {

      const isAuthRoute = req.url.includes('/api/auth/')

      // 🔥 Si 401 → refresh
      if (err.status === 401 && !isAuthRoute) {
        console.warn('[Interceptor] 401 → refresh')

        return auth.refreshToken().pipe(
          switchMap(() => {
            // ✅ IMPORTANT : on prend le token MAJ depuis le service
            const updatedToken = auth.accessToken

            if (!updatedToken) {
              auth.logout()
              return throwError(() => new Error('No token after refresh'))
            }

            console.log('[Interceptor] retry avec nouveau token')

            const retryReq = req.clone({
              setHeaders: { Authorization: `Bearer ${updatedToken}` }
            })

            return next(retryReq)
          }),
          catchError(() => {
            console.error('[Interceptor] refresh failed → logout')
            auth.logout()
            return throwError(() => err)
          })
        )
      }

      return throwError(() => err)
    })
  )
}