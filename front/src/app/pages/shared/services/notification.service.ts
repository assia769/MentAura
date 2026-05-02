import { Injectable, inject, signal } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Router } from '@angular/router'
import { interval, Subscription } from 'rxjs'
import { switchMap, startWith } from 'rxjs/operators'
import { environment } from '../../../../environments/environment'
import { AuthService } from '../../../core/services/auth.service'

export interface AppNotification {
  _id:       string
  type:      string
  titre:     string
  contenu:   string
  isLue:     boolean
  createdAt: string
  refId:     string | null
  refModel:  string | null
  groupeId:  string | null
}

export interface UnreadGroup {
  groupId: string
  nom:     string
  count:   number
}

export interface NotifResponse {
  notifications:  AppNotification[]
  unreadMessages: UnreadGroup[]
  totalUnread:    number
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http    = inject(HttpClient)
  private router  = inject(Router)
  private authSvc = inject(AuthService)
  private api     = environment.apiUrl

  notifications  = signal<AppNotification[]>([])
  unreadMessages = signal<UnreadGroup[]>([])
  totalUnread    = signal<number>(0)
  isOpen         = signal<boolean>(false)

  private pollSub?: Subscription

  // ── Headers avec x-user-id ─────────────────────────────────────────────
  private headers(): { [key: string]: string } {
    const user = this.authSvc.currentUser
    return {
      'Content-Type':  'application/json',
      'x-user-id':     user?.userId      ?? '',
      'Authorization': user?.accessToken ? `Bearer ${user.accessToken}` : ''
    }
  }

  // ── Polling toutes les 30s ─────────────────────────────────────────────
  startPolling() {
    if (this.pollSub) return

    this.pollSub = interval(30_000)
      .pipe(
        startWith(0),
        switchMap(() => this.http.get<NotifResponse>(
          `${this.api}/api/notifications`,
          { headers: this.headers() }     // ← headers ajoutés
        ))
      )
      .subscribe({
        next: (res) => {
          this.notifications.set(res.notifications)
          this.unreadMessages.set(res.unreadMessages)
          this.totalUnread.set(res.totalUnread)
        },
        error: (err) => console.error('[NotifService] polling error:', err)
      })
  }

  stopPolling() {
    this.pollSub?.unsubscribe()
    this.pollSub = undefined
  }

  toggle() { this.isOpen.update(v => !v) }
  close()  { this.isOpen.set(false) }

  // ── Clic notification système ──────────────────────────────────────────
  handleClick(notif: AppNotification) {
    this.markAsRead(notif._id)
    this.close()

    if (notif.type === 'invitation') {
      this.router.navigate(notif.groupeId
        ? ['/user/groups', notif.groupeId]
        : ['/user/invitations']
      )
    } else if (notif.refModel === 'GroupeEtude') {
      this.router.navigate(['/user/groups'])
    } else {
      this.router.navigate(['/user/dashboard'])
    }
  }

  // ── Clic groupe messages non lus ───────────────────────────────────────
  goToGroup(groupId: string) {
    // 1. Marquer en DB
    this.http.post(
      `${this.api}/api/groups/${groupId}/messages/read`,
      {},
      { headers: this.headers() }         // ← appel DB avec headers
    ).subscribe()

    // 2. Retirer du state local immédiatement
    this.unreadMessages.update(list => list.filter(g => g.groupId !== groupId))
    this.recalcTotal()

    // 3. Naviguer
    this.close()
    this.router.navigate(['/user/groups', groupId])
  }

  // ── Marquer une notif comme lue ────────────────────────────────────────
  markAsRead(notifId: string) {
    this.http.patch(
      `${this.api}/api/notifications`,
      { notifId },
      { headers: this.headers() }         // ← headers ajoutés
    ).subscribe()
    this.notifications.update(list =>
      list.map(n => n._id === notifId ? { ...n, isLue: true } : n)
    )
    this.recalcTotal()
  }

  // ── Tout marquer comme lu ──────────────────────────────────────────────
  markAllAsRead() {
    this.http.patch(
      `${this.api}/api/notifications`,
      { markAll: true },
      { headers: this.headers() }         // ← headers ajoutés
    ).subscribe()
    this.notifications.update(list => list.map(n => ({ ...n, isLue: true })))
    this.recalcTotal()
  }

  private recalcTotal() {
    const unreadNotifs = this.notifications().filter(n => !n.isLue).length
    const unreadMsgs   = this.unreadMessages().reduce((acc, g) => acc + g.count, 0)
    this.totalUnread.set(unreadNotifs + unreadMsgs)
  }

  unreadCountForGroup(groupId: string): number {
    return this.unreadMessages().find(g => g.groupId === groupId)?.count ?? 0
  }
}