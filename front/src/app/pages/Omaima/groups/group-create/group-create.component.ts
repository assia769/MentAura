import { Component, inject } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { Router } from '@angular/router'
import { GroupsService } from '../../../shared/services/groups.service'

@Component({
  selector: 'app-group-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './group-create.component.html',
  styleUrls: ['./group-create.component.scss']
})
export class GroupCreateComponent {
  private groupsSvc = inject(GroupsService)
  private router    = inject(Router)

  form = { nom: '', isPublic: true }
  saving = false
  error  = ''

  save() {
    if (!this.form.nom.trim()) return
    this.saving = true
    this.groupsSvc.createGroup(this.form).subscribe({
      next: res => this.router.navigate(['/user/groups', res.group._id]),
      error: ()  => { this.error = 'Erreur création.'; this.saving = false }
    })
  }

  cancel() { this.router.navigate(['/user/groups']) }
}