import { Injectable, inject } from '@angular/core'
import { HttpClient, HttpParams } from '@angular/common/http'
import { Observable } from 'rxjs'
import { environment } from '../../../../environments/environment'
import { Session, SessionFilters, GeneratePayload } from '../models'

@Injectable({ providedIn: 'root' })
export class PlanningService {
  private http = inject(HttpClient)
  private api = environment.apiUrl

  getSessions(filters: SessionFilters): Observable<{ sessions: Session[] }> {
    let params = new HttpParams().set('semaine', filters.semaine)
    if (filters.statut)    params = params.set('statut', filters.statut)
    if (filters.matiereId) params = params.set('matiereId', filters.matiereId)
    return this.http.get<{ sessions: Session[] }>(`${this.api}/api/sessions`, { params })
  }

  createSession(data: Partial<Session>): Observable<{ session: Session }> {
    return this.http.post<{ session: Session }>(`${this.api}/api/sessions`, data)
  }

  updateSession(id: string, data: Partial<Session>): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.api}/api/sessions/${id}`, data)
  }

  deleteSession(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.api}/api/sessions/${id}`)
  }

  startSession(id: string): Observable<{ session: Session }> {
    return this.http.post<{ session: Session }>(`${this.api}/api/sessions/${id}/start`, {})
  }

  // ✅ CORRECTION ICI - Ajout du champ 'statut' dans le type de retour
  completeSession(id: string, heuresRealisees: number): Observable<{ 
    session: Session; 
    pointsGagnes: number;
    statut: string;  // ← AJOUTÉ
  }> {
    return this.http.post<{ 
      session: Session; 
      pointsGagnes: number;
      statut: string;  // ← AJOUTÉ
    }>(
      `${this.api}/api/sessions/${id}/complete`,
      { heuresRealisees }
    )
  }

  generateSessions(payload: GeneratePayload): Observable<{ sessions: Session[]; nbCreees: number; message?: string }> {
    return this.http.post<{ sessions: Session[]; nbCreees: number; message?: string }>(
      `${this.api}/api/sessions/generate`,
      payload
    )
  }
}