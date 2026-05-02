import { Injectable, inject } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable } from 'rxjs'
import { environment } from '../../../../environments/environment'
import { UserStats, AnalyticsOverview, SubjectStats } from '../models'

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private http = inject(HttpClient)
  private api  = environment.apiUrl

  getStats(): Observable<{ analytics: AnalyticsOverview }> {
    return this.http.get<{ analytics: AnalyticsOverview }>(`${this.api}/api/analytics`)
  }

  getWeeklyStats(): Observable<{ weekly: UserStats }> {
    return this.http.get<{ weekly: UserStats }>(`${this.api}/api/analytics/weekly`)
  }

  getStatsBySubject(): Observable<{ subjects: SubjectStats[] }> {
    return this.http.get<{ subjects: SubjectStats[] }>(`${this.api}/api/analytics/subjects`)
  }
}