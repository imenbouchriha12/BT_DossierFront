import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { FinanceService } from '../../services/finance.service';
import { CompteDto } from '../../models/finance.models';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './comptes.component.html',
})
export class ComptesComponent implements OnInit {
  comptes: CompteDto[] = [];
  total = 0;
  page = 1;
  pageSize = 20;
  loading = true;

  filterNumCompte = '';
  filterAgence = '';
  filterDevise = '';
  filterCodeClient = '';

  constructor(private financeService: FinanceService) {}

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  get hasActiveFilters(): boolean {
    return !!(this.filterNumCompte || this.filterAgence || this.filterDevise || this.filterCodeClient);
  }

  ngOnInit(): void {
    this.search();
  }

  search(page?: number): void {
    if (page !== undefined) this.page = page;
    this.loading = true;
    this.financeService.searchComptes({
      numCompte: this.filterNumCompte || undefined,
      agence: this.filterAgence || undefined,
      devise: this.filterDevise || undefined,
      codeClient: this.filterCodeClient || undefined,
      page: this.page,
      pageSize: this.pageSize
    }).subscribe({
      next: (result) => {
        this.comptes = result.items;
        this.total = result.total;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  resetFilters(): void {
    this.filterNumCompte = '';
    this.filterAgence = '';
    this.filterDevise = '';
    this.filterCodeClient = '';
    this.page = 1;
    this.search();
  }

  getStatutSolde(c: CompteDto): string {
    if (c.solde < 0) return 'Découvert';
    if (c.solde === 0) return 'Soldé';
    return 'Créditeur';
  }

  getDeviseClass(devise: string): string {
    switch (devise) {
      case 'TND': return 'bg-primary/10 text-primary';
      case 'EUR': return 'bg-blue-50 text-blue-600';
      case 'USD': return 'bg-green-50 text-green-600';
      default: return 'bg-surface-container text-on-surface-variant';
    }
  }

  getSoldeClass(c: CompteDto): string {
    if (c.solde < 0) return 'text-error';
    if (c.solde === 0) return 'text-on-surface-variant';
    return 'text-green-600';
  }
}
