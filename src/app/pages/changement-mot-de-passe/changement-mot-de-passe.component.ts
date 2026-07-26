import { Component } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  standalone: true,
  imports: [NgIf, FormsModule],
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

  constructor(private auth: AuthService, private router: Router) {}

  onSubmit(): void {
    this.error = '';
    this.success = '';

    if (!this.oldPassword || !this.newPassword || !this.confirmPassword) {
      this.error = 'Veuillez remplir tous les champs.';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.error = 'Les nouveaux mots de passe ne correspondent pas.';
      return;
    }

    if (this.newPassword.length < 8) {
      this.error = 'Le nouveau mot de passe doit contenir au moins 8 caractères.';
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
