import { Component, OnInit, inject, ChangeDetectorRef, NgZone, PLATFORM_ID } from '@angular/core'
import { isPlatformBrowser } from '@angular/common'
import { CommonModule } from '@angular/common'
import { Router } from '@angular/router'
import { AdminService, AdminStats, AuditLog } from '../../../core/services/admin.service'
import { AuthService } from '../../../core/services/auth.service'

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
  private adminSvc   = inject(AdminService)
  private auth       = inject(AuthService)
  private router     = inject(Router)
  private cdr        = inject(ChangeDetectorRef)
  private zone       = inject(NgZone)
  private platformId = inject(PLATFORM_ID)

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

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return

    this.loadStats()
  }

  loadStats(): void {
    this.loading = true
    this.adminSvc.getStats().subscribe({
      next: s  => this.zone.run(() => { this.stats = s; this.loading = false }),
      error: () => this.zone.run(() => { this.loading = false })
    })
  }

  loadLogs(page = 1): void {
    this.logsLoading = true
    this.adminSvc.getAuditLogs(this.showSuspiciousOnly, page).subscribe({
      next: res => this.zone.run(() => {
        this.auditLogs   = res.logs
        this.totalLogs   = res.total
        this.currentPage = res.page
        this.logsLoading = false
      }),
      error: () => this.zone.run(() => { this.logsLoading = false })
    })
  }

  loadUsers(): void {
    this.adminSvc.getUsers().subscribe({
      next: res => this.zone.run(() => {
        this.users = res.users as any[]
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

  logout(): void { this.auth.logout() }

  isSuspicious(action: string): boolean {
    return ['LOGIN_FAILED', 'ACCOUNT_LOCKED', 'CAPTCHA_FAILED'].includes(action)
  }

  actionIcon(action: string): string {
    const map: Record<string, string> = {
      LOGIN_SUCCESS:  '✓',
      LOGIN_FAILED:   '✗',
      ACCOUNT_LOCKED: '🔒',
      CAPTCHA_FAILED: '🤖',
      REGISTER:       '➕',
      LOGOUT:         '→',
      TOKEN_REFRESH:  '↻'
    }
    return map[action] ?? '•'
  }

  get completionColor(): string {
    const v = this.stats?.tauxCompletionGlobal ?? 0
    if (v >= 80) return '#27ae60'
    if (v >= 60) return '#e67e22'
    return '#e74c3c'
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