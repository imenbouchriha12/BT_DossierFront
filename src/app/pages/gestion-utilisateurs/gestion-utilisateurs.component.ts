import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, UserDto } from '../../services/auth.service';
import { ToastService } from '../../shared/toast/toast.service';
import { lastValueFrom } from 'rxjs';
import { fieldBorder } from '../../shared/validation.utils';

interface RoleOption {
  id: number;
  name: string;
  isActive: boolean;
}

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-utilisateurs.component.html',
})
export class GestionUtilisateursComponent implements OnInit {
  Math = Math;
  pendingUsers: UserDto[] = [];
  approvedUsers: UserDto[] = [];
  roles: RoleOption[] = [];
  filteredRoles: RoleOption[] = [];

  loading = true;
  processingId: number | null = null;
  successMessage = '';
  errorMessage = '';
  selectedRole: { [userId: number]: number } = {};

  emailModalUser: UserDto | null = null;
  emailSubject = '';
  emailBody = '';
  sendingEmail = false;
  emailTouched: Record<string, boolean> = {};

  markEmailTouched(field: string): void {
    this.emailTouched[field] = true;
  }

  private emailState(field: string): 'idle' | 'error' | 'ok' {
    if (!this.emailTouched[field]) return 'idle';
    const value = field === 'subject' ? this.emailSubject : this.emailBody;
    if (!value || !value.trim()) return 'error';
    return 'ok';
  }

  emailBorder(field: string): string {
    return fieldBorder(this.emailState(field));
  }

  emailMessage(field: string): string {
    if (!this.emailTouched[field]) return '';
    const value = field === 'subject' ? this.emailSubject : this.emailBody;
    if (!value || !value.trim()) return field === 'subject' ? 'Le sujet est requis.' : 'Le message est requis.';
    return 'Champ valide.';
  }

  emailMessageClass(field: string): string {
    const state = this.emailState(field);
    if (state === 'error') return 'text-red-600';
    if (state === 'ok') return 'text-emerald-600';
    return '';
  }

  emailMessageIcon(field: string): string {
    const state = this.emailState(field);
    if (state === 'error') return 'error';
    if (state === 'ok') return 'check_circle';
    return '';
  }

  isEmailValid(): boolean {
    return !!this.emailSubject?.trim() && !!this.emailBody?.trim();
  }

  changingRole: { [userId: number]: boolean } = {};

  currentPage = 1;
  pageSize = 10;
  total = 0;
  totalPages = 0;

