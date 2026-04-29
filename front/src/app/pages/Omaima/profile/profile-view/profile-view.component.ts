import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core'
import { isPlatformBrowser } from '@angular/common'
import { CommonModule } from '@angular/common'
import { Router, RouterModule } from '@angular/router'
import { ProfileService } from '../../../shared/services/profile.service'
import { UserProfile, Subject, AvailabilitySlot } from '../../../shared/models'

@Component({
  selector: 'app-profile-view',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './profile-view.component.html',
  styleUrls: ['./profile-view.component.scss']
})
export class ProfileViewComponent implements OnInit {
  private profileSvc = inject(ProfileService)
  private router     = inject(Router)
  private platformId = inject(PLATFORM_ID)

  profile: UserProfile | null      = null
  subjects: Subject[]              = []
  availability: AvailabilitySlot[] = []
  loading = true
  error   = ''

  readonly Math = Math

  readonly days: Record<string, string> = {
    lun: 'Lundi', mar: 'Mardi', mer: 'Mercredi',
    jeu: 'Jeudi', ven: 'Vendredi', sam: 'Samedi', dim: 'Dimanche'
  }

  readonly priorityColors: Record<string, string> = {
    haute:   '#d4a843',
    moyenne: '#3d6af0',
    faible:  '#4a5270'
  }

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return

    this.profileSvc.getProfile().subscribe({
      next: res => {
        this.profile = res.profile
        this.loading = false
        this.loadSubjects()
        this.loadAvailability()
      },
      error: () => {
        this.error   = 'Impossible de charger le profil.'
        this.loading = false
      }
    })
  }

  private loadSubjects() {
    this.profileSvc.getSubjects().subscribe({
      next: res => this.subjects = res.subjects,
      error: ()  => {}
    })
  }

  private loadAvailability() {
    this.profileSvc.getAvailability().subscribe({
      next: res => this.availability = res.availability,
      error: ()  => {}
    })
  }

  get initials(): string {
    if (!this.profile) return '?'
    return `${this.profile.prenom?.[0] ?? ''}${this.profile.nom?.[0] ?? ''}`.toUpperCase()
  }

  get totalHours(): number {
    return this.subjects.reduce((acc, s) => acc + (s.totalHeuresEtudiees ?? 0), 0)
  }

  goEdit() {
    this.router.navigate(['/user/profile/edit'])
  }
}