import { Component } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  standalone: true,
  imports: [RouterLink, FormsModule, NgIf],
  templateUrl: './inscription.component.html',
  styleUrls: ['./inscription.component.css']
})
export class InscriptionComponent {
  username = '';
  email = '';
  error = '';
  success = '';
  loading = false;

  constructor(private auth: AuthService, private router: Router) {}

  onSubmit(): void {
    this.error = '';
    this.success = '';

    if (!this.username || !this.email) {
      this.error = 'Veuillez remplir tous les champs.';
      return;
    }

    this.loading = true;

    this.auth.register({
      username: this.username,
      email: this.email
    }).subscribe({
      next: (res) => {
        this.success = res.message || 'Compte créé avec succès. En attente d\'activation par l\'administrateur.';
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Erreur lors de l\'inscription.';
        this.loading = false;
      }
    });
  }
}
