import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http'
import { inject } from '@angular/core'
import { catchError, switchMap, throwError } from 'rxjs'
import { AuthService } from '../services/auth.service'

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService)
  const token = auth.accessToken

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {

      const isAuthRoute = req.url.includes('/api/auth/')

      if (err.status === 401 && !isAuthRoute) {
        return auth.refreshToken().pipe(
          switchMap(res => {
            const retryReq = req.clone({
              setHeaders: { Authorization: `Bearer ${res.accessToken}` }
            })

            return next(retryReq)
          }),
          catchError(() => {
            // ✅ VERSION SAFE
            console.warn('[Auth] refresh failed')

            // 🔥 IMPORTANT: ne PAS logout direct ici
            // sinon boucle que tu avais avant

            return throwError(() => err)
          })
        )
      }

      return throwError(() => err)
    })
  )
}