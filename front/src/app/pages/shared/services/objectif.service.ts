import { Injectable, inject } from '@angular/core'
import { HttpClient, HttpParams } from '@angular/common/http'
import { Observable } from 'rxjs'
import { environment } from '../../../../environments/environment'
import { Objectif, CreateObjectifPayload } from '../models'

@Injectable({ providedIn: 'root' })
export class ObjectifService {
  private http = inject(HttpClient)
  private api = environment.apiUrl

  getObjectifs(statut?: string): Observable<{ objectifs: Objectif[] }> {
    const params = statut ? new HttpParams().set('statut', statut) : new HttpParams()
    return this.http.get<{ objectifs: Objectif[] }>(`${this.api}/api/objectifs`, { params })
  }

  createObjectif(data: CreateObjectifPayload): Observable<{ objectif: Objectif }> {
    return this.http.post<{ objectif: Objectif }>(`${this.api}/api/objectifs`, data)
  }

  updateObjectif(id: string, data: Partial<Objectif>): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.api}/api/objectifs/${id}`, data)
  }

  deleteObjectif(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.api}/api/objectifs/${id}`)
  }
}
