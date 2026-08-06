import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportService } from '../../services/report.service';
import { ClientService } from '../../services/client.service';
import { ToastService } from '../../shared/toast/toast.service';
import { ClientStatsDto } from '../../models/client.models';

type Tab = 'export' | 'import';
type ReportCategory = 'clients' | 'documents' | 'activity';

interface ReportOption {
  id: string;
  title: string;
  description: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  formats: ('pdf' | 'excel')[];
  category: ReportCategory;
  hasFilters: boolean;
  badge?: string;
}

@Component({
  selector: 'app-rapports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rapports.component.html',
  styleUrls: ['./rapports.component.css'],
})
export class RapportsComponent implements OnInit {
  activeTab: Tab = 'export';
  loading = false;
  successMessage = '';
  errorMessage = '';

  stats: ClientStatsDto | null = null;
  villes: string[] = [];

  // Report categories
  activeCategory: ReportCategory = 'clients';

  // Report options
  reportOptions: ReportOption[] = [
    {
      id: 'client-list',
      title: 'Répertoire Client',
      description: 'Liste complète de tous les clients avec coordonnées, statut et date d\'adhésion.',
      icon: 'badge',
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      formats: ['pdf', 'excel'],
      category: 'clients',
      hasFilters: true,
    },
    {
      id: 'client-statut',
      title: 'Clients par Statut',
      description: 'Répartition des clients actifs, en attente et bloqués avec détails.',
      icon: 'group',
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      formats: ['pdf', 'excel'],
      category: 'clients',
      hasFilters: true,
    },
    {
      id: 'client-geo',
      title: 'Répartition Géographique',
      description: 'Distribution des clients par ville et région.',
      icon: 'map',
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      formats: ['pdf', 'excel'],
      category: 'clients',
      hasFilters: false,
      badge: 'Populaire',
    },
    {
      id: 'doc-list',
      title: 'Inventaire Documents',
      description: 'État de tous les documents déposés par les clients : validation, rejet, en attente.',
      icon: 'folder_open',
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-600',
      formats: ['pdf', 'excel'],
      category: 'documents',
      hasFilters: true,
    },
    {
      id: 'doc-validation',
      title: 'Suivi Validation',
      description: 'Documents en attente de validation avec délais et priorités.',
      icon: 'pending_actions',
      iconBg: 'bg-orange-50',
      iconColor: 'text-orange-600',
      formats: ['pdf'],
      category: 'documents',
      hasFilters: false,
      badge: 'Urgent',
    },
    {
      id: 'stats-global',
      title: 'Rapport Statistique Global',
      description: 'KPIs, tendances mensuelles, répartitions et indicateurs de performance.',
      icon: 'analytics',
      iconBg: 'bg-rose-50',
      iconColor: 'text-rose-600',
      formats: ['pdf'],
      category: 'activity',
      hasFilters: false,
      badge: 'Recommandé',
    },
    {
      id: 'activity-log',
      title: 'Journal d\'Activité',
      description: 'Historique complet des modifications, connexions et actions sur les dossiers.',
      icon: 'history',
      iconBg: 'bg-teal-50',
      iconColor: 'text-teal-600',
      formats: ['pdf', 'excel'],
      category: 'activity',
      hasFilters: true,
    },
  ];

  categories: { id: ReportCategory; label: string; icon: string }[] = [
    { id: 'clients', label: 'Clients', icon: 'people' },
    { id: 'documents', label: 'Documents', icon: 'description' },
    { id: 'activity', label: 'Activité', icon: 'bolt' },
  ];

  // Export state
  selectedReportId: string | null = null;
  exportFormat: 'pdf' | 'excel' = 'pdf';

  // Filter state
  filterVille = '';
  filterStatut = '';
  filterDateDebut = '';
  filterDateFin = '';
  datePreset: string = '';

  // Import state
  dragOver = signal(false);
  selectedFile: File | null = null;
  importStep = 1;

  recentDownloads = signal<{ type: string; format: string; date: string; filename: string }[]>([]);
  importHistory = signal<{ filename: string; date: string; imported: number; success: boolean; message: string }[]>([]);

