import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ClientService } from '../../services/client.service';
import { ClientStatusService } from '../../services/client-status.service';
import { ClientDto, ClientSearchDto, PagedResult } from '../../models/client.models';
import { AuthService } from '../../services/auth.service';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

@Component({
  selector: 'app-liste-clients',
  standalone: true,
  imports: [RouterModule, FormsModule, CommonModule],
  templateUrl: './liste-clients.component.html',
})
export class ListeClientsComponent implements OnInit, OnDestroy {
  clients: ClientDto[] = [];
  total = 0;
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  loading = false;
  error = '';
  showArchived = false;

  filterOpen = false;
  quickSearch = '';
  searchNom = '';
  searchPrenom = '';
  searchCode = '';
  searchVille = '';
  searchStatut = '';
  searchDateDebut = '';
  searchDateFin = '';

  villes: string[] = [];
  confirmActionId: number | null = null;
  confirmActionType: 'archive' | 'restore' | 'block' | 'unblock' = 'archive';
  blockClientId: number | null = null;
  showBlockModal = false;
  blockReason = '';
  blocking = false;

  private quickSearch$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    public clientService: ClientService,
    public authService: AuthService,
    private clientStatusService: ClientStatusService
  ) {
    this.quickSearch$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.searchNom = '';
      this.searchCode = '';
      this.searchPrenom = '';
      this.searchVille = '';
      this.searchStatut = '';
      this.searchDateDebut = '';
      this.searchDateFin = '';
      this.currentPage = 1;
      this.loadClients();
    });
  }

  ngOnInit() {
    this.loadClients();
    this.loadVilles();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get totalActifs(): number {
    return this.clients.filter(c => c.statut === 'Actif').length;
  }

  get totalEnAttente(): number {
    return this.clients.filter(c => c.statut === 'En attente').length;
  }

  get totalBloques(): number {
    return this.clients.filter(c => c.statut === 'Bloqué').length;
  }

  loadClients() {
    this.loading = true;
    this.error = '';

    if (this.showArchived) {
      this.clientService.getArchived(this.currentPage, this.pageSize).subscribe({
        next: (result: PagedResult<ClientDto>) => {
          this.clients = result.items;
          this.total = result.total;
          this.totalPages = result.totalPages;
          this.loading = false;
        },
        error: () => {
          this.error = 'Erreur lors du chargement des clients archivés.';
          this.loading = false;
        }
      });
    } else {
      const search: ClientSearchDto = {
        nom: this.searchNom || this.quickSearch || undefined,
        prenom: this.searchPrenom || undefined,
        codeClient: this.searchCode || undefined,
        ville: this.searchVille || undefined,
        statut: this.searchStatut || undefined,
        dateDebut: this.searchDateDebut || undefined,
        dateFin: this.searchDateFin || undefined,
        page: this.currentPage,
        pageSize: this.pageSize,
      };
      this.clientService.search(search).subscribe({
        next: (result: PagedResult<ClientDto>) => {
          this.clients = result.items;
          this.total = result.total;
          this.totalPages = result.totalPages;
          this.loading = false;
        },
        error: () => {
          this.error = 'Erreur lors du chargement des clients.';
          this.loading = false;
        }
      });
    }
  }

  onQuickSearch(): void {
    this.quickSearch$.next(this.quickSearch);
  }

  clearQuickSearch(): void {
    this.quickSearch = '';
    this.searchNom = '';
    this.searchCode = '';
    this.searchPrenom = '';
    this.searchVille = '';
    this.searchStatut = '';
    this.searchDateDebut = '';
    this.searchDateFin = '';
    this.currentPage = 1;
    this.loadClients();
  }

  loadVilles() {
    this.clientService.getVilles().subscribe({
      next: (villes) => this.villes = villes,
      error: () => {}
    });
  }

  toggleArchived() {
    this.showArchived = !this.showArchived;
    this.currentPage = 1;
    this.loadClients();
  }

  applyFilters() {
    this.currentPage = 1;
    this.quickSearch = '';
    this.loadClients();
  }

  resetFilters() {
    this.quickSearch = '';
    this.searchNom = '';
    this.searchPrenom = '';
    this.searchCode = '';
    this.searchVille = '';
    this.searchStatut = '';
    this.searchDateDebut = '';
    this.searchDateFin = '';
    this.currentPage = 1;
    this.loadClients();
  }

  toggleFilters() {
    this.filterOpen = !this.filterOpen;
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadClients();
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.loadClients();
  }

  confirmArchive(id: number) {
    this.confirmActionId = id;
    this.confirmActionType = 'archive';
  }

  confirmRestore(id: number) {
    this.confirmActionId = id;
    this.confirmActionType = 'restore';
  }

  openBlockModal(id: number) {
    this.blockClientId = id;
    this.blockReason = '';
    this.showBlockModal = true;
  }

  openUnblockModal(id: number) {
    this.blockClientId = id;
    this.showBlockModal = true;
  }

  closeBlockModal() {
    this.showBlockModal = false;
    this.blockClientId = null;
    this.blockReason = '';
  }

  submitBlock() {
    if (!this.blockClientId || !this.blockReason.trim()) return;
    this.blocking = true;
    this.clientStatusService.blockClient(this.blockClientId, this.blockReason.trim()).subscribe({
      next: () => {
        this.blocking = false;
        this.showBlockModal = false;
        this.blockClientId = null;
        this.blockReason = '';
        this.loadClients();
      },
      error: (err) => {
        this.error = err.error?.message || 'Erreur lors du blocage.';
        this.blocking = false;
      }
    });
  }

  submitUnblock() {
    if (!this.blockClientId) return;
    this.blocking = true;
    this.clientStatusService.unblockClient(this.blockClientId).subscribe({
      next: () => {
        this.blocking = false;
        this.showBlockModal = false;
        this.blockClientId = null;
        this.loadClients();
      },
      error: (err) => {
        this.error = err.error?.message || 'Erreur lors du déblocage.';
        this.blocking = false;
      }
    });
  }

  getBlockedClient(): ClientDto | undefined {
    return this.clients.find(c => c.id === this.blockClientId);
  }

  cancelConfirm() {
    this.confirmActionId = null;
  }

  executeAction(id: number) {
    if (this.confirmActionType === 'archive') {
      this.clientService.archive(id).subscribe({
        next: () => {
          this.confirmActionId = null;
          this.loadClients();
        },
        error: (err) => {
          this.error = err.error?.message || "Erreur lors de l'archivage.";
          this.confirmActionId = null;
        }
      });
    } else {
      this.clientService.restore(id).subscribe({
        next: () => {
          this.confirmActionId = null;
          this.loadClients();
        },
        error: (err) => {
          this.error = err.error?.message || 'Erreur lors de la restauration.';
          this.confirmActionId = null;
        }
      });
    }
  }

  exportExcel() {
    const search: ClientSearchDto = {
      nom: this.searchNom || this.quickSearch || undefined,
      prenom: this.searchPrenom || undefined,
      codeClient: this.searchCode || undefined,
      ville: this.searchVille || undefined,
      statut: this.searchStatut || undefined,
      dateDebut: this.searchDateDebut || undefined,
      dateFin: this.searchDateFin || undefined,
    };
    this.clientService.export(search).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `clients_${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.error = 'Erreur lors de l\'export Excel.';
      }
    });
  }

  getStatutClass(statut: string): string {
    switch (statut) {
      case 'Actif': return 'bg-green-50 text-green-700 border-green-200';
      case 'En attente': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Bloqué': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-surface-container text-on-surface-variant border-outline-variant';
    }
  }

  getStatutIcon(statut: string): string {
    switch (statut) {
      case 'Actif': return 'check_circle';
      case 'En attente': return 'hourglass_empty';
      case 'Bloqué': return 'block';
      default: return 'help';
    }
  }

  get pages(): number[] {
    const pages: number[] = [];
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.totalPages, this.currentPage + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }
}
