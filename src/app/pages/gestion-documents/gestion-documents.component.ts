import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DocumentService } from '../../services/document.service';
import { ClientService } from '../../services/client.service';
import { WorkflowService } from '../../services/workflow.service';
import { AdvancedSearchService, TagDto } from '../../services/advanced-search.service';
import { DocumentDto, ClientDto, PagedResult, WorkflowValidationDto } from '../../models/client.models';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../shared/toast/toast.service';
import { lastValueFrom } from 'rxjs';


@Component({
  selector: 'app-gestion-documents',
  standalone: true,
  imports: [RouterModule, FormsModule, CommonModule],
  templateUrl: './gestion-documents.component.html',
  styleUrls: ['./gestion-documents.component.css'],
})
export class GestionDocumentsComponent implements OnInit {
  Math = Math;
  documents: DocumentDto[] = [];
  selectedClient: ClientDto | null = null;
  clients: ClientDto[] = [];
  searchTerm = '';
  loading = false;
  error = '';
  success = '';
  showUpload = false;
  uploading = false;

  uploadType = '';
  uploadFile: File | null = null;

  // Preview modal
  showPreview = false;
  previewUrl: SafeResourceUrl = '';
  previewType = '';
  previewFilename = '';
  previewDocId = 0;
  previewLoading = false;
  previewError = '';

  // Workflow de validation multi-niveaux
  workflowsByDoc = new Map<number, WorkflowValidationDto>();
  showWorkflow = false;
  activeWorkflow: WorkflowValidationDto | null = null;
  workflowHistory: WorkflowValidationDto[] = [];
  workflowComment = '';
  workflowAction: 'valider' | 'rejeter' | 'relancer' | null = null;
  workflowDerogation = false;
  workflowLoading = false;
  workflowError = '';
  commentTouched = false;

  markCommentTouched(): void {
    this.commentTouched = true;
  }

  commentBorder(): string {
    if (!this.commentTouched || this.workflowComment.trim()) return '';
    return '!border-red-400';
  }

  commentMessage(): string {
    if (!this.commentTouched || this.workflowComment.trim()) return '';
    return 'Le motif de rejet est obligatoire.';
  }

  filterStatut = '';
  currentPage = 1;
  pageSize = 10;
  total = 0;
  totalPages = 0;

  constructor(
    public documentService: DocumentService,
    public clientService: ClientService,
    public workflowService: WorkflowService,
    public authService: AuthService,
    private advancedSearchService: AdvancedSearchService,
    private sanitizer: DomSanitizer,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.loadClients();
  }

  loadClients() {
    this.clientService.search({ pageSize: 50 }).subscribe({
      next: (result: PagedResult<ClientDto>) => {
        this.clients = result.items;
      }
    });
  }

  get filteredClients(): ClientDto[] {
    if (!this.searchTerm) return [];
    const term = this.searchTerm.toLowerCase();
    return this.clients.filter(c =>
      c.codeClient.toLowerCase().includes(term) ||
      c.nom.toLowerCase().includes(term) ||
      c.prenom.toLowerCase().includes(term)
    ).slice(0, 10);
  }

  selectClient(client: ClientDto) {
    this.selectedClient = client;
    this.searchTerm = `${client.codeClient} - ${client.prenom} ${client.nom}`;
    this.currentPage = 1;
    this.loadDocuments();
  }

  loadDocuments() {
    if (!this.selectedClient) return;
    this.loading = true;
    this.documentService.getByClientPaged(this.selectedClient.id, this.currentPage, this.pageSize).subscribe({
      next: (result) => {
        this.documents = result.items;
        this.total = result.total;
        this.totalPages = result.totalPages;
        this.loading = false;
        this.loadWorkflows();
      },
      error: () => {
        this.error = 'Erreur lors du chargement des documents.';
        this.loading = false;
      }
    });
  }

  loadWorkflows() {
    const ids = this.documents.map(d => d.id);
    if (ids.length === 0) {
      this.workflowsByDoc = new Map();
      return;
    }
    this.workflowService.getByDocuments(ids).subscribe({
      next: (workflows) => {
        const map = new Map<number, WorkflowValidationDto>();
        workflows.forEach(w => map.set(w.idDocument, w));
        this.workflowsByDoc = map;
      },
      error: () => {
        this.workflowsByDoc = new Map();
      }
    });
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadDocuments();
  }

