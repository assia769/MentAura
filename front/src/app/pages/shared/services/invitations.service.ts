import { Injectable, inject } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable } from 'rxjs'
import { environment } from '../../../../environments/environment'
import { Invitation } from '../models'

@Injectable({ providedIn: 'root' })
export class InvitationsService {
  private http = inject(HttpClient)
  private api  = environment.apiUrl

  getMyInvitations(): Observable<{ invitations: Invitation[] }> {
    return this.http.get<{ invitations: Invitation[] }>(`${this.api}/api/invitations`)
  }

  respond(id: string, action: 'accept' | 'decline'): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.api}/api/invitations/${id}`, { action })
  }
  getSentInvitations(): Observable<{ invitations: Invitation[] }> {
  return this.http.get<{ invitations: Invitation[] }>(`${this.api}/api/invitations/sent`)
}
}