import { Component, OnInit, inject } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, Router } from '@angular/router'
import { GroupsService } from '../../../shared/services/groups.service'
import { AuthService } from '../../../../core/services/auth.service'
import { GroupEtude } from '../../../shared/models'

@Component({
  selector: 'app-group-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './group-detail.component.html',
  styleUrls: ['./group-detail.component.scss']
})
export class GroupDetailComponent implements OnInit {
  private route     = inject(ActivatedRoute)
  private groupsSvc = inject(GroupsService)
  private router    = inject(Router)
  private authSvc   = inject(AuthService)

  group:        GroupEtude | null = null
  loading       = true
  error         = ''
  currentUserId = ''

  newMessage  = ''
  messages:   any[] = []
  inviteEmail = ''
  inviting    = false
  inviteMsg   = ''

  ngOnInit() {
    this.currentUserId = this.authSvc.currentUser?.userId ?? ''
    const id = this.route.snapshot.paramMap.get('id') ?? ''
    this.loadGroupData(id)
  }

  loadGroupData(id: string) {
    this.groupsSvc.getGroupById(id).subscribe({
      next: res => {
        this.group   = res.group
        this.loading = false
        this.loadMessages(id)
      },
      error: () => { this.error = 'Groupe introuvable.'; this.loading = false }
    })
  }

  loadMessages(groupId: string) {
    this.groupsSvc.getMessages(groupId).subscribe({
      next: res => {
        this.messages = res.messages.map((m: any) => ({
          user:  m.auteurId?.toString() === this.currentUserId ? 'Moi' : (m.authorName?.trim() || 'Utilisateur'),
          contenu: m.contenu,
          date:    m.createdAt,
          type:    'text'
        }))
        setTimeout(() => {
          const chatBody = document.querySelector('.chat-body')
          if (chatBody) chatBody.scrollTop = chatBody.scrollHeight
        }, 100)
      }
    })
  }

  sendMessage() {
    if (!this.newMessage.trim() || !this.group) return

    const content = this.newMessage
    this.messages.push({
      user:    'Moi',
      contenu: content,
      date:    new Date().toISOString(),
      type:    'text'
    })
    this.newMessage = ''

    setTimeout(() => {
      const chatBody = document.querySelector('.chat-body')
      if (chatBody) chatBody.scrollTop = chatBody.scrollHeight
    }, 100)

    this.groupsSvc.sendMessage(this.group._id, content).subscribe({
      error: () => {
        this.messages.pop()
        this.newMessage = content
      }
    })
  }

  invite() {
    if (!this.inviteEmail || !this.group) return
    this.inviting = true
    this.groupsSvc.inviteMember(this.group._id, this.inviteEmail).subscribe({
      next: () => {
        this.inviteMsg   = 'Invitation envoyée !'
        this.inviteEmail = ''
        this.inviting    = false
        setTimeout(() => this.inviteMsg = '', 3000)
      },
      error: () => { this.inviteMsg = 'Erreur envoi.'; this.inviting = false }
    })
  }

  leave() {
    if (!this.group) return
    if (confirm('Voulez-vous vraiment quitter ce groupe ?')) {
      this.groupsSvc.leaveGroup(this.group._id).subscribe({
        next: () => this.router.navigate(['/user/groups'])
      })
    }
  }

  back() { this.router.navigate(['/user/groups']) }

  getUserInitial(userId: unknown): string {
    return String(userId).slice(0, 2).toUpperCase()
  }
  getInitials(nom: string | undefined): string {
    if (!nom) return '?'
    return nom.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }
  getUserId(userId: unknown): string {
    return String(userId)
  }
}