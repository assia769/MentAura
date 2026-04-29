import { Injectable, inject } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable } from 'rxjs'
import { environment } from '../../../../environments/environment'
import { GroupEtude } from '../models'

@Injectable({ providedIn: 'root' })
export class GroupsService {
  private http = inject(HttpClient)
  private api = environment.apiUrl

  getGroups(): Observable<{ groups: GroupEtude[] }> {
    return this.http.get<{ groups: GroupEtude[] }>(`${this.api}/api/groups`)
  }

  getGroupById(id: string): Observable<{ group: GroupEtude }> {
    return this.http.get<{ group: GroupEtude }>(`${this.api}/api/groups/${id}`)
  }

  createGroup(data: Partial<GroupEtude>): Observable<{ group: GroupEtude }> {
    return this.http.post<{ group: GroupEtude }>(`${this.api}/api/groups`, data)
  }

  inviteMember(groupId: string, email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api}/api/groups/invite`, { groupId, email })
  }

  leaveGroup(groupId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.api}/api/groups/${groupId}/members`)
  }
}