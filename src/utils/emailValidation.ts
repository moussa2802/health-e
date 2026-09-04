const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const DOMAIN_CORRECTIONS: Record<string, string> = {
  'gmial.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.fr': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gmail.cm': 'gmail.com',
  'gmail.om': 'gmail.com',
  'gmail.cim': 'gmail.com',
  'gmail.vom': 'gmail.com',
  'hotmal.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'hotmail.con': 'hotmail.com',
  'hotmail.co': 'hotmail.com',
  'hotamil.com': 'hotmail.com',
  'hotmail.fr': 'hotmail.fr',
  'hotmial.com': 'hotmail.com',
  'outloo.com': 'outlook.com',
  'outlok.com': 'outlook.com',
  'outlook.con': 'outlook.com',
  'outllook.com': 'outlook.com',
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'yahoo.con': 'yahoo.com',
  'yahoo.co': 'yahoo.com',
  'yhoo.com': 'yahoo.com',
  'yhaoo.com': 'yahoo.com',
  'yahoo.fr': 'yahoo.fr',
  'yaoo.fr': 'yahoo.fr',
  'iclou.com': 'icloud.com',
  'icloud.con': 'icloud.com',
  'icoud.com': 'icloud.com',
  'protonmai.com': 'protonmail.com',
  'protonmail.con': 'protonmail.com',
  'orang.sn': 'orange.sn',
  'ornage.sn': 'orange.sn',
};

export interface EmailValidationResult {
  valid: boolean;
  error?: string;
  suggestion?: string;
}

export function validateEmail(email: string): EmailValidationResult {
  const trimmed = email.trim().toLowerCase();

  if (!trimmed) {
    return { valid: false, error: 'Veuillez entrer une adresse email.' };
  }

  if (!EMAIL_RE.test(trimmed)) {
    return { valid: false, error: 'Format d\'email invalide. Vérifiez qu\'il contient un @ et un domaine valide.' };
  }

  const domain = trimmed.split('@')[1];
  const corrected = DOMAIN_CORRECTIONS[domain];
  if (corrected && corrected !== domain) {
    const suggested = trimmed.replace(`@${domain}`, `@${corrected}`);
    return { valid: true, suggestion: suggested };
  }

  return { valid: true };
}
