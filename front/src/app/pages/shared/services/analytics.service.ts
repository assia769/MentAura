import { Injectable, inject } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable } from 'rxjs'
import { environment } from '../../../../environments/environment'
import { UserStats } from '../models'

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private http = inject(HttpClient)
  private api = environment.apiUrl

  getStats(): Observable<{ stats: UserStats }> {
    return this.http.get<{ stats: UserStats }>(`${this.api}/api/analytics`)
  }

  getWeeklyStats(): Observable<{ stats: UserStats }> {
    return this.http.get<{ stats: UserStats }>(`${this.api}/api/analytics/weekly`)
  }

  getStatsBySubject(): Observable<{ stats: UserStats['parMatiere'] }> {
    return this.http.get<{ stats: UserStats['parMatiere'] }>(`${this.api}/api/analytics/subjects`)
  }
}