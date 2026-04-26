import { Component, inject } from '@angular/core'
import { CommonModule } from '@angular/common'
import { AuthService } from '../../../core/services/auth.service'

@Component({
  selector: 'app-user-shell',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-shell.component.html',
  styleUrls: ['./user-shell.component.scss']
})
export class UserShellComponent {
  private auth = inject(AuthService)

  logout(): void {
    this.auth.logout()
  }
}