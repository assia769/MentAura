import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-auth-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth-panel.component.html',
  styleUrls: ['./auth-panel.component.scss']
})
export class AuthPanelComponent {
  @Input() currentTab: 'login' | 'register' = 'login';
  @Output() tabChange = new EventEmitter<'login' | 'register'>();

  strength = 0;

  switchTab(tab: 'login' | 'register'): void {
    this.currentTab = tab;
    this.tabChange.emit(tab);
  }

  togglePw(input: HTMLInputElement): void {
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
  }

  checkStrength(value: string): void {
    let score = 0;
    if (value.length >= 8) score++;
    if (/[A-Z]/.test(value)) score++;
    if (/[0-9]/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value)) score++;
    this.strength = score;
  }

  getStrengthLabel(): string {
    const labels = ['Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
    return labels[this.strength] || 'Weak';
  }

  getStrengthColor(index: number): string {
    if (this.strength < index) return '';
    if (this.strength <= 1) return '#c0392b';
    if (this.strength === 2) return '#e67e22';
    if (this.strength === 3) return '#2d9e3e';
    return '#c9a84c';
  }
}