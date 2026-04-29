import { Component, inject } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, Router } from '@angular/router'
import { GroupsService } from '../../../shared/services/groups.service'

@Component({
  selector: 'app-group-invite',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './group-invite.component.html',
  styleUrls: ['./group-invite.component.scss']
})
export class GroupInviteComponent {
  private route     = inject(ActivatedRoute)
  private groupsSvc = inject(GroupsService)
  private router    = inject(Router)

  groupId   = this.route.snapshot.paramMap.get('id') ?? ''
  email     = ''
  sending   = false
  success   = ''
  error     = ''

  send() {
    if (!this.email.trim()) return
    this.sending = true
    this.error   = ''
    this.success  = ''

    this.groupsSvc.inviteMember(this.groupId, this.email).subscribe({
      next: () => {
        this.success = `Invitation envoyée à ${this.email}`
        this.email   = ''
        this.sending = false
      },
      error: () => {
        this.error   = 'Erreur lors de l\'envoi de l\'invitation.'
        this.sending = false
      }
    })
  }

  back() { this.router.navigate(['/user/groups', this.groupId]) }
}