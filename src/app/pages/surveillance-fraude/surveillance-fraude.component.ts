import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { FraudService } from '../../services/fraud.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../shared/toast/toast.service';
import { lastValueFrom } from 'rxjs';
import {
  AlertesFraudeDto,
  CreateRegleAntifraudeDto,
  FraudStatsDto,
  RegleAntifraudeDto,
} from '../../models/ai.models';

@Component({
  selector: 'app-surveillance-fraude',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './surveillance-fraude.component.html',
  styleUrls: ['./surveillance-fraude.component.css'],
})
export class SurveillanceFraudeComponent implements OnInit {
  activeSection: 'alertes' | 'regles' = 'alertes';

  // Alertes
  alertes: AlertesFraudeDto[] = [];
  totalAlertes = 0;
  page = 1;
  pageSize = 15;
  filterStatut = '';
  filterNiveau = '';
  loadingAlertes = false;
  analyserEnCours = false;
  error = '';
  success = '';

  // Traitement d'alerte
  alerteEnTraitement: AlertesFraudeDto | null = null;
  traitementStatut = 'Traitee';
  traitementCommentaire = '';
  traitementEnCours = false;

  // Règles
  regles: RegleAntifraudeDto[] = [];
  loadingRegles = false;
  showRegleModal = false;
  regleEnEdition: RegleAntifraudeDto | null = null;
  regleForm: CreateRegleAntifraudeDto = this.emptyRegle();
  sauvegardeRegle = false;

  stats: FraudStatsDto | null = null;
  isAdminOrSuperviseur = false;

  constructor(private fraudService: FraudService, private authService: AuthService, private toast: ToastService) {}

  ngOnInit(): void {
    this.isAdminOrSuperviseur =
      this.authService.hasRole('Admin') || this.authService.hasRole('Superviseur');
    this.loadStats();
    this.loadAlertes();
    this.loadRegles();
  }

  get pageCount(): number {
    return Math.max(1, Math.ceil(this.totalAlertes / this.pageSize));
  }

  pages(): number[] {
    const total = this.pageCount;
    const debut = Math.max(1, this.page - 2);
    const fin = Math.min(total, this.page + 2);
    const result: number[] = [];
    for (let i = debut; i <= fin; i++) result.push(i);
    return result;
  }

  changerPage(p: number): void {
    if (p < 1 || p > this.pageCount) return;
    this.page = p;
    this.loadAlertes();
  }

  loadStats(): void {
    this.fraudService.getStats().subscribe({
      next: (s) => (this.stats = s),
      error: () => (this.stats = null),
    });
  }

  loadAlertes(): void {
    this.loadingAlertes = true;
    this.fraudService
      .getAlertes({
        page: this.page,
        pageSize: this.pageSize,
        statut: this.filterStatut || undefined,
        niveau: this.filterNiveau || undefined,
      })
      .subscribe({
        next: (res) => {
          this.alertes = res.items;
          this.totalAlertes = res.total;
          this.loadingAlertes = false;
        },
        error: () => {
          this.error = 'Impossible de charger les alertes de fraude.';
          this.loadingAlertes = false;
        },
      });
  }

  appliquerFiltres(): void {
    this.page = 1;
    this.loadAlertes();
  }

  resetFiltres(): void {
    this.filterStatut = '';
    this.filterNiveau = '';
    this.page = 1;
    this.loadAlertes();
  }

  analyserTous(): void {
    this.analyserEnCours = true;
    this.fraudService.analyserTous().subscribe({
      next: (res) => {
        this.success = res.message;
        this.analyserEnCours = false;
        this.loadAlertes();
        this.loadStats();
      },
      error: (err) => {
        this.error = err.error?.message || "Erreur lors de l'analyse.";
        this.analyserEnCours = false;
      },
    });
  }

  ouvrirTraitement(a: AlertesFraudeDto): void {
    this.alerteEnTraitement = a;
    this.traitementStatut = 'Traitee';
    this.traitementCommentaire = '';
  }

  fermerTraitement(): void {
    this.alerteEnTraitement = null;
    this.traitementCommentaire = '';
  }

  traiterAlerte(): void {
    if (!this.alerteEnTraitement) return;
    this.traitementEnCours = true;
    this.fraudService
      .traiterAlerte(this.alerteEnTraitement.id, this.traitementStatut, this.traitementCommentaire)
      .subscribe({
        next: () => {
          this.success = 'Alerte traitée avec succès.';
          this.traitementEnCours = false;
          this.fermerTraitement();
          this.loadAlertes();
          this.loadStats();
        },
        error: (err) => {
          this.error = err.error?.message || "Erreur lors du traitement de l'alerte.";
          this.traitementEnCours = false;
        },
      });
  }

