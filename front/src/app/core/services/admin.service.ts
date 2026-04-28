import { Injectable, inject } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable } from 'rxjs'
import { environment } from '../../../environments/environment'

export interface AdminStats {
  totalUsers: number
  totalStudents: number
  activeUsers: number
  totalSessions: number
  totalGroups: number
  tauxCompletionGlobal: number
  recentSessions: RecentSession[]
  topMatieres: TopMatiere[]
}

export interface RecentSession {
  _id: string
  titre: string
  statut: string
  dateDebut: string
  heuresRealisees: number
}

export interface TopMatiere {
  _id: string
  totalHeures: number
}

// export interface AuditLog {
//   _id: string
//   action: string
//   ipAddress: string
//   userAgent: string
//   createdAt: string
//   user?: { nom: string; prenom: string; email: string }
// }
export interface AuditLog {
  _id: string
  userId?: string
  action: string
  ipAddress?: string | null      // ← add ?  (was: string)
  userAgent?: string | null      // ← add ?  (was: string)
  createdAt: string | Date
  user?: {
    _id: string
    nom: string
    prenom: string
    email: string
  } | null
}
export interface AuditResponse {
  logs: AuditLog[]
  total: number
  page: number
  limit: number
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient)
  private api  = environment.apiUrl

  getStats(): Observable<AdminStats> {
    return this.http.get<AdminStats>(`${this.api}/api/admin/stats`)
  }

  getAuditLogs(suspicious = false, page = 1): Observable<AuditResponse> {
    return this.http.get<AuditResponse>(
      `${this.api}/api/admin/audit-logs?suspicious=${suspicious}&page=${page}`
    )
  }

  getUsers(): Observable<{ users: unknown[] }> {
    return this.http.get<{ users: unknown[] }>(`${this.api}/api/admin/users`)
  }

  // toggleUser(userId: string, isActive: boolean): Observable<unknown> {
  //   return this.http.patch(`${this.api}/api/admin/users`, { userId, isActive })
  // }
  // // Dans AdminService, assurez-vous que ces méthodes existent :

toggleUser(userId: string, isActive: boolean): Observable<unknown> {
  return this.http.patch(`${this.api}/api/admin/users`, { userId, isActive })
}

deleteUser(userId: string): Observable<unknown> {
  return this.http.delete(`${this.api}/api/admin/users/${userId}`)
}

updateUser(userId: string, data: Partial<any>): Observable<any> {
  return this.http.put(`${this.api}/api/admin/users/${userId}`, data)
}
}