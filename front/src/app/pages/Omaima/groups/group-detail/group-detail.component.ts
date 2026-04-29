import { Component, OnInit, inject } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, Router } from '@angular/router'
import { GroupsService } from '../../../shared/services/groups.service'
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

  group:   GroupEtude | null = null
  loading  = true
  error    = ''
  inviteEmail = ''
  inviting = false
  inviteMsg = ''

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') ?? ''
    this.groupsSvc.getGroupById(id).subscribe({
      next: res => { this.group = res.group; this.loading = false },
      error: ()  => { this.error = 'Groupe introuvable.'; this.loading = false }
    })
  }

  invite() {
    if (!this.inviteEmail || !this.group) return
    this.inviting = true
    this.groupsSvc.inviteMember(this.group._id, this.inviteEmail).subscribe({
      next: () => { this.inviteMsg = 'Invitation envoyée !'; this.inviteEmail = ''; this.inviting = false; setTimeout(() => this.inviteMsg = '', 3000) },
      error: ()  => { this.inviteMsg = 'Erreur envoi.'; this.inviting = false }
    })
  }

  leave() {
    if (!this.group) return
    this.groupsSvc.leaveGroup(this.group._id).subscribe({
      next: () => this.router.navigate(['/user/groups'])
    })
  }

  back() { this.router.navigate(['/user/groups']) }
}