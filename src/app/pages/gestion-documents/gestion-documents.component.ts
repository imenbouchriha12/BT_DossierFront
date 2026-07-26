import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DocumentService } from '../../services/document.service';
import { ClientService } from '../../services/client.service';
import { DocumentDto, ClientDto, PagedResult } from '../../models/client.models';
import { AuthService } from '../../services/auth.service';

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

  filterStatut = '';
  currentPage = 1;
  pageSize = 10;
  total = 0;
  totalPages = 0;

  constructor(
    public documentService: DocumentService,
    public clientService: ClientService,
    public authService: AuthService,
    private sanitizer: DomSanitizer
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
      },
      error: () => {
        this.error = 'Erreur lors du chargement des documents.';
        this.loading = false;
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
    if (!this.selectedClient || !this.uploadType || !this.uploadFile) return;

    this.uploading = true;
    this.documentService.create(this.selectedClient.id, this.uploadType, this.uploadFile).subscribe({
      next: () => {
        this.uploading = false;
        this.showUpload = false;
        this.uploadType = '';
        this.uploadFile = null;
        this.success = 'Document ajouté avec succès.';
        this.loadDocuments();
        this.clearAlerts();
      },
      error: (err) => {
        this.uploading = false;
        this.error = err.error?.message || 'Erreur lors de l\'upload.';
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
      },
      error: () => {
        this.error = 'Erreur lors du téléchargement.';
        this.clearAlerts();
      }
    });
  }

  validateDocument(id: number) {
    this.documentService.updateValidation(id, 'Validé').subscribe({
      next: () => this.loadDocuments(),
      error: () => {
        this.error = 'Erreur lors de la validation.';
        this.clearAlerts();
      }
    });
  }

  rejectDocument(id: number) {
    this.documentService.updateValidation(id, 'Rejeté').subscribe({
      next: () => this.loadDocuments(),
      error: () => {
        this.error = 'Erreur lors du rejet.';
        this.clearAlerts();
      }
    });
  }

  deleteDocument(id: number) {
    if (!confirm('Supprimer ce document définitivement ?')) return;
    this.documentService.delete(id).subscribe({
      next: () => {
        this.success = 'Document supprimé.';
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
}
