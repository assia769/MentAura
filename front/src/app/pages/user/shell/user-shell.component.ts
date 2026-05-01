import { Component, inject, OnInit, OnDestroy, HostListener, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router'
import { AuthService } from '../../../core/services/auth.service'
import { CursorComponent } from '../../landing/cursor/cursor.component'
import { NotificationService } from '../../shared/services/notification.service'
import { GroupsService } from '../../shared/services/groups.service'
import { InvitationsService } from '../../shared/services/invitations.service'
@Component({
  selector: 'app-user-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, CursorComponent],
  templateUrl: './user-shell.component.html',
  styleUrls: ['./user-shell.component.scss']
})
export class UserShellComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService)
  private invSvc = inject(InvitationsService)
pendingInvitations = signal<number>(0)
  private groupsSvc = inject(GroupsService)
  notifSvc     = inject(NotificationService)
  
  groupCount = signal<number>(0)



  ngOnInit() {
    this.notifSvc.startPolling()
    this.invSvc.getMyInvitations().subscribe({
  next: res => {
    const pending = (res.invitations ?? []).filter((i: any) => i.statut === 'pending').length
    this.pendingInvitations.set(pending)
  }
})
    
    // Charger le nombre de groupes
    this.groupsSvc.getGroups().subscribe({
      next: res => this.groupCount.set(res.groups.length)
    })

  }
  ngOnDestroy() { this.notifSvc.stopPolling()  }

  logout(): void { this.auth.logout() }

  get totalUnreadMessages(): number {
    return this.groupCount()
  }
  

  // Fermer le panneau si clic en dehors
  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    const target = e.target as HTMLElement
    if (!target.closest('.notif-wrapper')) {
      this.notifSvc.close()
    }
  }
}