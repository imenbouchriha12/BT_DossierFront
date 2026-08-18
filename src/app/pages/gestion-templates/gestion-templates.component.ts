import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { DocumentTemplateService, DocumentTemplateDto } from '../../services/document-template.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../shared/toast/toast.service';
import { lastValueFrom } from 'rxjs';
import { fieldBorder } from '../../shared/validation.utils';

const COMMON_FORMATS = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'doc', 'docx', 'xls', 'xlsx'];

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-templates.component.html',
})
export class GestionTemplatesComponent implements OnInit {
  Math = Math;
  fieldBorder = fieldBorder;
  formats = COMMON_FORMATS;

  templates: DocumentTemplateDto[] = [];
  types: string[] = [];
  filterType = 'Tous';

  loading = true;
  successMessage = '';
  errorMessage = '';
  isAdmin = false;

  modalOpen = false;
  modalMode: 'create' | 'edit' = 'create';
  editingId: number | null = null;
  formSaving = false;
  deletingId: number | null = null;
  processingId: number | null = null;

  formTypeClient = '';
  formNomDocument = '';
  formDescription = '';
  formEstObligatoire = true;
  formOrdre = 1;
  formatsSelected: string[] = [];
  formTailleMaxMo: number | null = null;

  typeClientTouched = false;
  nomDocumentTouched = false;
  ordreTouched = false;

  constructor(
    private templateService: DocumentTemplateService,
    private auth: AuthService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.auth.hasRole('Admin');
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.clearMessages();
    forkJoin({
      types: this.templateService.getTypesClients(),
      templates: this.templateService.getAll(),
    }).subscribe({
      next: ({ types, templates }) => {
        this.types = types;
        this.templates = templates;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Erreur lors du chargement des templates.';
        this.toast.error(this.errorMessage);
        this.autoClear();
      }
    });
  }

  // ── Filtres & compteurs ──────────────────────────────────────

  setFilterType(type: string): void {
    this.filterType = type;
  }

  get filteredTemplates(): DocumentTemplateDto[] {
    if (this.filterType === 'Tous') return this.templates;
    return this.templates.filter(t => t.typeClient === this.filterType);
  }

  get activeCount(): number {
    return this.templates.filter(t => t.isActive).length;
  }

  get inactiveCount(): number {
    return this.templates.filter(t => !t.isActive).length;
  }

  get obligatoryCount(): number {
    return this.templates.filter(t => t.estObligatoire).length;
  }

  get typesCount(): number {
    return this.types.length;
  }

  countForType(type: string): number {
    return this.templates.filter(t => t.typeClient === type).length;
  }

  formatChips(template: DocumentTemplateDto): string[] {
    return template.formatsAcceptes?.split(',').map(f => f.trim()).filter(Boolean) ?? [];
  }

  // ── Modal ────────────────────────────────────────────────────

  openCreateModal(): void {
    this.modalMode = 'create';
    this.editingId = null;
    this.formTypeClient = this.filterType !== 'Tous' ? this.filterType : '';
    this.formNomDocument = '';
    this.formDescription = '';
    this.formEstObligatoire = true;
    this.formOrdre = this.nextOrdre();
    this.formatsSelected = ['pdf'];
    this.formTailleMaxMo = 5;
    this.resetTouched();
    this.modalOpen = true;
  }

  openEditModal(template: DocumentTemplateDto): void {
    this.modalMode = 'edit';
    this.editingId = template.id;
    this.formTypeClient = template.typeClient;
    this.formNomDocument = template.nomDocument;
    this.formDescription = template.description ?? '';
    this.formEstObligatoire = template.estObligatoire;
    this.formOrdre = template.ordre;
    this.formatsSelected = this.formatChips(template);
    this.formTailleMaxMo = template.tailleMaxMo ?? null;
    this.resetTouched();
    this.modalOpen = true;
  }

  closeModal(): void {
    this.modalOpen = false;
    this.editingId = null;
    this.formSaving = false;
  }

  private resetTouched(): void {
    this.typeClientTouched = false;
    this.nomDocumentTouched = false;
    this.ordreTouched = false;
  }

  private nextOrdre(): number {
    const sameType = this.templates.filter(t =>
      this.filterType === 'Tous' ? t.typeClient === this.formTypeClient || !this.formTypeClient : t.typeClient === this.filterType
    );
    const max = sameType.reduce((m, t) => Math.max(m, t.ordre), 0);
    return max + 1;
  }

  toggleFormat(fmt: string): void {
    const idx = this.formatsSelected.indexOf(fmt);
    if (idx >= 0) this.formatsSelected.splice(idx, 1);
    else this.formatsSelected.push(fmt);
  }

  isFormatSelected(fmt: string): boolean {
    return this.formatsSelected.includes(fmt);
  }

  // ── Validation ───────────────────────────────────────────────

  get typeClientState(): 'idle' | 'error' | 'ok' {
    if (!this.typeClientTouched) return 'idle';
    return this.formTypeClient?.trim() ? 'ok' : 'error';
  }

  get typeClientMessage(): string {
    if (!this.typeClientTouched) return '';
    return this.formTypeClient?.trim() ? 'Type de client valide.' : 'Le type de client est requis.';
  }

  get nomDocumentState(): 'idle' | 'error' | 'ok' {
    if (!this.nomDocumentTouched) return 'idle';
    const name = this.formNomDocument?.trim() ?? '';
    if (!name) return 'error';
    return name.length >= 2 ? 'ok' : 'error';
  }

