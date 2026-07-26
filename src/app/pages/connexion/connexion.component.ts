import { Component } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  standalone: true,
  imports: [RouterLink, FormsModule, NgIf],
  templateUrl: './connexion.component.html',
  styleUrls: ['./connexion.component.css']
})
export class ConnexionComponent {
  matricule = '';
  password = '';
  error = '';
  loading = false;
  showPassword = false;

  constructor(private auth: AuthService, private router: Router) {}

  onSubmit(): void {
    if (!this.matricule || !this.password) {
      this.error = 'Veuillez remplir tous les champs.';
      return;
    }

    this.loading = true;
    this.error = '';

    this.auth.login({ matricule: this.matricule, password: this.password }).subscribe({
      next: () => {
        this.router.navigate(['/tableau-de-bord']);
      },
      error: (err) => {
        this.error = err.error?.message || 'Identifiants invalides ou compte inactif.';
        this.loading = false;
      }
    });
  }
}
