import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { WorkflowService } from '../../services/workflow.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../shared/toast/toast.service';
import { WorkflowValidationDto } from '../../models/client.models';

type Decision = 'valider' | 'rejeter';

@Component({
  selector: 'app-mes-validations',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './mes-validations.component.html',
  styleUrls: ['./mes-validations.component.css'],
})
export class MesValidationsComponent implements OnInit {
  items: WorkflowValidationDto[] = [];
  total = 0;
  page = 1;
  pageSize = 10;
  totalPages = 0;
  loading = true;
  error = '';

  selected: WorkflowValidationDto | null = null;
  action: Decision | null = null;
  comment = '';
  submitting = false;
  actionError = '';

  constructor(
    public auth: AuthService,
    private workflowService: WorkflowService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  get roleLabel(): string {
    if (this.auth.hasRole('Admin')) return 'Administrateur';
    if (this.auth.hasRole('Superviseur')) return 'Superviseur';
    return 'Agent';
  }

  get roleHint(): string {
    if (this.auth.hasRole('Admin')) {
      return 'Documents validés par un superviseur, en attente de votre validation finale.';
    }
    if (this.auth.hasRole('Superviseur')) {
      return 'Documents validés par un agent, en attente de votre contrôle.';
    }
    return 'Documents déposés par l\'équipe, en attente de votre premier contrôle.';
  }

  get clientsConcernes(): number {
    return new Set(this.items.map(i => i.idClient)).size;
  }

  load(page = this.page): void {
    this.page = page;
    this.loading = true;
    this.error = '';

    this.workflowService.getEnAttente(page, this.pageSize).subscribe({
      next: (res) => {
        this.items = res.items ?? [];
        this.total = res.total;
        this.totalPages = res.totalPages;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || 'Impossible de charger vos validations.';
        this.toast.error(this.error);
      },
    });
  }

  progress(wf: WorkflowValidationDto): { done: number; total: number; percent: number } {
    const applicable = (wf.etapes ?? []).filter(e => e.statut !== 'NonApplicable');
    const done = applicable.filter(e => e.statut === 'Valide').length;
    const percent = applicable.length ? Math.round((done * 100) / applicable.length) : 0;
    return { done, total: applicable.length, percent };
  }

  etapeClass(role?: string): string {
    switch (role) {
      case 'Agent':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'Superviseur':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Admin':
        return 'bg-violet-50 text-violet-700 border-violet-200';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  }

  open(wf: WorkflowValidationDto, action: Decision): void {
    this.selected = wf;
    this.action = action;
    this.comment = '';
    this.actionError = '';
    this.submitting = false;
  }

  close(): void {
    this.selected = null;
    this.action = null;
    this.comment = '';
    this.actionError = '';
    this.submitting = false;
  }

  confirm(): void {
    if (!this.selected || !this.action) return;

    const comment = this.comment.trim();
    if (this.action === 'rejeter' && !comment) {
      this.actionError = 'Le motif de rejet est obligatoire.';
      return;
    }

    this.submitting = true;
    this.actionError = '';

    const request = this.action === 'valider'
      ? this.workflowService.valider(this.selected.id, comment || undefined)
      : this.workflowService.rejeter(this.selected.id, comment);

    request.subscribe({
      next: () => {
        this.submitting = false;
        this.toast.success(
          this.action === 'valider'
            ? 'Étape validée. Le dossier avance dans le circuit.'
            : 'Dossier rejeté. Le demandeur sera notifié.'
        );
        this.close();
        this.load(this.page);
      },
      error: (err) => {
        this.submitting = false;
        this.actionError = err.error?.message || 'La décision n\'a pas pu être enregistrée.';
        this.toast.error(this.actionError);
      },
    });
  }

  goTo(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.page) return;
    this.load(page);
  }

  trackById(_index: number, item: WorkflowValidationDto): number {
    return item.id;
  }
}
