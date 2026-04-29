import { Component, OnInit, inject } from '@angular/core'
import { CommonModule } from '@angular/common'
import { AnalyticsService } from '../../../shared/services/analytics.service'
import { UserStats } from '../../../shared/models'

@Component({
  selector: 'app-analytics-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analytics-dashboard.component.html',
  styleUrls: ['./analytics-dashboard.component.scss']
})
export class AnalyticsDashboardComponent implements OnInit {
  private analyticsSvc = inject(AnalyticsService)

  stats:   UserStats | null = null
  loading = true
  error   = ''

  ngOnInit() {
    this.analyticsSvc.getWeeklyStats().subscribe({
      next: res => { this.stats = res.stats; this.loading = false },
      error: ()  => { this.error = 'Erreur chargement.'; this.loading = false }
    })
  }

  get completionColor(): string {
    const v = this.stats?.tauxCompletion ?? 0
    if (v >= 80) return '#27ae60'
    if (v >= 60) return '#d4a843'
    return '#e74c3c'
  }

  get maxHours(): number {
    if (!this.stats?.parMatiere?.length) return 1
    return Math.max(...this.stats.parMatiere.map(m => m.heures))
  }

  barWidth(heures: number): number {
    return Math.min((heures / this.maxHours) * 100, 100)
  }
}