  get pages(): number[] {
    const maxVisible = 5;
    const start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(this.totalPages, start + maxVisible - 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  get filteredDocuments(): DocumentDto[] {
    if (!this.filterStatut) return this.documents;
    return this.documents.filter(d => d.statutValidation === this.filterStatut);
  }

  get filteredTotal(): number {
    if (!this.filterStatut) return this.total;
    return this.filteredDocuments.length;
  }

  setFilterStatut(statut: string) {
    this.filterStatut = this.filterStatut === statut ? '' : statut;
    this.currentPage = 1;
  }

  changePageSize(event: any) {
    this.pageSize = Number(event.target.value);
    this.currentPage = 1;
    this.loadDocuments();
  }

  toggleUpload() {
    this.showUpload = !this.showUpload;
    this.uploadType = '';
    this.uploadFile = null;
  }

  onFileSelected(event: any) {
    this.uploadFile = event.target.files?.[0] || null;
  }

  uploadDocument() {
    if (!this.selectedClient || !this.uploadType || !this.uploadFile) {
      this.toast.error('Veuillez sélectionner un type de document et un fichier.');
      return;
    }

    this.uploading = true;
    this.documentService.create(this.selectedClient.id, this.uploadType, this.uploadFile).subscribe({
      next: () => {
        this.uploading = false;
        this.showUpload = false;
        this.uploadType = '';
        this.uploadFile = null;
        this.success = 'Document ajouté avec succès.';
        this.toast.success('Document ajouté avec succès.');
        this.loadDocuments();
        this.clearAlerts();
      },
      error: (err) => {
        this.uploading = false;
        this.error = err.error?.message || 'Erreur lors de l\'upload.';
        this.toast.error(this.error);
        this.clearAlerts();
      }
    });
  }

  downloadDocument(id: number) {
    this.documentService.download(id).subscribe({
      next: ({ blob, filename }) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
        this.toast.success('Document téléchargé avec succès.');
      },
      error: () => {
        this.error = 'Erreur lors du téléchargement.';
        this.toast.error(this.error);
        this.clearAlerts();
      }
    });
  }

  // ═══════════════ WORKFLOW DE VALIDATION MULTI-NIVEAUX ═══════════════

  getWorkflowForDoc(docId: number): WorkflowValidationDto | null {
    return this.workflowsByDoc.get(docId) ?? null;
  }

  workflowProgress(workflow: WorkflowValidationDto): string {
    if (!workflow.etapes || workflow.etapes.length === 0) return '0/0';
    const done = workflow.etapes.filter(e => e.statut === 'Valide').length;
    return `${done}/${workflow.etapes.length}`;
  }

  canActOnStep(workflow: WorkflowValidationDto): boolean {
    if (!workflow || workflow.statutGlobal !== 'EnCours' || !workflow.etapeCourante) return false;
    return this.authService.userRoles().includes(workflow.etapeCourante);
  }

  canDerogateStep(workflow: WorkflowValidationDto): boolean {
    if (!workflow || workflow.statutGlobal !== 'EnCours' || !workflow.etapeCourante) return false;
    if (this.canActOnStep(workflow)) return false;
    return this.authService.hasRole('Superviseur') || this.authService.hasRole('Admin');
  }

  canRelancer(workflow: WorkflowValidationDto): boolean {
    return !!workflow && workflow.statutGlobal === 'Rejete';
  }

  openWorkflow(doc: DocumentDto, action: 'valider' | 'rejeter' | 'relancer' | null = null) {
    const workflow = this.getWorkflowForDoc(doc.id);
    if (!workflow) {
      this.error = 'Aucun workflow de validation pour ce document.';
      this.clearAlerts();
      return;
    }
    this.activeWorkflow = workflow;
    this.workflowAction = action;
    this.workflowComment = '';
    this.workflowDerogation = false;
    this.workflowError = '';
    this.commentTouched = false;
    this.showWorkflow = true;

    this.workflowService.getHistory(doc.id).subscribe({
      next: (history) => {
        this.workflowHistory = history;
        this.workflowLoading = false;
      },
      error: () => {
        this.workflowHistory = [];
        this.workflowLoading = false;
      }
    });
  }

  closeWorkflow() {
    this.showWorkflow = false;
    this.activeWorkflow = null;
    this.workflowHistory = [];
    this.workflowComment = '';
    this.workflowDerogation = false;
    this.workflowAction = null;
    this.workflowError = '';
  }

  validateWorkflow() {
    if (!this.activeWorkflow) return;
    if (this.workflowDerogation && !this.workflowComment.trim()) {
      this.workflowError = 'Un commentaire est obligatoire pour déroger à l\'étape assignée.';
      this.toast.error(this.workflowError);
      return;
    }
    if (this.canDerogateStep(this.activeWorkflow) && !this.workflowDerogation) {
      this.workflowError = 'Cochez la dérogation et motivez-la pour intervenir sur une étape non assignée à votre rôle.';
      this.toast.error(this.workflowError);
      return;
    }
    this.workflowLoading = true;
    this.workflowService.valider(
      this.activeWorkflow.id,
      this.workflowComment || undefined,
      this.workflowDerogation
    ).subscribe({
      next: (updated) => {
        this.workflowLoading = false;
        this.workflowByDocUpdate(updated);
        this.success = this.workflowDerogation
          ? 'Dérogation enregistrée : étape approuvée.'
          : 'Étape de validation approuvée avec succès.';
        this.toast.success(this.success);
        this.closeWorkflow();
        this.loadDocuments();
        this.clearAlerts();
      },
      error: (err) => {
        this.workflowLoading = false;
        this.workflowError = err.error?.message || 'Erreur lors de la validation.';
        this.toast.error(this.workflowError);
      }
    });
  }

  rejectWorkflow() {
    if (!this.activeWorkflow) return;
    if (!this.workflowComment || !this.workflowComment.trim()) {
      this.commentTouched = true;
      this.workflowError = 'Le motif de rejet est obligatoire.';
      this.toast.error(this.workflowError);
      return;
    }
    if (this.canDerogateStep(this.activeWorkflow) && !this.workflowDerogation) {
      this.workflowError = 'Cochez la dérogation et motivez-la pour intervenir sur une étape non assignée à votre rôle.';
      this.toast.error(this.workflowError);
      return;
    }
    this.workflowLoading = true;
    this.workflowService.rejeter(this.activeWorkflow.id, this.workflowComment.trim(), this.workflowDerogation).subscribe({
      next: (updated) => {
        this.workflowLoading = false;
        this.workflowByDocUpdate(updated);
        this.success = 'Document rejeté.';
        this.toast.info('Document rejeté.');
        this.closeWorkflow();
        this.loadDocuments();
        this.clearAlerts();
      },
      error: (err) => {
        this.workflowLoading = false;
        this.workflowError = err.error?.message || 'Erreur lors du rejet.';
        this.toast.error(this.workflowError);
      }
    });
  }

  async resubmitWorkflow() {
    if (!this.activeWorkflow) return;
    const ok = await lastValueFrom(this.toast.confirm('Relancer le workflow de validation de ce document ?'));
    if (!ok) return;
    this.workflowLoading = true;
    this.workflowService.relancer(this.activeWorkflow.id, this.workflowComment || undefined).subscribe({
      next: () => {
        this.workflowLoading = false;
        this.success = 'Document relancé pour validation.';
        this.toast.success('Document relancé pour validation.');
        this.closeWorkflow();
        this.loadDocuments();
        this.clearAlerts();
      },
      error: (err) => {
        this.workflowLoading = false;
        this.workflowError = err.error?.message || 'Erreur lors de la relance.';
        this.toast.error(this.workflowError);
      }
    });
  }

  private workflowByDocUpdate(workflow: WorkflowValidationDto) {
    const map = new Map(this.workflowsByDoc);
    map.set(workflow.idDocument, workflow);
    this.workflowsByDoc = map;
  }

  getWorkflowStepClass(statut: string): string {
    switch (statut) {
      case 'Valide': return 'wf-step-done';
      case 'Rejete': return 'wf-step-rejected';
      case 'NonApplicable': return 'wf-step-skipped';
      default: return 'wf-step-pending';
    }
  }

  getWorkflowStepLabel(statut: string): string {
    switch (statut) {
      case 'Valide': return 'Validé';
      case 'Rejete': return 'Rejeté';
      case 'NonApplicable': return 'Non applicable';
      default: return 'En attente';
    }
  }

  getWorkflowGlobalLabel(statut: string): string {
    switch (statut) {
      case 'Valide': return 'Validé';
      case 'Rejete': return 'Rejeté';
      default: return 'En cours';
    }
  }

  async deleteDocument(id: number) {
    const ok = await lastValueFrom(this.toast.confirm('Supprimer ce document définitivement ?'));
    if (!ok) return;
    this.documentService.delete(id).subscribe({
      next: () => {
        this.success = 'Document supprimé.';
        this.toast.success('Document supprimé avec succès.');
        this.loadDocuments();
        this.clearAlerts();
      },
      error: () => {
        this.error = 'Erreur lors de la suppression.';
        this.clearAlerts();
      }
    });
  }

  private clearAlerts() {
    setTimeout(() => { this.error = ''; this.success = ''; }, 4000);
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  getStatutCount(statut: string): number {
    return this.documents.filter(d => d.statutValidation === statut).length;
  }

  getStatutClass(statut: string): string {
    switch (statut) {
      case 'Validé': return 'bg-green-50 text-green-700 border-green-200';
      case 'Rejeté': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  }

  getStatutBgClass(statut: string): string {
    switch (statut) {
      case 'Validé': return 'bg-green-100';
      case 'Rejeté': return 'bg-red-100';
      default: return 'bg-amber-100';
    }
  }

  getStatutTextClass(statut: string): string {
    switch (statut) {
      case 'Validé': return 'text-green-700';
      case 'Rejeté': return 'text-red-700';
      default: return 'text-amber-700';
    }
  }

  getIcon(type: string): string {
    switch (type) {
      case 'CIN': return 'badge';
      case 'Contrat': return 'contract';
      case 'Justificatif': return 'receipt_long';
      case 'RIB': return 'account_balance';
      default: return 'description';
    }
  }

  previewDocument(doc: DocumentDto) {
    if (!this.documentService.isPreviewable(doc.nomFichier)) {
      this.error = 'Ce type de fichier ne peut pas être prévisualisé. Téléchargez-le à la place.';
      this.clearAlerts();
      return;
    }
    this.showPreview = true;
    this.previewType = '';
    this.previewFilename = doc.nomFichier;
    this.previewDocId = doc.id;
    this.previewLoading = true;
    this.previewError = '';
    this.documentService.preview(doc.id).subscribe({
      next: (result) => {
        this.previewType = result.contentType;
        this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(result.objectUrl);
        this.previewLoading = false;
      },
      error: () => {
        this.previewLoading = false;
        this.previewError = 'Erreur lors du chargement de l\'aperçu.';
      }
    });
  }

  closePreview() {
    this.showPreview = false;
    this.previewUrl = '';
    this.previewType = '';
    this.previewFilename = '';
    this.previewDocId = 0;
    this.previewError = '';
  }

  get isPreviewPdf(): boolean {
    return this.previewType === 'application/pdf';
  }

  get isPreviewImage(): boolean {
    return this.previewType.startsWith('image/');
  }

  // ═══════════════ TAGS DOCUMENTS ═══════════════
  showDocTags = false;
  activeDocForTags: DocumentDto | null = null;
  docTags: TagDto[] = [];
  docTagInput = '';
  docTagLoading = false;
  docTagSaving = false;
  docTagRemovingId: number | null = null;

  openDocTags(doc: DocumentDto): void {
    this.activeDocForTags = doc;
    this.showDocTags = true;
    this.docTagInput = '';
    this.docTagLoading = true;
    this.docTags = [];
    this.advancedSearchService.getDocumentTags(doc.id).subscribe({
      next: (tags) => {
        this.docTags = tags;
        this.docTagLoading = false;
      },
      error: () => {
        this.docTagLoading = false;
        this.toast.error('Impossible de charger les tags.');
      }
    });
  }

  closeDocTags(): void {
    this.showDocTags = false;
    this.activeDocForTags = null;
    this.docTags = [];
    this.docTagInput = '';
    this.docTagRemovingId = null;
  }

  addDocTag(): void {
    const tag = this.docTagInput.trim();
    if (!tag || !this.activeDocForTags) return;
    this.docTagSaving = true;
    this.advancedSearchService.addDocumentTag(this.activeDocForTags.id, tag).subscribe({
      next: (t) => {
        this.docTagSaving = false;
        this.docTags.push(t);
        this.docTagInput = '';
        this.toast.success(`Tag « ${t.tag} » ajouté au document.`);
      },
      error: (err) => {
        this.docTagSaving = false;
        this.toast.error(err.error?.message || 'Erreur lors de l\'ajout du tag.');
      }
    });
  }

  async removeDocTag(tag: TagDto): Promise<void> {
    const ok = await lastValueFrom(this.toast.confirm(`Supprimer le tag « ${tag.tag} » ?`));
    if (!ok) return;
    this.docTagRemovingId = tag.id;
    this.advancedSearchService.removeDocumentTag(tag.id).subscribe({
      next: () => {
        this.docTagRemovingId = null;
        this.docTags = this.docTags.filter(t => t.id !== tag.id);
        this.toast.success('Tag supprimé.');
      },
      error: (err) => {
        this.docTagRemovingId = null;
        this.toast.error(err.error?.message || 'Erreur lors de la suppression du tag.');
      }
    });
  }
}
