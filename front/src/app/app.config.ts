import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core'
import { provideRouter } from '@angular/router'
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http'
import { routes } from './app.routes'
// ✅ Utilise le nom du fichier existant dans ton projet
import { authInterceptor } from './core/interceptors/auth.interceptor'
import { registerLocaleData } from '@angular/common'
   import localeFr from '@angular/common/locales/fr'
   registerLocaleData(localeFr, 'fr')
   
export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(
      withFetch(),
      withInterceptors([authInterceptor])
    )
  ]
}