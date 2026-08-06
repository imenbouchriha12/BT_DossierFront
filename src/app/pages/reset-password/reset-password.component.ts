import { Component, OnInit } from '@angular/core';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { NgIf, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { fieldBorder, checkPassword } from '../../shared/validation.utils';

@Component({
  standalone: true,
  imports: [RouterLink, NgIf, NgClass, FormsModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css'],
})
export class ResetPasswordComponent implements OnInit {
  token = '';
  email = '';
  newPassword = '';
  confirmPassword = '';
  error = '';
  success = '';
  loading = false;
  invalidLink = false;
  newPasswordTouched = false;
  confirmPasswordTouched = false;

  constructor(private route: ActivatedRoute, private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || '';
      this.email = params['email'] || '';
      if (!this.token || !this.email) {
        this.invalidLink = true;
        this.error = 'Lien de réinitialisation invalide.';
      }
    });
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
    if (!this.confirmPassword) return 'Veuillez confirmer le mot de passe.';
    return this.newPassword === this.confirmPassword
      ? 'Les mots de passe correspondent.'
      : 'Les mots de passe ne correspondent pas.';
  }

  fieldBorder = fieldBorder;

  onSubmit(): void {
    this.error = '';
    this.success = '';
    this.newPasswordTouched = true;
    this.confirmPasswordTouched = true;

    const pwd = checkPassword(this.newPassword);

    if (this.newPassword !== this.confirmPassword) {
      this.error = 'Les mots de passe ne correspondent pas.';
      return;
    }

    if (pwd.error) {
      this.error = pwd.error;
      return;
    }

    this.loading = true;

    this.http.post<{ message: string }>(`${environment.apiUrl}/auth/reset-password`, {
      token: this.token,
      email: this.email,
      newPassword: this.newPassword
    }).subscribe({
      next: () => {
        this.success = 'Mot de passe réinitialisé avec succès.';
        this.loading = false;
        setTimeout(() => this.router.navigate(['/connexion']), 3000);
      },
      error: (err) => {
        this.error = err.error?.message || 'Erreur lors de la réinitialisation.';
        this.loading = false;
      }
    });
  }
}
