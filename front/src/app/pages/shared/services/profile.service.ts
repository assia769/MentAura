import { Injectable, inject } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable } from 'rxjs'
import { environment } from '../../../../environments/environment'
import { UserProfile, Subject, AvailabilitySlot } from '../models'

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private http = inject(HttpClient)
  private api  = environment.apiUrl

  // ── Profile ──────────────────────────────────────────────
  getProfile(): Observable<{ profile: UserProfile }> {
    return this.http.get<{ profile: UserProfile }>(`${this.api}/api/profile`)
  }

  updateProfile(data: Partial<UserProfile>): Observable<{ profile: UserProfile }> {
    return this.http.put<{ profile: UserProfile }>(`${this.api}/api/profile`, data)
  }

  // ── Subjects ─────────────────────────────────────────────
  getSubjects(): Observable<{ subjects: Subject[] }> {
    return this.http.get<{ subjects: Subject[] }>(`${this.api}/api/profile/subjects`)
  }

  addSubject(data: Omit<Subject, '_id' | 'userId' | 'createdAt' | 'updatedAt'>): Observable<{ subject: Subject }> {
    return this.http.post<{ subject: Subject }>(`${this.api}/api/profile/subjects`, data)
  }

  updateSubject(id: string, data: Partial<Subject>): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.api}/api/profile/subjects/${id}`, data)
  }

  deleteSubject(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.api}/api/profile/subjects/${id}`)
  }

  // ── Availability ─────────────────────────────────────────
  getAvailability(): Observable<{ availability: AvailabilitySlot[] }> {
    return this.http.get<{ availability: AvailabilitySlot[] }>(`${this.api}/api/profile/availability`)
  }

  updateAvailability(slots: AvailabilitySlot[]): Observable<{ message: string; slots: AvailabilitySlot[] }> {
    return this.http.put<{ message: string; slots: AvailabilitySlot[] }>(
      `${this.api}/api/profile/availability`,
      { slots }
    )
  }
}