  get nomDocumentMessage(): string {
    if (!this.nomDocumentTouched) return '';
    const name = this.formNomDocument?.trim() ?? '';
    if (!name) return 'Le nom du document est requis.';
    if (name.length < 2) return 'Le nom doit contenir au moins 2 caractères.';
    const duplicate = this.templates.some(t =>
      t.typeClient.toLowerCase() === this.formTypeClient?.trim().toLowerCase()
      && t.nomDocument.toLowerCase() === name.toLowerCase()
      && t.id !== this.editingId
    );
    return duplicate ? 'Ce template existe déjà pour ce type de client.' : 'Nom de document valide.';
  }

  get ordreState(): 'idle' | 'error' | 'ok' {
    if (!this.ordreTouched) return 'idle';
    return this.formOrdre >= 0 ? 'ok' : 'error';
  }

  get ordreMessage(): string {
    if (!this.ordreTouched) return '';
    return this.formOrdre >= 0 ? 'Ordre valide.' : 'L\'ordre doit être un nombre positif.';
  }

  isFormValid(): boolean {
    const typeOk = !!this.formTypeClient?.trim();
    const name = this.formNomDocument?.trim() ?? '';
    const nameOk = name.length >= 2;
    const duplicate = this.templates.some(t =>
      t.typeClient.toLowerCase() === this.formTypeClient?.trim().toLowerCase()
      && t.nomDocument.toLowerCase() === name.toLowerCase()
      && t.id !== this.editingId
    );
    return typeOk && nameOk && !duplicate && this.formOrdre >= 0;
  }

  // ── Sauvegarde ───────────────────────────────────────────────

  saveTemplate(): void {
    this.typeClientTouched = true;
    this.nomDocumentTouched = true;
    this.ordreTouched = true;
    if (!this.isFormValid()) return;

    const base = {
      nomDocument: this.formNomDocument.trim(),
      description: this.formDescription.trim() || undefined,
      estObligatoire: this.formEstObligatoire,
      ordre: this.formOrdre,
      formatsAcceptes: this.formatsSelected.length ? this.formatsSelected.join(',') : undefined,
      tailleMaxMo: this.formTailleMaxMo ?? undefined,
    };

    this.formSaving = true;
    this.clearMessages();

    const request = this.modalMode === 'create'
      ? this.templateService.create({ ...base, typeClient: this.formTypeClient.trim() })
      : this.templateService.update(this.editingId!, base);

    request.subscribe({
      next: (tpl) => {
        this.formSaving = false;
        this.successMessage = this.modalMode === 'create'
          ? `Template « ${tpl.nomDocument} » créé avec succès.`
          : `Template « ${tpl.nomDocument} » mis à jour.`;
        this.toast.success(this.successMessage);
        this.closeModal();
        this.loadData();
        this.autoClear();
      },
      error: (err) => {
        this.formSaving = false;
        this.errorMessage = err.error?.message || 'Erreur lors de l\'enregistrement du template.';
        this.toast.error(this.errorMessage);
        this.autoClear();
      }
    });
  }

  async toggleActive(template: DocumentTemplateDto): Promise<void> {
    const action = template.isActive ? 'désactiver' : 'activer';
    const ok = await lastValueFrom(this.toast.confirm(`Êtes-vous sûr de vouloir ${action} le template « ${template.nomDocument} » ?`));
    if (!ok) return;

    this.processingId = template.id;
    this.clearMessages();

    const payload = {
      nomDocument: template.nomDocument,
      description: template.description ?? undefined,
      estObligatoire: template.estObligatoire,
      ordre: template.ordre,
      formatsAcceptes: template.formatsAcceptes ?? undefined,
      tailleMaxMo: template.tailleMaxMo ?? undefined,
      isActive: !template.isActive,
    };

    this.templateService.update(template.id, payload).subscribe({
      next: () => {
        this.processingId = null;
        this.successMessage = `Template « ${template.nomDocument} » ${template.isActive ? 'désactivé' : 'activé'} avec succès.`;
        this.toast.success(this.successMessage);
        this.loadData();
        this.autoClear();
      },
      error: (err) => {
        this.processingId = null;
        this.errorMessage = err.error?.message || 'Erreur lors de l\'opération.';
        this.toast.error(this.errorMessage);
        this.autoClear();
      }
    });
  }

  async deleteTemplate(template: DocumentTemplateDto): Promise<void> {
    const ok = await lastValueFrom(this.toast.confirm(`Supprimer définitivement le template « ${template.nomDocument} » ?`));
    if (!ok) return;

    this.deletingId = template.id;
    this.clearMessages();

    this.templateService.delete(template.id).subscribe({
      next: () => {
        this.deletingId = null;
        this.successMessage = `Template « ${template.nomDocument} » supprimé avec succès.`;
        this.toast.success(this.successMessage);
        this.loadData();
        this.autoClear();
      },
      error: (err) => {
        this.deletingId = null;
        this.errorMessage = err.error?.message || 'Erreur lors de la suppression du template.';
        this.toast.error(this.errorMessage);
        this.autoClear();
      }
    });
  }

  private clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }

  private autoClear(): void {
    setTimeout(() => { this.successMessage = ''; this.errorMessage = ''; }, 5000);
  }
}