export type FieldState = 'idle' | 'error' | 'warn' | 'ok';

export const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
export const PHONE_RE = /^\+?[0-9][0-9\s().-]{7,19}$/;

/** Classe de bordure d'un champ selon son état (rouge / jaune / vert) */
export function fieldBorder(state: string): string {
  switch (state) {
    case 'error': return '!border-red-400';
    case 'warn': return '!border-amber-400';
    case 'ok': return '!border-emerald-500';
    default: return '';
  }
}

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

export interface PasswordCheck {
  score: number;
  error: string | null;
  label: string;
}

/**
 * Évalue la robustesse d'un mot de passe.
 * Règles : min 8 caractères, une majuscule, une minuscule, un chiffre.
 */
export function checkPassword(pw: string): PasswordCheck {
  if (!pw) return { score: 0, error: 'Champ requis', label: '' };

  const rules: { re: RegExp; msg: string }[] = [
    { re: /.{8,}/, msg: '8 caractères' },
    { re: /[A-Z]/, msg: 'une majuscule' },
    { re: /[a-z]/, msg: 'une minuscule' },
    { re: /[0-9]/, msg: 'un chiffre' },
  ];

  let score = 0;
  const missing: string[] = [];
  for (const rule of rules) {
    if (rule.re.test(pw)) score++;
    else missing.push(rule.msg);
  }

  if (score === 0) return { score, error: 'Mot de passe trop faible', label: 'Faible' };
  if (score < rules.length) return { score, error: `Critères manquants : ${missing.join(', ')}`, label: 'Moyen' };
  return { score, error: null, label: 'Fort' };
}

/** Message d'aide lié à un mot de passe validé (null si valide) */
export function passwordError(pw: string): string | null {
  return checkPassword(pw).error;
}
