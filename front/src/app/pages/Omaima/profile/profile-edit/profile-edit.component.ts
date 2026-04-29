import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core'
import { isPlatformBrowser } from '@angular/common'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { Router } from '@angular/router'
import { ProfileService } from '../../../shared/services/profile.service'
import { UserProfile, Subject, AvailabilitySlot } from '../../../shared/models'

@Component({
  selector: 'app-profile-edit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile-edit.component.html',
  styleUrls: ['./profile-edit.component.scss']
})
export class ProfileEditComponent implements OnInit {
  private profileSvc = inject(ProfileService)
  private router     = inject(Router)
  private platformId = inject(PLATFORM_ID)

  profile: Partial<UserProfile>    = {}
  subjects: Subject[]              = []
  availability: AvailabilitySlot[] = []

  loading  = true
  saving   = false
  success  = ''
  error    = ''

  activeTab: 'info' | 'subjects' | 'availability' = 'info'

  newSubject: Partial<Subject> = {
    nom: '', couleur: '#d4a843', priorite: 'moyenne', totalHeuresEtudiees: 0
  }

  readonly priorites = ['haute', 'moyenne', 'faible'] as const
  readonly jours = [
    { key: 'lun', label: 'Lun' }, { key: 'mar', label: 'Mar' },
    { key: 'mer', label: 'Mer' }, { key: 'jeu', label: 'Jeu' },
    { key: 'ven', label: 'Ven' }, { key: 'sam', label: 'Sam' },
    { key: 'dim', label: 'Dim' }
  ] as const

  newSlot: Partial<AvailabilitySlot> = {
    jourSemaine: 'lun', heureDebut: '09:00', heureFin: '12:00', recurrente: true
  }

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return

    this.profileSvc.getProfile().subscribe({
      next: res => {
        this.profile = { ...res.profile }
        this.loading = false
      },
      error: () => { this.error = 'Erreur chargement.'; this.loading = false }
    })

    this.profileSvc.getSubjects().subscribe({
      next: res => this.subjects = res.subjects
    })

    this.profileSvc.getAvailability().subscribe({
      next: res => this.availability = res.availability
    })
  }

  saveProfile() {
    this.saving = true
    this.profileSvc.updateProfile(this.profile).subscribe({
      next: () => {
        this.success = 'Profil mis à jour !'
        this.saving  = false
        setTimeout(() => this.success = '', 3000)
      },
      error: () => { this.error = 'Erreur sauvegarde.'; this.saving = false }
    })
  }

  addSubject() {
    if (!this.newSubject.nom) return
    this.profileSvc.addSubject(this.newSubject as any).subscribe({
      next: res => {
        this.subjects.push(res.subject)
        this.newSubject = { nom: '', couleur: '#d4a843', priorite: 'moyenne', totalHeuresEtudiees: 0 }
      }
    })
  }

  deleteSubject(id: string) {
    this.profileSvc.deleteSubject(id).subscribe({
      next: () => this.subjects = this.subjects.filter(s => s._id !== id)
    })
  }

  addSlot() {
    const slots = [...this.availability, this.newSlot as AvailabilitySlot]
    this.profileSvc.updateAvailability(slots).subscribe({
      next: res => {
        this.availability = res.slots
        this.newSlot = { jourSemaine: 'lun', heureDebut: '09:00', heureFin: '12:00', recurrente: true }
      }
    })
  }

  removeSlot(index: number) {
    const slots = this.availability.filter((_, i) => i !== index)
    this.profileSvc.updateAvailability(slots).subscribe({
      next: res => this.availability = res.slots
    })
  }

  cancel() { this.router.navigate(['/user/profile']) }
}