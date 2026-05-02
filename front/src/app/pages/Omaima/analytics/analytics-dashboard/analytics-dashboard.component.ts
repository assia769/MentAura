import { Component, OnInit, inject } from '@angular/core'
import { CommonModule } from '@angular/common'
import { forkJoin } from 'rxjs'

import { AnalyticsService } from '../../../shared/services/analytics.service'
import { UserStats, AnalyticsOverview, SubjectStats } from '../../../shared/models'
import { BarChartComponent } from '../charts/bar-chart/bar-chart.component'
import { LineChartComponent } from '../charts/line-chart/line-chart.component'
import { PieChartComponent } from '../charts/pie-chart/pie-chart.component'

@Component({
  selector: 'app-analytics-dashboard',
  standalone: true,
  imports: [CommonModule, BarChartComponent, LineChartComponent, PieChartComponent],
  templateUrl: './analytics-dashboard.component.html',
  styleUrls: ['./analytics-dashboard.component.scss']
})
export class AnalyticsDashboardComponent implements OnInit {
  private analyticsSvc = inject(AnalyticsService)

  weekly:   UserStats | null      = null
  overview: AnalyticsOverview | null = null
  subjects: SubjectStats[]        = []

  loading = true
  error   = ''

  ngOnInit() {
    this.loading = true
    this.error   = ''

    forkJoin({
      weekly:   this.analyticsSvc.getWeeklyStats(),
      overview: this.analyticsSvc.getStats(),
      subjects: this.analyticsSvc.getStatsBySubject()
    }).subscribe({
      next: ({ weekly, overview, subjects }) => {
        this.weekly   = weekly?.weekly   ?? null
        this.overview = overview?.analytics ?? null
        this.subjects = subjects?.subjects  ?? []
        this.loading  = false
      },
      error: (err) => {
        console.error(err)
        this.error   = 'Erreur chargement.'
        this.loading = false
      }
    })
  }

  get completionColor(): string {
    const v = this.weekly?.tauxCompletion ?? 0
    if (v >= 80) return '#27ae60'
    if (v >= 60) return '#d4a843'
    return '#e74c3c'
  }
}