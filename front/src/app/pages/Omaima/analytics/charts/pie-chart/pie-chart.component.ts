import { Component, Input, OnChanges, SimpleChanges } from '@angular/core'
import { CommonModule } from '@angular/common'
import { SubjectStats } from '../../../../shared/models'

export interface DonutSlice {
  nom:     string
  couleur: string
  pct:     number
  offset:  number
  dash:    number
}

@Component({
  selector: 'app-pie-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pie-chart.component.html',
  styleUrls: ['./pie-chart.component.scss']
})
export class PieChartComponent implements OnChanges {
  @Input() subjects: SubjectStats[] = []

  slices:       DonutSlice[] = []
  globalPct     = 0
  totalHeures   = 0
  totalSessions = 0
  doneSession   = 0

  readonly R      = 54
  readonly CIRCUM = 2 * Math.PI * this.R   // ≈ 339.3

  ngOnChanges(c: SimpleChanges) {
    if (!c['subjects']) return
    this.build()
  }

  private build() {
    const s = this.subjects
    if (!s?.length) { this.slices = []; return }

    this.totalHeures   = s.reduce((a, x) => a + x.totalHeuresEtudiees, 0)
    this.totalSessions = s.reduce((a, x) => a + x.totalSessions, 0)
    this.doneSession   = s.reduce((a, x) => a + x.sessionsRealisees, 0)
    this.globalPct     = this.totalSessions
      ? Math.round((this.doneSession / this.totalSessions) * 100)
      : 0

    let cursor = 0
    this.slices = s.map(sub => {
      const pct    = this.totalHeures ? sub.totalHeuresEtudiees / this.totalHeures : 0
      const dash   = pct * this.CIRCUM
      const offset = cursor
      cursor += dash
      return { nom: sub.nom, couleur: sub.couleur, pct: Math.round(pct * 100), offset, dash }
    })
  }

  trackByNom(_: number, sl: DonutSlice) { return sl.nom }
}