  constructor(
    private reportService: ReportService,
    private clientService: ClientService,
    private toast: ToastService
  ) {
    this.loadRecentDownloads();
    this.loadImportHistory();
  }

  ngOnInit(): void {
    this.clientService.getVilles().subscribe(v => this.villes = v);
    this.clientService.getStats().subscribe({
      next: (s) => this.stats = s,
      error: () => {}
    });
  }

  get selectedReport(): ReportOption | undefined {
    return this.reportOptions.find(r => r.id === this.selectedReportId) ?? undefined;
  }

  get filteredReports(): ReportOption[] {
    return this.reportOptions.filter(r => r.category === this.activeCategory);
  }

  get hasActiveFilters(): boolean {
    return !!(this.filterVille || this.filterStatut || this.filterDateDebut || this.filterDateFin);
  }

  get activeFilterCount(): number {
    let count = 0;
    if (this.filterVille) count++;
    if (this.filterStatut) count++;
    if (this.filterDateDebut) count++;
    if (this.filterDateFin) count++;
    return count;
  }

  get totalClients(): number {
    return this.stats?.totalClients ?? 0;
  }

  selectReport(option: ReportOption): void {
    this.selectedReportId = option.id;
    this.exportFormat = option.formats[0];
  }

  selectFormat(format: 'pdf' | 'excel'): void {
    this.exportFormat = format;
  }

  applyDatePreset(preset: string): void {
    this.datePreset = preset;
    const today = new Date();
    switch (preset) {
      case 'today':
        this.filterDateDebut = this.formatDate(today);
        this.filterDateFin = this.formatDate(today);
        break;
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        this.filterDateDebut = this.formatDate(weekAgo);
        this.filterDateFin = this.formatDate(today);
        break;
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        this.filterDateDebut = this.formatDate(monthAgo);
        this.filterDateFin = this.formatDate(today);
        break;
      case 'quarter':
        const quarterAgo = new Date(today);
        quarterAgo.setMonth(quarterAgo.getMonth() - 3);
        this.filterDateDebut = this.formatDate(quarterAgo);
        this.filterDateFin = this.formatDate(today);
        break;
      case 'year':
        const yearAgo = new Date(today);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        this.filterDateDebut = this.formatDate(yearAgo);
        this.filterDateFin = this.formatDate(today);
        break;
      case 'clear':
        this.filterDateDebut = '';
        this.filterDateFin = '';
        this.datePreset = '';
        break;
    }
  }

  clearFilters(): void {
    this.filterVille = '';
    this.filterStatut = '';
    this.filterDateDebut = '';
    this.filterDateFin = '';
    this.datePreset = '';
  }

  // ─── Export ────────────────────────────────────────────────

