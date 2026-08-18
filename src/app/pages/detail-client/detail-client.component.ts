import { Component, OnInit } from '@angular/core';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ClientService } from '../../services/client.service';
import { DocumentService } from '../../services/document.service';
import { AuthService } from '../../services/auth.service';
import { ActivityService, PagedEvenementsDto } from '../../services/activity.service';
import { PortalService, GenerateLinkResponse } from '../../services/portal.service';
import { ClientStatusService, ClientStatusReport } from '../../services/client-status.service';
import { FinanceService } from '../../services/finance.service';
import { ReportService } from '../../services/report.service';
import { AiService } from '../../services/ai.service';
import { AdvancedSearchService, TagDto } from '../../services/advanced-search.service';
import { RiskService } from '../../services/risk.service';
import { FraudService } from '../../services/fraud.service';
import { ToastService } from '../../shared/toast/toast.service';
import { ClientDto, DocumentDto, EvenementClientDto, NoteClientDto, ContactClientDto } from '../../models/client.models';
import { CompteDto, MouvementDto, CompteTotalDto } from '../../models/finance.models';
import { lastValueFrom } from 'rxjs';
import {
  ClientSummaryDto,
  RapportRisqueDto,
  AlertesFraudeDto,
} from '../../models/ai.models';
import { fieldBorder, isValidEmail, PHONE_RE } from '../../shared/validation.utils';

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
  blockTouched = false;

  markBlockTouched(): void {
    this.blockTouched = true;
  }

  blockBorder(): string {
    if (!this.blockTouched) return '';
    return this.blockReason.trim() ? fieldBorder('ok') : fieldBorder('error');
  }

  blockMessage(): string {
    if (!this.blockTouched) return '';
    return this.blockReason.trim() ? 'Champ valide.' : 'La raison du blocage est obligatoire.';
  }

  blockMessageClass(): string {
    if (!this.blockTouched) return '';
    return this.blockReason.trim() ? 'text-emerald-600' : 'text-red-600';
  }

  blockMessageIcon(): string {
    if (!this.blockTouched) return '';
    return this.blockReason.trim() ? 'check_circle' : 'error';
  }

  isBlockValid(): boolean {
    return !!this.blockReason?.trim();
  }

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

  // ── Situation financière & Relevé ─────────────────────────────────────
  comptes: CompteDto[] = [];
  totaux: CompteTotalDto[] = [];
  mouvements: MouvementDto[] = [];
  mouvementsTotal = 0;
  loadingComptes = false;
  loadingMouvements = false;
  compteSelectionneId: number | null = null;
  mvtFilterDateDebut = '';
  mvtFilterDateFin = '';
  mvtFilterSens = '';
  mvtFilterMontantMin: number | null = null;
  mvtFilterMontantMax: number | null = null;
  mvtPage = 1;
  mvtPageSize = 20;
  exportLoading = false;

  // ── Activité (timeline), notes & contacts ─────────────────────────────
  evenements: EvenementClientDto[] = [];
  evenementsTotal = 0;
  evenementPage = 1;
  evenementPageSize = 20;
  loadingEvenements = false;
  evenementsLoaded = false;

  notes: NoteClientDto[] = [];
  loadingNotes = false;
  notesLoaded = false;
  showNoteForm = false;
  savingNote = false;
  editingNoteId: number | null = null;
  noteForm = { titre: '', contenu: '', categorie: 'Général', estEpinglee: false };
  noteTouched: Record<string, boolean> = {};

  markNoteTouched(field: string): void {
    this.noteTouched[field] = true;
  }

  noteBorder(field: string): string {
    if (!this.noteTouched[field]) return '';
    const value = field === 'contenu' ? this.noteForm.contenu : this.noteForm.titre;
    return value && value.trim() ? fieldBorder('ok') : fieldBorder('error');
  }

  noteMessage(field: string): string {
    if (!this.noteTouched[field]) return '';
    const value = field === 'contenu' ? this.noteForm.contenu : this.noteForm.titre;
    if (!value || !value.trim()) return field === 'contenu' ? 'Le contenu est requis.' : 'Le titre est requis.';
    return 'Champ valide.';
  }

  noteMessageClass(field: string): string {
    if (!this.noteTouched[field]) return '';
    const value = field === 'contenu' ? this.noteForm.contenu : this.noteForm.titre;
    return value && value.trim() ? 'text-emerald-600' : 'text-red-600';
  }

  noteMessageIcon(field: string): string {
    if (!this.noteTouched[field]) return '';
    const value = field === 'contenu' ? this.noteForm.contenu : this.noteForm.titre;
    return value && value.trim() ? 'check_circle' : 'error';
  }

  isNoteValid(): boolean {
    return !!this.noteForm.contenu?.trim();
  }

  contacts: ContactClientDto[] = [];
  loadingContacts = false;
  contactsLoaded = false;
  showContactForm = false;
  savingContact = false;
  editingContactId: number | null = null;
  contactForm = { typeContact: 'Conjoint', nom: '', prenom: '', telephone: '', email: '', adresse: '', relation: '' };
  contactTouched: Record<string, boolean> = {};

  markContactTouched(field: string): void {
    this.contactTouched[field] = true;
  }

  private contactValue(field: string): string {
    switch (field) {
      case 'nom': return this.contactForm.nom;
      case 'prenom': return this.contactForm.prenom;
      case 'telephone': return this.contactForm.telephone;
      case 'email': return this.contactForm.email;
      case 'adresse': return this.contactForm.adresse;
      case 'relation': return this.contactForm.relation;
      default: return '';
    }
  }

  contactBorder(field: string): string {
    if (!this.contactTouched[field]) return '';
    const value = this.contactValue(field);
    if (!value || !value.trim()) return field === 'nom' ? fieldBorder('error') : '';
    if (field === 'email') return isValidEmail(value) ? fieldBorder('ok') : fieldBorder('error');
    if (field === 'telephone') return PHONE_RE.test(value) ? fieldBorder('ok') : fieldBorder('error');
    return fieldBorder('ok');
  }

  contactMessage(field: string): string {
    if (!this.contactTouched[field]) return '';
    const value = this.contactValue(field);
    if (!value || !value.trim()) return field === 'nom' ? 'Le nom est requis.' : '';
    if (field === 'email') return isValidEmail(value) ? 'Adresse email valide.' : 'Adresse email invalide.';
    if (field === 'telephone') return PHONE_RE.test(value) ? 'Numéro valide.' : 'Numéro de téléphone invalide.';
    return 'Champ valide.';
  }

  contactMessageClass(field: string): string {
    if (!this.contactTouched[field]) return '';
    const value = this.contactValue(field);
    if (!value || !value.trim()) return field === 'nom' ? 'text-red-600' : '';
    if (field === 'email') return isValidEmail(value) ? 'text-emerald-600' : 'text-red-600';
    if (field === 'telephone') return PHONE_RE.test(value) ? 'text-emerald-600' : 'text-red-600';
    return 'text-emerald-600';
  }

  contactMessageIcon(field: string): string {
    if (!this.contactTouched[field]) return '';
    const value = this.contactValue(field);
    if (!value || !value.trim()) return field === 'nom' ? 'error' : '';
    if (field === 'email') return isValidEmail(value) ? 'check_circle' : 'error';
    if (field === 'telephone') return PHONE_RE.test(value) ? 'check_circle' : 'error';
    return 'check_circle';
  }

  isContactValid(): boolean {
    const { nom, email, telephone } = this.contactForm;
    return !!nom?.trim() && (!email?.trim() || isValidEmail(email)) && (!telephone?.trim() || PHONE_RE.test(telephone));
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private clientService: ClientService,
    public documentService: DocumentService,
    public authService: AuthService,
    private clientStatusService: ClientStatusService,
    private portalService: PortalService,
    private financeService: FinanceService,
    private reportService: ReportService,
    private activityService: ActivityService,
    private aiService: AiService,
    private riskService: RiskService,
    private fraudService: FraudService,
    private advancedSearchService: AdvancedSearchService,
    private sanitizer: DomSanitizer,
    private toast: ToastService
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
        // Charger le rapport de statut et les documents automatiquement
        this.loadStatusReport();
        this.loadDocuments();
        this.loadAiFeatures();
        this.loadClientTags();
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

  // ── Tags client ─────────────────────────────────────────────────
  clientTags: TagDto[] = [];
  tagInput = '';
  tagSaving = false;
  tagRemovingId: number | null = null;

  loadClientTags(): void {
    if (!this.client) return;
    this.advancedSearchService.getClientTags(this.client.id).subscribe({
      next: (tags) => {
        this.clientTags = tags;
      },
      error: () => this.clientTags = []
    });
  }

  addClientTag(): void {
    const tag = this.tagInput.trim();
    if (!tag || !this.client) return;
    this.tagSaving = true;
    this.advancedSearchService.addClientTag(this.client.id, tag).subscribe({
      next: (t) => {
        this.tagSaving = false;
        this.clientTags.push(t);
        this.tagInput = '';
        this.toast.success(`Tag « ${t.tag} » ajouté au client.`);
      },
      error: (err) => {
        this.tagSaving = false;
        this.toast.error(err.error?.message || 'Erreur lors de l\'ajout du tag.');
      }
    });
  }

  async removeClientTag(tag: TagDto): Promise<void> {
    const ok = await lastValueFrom(this.toast.confirm(`Supprimer le tag « ${tag.tag} » ?`));
    if (!ok) return;
    this.tagRemovingId = tag.id;
    this.advancedSearchService.removeClientTag(tag.id).subscribe({
      next: () => {
        this.tagRemovingId = null;
        this.clientTags = this.clientTags.filter(t => t.id !== tag.id);
        this.toast.success('Tag supprimé.');
      },
      error: (err) => {
        this.tagRemovingId = null;
        this.toast.error(err.error?.message || 'Erreur lors de la suppression du tag.');
      }
    });
  }

  // ── Fonctionnalités IA : résumé, risque, fraude ─────────────────
  aiSummary: ClientSummaryDto | null = null;
  loadingAiSummary = false;
  riskRapport: RapportRisqueDto | null = null;
  loadingRisk = false;
  riskCalculEnCours = false;
  fraudAlertes: AlertesFraudeDto[] = [];
  loadingFraud = false;
  fraudAnalyseEnCours = false;

  private loadAiFeatures(): void {
    if (!this.client) return;
    this.loadAiSummary();
    this.loadRiskReport();
    this.loadFraudAlertes();
  }

  loadAiSummary(): void {
    if (!this.client) return;
    this.loadingAiSummary = true;
    this.aiService.resumeClient(this.client.id).subscribe({
      next: (s) => {
        this.aiSummary = s;
        this.loadingAiSummary = false;
      },
      error: () => {
        this.loadingAiSummary = false;
      },
    });
  }

  loadRiskReport(): void {
    if (!this.client) return;
    this.loadingRisk = true;
    this.riskService.getRapport(this.client.id).subscribe({
      next: (r) => {
        this.riskRapport = r;
        this.loadingRisk = false;
      },
      error: () => {
        this.riskRapport = null;
        this.loadingRisk = false;
      },
    });
  }

  calculerRisque(): void {
    if (!this.client) return;
    this.riskCalculEnCours = true;
    this.riskService.calculer(this.client.id).subscribe({
      next: (r) => {
        this.riskRapport = r;
        this.riskCalculEnCours = false;
        this.toast.success('Score de risque recalculé avec succès.');
        this.loadAiSummary();
      },
      error: (err) => {
        this.riskCalculEnCours = false;
        this.toast.error(err.error?.message || 'Erreur lors du calcul du risque.');
      },
    });
  }

  loadFraudAlertes(): void {
    if (!this.client) return;
    this.loadingFraud = true;
    this.fraudService.getAlertesByClient(this.client.id).subscribe({
      next: (items) => {
        this.fraudAlertes = items;
        this.loadingFraud = false;
      },
      error: () => {
        this.loadingFraud = false;
      },
    });
  }

  analyserFraude(): void {
    if (!this.client) return;
    this.fraudAnalyseEnCours = true;
    this.fraudService.analyserClient(this.client.id).subscribe({
      next: () => {
        this.fraudAnalyseEnCours = false;
        this.toast.success('Analyse de fraude lancée avec succès.');
        this.loadFraudAlertes();
        this.loadAiSummary();
      },
      error: (err) => {
        this.fraudAnalyseEnCours = false;
        this.toast.error(err.error?.message || 'Erreur lors de l\'analyse de fraude.');
      },
    });
  }

  traiterAlerteFraude(a: AlertesFraudeDto, statut: string): void {
    this.fraudService.traiterAlerte(a.id, statut).subscribe({
      next: () => {
        this.loadFraudAlertes();
        this.toast.success(statut === 'Traité' ? 'Alerte de fraude traitée.' : 'Alerte de fraude ignorée.');
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Erreur lors du traitement de l\'alerte.');
      },
    });
  }

  risqueNiveauClass(niveau: string): string {
    switch (niveau) {
      case 'Critique': return 'bg-error/10 text-error border-error/20';
      case 'Eleve': return 'bg-warning/10 text-warning border-warning/30';
      case 'Modere': return 'bg-primary/10 text-primary border-primary/20';
      default: return 'bg-green-50 text-green-700 border-green-200';
    }
  }

  risqueBarreClass(score: number): string {
    if (score >= 70) return 'bg-error';
    if (score >= 45) return 'bg-warning';
    if (score >= 25) return 'bg-primary';
    return 'bg-green-500';
  }

  switchTab(tab: string) {
    this.activeTab = tab;
    if (tab === 'docs' && this.client && this.documents.length === 0) {
      this.loadDocuments();
    }
    if (tab === 'comptes' && this.client && this.comptes.length === 0) {
      this.loadComptes();
    }
    if (tab === 'activite' && this.client && !this.evenementsLoaded) {
      this.loadEvenements();
    }
    if (tab === 'notes' && this.client) {
      if (!this.notesLoaded) this.loadNotes();
      if (!this.contactsLoaded) this.loadContacts();
    }
  }

  loadComptes() {
    if (!this.client) return;
    this.loadingComptes = true;
    this.financeService.getComptesByClient(this.client.id).subscribe({
      next: (comptes) => {
        this.comptes = comptes;
        if (comptes.length > 0) {
          this.compteSelectionneId = comptes[0].id;
          this.loadMouvements();
        }
        this.loadingComptes = false;
      },
      error: () => this.loadingComptes = false
    });
    this.financeService.getTotauxByClient(this.client.id).subscribe({
      next: (totaux) => this.totaux = totaux,
      error: () => {}
    });
  }

  selectCompte(id: number) {
    this.compteSelectionneId = id;
    this.mvtPage = 1;
    this.loadMouvements();
  }

  loadMouvements() {
    if (!this.client || !this.compteSelectionneId) return;
    this.loadingMouvements = true;
    this.financeService.getMouvementsByCompte(this.compteSelectionneId, {
      dateDebut: this.mvtFilterDateDebut || undefined,
      dateFin: this.mvtFilterDateFin || undefined,
      sens: this.mvtFilterSens || undefined,
      montantMin: this.mvtFilterMontantMin ?? undefined,
      montantMax: this.mvtFilterMontantMax ?? undefined,
      page: this.mvtPage,
      pageSize: this.mvtPageSize
    }).subscribe({
      next: (result) => {
        this.mouvements = result.items;
        this.mouvementsTotal = result.total;
        this.loadingMouvements = false;
      },
      error: () => this.loadingMouvements = false
    });
  }

  resetMouvementFilters() {
    this.mvtFilterDateDebut = '';
    this.mvtFilterDateFin = '';
    this.mvtFilterSens = '';
    this.mvtFilterMontantMin = null;
    this.mvtFilterMontantMax = null;
    this.mvtPage = 1;
    this.loadMouvements();
  }

  get compteSelectionne(): CompteDto | null {
    return this.comptes.find(c => c.id === this.compteSelectionneId) || null;
  }

  get mvtTotalPages(): number {
    return Math.max(1, Math.ceil(this.mouvementsTotal / this.mvtPageSize));
  }

  // Patrimoine consolidé toutes devises confondues (contre-valeur en TND)
  get patrimoineTotal(): number {
    return this.totaux.reduce((sum, t) => sum + t.totalContreValeur, 0);
  }

  get nbComptes(): number {
    return this.comptes.length;
  }

  get totalCredit(): number {
    return this.mouvements.filter(m => m.sens === 'C').reduce((s, m) => s + m.montant, 0);
  }

  get totalDebit(): number {
    return this.mouvements.filter(m => m.sens === 'D').reduce((s, m) => s + m.montant, 0);
  }

  exportReleve(format: 'pdf' | 'excel') {
    if (!this.compteSelectionneId) return;
    this.exportLoading = true;
    const params = {
      compteId: this.compteSelectionneId,
      dateDebut: this.mvtFilterDateDebut || undefined,
      dateFin: this.mvtFilterDateFin || undefined,
      sens: this.mvtFilterSens || undefined,
      montantMin: this.mvtFilterMontantMin ?? undefined,
      montantMax: this.mvtFilterMontantMax ?? undefined,
    };
    const obs = format === 'pdf'
      ? this.reportService.generateRelevePdf(params)
      : this.reportService.generateReleveExcel(params);
    obs.subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const ext = format === 'pdf' ? 'pdf' : 'xlsx';
        a.download = `releve_${this.compteSelectionne?.numCompte ?? this.compteSelectionneId}_${new Date().toISOString().slice(0, 10)}.${ext}`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.exportLoading = false;
        this.toast.success('Relevé exporté avec succès.');
      },
      error: () => {
        this.exportLoading = false;
        this.toast.error('Erreur lors de l\'export du relevé.');
      }
    });
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
        this.toast.success('Document téléchargé avec succès.');
      },
      error: () => {
        this.toast.error('Erreur lors du téléchargement du document.');
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
    if (!this.client || !this.uploadType || !this.uploadFile) {
      this.toast.error('Veuillez sélectionner un type de document et un fichier.');
      return;
    }
    this.uploading = true;
    this.documentService.create(this.client.id, this.uploadType, this.uploadFile).subscribe({
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

  validateDocument(id: number) {
    this.documentService.updateValidation(id, 'Validé').subscribe({
      next: () => {
        this.loadDocuments();
        this.toast.success('Document validé avec succès.');
      },
      error: (err) => {
        this.error = err.error?.message || 'Erreur lors de la validation.';
        this.toast.error(this.error);
        this.clearAlerts();
      }
    });
  }

  rejectDocument(id: number) {
    this.documentService.updateValidation(id, 'Rejeté').subscribe({
      next: () => {
        this.loadDocuments();
        this.toast.info('Document rejeté.');
      },
      error: (err) => {
        this.error = err.error?.message || 'Erreur lors du rejet.';
        this.toast.error(this.error);
        this.clearAlerts();
      }
    });
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

  openBlockModal() {
    this.isBlocking = true;
    this.blockReason = '';
    this.blockTouched = false;
    this.showBlockModal = true;
  }

  openUnblockModal() {
    this.isBlocking = false;
    this.showBlockModal = true;
  }

  closeBlockModal() {
    this.showBlockModal = false;
    this.blockReason = '';
    this.blockTouched = false;
  }

  submitBlock() {
    if (!this.client || !this.blockReason.trim()) {
      this.toast.error('La raison du blocage est obligatoire.');
      return;
    }
    this.blocking = true;
    this.clientStatusService.blockClient(this.client.id, this.blockReason.trim()).subscribe({
      next: () => {
        this.success = 'Client bloqué avec succès.';
        this.toast.success('Client bloqué avec succès.');
        this.blocking = false;
        this.showBlockModal = false;
        this.blockReason = '';
        this.loadClient(this.client!.id);
        this.clearAlerts();
      },
      error: (err) => {
        this.error = err.error?.message || 'Erreur lors du blocage.';
        this.toast.error(this.error);
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
        this.toast.success('Client débloqué avec succès.');
        this.blocking = false;
        this.showBlockModal = false;
        this.loadClient(this.client!.id);
        this.clearAlerts();
      },
      error: (err) => {
        this.error = err.error?.message || 'Erreur lors du déblocage.';
        this.toast.error(this.error);
        this.blocking = false;
        this.clearAlerts();
      }
    });
  }

  get isBlocked(): boolean {
    return this.client?.statut === 'Bloqué';
  }

  // Complétude du dossier : documents validés / documents requis (rapport de statut)
  get dossierCompletion(): number {
    if (!this.statusReport || this.statusReport.documentsRequis <= 0) return 0;
    return Math.min(100, Math.round((this.statusReport.documentsValides / this.statusReport.documentsRequis) * 100));
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

  getIcon(type: string): string {
    switch (type) {
      case 'CIN': return 'badge';
      case 'Contrat': return 'contract';
      case 'Justificatif': return 'receipt_long';
      case 'RIB': return 'account_balance';
      default: return 'description';
    }
  }

  // ── Activité (timeline) ─────────────────────────────────────────────

  loadEvenements() {
    if (!this.client) return;
    this.loadingEvenements = true;
    this.activityService.getEvenements(this.client.id, this.evenementPage, this.evenementPageSize).subscribe({
      next: (result) => {
        this.evenements = result.items;
        this.evenementsTotal = result.total;
        this.evenementsLoaded = true;
        this.loadingEvenements = false;
      },
      error: () => {
        this.loadingEvenements = false;
        this.evenementsLoaded = true;
      }
    });
  }

  loadMoreEvenements() {
    if (!this.client || this.loadingEvenements) return;
    this.evenementPage++;
    this.loadingEvenements = true;
    this.activityService.getEvenements(this.client.id, this.evenementPage, this.evenementPageSize).subscribe({
      next: (result) => {
        this.evenements = [...this.evenements, ...result.items];
        this.evenementsTotal = result.total;
        this.loadingEvenements = false;
      },
      error: () => {
        this.evenementPage--;
        this.loadingEvenements = false;
      }
    });
  }

  eventIcon(type: string): string {
    switch (type) {
      case 'Document': return 'description';
      case 'Statut': return 'verified_user';
      case 'Compte': return 'account_balance';
      case 'Rappel': return 'notifications';
      case 'Note': return 'sticky_note_2';
      case 'Contact': return 'contacts';
      case 'Workflow': return 'rule';
      default: return 'history';
    }
  }

  // ── Notes internes ──────────────────────────────────────────────────

  loadNotes() {
    if (!this.client) return;
    this.loadingNotes = true;
    this.activityService.getNotes(this.client.id).subscribe({
      next: (notes) => {
        this.notes = notes;
        this.notesLoaded = true;
        this.loadingNotes = false;
      },
      error: () => {
        this.notesLoaded = true;
        this.loadingNotes = false;
      }
    });
  }

  openNoteForm(note?: NoteClientDto) {
    this.editingNoteId = note ? note.id : null;
    this.noteTouched = {};
    this.noteForm = note
      ? { titre: note.titre || '', contenu: note.contenu, categorie: note.categorie, estEpinglee: note.estEpinglee }
      : { titre: '', contenu: '', categorie: 'Général', estEpinglee: false };
    this.showNoteForm = true;
  }

  closeNoteForm() {
    this.showNoteForm = false;
    this.editingNoteId = null;
    this.noteTouched = {};
  }

  saveNote() {
    this.noteTouched = { contenu: true, titre: true };
    if (!this.client || !this.isNoteValid()) return;
    this.savingNote = true;
    const dto = { titre: this.noteForm.titre || undefined, contenu: this.noteForm.contenu, categorie: this.noteForm.categorie, estEpinglee: this.noteForm.estEpinglee };
    const obs = this.editingNoteId
      ? this.activityService.updateNote(this.client.id, this.editingNoteId, dto)
      : this.activityService.createNote(this.client.id, dto);
    obs.subscribe({
      next: () => {
        this.savingNote = false;
        this.closeNoteForm();
        this.loadNotes();
        this.loadEvenements();
        this.success = 'Note enregistrée.';
        this.toast.success(this.editingNoteId ? 'Note modifiée avec succès.' : 'Note ajoutée avec succès.');
        this.clearAlerts();
      },
      error: (err) => {
        this.savingNote = false;
        this.error = err.error?.message || 'Erreur lors de l\'enregistrement de la note.';
        this.toast.error(this.error);
        this.clearAlerts();
      }
    });
  }

  async deleteNote(id: number) {
    if (!this.client) return;
    const ok = await lastValueFrom(this.toast.confirm('Supprimer cette note ?'));
    if (!ok) return;
    this.activityService.deleteNote(this.client.id, id).subscribe({
      next: () => { this.loadNotes(); this.toast.success('Note supprimée.'); },
      error: () => {
        this.error = 'Erreur lors de la suppression de la note.';
        this.clearAlerts();
      }
    });
  }

  // ── Contacts ────────────────────────────────────────────────────────

  loadContacts() {
    if (!this.client) return;
    this.loadingContacts = true;
    this.activityService.getContacts(this.client.id).subscribe({
      next: (contacts) => {
        this.contacts = contacts;
        this.contactsLoaded = true;
        this.loadingContacts = false;
      },
      error: () => {
        this.contactsLoaded = true;
        this.loadingContacts = false;
      }
    });
  }

  openContactForm(contact?: ContactClientDto) {
    this.editingContactId = contact ? contact.id : null;
    this.contactTouched = {};
    this.contactForm = contact
      ? {
          typeContact: contact.typeContact,
          nom: contact.nom,
          prenom: contact.prenom || '',
          telephone: contact.telephone || '',
          email: contact.email || '',
          adresse: contact.adresse || '',
          relation: contact.relation || ''
        }
      : { typeContact: 'Conjoint', nom: '', prenom: '', telephone: '', email: '', adresse: '', relation: '' };
    this.showContactForm = true;
  }

  closeContactForm() {
    this.showContactForm = false;
    this.editingContactId = null;
    this.contactTouched = {};
  }

  saveContact() {
    this.contactTouched = { nom: true, email: true, telephone: true, prenom: true, adresse: true, relation: true };
    if (!this.client || !this.isContactValid()) return;
    this.savingContact = true;
    const dto = {
      typeContact: this.contactForm.typeContact,
      nom: this.contactForm.nom,
      prenom: this.contactForm.prenom || undefined,
      telephone: this.contactForm.telephone || undefined,
      email: this.contactForm.email || undefined,
      adresse: this.contactForm.adresse || undefined,
      relation: this.contactForm.relation || undefined
    };
    const obs = this.editingContactId
      ? this.activityService.updateContact(this.client.id, this.editingContactId, dto)
      : this.activityService.createContact(this.client.id, dto);
    obs.subscribe({
      next: () => {
        this.savingContact = false;
        this.closeContactForm();
        this.loadContacts();
        this.loadEvenements();
        this.success = 'Contact enregistré.';
        this.toast.success(this.editingContactId ? 'Contact modifié avec succès.' : 'Contact ajouté avec succès.');
        this.clearAlerts();
      },
      error: (err) => {
        this.savingContact = false;
        this.error = err.error?.message || 'Erreur lors de l\'enregistrement du contact.';
        this.toast.error(this.error);
        this.clearAlerts();
      }
    });
  }

  async deleteContact(id: number) {
    if (!this.client) return;
    const ok = await lastValueFrom(this.toast.confirm('Supprimer ce contact ?'));
    if (!ok) return;
    this.activityService.deleteContact(this.client.id, id).subscribe({
      next: () => { this.loadContacts(); this.toast.success('Contact supprimé.'); },
      error: () => {
        this.error = 'Erreur lors de la suppression du contact.';
        this.clearAlerts();
      }
    });
  }

  contactTypeLabel(type: string): string {
    switch (type) {
      case 'Conjoint': return 'Conjoint';
      case 'Garant': return 'Garant';
      case 'Reference': return 'Référence';
      case 'Heritier': return 'Héritier';
      default: return 'Autre';
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
        this.toast.success('Lien du portail client généré avec succès.');
      },
      error: (err) => {
        this.portalError = err.error?.message || 'Erreur lors de la génération du lien.';
        this.portalSending = false;
        this.toast.error(this.portalError);
      }
    });
  }

  copyPortalLink() {
    if (this.portalLink) {
      navigator.clipboard.writeText(this.portalLink);
      this.toast.success('Lien copié dans le presse-papiers.');
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
