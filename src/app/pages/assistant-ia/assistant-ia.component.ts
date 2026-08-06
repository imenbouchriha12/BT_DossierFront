import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiService } from '../../services/ai.service';
import { DonneeContextuelleDto } from '../../models/ai.models';

interface MessageBubble {
  role: 'user' | 'assistant';
  content: string;
  mode?: string;
  contexte?: DonneeContextuelleDto[];
  time: Date;
}

@Component({
  selector: 'app-assistant-ia',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './assistant-ia.component.html',
  styleUrls: ['./assistant-ia.component.css'],
})
export class AssistantIaComponent {
  messages: MessageBubble[] = [
    {
      role: 'assistant',
      content:
        "Bonjour, je suis l'assistant IA de BT DocCenter. Posez-moi une question en langage naturel sur vos clients, leurs comptes, leurs mouvements, leurs documents ou les alertes de fraude. Exemple : « combien de clients VIP sont en attente de documents ? »",
      time: new Date(),
    },
  ];
  input = '';
  loading = false;
  error = '';

  suggestions: string[] = [
    'Combien de clients VIP sont en attente de documents ?',
    'Montre-moi les alertes de fraude actives',
    'Quel est le score de risque du client Ahmed Ben Salah ?',
    'Résume le dossier du client dont le code est 0100100100',
    'Quels sont les mouvements récents du client Ben Salah ?',
  ];

  constructor(private aiService: AiService) {}

  envoyer(texte?: string): void {
    const contenu = (texte ?? this.input).trim();
    if (!contenu || this.loading) return;

    this.messages.push({ role: 'user', content: contenu, time: new Date() });
    this.input = '';
    this.loading = true;
    this.error = '';

    this.aiService.chat({ message: contenu }).subscribe({
      next: (res) => {
        this.messages.push({
          role: 'assistant',
          content: res.reponse,
          mode: res.mode,
          contexte: res.contexte,
          time: new Date(),
        });
        this.loading = false;
      },
      error: () => {
        this.messages.push({
          role: 'assistant',
          content: "Désolé, une erreur est survenue lors de la génération de la réponse. Réessayez dans un instant.",
          time: new Date(),
        });
        this.loading = false;
      },
    });
  }
}