  constructor(private auth: AuthService, private toast: ToastService) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.auth.getRoles().subscribe({
      next: (roles) => {
        this.roles = roles.filter(r => r.name !== 'Admin' && r.isActive);
        this.filteredRoles = this.roles;
        const defaultRoleId = this.roles.length > 0 ? this.roles[0].id : 0;
        this.auth.getPendingUsers().subscribe({
          next: (users) => {
            this.pendingUsers = users;
            users.forEach(u => { this.selectedRole[u.id] = defaultRoleId; });
            this.currentPage = 1;
            this.loadApprovedUsers();
          },
          error: () => this.loading = false
        });
      },
      error: () => this.loading = false
    });
  }

  loadApprovedUsers(): void {
    this.auth.getAllUsers().subscribe({
      next: (users) => {
        this.approvedUsers = users.filter(u => u.roles.some(r => r === 'Agent' || r === 'Superviseur'));
        this.total = this.approvedUsers.length;
        this.totalPages = Math.ceil(this.total / this.pageSize) || 1;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  get paginatedUsers(): UserDto[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.approvedUsers.slice(start, start + this.pageSize);
  }

  get pages(): number[] {
    const maxVisible = 5;
    const start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(this.totalPages, start + maxVisible - 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  changePageSize(event: any): void {
    this.pageSize = Number(event.target.value);
    this.currentPage = 1;
    this.totalPages = Math.ceil(this.total / this.pageSize) || 1;
  }

  approve(userId: number): void {
    const roleId = this.selectedRole[userId];
    if (!roleId) return;

    this.processingId = userId;
    this.clearMessages();

    this.auth.approveUser(userId, roleId).subscribe({
      next: () => {
        this.pendingUsers = this.pendingUsers.filter(u => u.id !== userId);
        this.processingId = null;
        this.successMessage = 'Utilisateur approuvé. Un email lui a été envoyé avec ses identifiants.';
        this.toast.success('Utilisateur approuvé avec succès.');
        this.loadApprovedUsers();
        this.autoClear();
      },
      error: (err) => {
        this.processingId = null;
        this.errorMessage = err.error?.message || 'Erreur lors de l\'approbation.';
        this.toast.error(this.errorMessage);
        this.autoClear();
      }
    });
  }

  async reject(userId: number): Promise<void> {
    const ok = await lastValueFrom(this.toast.confirm('Êtes-vous sûr de vouloir rejeter cette demande ? L\'utilisateur sera supprimé.'));
    if (!ok) return;

    this.processingId = userId;
    this.clearMessages();

    this.auth.rejectUser(userId).subscribe({
      next: () => {
        this.pendingUsers = this.pendingUsers.filter(u => u.id !== userId);
        this.processingId = null;
        this.successMessage = 'Demande rejetée.';
        this.toast.success('Demande rejetée.');
        this.autoClear();
      },
      error: (err) => {
        this.processingId = null;
        this.errorMessage = err.error?.message || 'Erreur lors du rejet.';
        this.autoClear();
      }
    });
  }

  async toggleActivation(user: UserDto): Promise<void> {
    const action = user.isActive ? 'désactiver' : 'activer';
    const ok = await lastValueFrom(this.toast.confirm(`Êtes-vous sûr de vouloir ${action} le compte de ${user.username} ?`));
    if (!ok) return;

    this.processingId = user.id;
    this.clearMessages();

    const request = user.isActive
      ? this.auth.deactivateUser(user.id)
      : this.auth.activateUser(user.id);

    request.subscribe({
      next: () => {
        this.processingId = null;
        this.successMessage = `Compte ${action === 'désactiver' ? 'désactivé' : 'activé'} avec succès.`;
        this.toast.success(`Compte ${action === 'désactiver' ? 'désactivé' : 'activé'} avec succès.`);
        this.loadApprovedUsers();
        this.autoClear();
      },
      error: (err) => {
        this.processingId = null;
        this.errorMessage = err.error?.message || 'Erreur lors de l\'opération.';
        this.autoClear();
      }
    });
  }

  changeUserRole(user: UserDto, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const newRoleId = Number(select.value);
    if (!newRoleId) return;

    this.changingRole[user.id] = true;
    this.clearMessages();

    const oldRoleName = user.roles.find(r => r === 'Agent' || r === 'Superviseur');
    const oldRole = this.roles.find(r => r.name === oldRoleName);

    const doAssign = () => {
      this.auth.assignRole(user.id, newRoleId).subscribe({
        next: () => {
          this.changingRole[user.id] = false;
          this.successMessage = `Rôle de ${user.username} changé en ${this.roles.find(r => r.id === newRoleId)?.name}.`;
          this.toast.success(this.successMessage);
          this.loadApprovedUsers();
          this.autoClear();
        },
        error: (err) => {
          this.changingRole[user.id] = false;
          this.errorMessage = err.error?.message || 'Erreur lors du changement de rôle.';
          this.toast.error(this.errorMessage);
          this.autoClear();
        }
      });
    };

    if (oldRole) {
      this.auth.removeRole(user.id, oldRole.id).subscribe({
        next: () => doAssign(),
        error: (err) => {
          this.changingRole[user.id] = false;
          this.errorMessage = err.error?.message || 'Erreur lors du changement de rôle.';
          this.toast.error(this.errorMessage);
          this.autoClear();
        }
      });
    } else {
      doAssign();
    }
  }

  getRoleId(user: UserDto): number {
    const roleName = user.roles.find(r => r === 'Agent' || r === 'Superviseur');
    const role = this.roles.find(r => r.name === roleName);
    return role?.id || 0;
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  openEmailModal(user: UserDto): void {
    this.emailModalUser = user;
    this.emailSubject = '';
    this.emailBody = '';
    this.emailTouched = {};
  }

  closeEmailModal(): void {
    this.emailModalUser = null;
    this.emailSubject = '';
    this.emailBody = '';
    this.emailTouched = {};
  }

  sendEmail(): void {
    this.emailTouched = { subject: true, body: true };
    if (!this.emailModalUser || !this.isEmailValid()) return;

    this.sendingEmail = true;
    this.auth.sendEmail(this.emailModalUser.id, this.emailSubject, this.emailBody).subscribe({
      next: () => {
        this.sendingEmail = false;
        this.successMessage = `Email envoyé à ${this.emailModalUser!.email}.`;
        this.toast.success(this.successMessage);
        this.closeEmailModal();
        this.autoClear();
      },
      error: (err) => {
        this.sendingEmail = false;
        this.errorMessage = err.error?.message || 'Erreur lors de l\'envoi.';
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
