import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HistoriqueService, HistoriqueDto } from '../../services/historique.service';
import { AuthService } from '../../services/auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './historique-modifications.component.html',
  styleUrls: ['./historique-modifications.component.css']
})
export class HistoriqueModificationsComponent implements OnInit {
  Math = Math;
  items: HistoriqueDto[] = [];
  total = 0;
  page = 1;
  pageSize = 20;
  loading = true;
  expandedIds = new Set<number>();

  tables: string[] = [];
  actions: string[] = [];

  filterTable = '';
  filterUser = '';
  filterAction = '';
  filterDateDebut = '';
  filterDateFin = '';

  constructor(
    private historiqueService: HistoriqueService,
    public authService: AuthService
  ) {}

  get isAdmin(): boolean {
    return this.authService.hasRole('Admin');
  }

  get userName(): string {
    return this.authService.currentUser()?.username ?? '';
  }

  ngOnInit(): void {
    this.loadFilters();
    this.search();
  }

  get hasActiveFilters(): boolean {
    return !!(this.filterTable || this.filterUser || this.filterAction || this.filterDateDebut || this.filterDateFin);
  }

  loadFilters(): void {
    this.historiqueService.getTables().subscribe(tables => this.tables = tables);
    this.historiqueService.getActions().subscribe(actions => this.actions = actions);
  }

  search(page?: number): void {
    if (page !== undefined) this.page = page;
    this.loading = true;
    this.expandedIds.clear();

    this.historiqueService.search({
      tableModifiee: this.filterTable || undefined,
      utilisateurNom: this.filterUser || undefined,
      action: this.filterAction || undefined,
      dateDebut: this.filterDateDebut || undefined,
      dateFin: this.filterDateFin || undefined,
      page: this.page,
      pageSize: this.pageSize
    }).subscribe({
      next: (result) => {
        this.items = result.items;
        this.total = result.total;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  resetFilters(): void {
    this.filterTable = '';
    this.filterUser = '';
    this.filterAction = '';
    this.filterDateDebut = '';
    this.filterDateFin = '';
    this.page = 1;
    this.search();
  }

  toggleExpand(id: number): void {
    if (this.expandedIds.has(id)) {
      this.expandedIds.delete(id);
    } else {
      this.expandedIds.add(id);
    }
  }

  getActionCount(action: string): number {
    return this.items.filter(i => i.action === action).length;
  }

  get totalPages(): number {
    return Math.ceil(this.total / this.pageSize);
  }

  get pages(): number[] {
    const total = this.totalPages;
    const current = this.page;
    const pages: number[] = [];
    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  getIcon(table: string): string {
    switch (table) {
      case 'Clients': return 'person';
      case 'Documents': return 'description';
      case 'Utilisateurs': return 'badge';
      default: return 'history';
    }
  }

  getTableIconColor(table: string): string {
    switch (table) {
      case 'Clients': return 'text-primary';
      case 'Documents': return 'text-amber-600';
      case 'Utilisateurs': return 'text-purple-600';
      default: return 'text-on-surface-variant';
    }
  }

  getActionIcon(action: string): string {
    switch (action) {
      case 'Création': return 'add_circle';
      case 'Modification': return 'edit_note';
      case 'Suppression': return 'delete';
      case 'Archivage': return 'archive';
      case 'Restauration': return 'restore';
      case 'Activation': return 'check_circle';
      case 'Désactivation': return 'cancel';
      default: return 'history';
    }
  }

  getActionBarColor(action: string): string {
    switch (action) {
      case 'Création': return 'bg-green-500';
      case 'Modification': return 'bg-blue-500';
      case 'Suppression': return 'bg-red-500';
      case 'Archivage': return 'bg-amber-500';
      case 'Restauration': return 'bg-teal-500';
      case 'Activation': return 'bg-emerald-500';
      case 'Désactivation': return 'bg-rose-400';
      default: return 'bg-outline-variant';
    }
  }

  getActionBgColor(action: string): string {
    switch (action) {
      case 'Création': return 'bg-green-50';
      case 'Modification': return 'bg-blue-50';
      case 'Suppression': return 'bg-red-50';
      case 'Archivage': return 'bg-amber-50';
      case 'Restauration': return 'bg-teal-50';
      case 'Activation': return 'bg-emerald-50';
      case 'Désactivation': return 'bg-rose-50';
      default: return 'bg-surface-container-low';
    }
  }

  getActionTextColor(action: string): string {
    switch (action) {
      case 'Création': return 'text-green-600';
      case 'Modification': return 'text-blue-600';
      case 'Suppression': return 'text-red-600';
      case 'Archivage': return 'text-amber-600';
      case 'Restauration': return 'text-teal-600';
      case 'Activation': return 'text-emerald-600';
      case 'Désactivation': return 'text-rose-500';
      default: return 'text-on-surface-variant';
    }
  }

  getInitials(name: string): string {
    return name.charAt(0).toUpperCase();
  }
}
