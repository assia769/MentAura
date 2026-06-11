import { Component, OnInit, Output, EventEmitter, inject, PLATFORM_ID, signal } from '@angular/core'
import { CommonModule, isPlatformBrowser } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { ProfileService } from '../../../shared/services/profile.service'
import { AvailabilitySlot } from '../../../shared/models'

type DayKey = 'lun' | 'mar' | 'mer' | 'jeu' | 'ven' | 'sam' | 'dim'
type BlockKey = 'matin' | 'apresmidi' | 'soir'

interface CellState {
  active: boolean
  heureDebut: string
  heureFin: string
}

@Component({
  selector: 'app-availability-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './availability-picker.component.html',
  styleUrls: ['./availability-picker.component.scss']
})
export class AvailabilityPickerComponent implements OnInit {
  private profileSvc = inject(ProfileService)
  private platformId = inject(PLATFORM_ID)

  @Output() saved = new EventEmitter<AvailabilitySlot[]>()

  readonly DAYS: { key: DayKey; label: string }[] = [
    { key: 'lun', label: 'Lun' },
    { key: 'mar', label: 'Mar' },
    { key: 'mer', label: 'Mer' },
    { key: 'jeu', label: 'Jeu' },
    { key: 'ven', label: 'Ven' },
    { key: 'sam', label: 'Sam' },
    { key: 'dim', label: 'Dim' }
  ]

  readonly BLOCKS: { key: BlockKey; label: string; defaultStart: string; defaultEnd: string }[] = [
    { key: 'matin',     label: 'Matin',      defaultStart: '06:00', defaultEnd: '12:00' },
    { key: 'apresmidi', label: 'Après-midi', defaultStart: '12:00', defaultEnd: '18:00' },
    { key: 'soir',      label: 'Soir',       defaultStart: '18:00', defaultEnd: '23:00' }
  ]

  grid = signal<Record<string, CellState>>({})
  loading = signal(false)
  saving  = signal(false)
  error   = signal('')
  success = signal('')

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return
    this.initGrid()
    this.loadAvailability()
  }

  private initGrid(): void {
    const initial: Record<string, CellState> = {}
    for (const day of this.DAYS) {
      for (const block of this.BLOCKS) {
        initial[`${day.key}-${block.key}`] = {
          active: false,
          heureDebut: block.defaultStart,
          heureFin: block.defaultEnd
        }
      }
    }
    this.grid.set(initial)
  }

  private loadAvailability(): void {
    this.loading.set(true)
    this.profileSvc.getAvailability().subscribe({
      next: res => {
        const g = { ...this.grid() }
        for (const slot of res.availability) {
          const blockKey = this.heureToBlock(slot.heureDebut)
          if (blockKey) {
            const key = `${slot.jourSemaine}-${blockKey}`
            if (g[key]) {
              g[key] = { active: true, heureDebut: slot.heureDebut, heureFin: slot.heureFin }
            }
          }
        }
        this.grid.set(g)
        this.loading.set(false)
      },
      error: () => {
        this.error.set('Impossible de charger les disponibilités.')
        this.loading.set(false)
      }
    })
  }

  private heureToBlock(heureDebut: string): BlockKey | null {
    const h = parseInt(heureDebut.split(':')[0], 10)
    if (h >= 6 && h < 12)  return 'matin'
    if (h >= 12 && h < 18) return 'apresmidi'
    if (h >= 18)           return 'soir'
    return null
  }

  cellKey(dayKey: string, blockKey: string): string {
    return `${dayKey}-${blockKey}`
  }

  getCell(dayKey: string, blockKey: string): CellState {
    return this.grid()[`${dayKey}-${blockKey}`]
  }

  toggleCell(dayKey: string, blockKey: string): void {
    const key = `${dayKey}-${blockKey}`
    this.grid.update(g => ({
      ...g,
      [key]: { ...g[key], active: !g[key].active }
    }))
  }

  updateTime(dayKey: string, blockKey: string, field: 'heureDebut' | 'heureFin', value: string): void {
    const key = `${dayKey}-${blockKey}`
    this.grid.update(g => ({
      ...g,
      [key]: { ...g[key], [field]: value }
    }))
  }

  save(): void {
    this.saving.set(true)
    this.error.set('')
    this.success.set('')

    const slots: AvailabilitySlot[] = []
    const g = this.grid()

    for (const day of this.DAYS) {
      for (const block of this.BLOCKS) {
        const cell = g[`${day.key}-${block.key}`]
        if (cell?.active) {
          slots.push({
            jourSemaine: day.key,
            heureDebut: cell.heureDebut,
            heureFin: cell.heureFin,
            recurrente: true
          })
        }
      }
    }

    this.profileSvc.updateAvailability(slots).subscribe({
      next: res => {
        this.saving.set(false)
        this.success.set('Disponibilités enregistrées !')
        setTimeout(() => this.success.set(''), 3000)
        this.saved.emit((res as { message: string; slots?: AvailabilitySlot[] }).slots ?? slots)
      },
      error: () => {
        this.saving.set(false)
        this.error.set('Erreur lors de la sauvegarde.')
      }
    })
  }
}
