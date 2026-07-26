import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../../shared/sidebar/sidebar.component';
import { TopbarComponent } from '../../shared/topbar/topbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';

@Component({
  selector: 'app-sidebar-layout',
  standalone: true,
  imports: [SidebarComponent, TopbarComponent, FooterComponent, RouterOutlet],
  templateUrl: './sidebar-layout.component.html',
})
export class SidebarLayoutComponent {
  sidebarOpen = signal(false);

  toggleSidebar(): void {
    this.sidebarOpen.update(v => !v);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }
}
