import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../../shared/sidebar/sidebar.component';
import { TopbarComponent } from '../../shared/topbar/topbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { MessageService } from '../../services/message.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-sidebar-layout',
  standalone: true,
  imports: [SidebarComponent, TopbarComponent, FooterComponent, RouterOutlet],
  templateUrl: './sidebar-layout.component.html',
})
export class SidebarLayoutComponent implements OnInit, OnDestroy {
  sidebarOpen = signal(false);

  constructor(
    private messageService: MessageService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    // Connexion permanente à la messagerie : l'utilisateur est marqué « en ligne »
    // partout dans l'application (pas seulement sur la page messagerie).
    this.messageService.connect();
    // Réception temps réel des notifications (cloche) dans toute l'application.
    this.notificationService.connect();
  }

  ngOnDestroy(): void {
    this.messageService.disconnect();
    this.notificationService.disconnect();
  }

  toggleSidebar(): void {
    this.sidebarOpen.update(v => !v);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }
}
