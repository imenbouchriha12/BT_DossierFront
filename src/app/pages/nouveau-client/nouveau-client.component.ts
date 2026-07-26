import { Component, OnInit } from '@angular/core';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ClientService } from '../../services/client.service';
import { CreateClientDto, UpdateClientDto, ClientDto } from '../../models/client.models';

@Component({
  selector: 'app-nouveau-client',
  standalone: true,
  imports: [RouterModule, FormsModule, CommonModule],
  templateUrl: './nouveau-client.component.html',
})
export class NouveauClientComponent implements OnInit {
  editMode = false;
  clientId: number | null = null;
  loading = false;
  saving = false;
  error = '';
  success = '';

  currentStep = 1;

  formData: CreateClientDto = {
    nom: '',
    prenom: '',
    dateNaissance: '',
    sexe: '',
    nationalite: '',
    telephone: '',
    email: '',
    adresse: '',
    ville: '',
    statut: 'Actif',
    detail: {
      profession: '',
      employeur: '',
      secteurActivite: '',
      revenuMensuel: 0,
      situationFamiliale: '',
      typeResidence: 'R',
    }
  };

  constructor(
    private clientService: ClientService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editMode = true;
      this.clientId = +id;
      this.loadClient(+id);
    }
  }

  loadClient(id: number) {
    this.loading = true;
    this.clientService.getById(id).subscribe({
      next: (client) => {
        this.formData = {
          nom: client.nom,
          prenom: client.prenom,
          dateNaissance: client.dateNaissance.slice(0, 10),
          sexe: client.sexe,
          nationalite: client.nationalite,
          telephone: client.telephone,
          email: client.email,
          adresse: client.adresse,
          ville: client.ville,
          statut: client.statut,
          detail: {
            profession: client.detail?.profession || '',
            employeur: client.detail?.employeur || '',
            secteurActivite: client.detail?.secteurActivite || '',
            revenuMensuel: client.detail?.revenuMensuel || 0,
            situationFamiliale: client.detail?.situationFamiliale || '',
            typeResidence: client.detail?.typeResidence || 'R',
          }
        };
        this.loading = false;
      },
      error: () => {
        this.error = 'Erreur lors du chargement du client.';
        this.loading = false;
      }
    });
  }

  get isStepValid(): boolean {
    if (this.currentStep === 1) {
      return !!(
        this.formData.nom &&
        this.formData.prenom &&
        this.formData.dateNaissance &&
        this.formData.sexe &&
        this.formData.nationalite
      );
    }
    if (this.currentStep === 2) {
      return !!(
        this.formData.telephone &&
        this.formData.email &&
        this.formData.adresse &&
        this.formData.ville
      );
    }
    return true;
  }

  nextStep() {
    if (this.currentStep < 3) {
      this.currentStep++;
    }
  }

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  getStepCircleClass(step: number): string {
    const base = 'w-10 h-10 rounded-full flex items-center justify-center text-title-md font-title-md border-4 border-white shadow-md transition-all duration-300';
    if (this.currentStep >= step) {
      return `${base} bg-primary text-white`;
    }
    return `${base} bg-white text-on-surface-variant`;
  }

  getStepLabelClass(step: number): string {
    const base = 'text-label-md font-label-md';
    if (this.currentStep >= step) {
      return `${base} text-primary`;
    }
    return `${base} text-on-surface-variant`;
  }

  onSubmit() {
    this.saving = true;
    this.error = '';
    this.success = '';

    const obs = this.editMode && this.clientId
      ? this.clientService.update(this.clientId, this.formData as UpdateClientDto)
      : this.clientService.create(this.formData);

    obs.subscribe({
      next: () => {
        this.saving = false;
        this.success = this.editMode
          ? 'Client modifié avec succès.'
          : 'Client créé avec succès.';
        setTimeout(() => {
          this.router.navigate(['/liste-clients']);
        }, 1500);
      },
      error: (err) => {
        this.saving = false;
        this.error = err.error?.message || 'Erreur lors de l\'enregistrement.';
      }
    });
  }
}
