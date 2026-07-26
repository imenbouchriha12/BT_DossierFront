import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { PortalService, ClientPortalView, RequiredDocumentStatus } from '../../services/portal.service';

@Component({
  selector: 'app-portal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './portal.component.html',
})
export class PortalComponent implements OnInit {
  token = '';
  portalView: ClientPortalView | null = null;
  loading = true;
  error = '';
  invalidReason = '';

  uploadingType = '';
  uploadingFile: File | null = null;
  uploading = false;
  uploadSuccess = '';
  uploadError = '';

  constructor(
    private route: ActivatedRoute,
    private portalService: PortalService
  ) {}

  ngOnInit() {
    this.token = this.route.snapshot.paramMap.get('token') || '';
    if (this.token) {
      this.loadPortal();
    } else {
      this.error = 'Lien invalide.';
      this.loading = false;
    }
  }

  loadPortal() {
    this.loading = true;
    this.error = '';
    this.invalidReason = '';
    this.portalService.getPortalView(this.token).subscribe({
      next: (view) => {
        this.portalView = view;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        if (err.status === 401) {
          this.invalidReason = err.error?.message || 'Lien invalide ou expiré.';
        } else if (err.status === 404) {
          this.error = 'Client introuvable.';
        } else {
          this.error = 'Erreur lors du chargement.';
        }
      }
    });
  }

  startUpload(typeDocument: string) {
    this.uploadingType = typeDocument;
    this.uploadingFile = null;
    this.uploadSuccess = '';
    this.uploadError = '';
  }

  cancelUpload() {
    this.uploadingType = '';
    this.uploadingFile = null;
  }

  onFileSelected(event: any, input: HTMLInputElement) {
    this.uploadingFile = event.target.files?.[0] || null;
  }

  submitUpload() {
    if (!this.uploadingType || !this.uploadingFile) return;
    this.uploading = true;
    this.uploadError = '';
    this.uploadSuccess = '';
    this.portalService.uploadDocument(this.token, this.uploadingType, this.uploadingFile).subscribe({
      next: (result) => {
        this.uploading = false;
        this.uploadSuccess = result.message;
        this.uploadingType = '';
        this.uploadingFile = null;
        this.loadPortal();
        setTimeout(() => this.uploadSuccess = '', 6000);
      },
      error: (err) => {
        this.uploading = false;
        this.uploadError = err.error?.message || 'Erreur lors de l\'upload.';
      }
    });
  }

  getStatusIcon(doc: RequiredDocumentStatus): string {
    if (!doc.statut) return 'pending';
    if (doc.statut === 'Validé') return 'valid';
    if (doc.statut === 'Rejeté') return 'rejected';
    return 'pending';
  }

  getStatusLabel(doc: RequiredDocumentStatus): string {
    if (!doc.statut) return 'Non soumis';
    return doc.statut;
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' o';
    if (bytes < 1048576) return (bytes / 1024).toFixed(0) + ' Ko';
    return (bytes / 1048576).toFixed(1) + ' Mo';
  }
}