  // ---------------- Règles ----------------

  loadRegles(): void {
    this.loadingRegles = true;
    this.fraudService.getRegles().subscribe({
      next: (r) => {
        this.regles = r;
        this.loadingRegles = false;
      },
      error: () => {
        this.error = 'Impossible de charger les règles antifraude.';
        this.loadingRegles = false;
      },
    });
  }

  private emptyRegle(): CreateRegleAntifraudeDto {
    return {
      code: '',
      nom: '',
      description: '',
      type: 'MontantMaximal',
      seuil: 0,
      seuilSecondaire: undefined,
      periodeJours: 90,
      poids: 10,
      actif: true,
      priorite: 1,
    };
  }

  ouvrirNouvelleRegle(): void {
    this.regleEnEdition = null;
    this.regleForm = this.emptyRegle();
    this.showRegleModal = true;
  }

  ouvrirEditionRegle(r: RegleAntifraudeDto): void {
    this.regleEnEdition = r;
    this.regleForm = {
      code: r.code,
      nom: r.nom,
      description: r.description,
      type: r.type,
      seuil: r.seuil,
      seuilSecondaire: r.seuilSecondaire,
      periodeJours: r.periodeJours,
      poids: r.poids,
      actif: r.actif,
      priorite: r.priorite,
    };
    this.showRegleModal = true;
  }

  fermerRegleModal(): void {
    this.showRegleModal = false;
    this.regleEnEdition = null;
  }

  sauvegarderRegle(): void {
    this.sauvegardeRegle = true;
    const action = this.regleEnEdition
      ? this.fraudService.updateRegle(this.regleEnEdition.id, this.regleForm)
      : this.fraudService.createRegle(this.regleForm);

    action.subscribe({
      next: () => {
        this.success = this.regleEnEdition
          ? 'Règle mise à jour avec succès.'
          : 'Règle créée avec succès.';
        this.sauvegardeRegle = false;
        this.fermerRegleModal();
        this.loadRegles();
      },
      error: (err) => {
        this.error = err.error?.message || 'Erreur lors de la sauvegarde de la règle.';
        this.sauvegardeRegle = false;
      },
    });
  }

  toggleRegle(r: RegleAntifraudeDto): void {
    this.fraudService.toggleRegle(r.id).subscribe({
      next: () => this.loadRegles(),
      error: () => (this.error = "Erreur lors de l'activation/désactivation."),
    });
  }

  async supprimerRegle(r: RegleAntifraudeDto): Promise<void> {
    const ok = await lastValueFrom(this.toast.confirm(`Supprimer la règle « ${r.nom} » ?`));
    if (!ok) return;
    this.fraudService.deleteRegle(r.id).subscribe({
      next: () => {
        this.success = 'Règle supprimée.';
        this.toast.success('Règle supprimée avec succès.');
        this.loadRegles();
      },
      error: () => (this.error = 'Erreur lors de la suppression.'),
    });
  }

  // ---------------- Helpers d'affichage ----------------

  niveauClass(niveau: string): string {
    switch (niveau) {
      case 'Critique': return 'bg-error/10 text-error border-error/20';
      case 'Haute': return 'bg-warning/10 text-warning border-warning/30';
      case 'Moyenne': return 'bg-primary/10 text-primary border-primary/20';
      default: return 'bg-surface-container text-on-surface-variant border-outline-variant/40';
    }
  }

  statutLabel(statut: string): string {
    switch (statut) {
      case 'Nouvelle': return 'Nouvelle';
      case 'EnCours': return 'En cours';
      case 'Traitee': return 'Traitée';
      case 'Ignoree': return 'Ignorée';
      default: return statut;
    }
  }

  statutClass(statut: string): string {
    switch (statut) {
      case 'Traitee': return 'bg-green-100 text-green-700';
      case 'Ignoree': return 'bg-surface-container text-on-surface-variant';
      case 'EnCours': return 'bg-primary/10 text-primary';
      default: return 'bg-error/10 text-error';
    }
  }

  typeLibelle(type: string): string {
    switch (type) {
      case 'MontantMaximal': return 'Montant élevé';
      case 'MontantAnormal': return 'Montant anormal';
      case 'PicDebit': return 'Pic de débits';
      case 'MultiComptes': return 'Multi-comptes';
      case 'Frequence': return 'Fréquence anormale';
      default: return type;
    }
  }
}
