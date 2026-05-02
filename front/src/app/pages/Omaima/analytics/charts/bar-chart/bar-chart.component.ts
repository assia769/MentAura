import { Component, Input, OnChanges, SimpleChanges } from '@angular/core'
import { CommonModule } from '@angular/common'
import { SubjectStats } from '../../../../shared/models'

@Component({
  selector: 'app-bar-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bar-chart.component.html',
  styleUrls: ['./bar-chart.component.scss']
})
export class BarChartComponent implements OnChanges {
  @Input() subjects: SubjectStats[] = []

  sorted: SubjectStats[] = []
  maxHours = 1

  ngOnChanges(changes: SimpleChanges) {
    if (changes['subjects'] && this.subjects?.length) {
      this.sorted   = [...this.subjects].sort((a, b) => b.totalHeuresEtudiees - a.totalHeuresEtudiees)
      this.maxHours = Math.max(...this.sorted.map(s => s.totalHeuresEtudiees), 1)
    }
  }

  barPct(h: number): number {
    return Math.min((h / this.maxHours) * 100, 100)
  }

  completionPct(s: SubjectStats): number {
    if (!s.totalSessions) return 0
    return Math.round((s.sessionsRealisees / s.totalSessions) * 100)
  }

  trackById(_: number, s: SubjectStats) { return s._id }
}