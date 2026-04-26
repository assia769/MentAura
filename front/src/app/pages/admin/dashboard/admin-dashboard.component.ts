import { Component, OnInit, inject } from '@angular/core'
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
  private adminSvc = inject(AdminService)
  private auth     = inject(AuthService)
  private router   = inject(Router)

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

  ngOnInit(): void {
    this.loadStats()
  }

  loadStats(): void {
    this.loading = true
    this.adminSvc.getStats().subscribe({
      next: s  => { this.stats = s; this.loading = false },
      error: () => { this.loading = false }
    })
  }

  loadLogs(page = 1): void {
    this.logsLoading = true
    this.adminSvc.getAuditLogs(this.showSuspiciousOnly, page).subscribe({
      next: res => {
        this.auditLogs   = res.logs
        this.totalLogs   = res.total
        this.currentPage = res.page
        this.logsLoading = false
      },
      error: () => { this.logsLoading = false }
    })
  }

  loadUsers(): void {
    this.adminSvc.getUsers().subscribe({
      next: res => this.users = res.users as any[]
    })
  }

  toggleSuspicious(): void {
    this.showSuspiciousOnly = !this.showSuspiciousOnly
    this.loadLogs(1)
  }

  setTab(tab: 'overview' | 'logs' | 'users'): void {
     console.log('🔥 setTab called:', tab) 
    this.activeTab = tab
    // Load data lazily per tab
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