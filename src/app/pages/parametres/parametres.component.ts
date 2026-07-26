import { Component, OnInit } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, UserDto } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  standalone: true,
  imports: [NgIf, FormsModule],
  templateUrl: './parametres.component.html',
  styleUrls: ['./parametres.component.css'],
})
export class ParametresComponent implements OnInit {
  activeTab: 'profil' | 'securite' = 'profil';

  user: UserDto | null = null;
  username = '';
  email = '';
  photoUrl: string | null = null;

  saving = false;
  profileError = '';
  profileSuccess = '';

  oldPassword = '';
  newPassword = '';
  confirmPassword = '';
  passwordError = '';
  passwordSuccess = '';
  passwordLoading = false;

  constructor(private auth: AuthService) {}

  ngOnInit(): void {
    this.auth.getProfile().subscribe({
      next: (u) => {
        this.user = u;
        this.username = u.username;
        this.email = u.email;
        this.photoUrl = u.photoUrl || null;
      },
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
    if (!allowed.includes(file.type)) {
      this.profileError = `Format '${file.type}' non supporté. Utilisez jpg, png, gif ou webp.`;
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.profileError = 'L\'image ne doit pas dépasser 2 Mo.';
      return;
    }

    this.auth.uploadPhoto(file).subscribe({
      next: (res) => {
        this.photoUrl = res.photoUrl;
      },
      error: (err) => {
        this.profileError = err.error?.message || 'Erreur lors de l\'upload de la photo.';
      },
    });
  }

  saveProfile(): void {
    this.profileError = '';
    this.profileSuccess = '';

    if (!this.username || !this.email) {
      this.profileError = 'Veuillez remplir tous les champs.';
      return;
    }

    this.saving = true;
    this.auth.updateProfile({ username: this.username, email: this.email }).subscribe({
      next: () => {
        this.profileSuccess = 'Profil mis à jour avec succès.';
        this.saving = false;
        setTimeout(() => this.profileSuccess = '', 4000);
      },
      error: (err) => {
        this.profileError = err.error?.message || 'Erreur lors de la mise à jour.';
        this.saving = false;
      },
    });
  }

  changePassword(): void {
    this.passwordError = '';
    this.passwordSuccess = '';

    if (!this.oldPassword || !this.newPassword || !this.confirmPassword) {
      this.passwordError = 'Veuillez remplir tous les champs.';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.passwordError = 'Les nouveaux mots de passe ne correspondent pas.';
      return;
    }

    if (this.newPassword.length < 8) {
      this.passwordError = 'Le mot de passe doit contenir au moins 8 caractères.';
      return;
    }

    if (!/[A-Z]/.test(this.newPassword)) {
      this.passwordError = 'Le mot de passe doit contenir au moins une majuscule.';
      return;
    }

    if (!/[a-z]/.test(this.newPassword)) {
      this.passwordError = 'Le mot de passe doit contenir au moins une minuscule.';
      return;
    }

    if (!/[0-9]/.test(this.newPassword)) {
      this.passwordError = 'Le mot de passe doit contenir au moins un chiffre.';
      return;
    }

    this.passwordLoading = true;
    this.auth.changePassword(this.oldPassword, this.newPassword).subscribe({
      next: () => {
        this.passwordSuccess = 'Mot de passe changé avec succès.';
        this.oldPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
        this.passwordLoading = false;
        setTimeout(() => this.passwordSuccess = '', 4000);
      },
      error: (err) => {
        this.passwordError = err.error?.message || 'Erreur lors du changement.';
        this.passwordLoading = false;
      },
    });
  }

  getInitials(): string {
    return (this.user?.username?.charAt(0) || 'U').toUpperCase();
  }

  get fullPhotoUrl(): string | null {
    return this.photoUrl ? `${environment.staticUrl}${this.photoUrl}` : null;
  }
}
