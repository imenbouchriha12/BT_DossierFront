import { Component } from '@angular/core';
import { NgIf, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { fieldBorder, checkPassword } from '../../shared/validation.utils';

@Component({
  standalone: true,
  imports: [NgIf, NgClass, FormsModule],
  templateUrl: './changement-mot-de-passe.component.html',
  styleUrls: ['./changement-mot-de-passe.component.css'],
})
export class ChangementMotDePasseComponent {
  oldPassword = '';
  newPassword = '';
  confirmPassword = '';
  error = '';
  success = '';
  loading = false;
  oldPasswordTouched = false;
  newPasswordTouched = false;
  confirmPasswordTouched = false;

  constructor(private auth: AuthService, private router: Router) {}

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

  fieldBorder = fieldBorder;

  onSubmit(): void {
    this.error = '';
    this.success = '';
    this.oldPasswordTouched = true;
    this.newPasswordTouched = true;
    this.confirmPasswordTouched = true;

    if (!this.oldPassword || !this.newPassword || !this.confirmPassword) {
      this.error = 'Veuillez remplir tous les champs.';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.error = 'Les nouveaux mots de passe ne correspondent pas.';
      return;
    }

    const pwd = checkPassword(this.newPassword);
    if (pwd.error) {
      this.error = pwd.error;
      return;
    }

    this.loading = true;

    this.auth.changePassword(this.oldPassword, this.newPassword).subscribe({
      next: () => {
        this.success = 'Mot de passe changé avec succès.';
        this.oldPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
        this.loading = false;
        setTimeout(() => this.success = '', 4000);
      },
      error: (err) => {
        this.error = err.error?.message || 'Erreur lors du changement de mot de passe.';
        this.loading = false;
      }
    });
  }
}
