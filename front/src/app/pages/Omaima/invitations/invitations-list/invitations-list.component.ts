import { Component, inject, OnInit } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Router } from '@angular/router'
import { InvitationsService } from '../../../shared/services/invitations.service'
import { Invitation } from '../../../shared/models/invitation.model'

@Component({
  selector: 'app-invitations-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './invitations-list.component.html',
  styleUrls: ['./invitations-list.component.scss']
})
export class InvitationsListComponent implements OnInit {
  private svc    = inject(InvitationsService)
  private router = inject(Router)

  received: Invitation[] = []   // invitations reçues
  sent:     Invitation[] = []   // invitations envoyées

  loading  = true
  error    = ''
  actionId = ''

  ngOnInit() {
    let receivedDone = false
    let sentDone     = false

    const checkDone = () => {
      if (receivedDone && sentDone) this.loading = false
    }

    this.svc.getMyInvitations().subscribe({
      next: res => {
        this.received = res.invitations ?? []
        receivedDone  = true
        checkDone()
      },
      error: () => {
        this.error   = 'Impossible de charger les invitations.'
        receivedDone = true
        checkDone()
      }
    })

    this.svc.getSentInvitations().subscribe({
      next: res => {
        this.sent = res.invitations ?? []
        sentDone  = true
        checkDone()
      },
      error: () => {
        sentDone = true
        checkDone()
      }
    })
  }

  respond(inv: Invitation, action: 'accept' | 'decline') {
    this.actionId = inv._id
    this.svc.respond(inv._id, action).subscribe({
      next: () => {
        inv.statut    = action === 'accept' ? 'accepted' : 'declined'
        this.actionId = ''
      },
      error: () => { this.actionId = '' }
    })
  }

  goGroup(groupeId: string) {
    this.router.navigate(['/user/groups', groupeId])
  }

  // ── Reçues ──────────────────────────────
  get pendingReceived()  { return this.received.filter(i => i.statut === 'pending') }
  get handledReceived()  { return this.received.filter(i => i.statut !== 'pending') }

  // ── Envoyées ────────────────────────────
  get pendingSent()      { return this.sent.filter(i => i.statut === 'pending') }
  get handledSent()      { return this.sent.filter(i => i.statut !== 'pending') }

  get totalPending()     { return this.pendingReceived.length }
}