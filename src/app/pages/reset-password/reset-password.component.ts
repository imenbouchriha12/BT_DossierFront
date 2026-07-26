import { Component, OnInit } from '@angular/core';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  standalone: true,
  imports: [RouterLink, NgIf, FormsModule],
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

  onSubmit(): void {
    this.error = '';
    this.success = '';

    if (this.newPassword !== this.confirmPassword) {
      this.error = 'Les mots de passe ne correspondent pas.';
      return;
    }

    if (this.newPassword.length < 8) {
      this.error = 'Le mot de passe doit contenir au moins 8 caractères.';
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
