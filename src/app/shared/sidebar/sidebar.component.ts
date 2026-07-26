import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { NgIf } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NgIf],
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent {
  @Input() isOpen = false;
  @Output() closed = new EventEmitter<void>();

  constructor(public auth: AuthService, private router: Router) {}

  closeSidebar(): void {
    this.closed.emit();
  }

  logout(): void {
    this.auth.serverLogout().subscribe({
      next: () => this.auth.logout(),
      error: () => this.auth.logout()
    });
  }
}
