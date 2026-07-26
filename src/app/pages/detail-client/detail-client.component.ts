import { Component, OnInit } from '@angular/core';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ClientService } from '../../services/client.service';
import { DocumentService } from '../../services/document.service';
import { AuthService } from '../../services/auth.service';
import { PortalService, GenerateLinkResponse } from '../../services/portal.service';
import { ClientStatusService, ClientStatusReport } from '../../services/client-status.service';
import { ClientDto, DocumentDto } from '../../models/client.models';

@Component({
  selector: 'app-detail-client',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './detail-client.component.html',
  styleUrls: ['./detail-client.component.css'],
})
export class DetailClientComponent implements OnInit {
  client: ClientDto | null = null;
  documents: DocumentDto[] = [];
  statusReport: ClientStatusReport | null = null;
  loading = false;
  loadingDocs = false;
  loadingStatus = false;
  error = '';
  success = '';
  activeTab = 'general';

  showUpload = false;
  uploadType = '';
  uploadFile: File | null = null;
  uploading = false;

  // Modal de blocage/déblocage
  showBlockModal = false;
  isBlocking = true; // true = mode blocage, false = mode déblocage
  blockReason = '';
  blocking = false;

  // Portal
  showPortalModal = false;
  portalLink = '';
  portalExpiration = '';
  portalSending = false;
  portalSuccess = '';
  portalError = '';

  // Preview
  showPreview = false;
  previewUrl: SafeResourceUrl = '';
  previewType = '';
  previewFilename = '';
  previewDocId = 0;
  previewLoading = false;
  previewError = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private clientService: ClientService,
    public documentService: DocumentService,
    public authService: AuthService,
    private clientStatusService: ClientStatusService,
    private portalService: PortalService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadClient(+id);
    }
  }

  loadClient(id: number) {
    this.loading = true;
    this.clientService.getById(id).subscribe({
      next: (client) => {
        this.client = client;
        this.loading = false;
        // Charger le rapport de statut automatiquement
        this.loadStatusReport();
      },
      error: () => {
        this.error = 'Erreur lors du chargement du client.';
        this.loading = false;
      }
    });
  }

  loadStatusReport() {
    if (!this.client) return;
    this.loadingStatus = true;
    this.clientStatusService.getStatusReport(this.client.id).subscribe({
      next: (report) => {
        this.statusReport = report;
        this.loadingStatus = false;
      },
      error: () => {
        this.loadingStatus = false;
      }
    });
  }

  switchTab(tab: string) {
    this.activeTab = tab;
    if (tab === 'docs' && this.client && this.documents.length === 0) {
      this.loadDocuments();
    }
  }

  loadDocuments() {
    if (!this.client) return;
    this.loadingDocs = true;
    this.documentService.getByClient(this.client.id).subscribe({
      next: (docs) => {
        this.documents = docs;
        this.loadingDocs = false;
      },
      error: () => this.loadingDocs = false
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
      }
    });
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
    if (!this.client || !this.uploadType || !this.uploadFile) return;
    this.uploading = true;
    this.documentService.create(this.client.id, this.uploadType, this.uploadFile).subscribe({
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

  openBlockModal() {
    this.isBlocking = true;
    this.blockReason = '';
    this.showBlockModal = true;
  }

  openUnblockModal() {
    this.isBlocking = false;
    this.showBlockModal = true;
  }

  closeBlockModal() {
    this.showBlockModal = false;
    this.blockReason = '';
  }

  submitBlock() {
    if (!this.client || !this.blockReason.trim()) return;
    this.blocking = true;
    this.clientStatusService.blockClient(this.client.id, this.blockReason.trim()).subscribe({
      next: () => {
        this.success = 'Client bloqué avec succès.';
        this.blocking = false;
        this.showBlockModal = false;
        this.blockReason = '';
        this.loadClient(this.client!.id);
        this.clearAlerts();
      },
      error: (err) => {
        this.error = err.error?.message || 'Erreur lors du blocage.';
        this.blocking = false;
        this.clearAlerts();
      }
    });
  }

  submitUnblock() {
    if (!this.client) return;
    this.blocking = true;
    this.clientStatusService.unblockClient(this.client.id).subscribe({
      next: () => {
        this.success = 'Client débloqué avec succès.';
        this.blocking = false;
        this.showBlockModal = false;
        this.loadClient(this.client!.id);
        this.clearAlerts();
      },
      error: (err) => {
        this.error = err.error?.message || 'Erreur lors du déblocage.';
        this.blocking = false;
        this.clearAlerts();
      }
    });
  }

  get isBlocked(): boolean {
    return this.client?.statut === 'Bloqué';
  }

  getInitials(): string {
    if (!this.client) return '--';
    return (this.client.prenom[0] + this.client.nom[0]).toUpperCase();
  }

  calculateAge(): number {
    if (!this.client) return 0;
    const birth = new Date(this.client.dateNaissance);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }

  get statutClass(): string {
    if (!this.client) return '';
    switch (this.client.statut) {
      case 'Actif': return 'bg-primary/10 text-primary';
      case 'Bloqué': return 'bg-error/10 text-error';
      case 'En attente': return 'bg-secondary-container text-on-secondary-container';
      default: return 'bg-surface-container text-on-surface-variant';
    }
  }

  get statutDotClass(): string {
    if (!this.client) return '';
    switch (this.client.statut) {
      case 'Actif': return 'bg-primary';
      case 'Bloqué': return 'bg-error';
      case 'En attente': return 'bg-secondary';
      default: return 'bg-surface-variant';
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

  // ── Portal methods ───────────────────────────────────────────────────

  openPortalModal() {
    this.showPortalModal = true;
    this.portalLink = '';
    this.portalExpiration = '';
    this.portalSuccess = '';
    this.portalError = '';
  }

  closePortalModal() {
    this.showPortalModal = false;
    this.portalLink = '';
    this.portalExpiration = '';
  }

  sendPortalLink() {
    if (!this.client) return;
    this.portalSending = true;
    this.portalError = '';
    this.portalService.generateLink(this.client.id).subscribe({
      next: (result) => {
        this.portalLink = result.portalLink;
        this.portalExpiration = result.dateExpiration;
        this.portalSuccess = result.message;
        this.portalSending = false;
      },
      error: (err) => {
        this.portalError = err.error?.message || 'Erreur lors de la génération du lien.';
        this.portalSending = false;
      }
    });
  }

  copyPortalLink() {
    if (this.portalLink) {
      navigator.clipboard.writeText(this.portalLink);
    }
  }

  // ── Preview methods ──────────────────────────────────────────────────

  previewDocument(doc: DocumentDto) {
    if (!this.documentService.isPreviewable(doc.nomFichier)) {
      this.error = 'Ce type de fichier ne peut pas être prévisualisé.';
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
