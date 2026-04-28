import { Component, OnInit, inject, ChangeDetectorRef, NgZone } from '@angular/core'
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common'
import { Router } from '@angular/router'
import { AdminService, AdminStats, AuditLog } from '../../../core/services/admin.service'
import { AuthService } from '../../../core/services/auth.service'

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, DatePipe, DecimalPipe],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
  private adminSvc = inject(AdminService)
  private auth     = inject(AuthService)
  private router   = inject(Router)
  private cdr      = inject(ChangeDetectorRef)
  private zone     = inject(NgZone)

  // Expose Math to template
  Math = Math

  stats: AdminStats | null = null
  auditLogs: AuditLog[]   = []
  totalLogs               = 0
  currentPage             = 1
  showSuspiciousOnly      = false
  activeTab: 'overview' | 'logs' | 'users' = 'overview'
  users: any[]            = []
  loading                 = true
  logsLoading             = false
  today                   = new Date()

  // Update clock every minute
  private clockInterval: ReturnType<typeof setInterval> | null = null

  ngOnInit(): void {
    this.loadStats()
    this.clockInterval = setInterval(() => {
      this.zone.run(() => { this.today = new Date() })
    }, 60_000)
  }

  ngOnDestroy(): void {
    if (this.clockInterval) clearInterval(this.clockInterval)
  }

  loadStats(): void {
    this.loading = true
    this.adminSvc.getStats().subscribe({
      next: s  => this.zone.run(() => { this.stats = s; this.loading = false; this.cdr.detectChanges() }),
      error: () => this.zone.run(() => { this.loading = false; this.cdr.detectChanges() })
    })
  }

  loadLogs(page = 1): void {
    this.logsLoading = true
    this.cdr.detectChanges()
    this.adminSvc.getAuditLogs(this.showSuspiciousOnly, page).subscribe({
      next: res => this.zone.run(() => {
        this.auditLogs   = res.logs
        this.totalLogs   = res.total
        this.currentPage = res.page
        this.logsLoading = false
        this.cdr.detectChanges()
      }),
      error: () => this.zone.run(() => { this.logsLoading = false; this.cdr.detectChanges() })
    })
  }

  loadUsers(): void {
    this.adminSvc.getUsers().subscribe({
      next: res => this.zone.run(() => {
        this.users = res.users as any[]
        this.cdr.detectChanges()
      })
    })
  }

  toggleSuspicious(): void {
    this.showSuspiciousOnly = !this.showSuspiciousOnly
    this.loadLogs(1)
  }

  setTab(tab: 'overview' | 'logs' | 'users'): void {
    if (this.activeTab === tab) return
    this.activeTab = tab
    this.cdr.detectChanges()

    if (tab === 'users' && !this.users.length) this.loadUsers()
    if (tab === 'logs') this.loadLogs(1)
    if (tab === 'overview' && !this.stats) this.loadStats()
  }

  toggleUser(userId: string, isActive: boolean): void {
    this.adminSvc.toggleUser(userId, !isActive).subscribe(() => this.loadUsers())
  }

  logout(): void {
    this.auth.logout()
  }

  isSuspicious(action: string): boolean {
    return ['LOGIN_FAILED', 'ACCOUNT_LOCKED', 'CAPTCHA_FAILED'].includes(action)
  }

  actionIcon(action: string): string {
    const map: Record<string, string> = {
      LOGIN_SUCCESS:  '✓',
      LOGIN_FAILED:   '✗',
      ACCOUNT_LOCKED: '⊘',
      CAPTCHA_FAILED: '⊗',
      REGISTER:       '+',
      LOGOUT:         '→',
      TOKEN_REFRESH:  '↻'
    }
    return map[action] ?? '·'
  }

  // ── Dynamic KPI color helpers ─────────────────────────────────

  get completionColor(): string {
    const v = this.stats?.tauxCompletionGlobal ?? 0
    if (v >= 80) return '#22c55e'
    if (v >= 60) return '#f97316'
    return '#ef4444'
  }

  get completionIconClass(): string {
    const v = this.stats?.tauxCompletionGlobal ?? 0
    if (v >= 80) return 'kpi-icon-green'
    if (v >= 60) return 'kpi-icon-gold'
    return 'kpi-icon-red'
  }

  get completionTagClass(): string {
    const v = this.stats?.tauxCompletionGlobal ?? 0
    if (v >= 80) return 'tag-green'
    if (v >= 60) return 'tag-orange'
    return 'tag-red'
  }

  get completionGlowClass(): string {
    const v = this.stats?.tauxCompletionGlobal ?? 0
    if (v >= 80) return 'kpi-glow-green'
    if (v >= 60) return 'kpi-glow-gold'
    return 'kpi-glow-red'
  }
}