  generateReport(): void {
    if (!this.selectedReportId) return;
    this.loading = true;
    this.successMessage = '';
    this.errorMessage = '';

    const params = {
      ville: this.filterVille || undefined,
      statut: this.filterStatut || undefined,
      dateDebut: this.filterDateDebut || undefined,
      dateFin: this.filterDateFin || undefined,
    };

    const report = this.selectedReport;
    if (!report) return;

    let request$: any;
    if (report.id === 'stats-global') {
      request$ = this.reportService.generateStatsPdf();
    } else if (this.exportFormat === 'pdf') {
      request$ = this.reportService.generateClientListPdf(params);
    } else {
      request$ = this.reportService.generateClientListExcel(params);
    }

    request$.subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const ext = this.exportFormat;
        const dateStr = new Date().toISOString().slice(0, 10);
        const filename = `${report.id}_${dateStr}.${ext}`;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
        this.loading = false;
        this.successMessage = `"${report.title}" téléchargé avec succès.`;
        this.toast.success(`Rapport "${report.title}" téléchargé avec succès.`);
        this.addToRecent(report.title, ext, filename);
        setTimeout(() => this.successMessage = '', 5000);
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Erreur lors de la génération du rapport. Réessayez.';
        this.toast.error(this.errorMessage);
        setTimeout(() => this.errorMessage = '', 5000);
      }
    });
  }

  // ─── Import ────────────────────────────────────────────────

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(false);
    const file = event.dataTransfer?.files[0];
    if (file) this.validateAndSetFile(file);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) this.validateAndSetFile(input.files[0]);
  }

  private validateAndSetFile(file: File): void {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls'].includes(ext ?? '')) {
      this.errorMessage = 'Format non supporté. Utilisez un fichier Excel (.xlsx, .xls).';
      this.toast.error(this.errorMessage);
      setTimeout(() => this.errorMessage = '', 4000);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.errorMessage = 'Le fichier dépasse la taille maximale de 10 Mo.';
      this.toast.error(this.errorMessage);
      setTimeout(() => this.errorMessage = '', 4000);
      return;
    }
    this.selectedFile = file;
    this.importStep = 2;
  }

  downloadTemplate(): void {
    this.clientService.downloadImportTemplate().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'modele_import_clients.xlsx';
        a.click();
        window.URL.revokeObjectURL(url);
        this.successMessage = 'Modèle Excel téléchargé. Remplissez-le puis importez-le.';
        this.toast.success('Modèle Excel téléchargé avec succès.');
        setTimeout(() => this.successMessage = '', 5000);
      },
      error: () => {
        this.errorMessage = 'Erreur lors du téléchargement du modèle. Réessayez.';
        this.toast.error(this.errorMessage);
        setTimeout(() => this.errorMessage = '', 5000);
      }
    });
  }

  removeFile(): void {
    this.selectedFile = null;
    this.importStep = 1;
  }

  importFile(): void {
    if (!this.selectedFile) {
      this.toast.error('Veuillez sélectionner un fichier à importer.');
      return;
    }
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const formData = new FormData();
    formData.append('file', this.selectedFile);
    const fileName = this.selectedFile.name;

    this.clientService.importExcel(formData).subscribe({
      next: (res: any) => {
        this.loading = false;
        const imported = res?.imported ?? 0;
        this.successMessage = `Import réussi : ${imported} client(s) importé(s) avec succès.`;
        this.toast.success(this.successMessage);
        this.addToImportHistory(fileName, imported, true, this.successMessage);
        this.selectedFile = null;
        this.importStep = 1;
        setTimeout(() => this.successMessage = '', 6000);
      },
      error: (err) => {
        this.loading = false;
        const message = err.error?.message || 'Erreur lors de l\'import. Vérifiez le format de votre fichier.';
        this.errorMessage = message;
        this.toast.error(message);
        this.addToImportHistory(fileName, 0, false, message);
        setTimeout(() => this.errorMessage = '', 6000);
      }
    });
  }

  // ─── Helpers ──────────────────────────────────────────────

  private formatDate(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  private addToRecent(type: string, format: string, filename: string): void {
    const entry = { type, format, date: new Date().toISOString(), filename };
    const all = [entry, ...this.recentDownloads().slice(0, 9)];
    this.recentDownloads.set(all);
    localStorage.setItem('recentDownloads', JSON.stringify(all));
  }

  private loadRecentDownloads(): void {
    try {
      const raw = localStorage.getItem('recentDownloads');
      if (raw) this.recentDownloads.set(JSON.parse(raw));
    } catch {}
  }

  clearRecentDownloads(): void {
    this.recentDownloads.set([]);
    localStorage.removeItem('recentDownloads');
    this.toast.info('Historique des téléchargements effacé.');
  }

  // ─── Historique des imports ──────────────────────────────

  private addToImportHistory(filename: string, imported: number, success: boolean, message: string): void {
    const entry = { filename, imported, success, message, date: new Date().toISOString() };
    const all = [entry, ...this.importHistory().slice(0, 9)];
    this.importHistory.set(all);
    localStorage.setItem('importHistory', JSON.stringify(all));
  }

  private loadImportHistory(): void {
    try {
      const raw = localStorage.getItem('importHistory');
      if (raw) this.importHistory.set(JSON.parse(raw));
    } catch {}
  }

  clearImportHistory(): void {
    this.importHistory.set([]);
    localStorage.removeItem('importHistory');
    this.toast.info('Historique des imports effacé.');
  }
}
