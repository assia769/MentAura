import { Injectable, inject } from '@angular/core'
import { HttpClient, HttpHeaders } from '@angular/common/http'
import { Observable } from 'rxjs'
import { environment } from '../../../../environments/environment'
import { GroupEtude } from '../models'
import { AuthService } from '../../../core/services/auth.service'

@Injectable({ providedIn: 'root' })
export class GroupsService {
  private http    = inject(HttpClient)
  private authSvc = inject(AuthService)
  private api     = environment.apiUrl

  private headers(): { [key: string]: string } {
    const user = this.authSvc.currentUser
    console.log('userId envoyé:', user?.userId)
    return {
      'Content-Type':  'application/json',
      'x-user-id':     user?.userId      ?? '',
      'Authorization': user?.accessToken ? `Bearer ${user.accessToken}` : ''
    }
  }

  getGroups(): Observable<{ groups: GroupEtude[] }> {
    return this.http.get<{ groups: GroupEtude[] }>(
      `${this.api}/api/groups`,
      { headers: this.headers() }
    )
  }

  getGroupById(id: string): Observable<{ group: GroupEtude }> {
    return this.http.get<{ group: GroupEtude }>(
      `${this.api}/api/groups/${id}`,
      { headers: this.headers() }
    )
  }

  createGroup(data: Partial<GroupEtude>): Observable<{ group: GroupEtude }> {
    return this.http.post<{ group: GroupEtude }>(
      `${this.api}/api/groups`,
      data,
      { headers: this.headers() }
    )
  }

  inviteMember(groupId: string, email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.api}/api/groups/invite`,
      { groupId, email },
      { headers: this.headers() }
    )
  }

  leaveGroup(groupId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.api}/api/groups/${groupId}/members`,
      { headers: this.headers() }
    )
  }

  getMessages(groupId: string): Observable<{ messages: any[] }> {
    return this.http.get<{ messages: any[] }>(
      `${this.api}/api/groups/${groupId}/messages`,
      { headers: this.headers() }
    )
  }

  sendMessage(groupId: string, contenu: string): Observable<any> {
    return this.http.post(
      `${this.api}/api/groups/${groupId}/messages`,
      { contenu },
      { headers: this.headers() }
    )
  }
}