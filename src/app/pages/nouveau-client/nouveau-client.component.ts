import { Component, OnInit } from '@angular/core';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ClientService } from '../../services/client.service';
import { CreateClientDto, UpdateClientDto, ClientDto } from '../../models/client.models';
import { isValidEmail, PHONE_RE } from '../../shared/validation.utils';

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
    typeClient: 'Particulier',
    matriculeFiscal: '',
    registreCommerce: '',
    detail: {
      profession: '',
      employeur: '',
      secteurActivite: '',
      revenuMensuel: 0,
      situationFamiliale: '',
      typeResidence: 'R',
    }
  };

  clientTypes = ['Particulier', 'Entreprise', 'VIP', 'Professionnel', 'Association'];

  touchedFields: Record<string, boolean> = {};

  private readonly labels: Record<string, string> = {
    nom: 'Le nom',
    prenom: 'Le prénom',
    dateNaissance: 'La date de naissance',
    sexe: 'Le sexe',
    nationalite: 'La nationalité',
    matriculeFiscal: 'Le matricule fiscal',
    registreCommerce: 'Le registre de commerce',
    telephone: 'Le téléphone',
    email: 'L\'adresse email',
    adresse: 'L\'adresse',
    ville: 'La ville',
  };

  isTouched(field: string): boolean {
    return !!this.touchedFields[field];
  }

  markTouched(field: string): void {
    this.touchedFields[field] = true;
  }

  isRequiredField(field: string): boolean {
    if (field === 'matriculeFiscal') return this.needsMatriculeFiscal;
    if (field === 'registreCommerce') return this.needsRegistreCommerce;
    return true;
  }

  private fieldValue(field: string): any {
    switch (field) {
      case 'nom': return this.formData.nom;
      case 'prenom': return this.formData.prenom;
      case 'dateNaissance': return this.formData.dateNaissance;
      case 'sexe': return this.formData.sexe;
      case 'nationalite': return this.formData.nationalite;
      case 'matriculeFiscal': return this.formData.matriculeFiscal;
      case 'registreCommerce': return this.formData.registreCommerce;
      case 'telephone': return this.formData.telephone;
      case 'email': return this.formData.email;
      case 'adresse': return this.formData.adresse;
      case 'ville': return this.formData.ville;
      default: return '';
    }
  }

  borderFor(field: string): string {
    if (!this.isTouched(field)) return '';
    const value = this.fieldValue(field);
    const filled = value !== '' && value != null;
    if (!filled) return this.isRequiredField(field) ? '!border-red-400' : '';
    if (field === 'email') return isValidEmail(String(value)) ? '!border-emerald-500' : '!border-red-400';
    if (field === 'telephone') return PHONE_RE.test(String(value)) ? '!border-emerald-500' : '!border-red-400';
    return '!border-emerald-500';
  }

  messageFor(field: string): string {
    if (!this.isTouched(field)) return '';
    const value = this.fieldValue(field);
    const filled = value !== '' && value != null;
    if (!filled) {
      return this.isRequiredField(field) ? `${this.labels[field] || 'Le champ'} est requis.` : '';
    }
    if (field === 'email') return isValidEmail(String(value)) ? 'Adresse email valide.' : 'Adresse email invalide.';
    if (field === 'telephone') return PHONE_RE.test(String(value)) ? 'Numéro valide.' : 'Numéro de téléphone invalide.';
    return 'Champ valide.';
  }

  messageClassFor(field: string): string {
    if (!this.isTouched(field)) return '';
    const value = this.fieldValue(field);
    const filled = value !== '' && value != null;
    if (!filled) return this.isRequiredField(field) ? 'text-red-600' : '';
    if (field === 'email') return isValidEmail(String(value)) ? 'text-emerald-600' : 'text-red-600';
    if (field === 'telephone') return PHONE_RE.test(String(value)) ? 'text-emerald-600' : 'text-red-600';
    return 'text-emerald-600';
  }

  messageIconFor(field: string): string {
    if (!this.isTouched(field)) return '';
    const value = this.fieldValue(field);
    const filled = value !== '' && value != null;
    if (!filled) return this.isRequiredField(field) ? 'error' : '';
    if (field === 'email') return isValidEmail(String(value)) ? 'check_circle' : 'error';
    if (field === 'telephone') return PHONE_RE.test(String(value)) ? 'check_circle' : 'error';
    return 'check_circle';
  }

  touchStepFields(step: number): void {
    const fields = step === 1
      ? ['nom', 'prenom', 'dateNaissance', 'sexe', 'nationalite', 'matriculeFiscal', 'registreCommerce']
      : step === 2 ? ['telephone', 'email', 'adresse', 'ville'] : [];
    fields.forEach((f) => { if (this.isRequiredField(f)) this.touchedFields[f] = true; });
  }

  get needsMatriculeFiscal(): boolean {
    return this.formData.typeClient === 'Entreprise'
      || this.formData.typeClient === 'Professionnel'
      || this.formData.typeClient === 'Association';
  }

  get needsRegistreCommerce(): boolean {
    return this.formData.typeClient === 'Entreprise' || this.formData.typeClient === 'Association';
  }

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
          typeClient: client.typeClient || 'Particulier',
          matriculeFiscal: client.matriculeFiscal || '',
          registreCommerce: client.registreCommerce || '',
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
      if (this.needsMatriculeFiscal && !this.formData.matriculeFiscal) return false;
      if (this.needsRegistreCommerce && !this.formData.registreCommerce) return false;
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
        PHONE_RE.test(this.formData.telephone) &&
        this.formData.email &&
        isValidEmail(this.formData.email) &&
        this.formData.adresse &&
        this.formData.ville
      );
    }
    return true;
  }

  nextStep() {
    if (this.currentStep < 3) {
      this.touchStepFields(this.currentStep);
      if (!this.isStepValid) return;
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
