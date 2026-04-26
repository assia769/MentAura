import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http'
import { inject } from '@angular/core'
import { catchError, switchMap, throwError } from 'rxjs'
import { AuthService } from '../services/auth.service'

export const jwtInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const auth  = inject(AuthService)
  const token = auth.accessToken

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      // Auto-refresh on 401 (except auth endpoints)
      if (err.status === 401 && !req.url.includes('/api/auth/')) {
        return auth.refreshToken().pipe(
          switchMap(res => {
            const retried = req.clone({
              setHeaders: { Authorization: `Bearer ${res.accessToken}` }
            })
            return next(retried)
          }),
          catchError(refreshErr => {
            auth.logout()
            return throwError(() => refreshErr)
          })
        )
      }
      return throwError(() => err)
    })
  )
}