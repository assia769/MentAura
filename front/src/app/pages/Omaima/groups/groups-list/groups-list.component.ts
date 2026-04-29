import { Component, OnInit, inject } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Router, RouterModule } from '@angular/router'
import { GroupsService } from '../../../shared/services/groups.service'
import { GroupEtude } from '../../../shared/models'

@Component({
  selector: 'app-groups-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './groups-list.component.html',
  styleUrls: ['./groups-list.component.scss']
})
export class GroupsListComponent implements OnInit {
  private groupsSvc = inject(GroupsService)
  private router    = inject(Router)

  groups:  GroupEtude[] = []
  loading = true
  error   = ''

  ngOnInit() {
    this.groupsSvc.getGroups().subscribe({
      next: res => { this.groups = res.groups; this.loading = false },
      error: ()  => { this.error = 'Erreur chargement.'; this.loading = false }
    })
  }

  goCreate()           { this.router.navigate(['/user/groups/create']) }
  goDetail(id: string) { this.router.navigate(['/user/groups', id]) }

  getMemberCount(g: GroupEtude): number { return g.membres?.length ?? 0 }

  getInitials(nom: string): string {
    return nom.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  }
}