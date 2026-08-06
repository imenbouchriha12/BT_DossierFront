import { Component, EventEmitter, HostListener, OnDestroy, Output, ChangeDetectorRef, signal } from '@angular/core';
import { NgIf, NgFor, NgClass, AsyncPipe, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, interval, Subscription, switchMap } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { SearchService, GlobalSearchResult } from '../../services/search.service';
import { NotificationService, NotificationDto } from '../../services/notification.service';
import { ToastService } from '../../shared/toast/toast.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [NgIf, NgFor, NgClass, AsyncPipe, DatePipe, RouterLink, FormsModule],
  templateUrl: './topbar.component.html',
})
export class TopbarComponent implements OnDestroy {
  @Output() menuToggle = new EventEmitter<void>();

  private searchTerms = new Subject<string>();
  private pollingSub?: Subscription;
  private notifRealTimeSub?: Subscription;
  searchQuery = '';
  searchResults?: GlobalSearchResult;
  showSearchDropdown = false;
  showNotifications = false;
  notifications: NotificationDto[] = [];
  notificationCount = signal(0);
  loadingSearch = false;

  constructor(
    public auth: AuthService,
    private searchService: SearchService,
    private notificationService: NotificationService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private toast: ToastService
  ) {
    this.searchTerms.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(term => {
        if (term.length < 2) {
          this.searchResults = undefined;
          this.loadingSearch = false;
          return [];
        }
        this.loadingSearch = true;
        return this.searchService.globalSearch(term);
      })
    ).subscribe({
      next: (result) => {
        this.searchResults = result as GlobalSearchResult;
        this.loadingSearch = false;
        this.showSearchDropdown = true;
      },
      error: () => {
        this.loadingSearch = false;
      }
    });

    this.loadNotifications();

    this.pollingSub = interval(30000).subscribe(() => {
      this.notificationService.getNonLuCount().subscribe(count => {
        this.notificationCount.set(count.totalNonLu);
      });
    });

    this.notifRealTimeSub = this.notificationService.recevoirNotification$.subscribe(notif => {
      const dejaPresente = notif.id !== 0 && this.notifications.some(n => n.id === notif.id);
      if (!dejaPresente) {
        this.notifications.unshift(notif);
        this.notificationCount.update(c => c + 1);
      }
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.pollingSub?.unsubscribe();
    this.notifRealTimeSub?.unsubscribe();
  }

  onSearchInput(): void {
    this.searchTerms.next(this.searchQuery);
    if (this.searchQuery.length < 2) {
      this.showSearchDropdown = false;
      this.searchResults = undefined;
    }
  }

  onSearchFocus(): void {
    if (this.searchResults && this.searchResults.totalCount > 0) {
      this.showSearchDropdown = true;
    }
  }

  selectSearchResult(): void {
    this.searchQuery = '';
    this.searchResults = undefined;
    this.showSearchDropdown = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.search-container')) {
      this.showSearchDropdown = false;
    }
    if (!target.closest('.notification-container')) {
      this.showNotifications = false;
    }
  }

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
    if (this.showNotifications) {
      this.loadNotifications();
    }
  }

  markAsLu(event: MouseEvent, id: number): void {
    event.stopPropagation();
    const notif = this.notifications.find(n => n.id === id);

    this.showNotifications = false;

    if (notif && notif.lien) {
      this.router.navigateByUrl(notif.lien);
    }

    if (notif && !notif.estLu) {
      this.notificationService.markAsLu(id).subscribe(() => {
        notif.estLu = true;
        this.notificationCount.update(c => Math.max(0, c - 1));
      });
    }
  }

  markAllAsLu(): void {
    this.notificationService.markAllAsLu().subscribe(() => {
      this.notifications.forEach(n => n.estLu = true);
      this.notificationCount.set(0);
      this.toast.info('Toutes les notifications sont marquées comme lues.');
    });
  }

  private loadNotifications(): void {
    this.notificationService.getAll().subscribe(notifs => {
      this.notifications = notifs;
    });
    this.notificationService.getNonLuCount().subscribe(count => {
      this.notificationCount.set(count.totalNonLu);
    });
  }

  get isDark(): boolean {
    return document.documentElement.classList.contains('dark');
  }

  toggleDarkMode(): void {
    const html = document.documentElement;
    html.classList.toggle('dark');
    const dark = html.classList.contains('dark');
    localStorage.setItem('theme', dark ? 'dark' : 'light');
    this.toast.info(dark ? 'Mode sombre activé.' : 'Mode clair activé.', 'Thème');
  }

  get userPhotoUrl(): string | null {
    const relative = this.auth.currentUser()?.photoUrl;
    if (!relative) return null;
    const sansPrefixe = relative.replace(/^\/?uploads\//, '');
    return `${environment.staticUrl}${sansPrefixe}`;
  }

  get userInitial(): string {
    return (this.auth.currentUser()?.username?.charAt(0) || 'U').toUpperCase();
  }
}
