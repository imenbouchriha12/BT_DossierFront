import { Component, OnInit } from '@angular/core';
import { NgIf, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, UserDto } from '../../services/auth.service';
import { environment } from '../../../environments/environment';
import { fieldBorder, isValidEmail, checkPassword } from '../../shared/validation.utils';

@Component({
  standalone: true,
  imports: [NgIf, NgClass, FormsModule],
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

  usernameTouched = false;
  emailTouched = false;
  oldPasswordTouched = false;
  newPasswordTouched = false;
  confirmPasswordTouched = false;

  constructor(private auth: AuthService) {}

  fieldBorder = fieldBorder;

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

  get usernameState(): string {
    if (!this.usernameTouched) return 'idle';
    return this.username ? 'ok' : 'error';
  }

  get emailState(): string {
    if (!this.emailTouched) return 'idle';
    if (!this.email) return 'error';
    return isValidEmail(this.email) ? 'ok' : 'error';
  }

  get emailMessage(): string {
    if (!this.emailTouched) return '';
    if (!this.email) return 'L\'adresse email est requise.';
    return isValidEmail(this.email) ? 'Adresse email valide.' : 'Adresse email invalide.';
  }

  get oldPasswordState(): string {
    if (!this.oldPasswordTouched) return 'idle';
    return this.oldPassword ? 'ok' : 'error';
  }

  get newPasswordState(): string {
    if (!this.newPasswordTouched) return 'idle';
    if (!this.newPassword) return 'error';
    return checkPassword(this.newPassword).score >= 4 ? 'ok' : 'warn';
  }

  get newPasswordMessage(): string {
    if (!this.newPasswordTouched) return '';
    if (!this.newPassword) return 'Le nouveau mot de passe est requis.';
    return checkPassword(this.newPassword).error || 'Mot de passe fort.';
  }

  get confirmPasswordState(): string {
    if (!this.confirmPasswordTouched) return 'idle';
    if (!this.confirmPassword) return 'error';
    return this.newPassword === this.confirmPassword ? 'ok' : 'error';
  }

  get confirmPasswordMessage(): string {
    if (!this.confirmPasswordTouched) return '';
    if (!this.confirmPassword) return 'Veuillez confirmer le nouveau mot de passe.';
    return this.newPassword === this.confirmPassword
      ? 'Les mots de passe correspondent.'
      : 'Les mots de passe ne correspondent pas.';
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
    this.usernameTouched = true;
    this.emailTouched = true;

    if (!this.username || !this.email || !isValidEmail(this.email)) {
      this.profileError = 'Veuillez vérifier les champs du formulaire.';
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
    this.oldPasswordTouched = true;
    this.newPasswordTouched = true;
    this.confirmPasswordTouched = true;

    if (!this.oldPassword || !this.newPassword || !this.confirmPassword) {
      this.passwordError = 'Veuillez remplir tous les champs.';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.passwordError = 'Les nouveaux mots de passe ne correspondent pas.';
      return;
    }

    const pwd = checkPassword(this.newPassword);
    if (pwd.error) {
      this.passwordError = pwd.error;
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
