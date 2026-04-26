import { Component } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Router } from '@angular/router'
import { HttpClient } from '@angular/common/http'

@Component({
  selector: 'app-user-shell',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-shell.component.html',
  styleUrls: ['./user-shell.component.scss']
})
export class UserShellComponent {

  constructor(private http: HttpClient, private router: Router) {}

  logout(): void {
    const refreshToken = localStorage.getItem('refreshToken')
    this.http.post('/api/auth/logout', { refreshToken }).subscribe({
      next: () => this.clearAndRedirect(),
      error: () => this.clearAndRedirect()
    })
  }

  private clearAndRedirect(): void {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    this.router.navigate(['/login'])
  }
}