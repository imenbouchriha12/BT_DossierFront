import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ClientService } from '../../services/client.service';
import { ClientStatusService } from '../../services/client-status.service';
import { ClientDto, ClientSearchDto, PagedResult } from '../../models/client.models';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../shared/toast/toast.service';
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
  searchType = '';
  searchDateDebut = '';
  searchDateFin = '';

  villes: string[] = [];
  clientTypes = ['Particulier', 'Entreprise', 'VIP', 'Professionnel', 'Association'];
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
    private clientStatusService: ClientStatusService,
    private toast: ToastService
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
      this.searchType = '';
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
        typeClient: this.searchType || undefined,
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
    this.searchType = '';
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
    this.searchType = '';
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
    if (!this.blockClientId || !this.blockReason.trim()) {
      this.toast.error('Veuillez saisir un motif de blocage.');
      return;
    }
    this.blocking = true;
    this.clientStatusService.blockClient(this.blockClientId, this.blockReason.trim()).subscribe({
      next: () => {
        this.blocking = false;
        this.showBlockModal = false;
        this.blockClientId = null;
        this.blockReason = '';
        this.toast.success('Client bloqué avec succès.');
        this.loadClients();
      },
      error: (err) => {
        this.error = err.error?.message || 'Erreur lors du blocage.';
        this.toast.error(this.error);
        this.blocking = false;
      }
    });
  }

  submitUnblock() {
    if (!this.blockClientId) {
      this.toast.error('Client introuvable.');
      return;
    }
    this.blocking = true;
    this.clientStatusService.unblockClient(this.blockClientId).subscribe({
      next: () => {
        this.blocking = false;
        this.showBlockModal = false;
        this.blockClientId = null;
        this.toast.success('Client débloqué avec succès.');
        this.loadClients();
      },
      error: (err) => {
        this.error = err.error?.message || 'Erreur lors du déblocage.';
        this.toast.error(this.error);
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
          this.toast.success('Client archivé avec succès.');
          this.loadClients();
        },
        error: (err) => {
          this.error = err.error?.message || "Erreur lors de l'archivage.";
          this.toast.error(this.error);
          this.confirmActionId = null;
        }
      });
    } else {
      this.clientService.restore(id).subscribe({
        next: () => {
          this.confirmActionId = null;
          this.toast.success('Client restauré avec succès.');
          this.loadClients();
        },
        error: (err) => {
          this.error = err.error?.message || 'Erreur lors de la restauration.';
          this.toast.error(this.error);
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
      typeClient: this.searchType || undefined,
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
        this.toast.success('Export Excel téléchargé avec succès.');
      },
      error: () => {
        this.error = 'Erreur lors de l\'export Excel.';
        this.toast.error(this.error);
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

  getTypeClass(type: string): string {
    switch (type) {
      case 'Entreprise': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'VIP': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Professionnel': return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'Association': return 'bg-orange-50 text-orange-700 border-orange-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  }

  getTypeIcon(type: string): string {
    switch (type) {
      case 'Entreprise': return 'business';
      case 'VIP': return 'star';
      case 'Professionnel': return 'work';
      case 'Association': return 'groups';
      default: return 'person';
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
