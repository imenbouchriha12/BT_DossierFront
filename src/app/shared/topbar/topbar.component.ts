import { Component, EventEmitter, HostListener, OnDestroy, Output, signal } from '@angular/core';
import { NgIf, NgFor, NgClass, AsyncPipe, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, interval, Subscription, switchMap } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { SearchService, GlobalSearchResult } from '../../services/search.service';
import { NotificationService, NotificationDto } from '../../services/notification.service';
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
    private router: Router
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
  }

  ngOnDestroy(): void {
    this.pollingSub?.unsubscribe();
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
    localStorage.setItem('theme', html.classList.contains('dark') ? 'dark' : 'light');
  }

  get userPhotoUrl(): string | null {
    const relative = this.auth.currentUser()?.photoUrl;
    return relative ? `${environment.staticUrl}${relative}` : null;
  }

  get userInitial(): string {
    return (this.auth.currentUser()?.username?.charAt(0) || 'U').toUpperCase();
  }
}
