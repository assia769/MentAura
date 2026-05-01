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

  profile:      Partial<UserProfile>   = {}
  subjects:     Subject[]              = []
  availability: AvailabilitySlot[]     = []

  loading  = true
  saving   = false
  success  = ''
  error    = ''
  showDeleteConfirm = false
  deleting = false

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

  get initials(): string {
    const p = this.profile.prenom?.[0] ?? ''
    const n = this.profile.nom?.[0] ?? ''
    return `${p}${n}`.toUpperCase() || '?'
  }

  get memberSince(): string {
    if (!this.profile.createdAt) return ''
    return new Date(this.profile.createdAt).toLocaleDateString('fr-FR', {
      month: 'long', year: 'numeric'
    })
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
      next: res => this.subjects = res.subjects,
      error: () => {}
    })

    this.profileSvc.getAvailability().subscribe({
      next: res => this.availability = res.availability,
      error: () => {}
    })
  }

  saveProfile() {
    this.saving = true
    this.error  = ''
    this.profileSvc.updateProfile({
      nom:      this.profile.nom,
      prenom:   this.profile.prenom,
      bio:      this.profile.bio,
      avatarUrl: this.profile.avatarUrl
    }).subscribe({
      next: res => {
        this.profile = { ...res.profile }
        this.success = 'Profil mis à jour !'
        this.saving  = false
        setTimeout(() => this.success = '', 3000)
      },
      error: () => { this.error = 'Erreur sauvegarde.'; this.saving = false }
    })
  }

  addSubject() {
    if (!this.newSubject.nom) return
    const payload = {
      nom:      this.newSubject.nom!,
      couleur:  this.newSubject.couleur!,
      priorite: this.newSubject.priorite!,
      totalHeuresEtudiees: this.newSubject.totalHeuresEtudiees ?? 0
    }
    this.profileSvc.addSubject(payload).subscribe({
      next: res => {
        this.subjects = [...this.subjects, res.subject]
        this.newSubject = { nom: '', couleur: '#d4a843', priorite: 'moyenne', totalHeuresEtudiees: 0 }
        this.success = 'Matière ajoutée !'
        setTimeout(() => this.success = '', 2000)
      },
      error: () => { this.error = 'Erreur ajout matière.' }
    })
  }

  deleteSubject(id: string) {
    this.profileSvc.deleteSubject(id).subscribe({
      next: () => {
        this.subjects = this.subjects.filter(s => s._id !== id)
      },
      error: () => { this.error = 'Erreur suppression.' }
    })
  }

  addSlot() {
    const slots = [...this.availability, this.newSlot as AvailabilitySlot]
    this.profileSvc.updateAvailability(slots).subscribe({
      next: res => {
        this.availability = res.slots ?? slots
        this.newSlot = { jourSemaine: 'lun', heureDebut: '09:00', heureFin: '12:00', recurrente: true }
        this.success = 'Créneau ajouté !'
        setTimeout(() => this.success = '', 2000)
      },
      error: () => { this.error = 'Erreur ajout créneau.' }
    })
  }

  removeSlot(index: number) {
    const slots = this.availability.filter((_, i) => i !== index)
    this.profileSvc.updateAvailability(slots).subscribe({
      next: res => {
        this.availability = res.slots ?? slots
      },
      error: () => { this.error = 'Erreur suppression créneau.' }
    })
  }

  confirmDelete() { this.showDeleteConfirm = true }
  cancelDelete()  { this.showDeleteConfirm = false }

  deleteAccount() {
    this.deleting = true
    // Appel logout puis redirection — à connecter à ton backend si tu as un DELETE /api/profile
    this.profileSvc.deleteAccount().subscribe({
      next: () => this.router.navigate(['/']),
      error: () => {
        this.error    = 'Erreur suppression compte.'
        this.deleting = false
        this.showDeleteConfirm = false
      }
    })
  }

  cancel() { this.router.navigate(['/user/profile']) }
}