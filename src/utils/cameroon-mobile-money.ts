export type CameroonMmOperator = 'MTN' | 'ORANGE';

function digitsOnly(value: string): string {
  return String(value || '').replace(/\D/g, '');
}

export function localCameroonMsisdn(value: string): string {
  let phone = digitsOnly(value);
  if (phone.startsWith('237') && phone.length >= 12) {
    phone = phone.slice(3);
  }
  if (phone.startsWith('0') && phone.length === 10) {
    phone = phone.slice(1);
  }
  return phone;
}

export function inferCameroonMobileOperator(value: string): CameroonMmOperator | null {
  const phone = localCameroonMsisdn(value);
  if (!/^6\d{8}$/.test(phone)) return null;
  const prefix3 = phone.slice(0, 3);
  if (phone.startsWith('69') || (prefix3 >= '655' && prefix3 <= '659')) {
    return 'ORANGE';
  }
  if (
    phone.startsWith('67') ||
    (prefix3 >= '650' && prefix3 <= '654') ||
    (prefix3 >= '680' && prefix3 <= '684')
  ) {
    return 'MTN';
  }
  return null;
}

export function operatorLabel(service: string): string {
  return String(service || '').toUpperCase() === 'ORANGE' ? 'Orange Money' : 'MTN Money';
}

export function operatorMismatchMessage(phone: string, service: string): string | null {
  const inferred = inferCameroonMobileOperator(phone);
  const selected = String(service || '').toUpperCase();
  if (!inferred || (selected !== 'MTN' && selected !== 'ORANGE') || inferred === selected) {
    return null;
  }
  const inferredName = operatorLabel(inferred);
  const selectedName = operatorLabel(selected);
  return `Le numéro saisi correspond à ${inferredName}, alors que ${selectedName} est sélectionné. Choisissez ${inferredName} ou saisissez un numéro ${selectedName}.`;
}

export function friendlyMobileMoneyFailureMessage(
  phone: string,
  service: string,
  rawMessage?: string | null
): string {
  const mismatch = operatorMismatchMessage(phone, service);
  if (mismatch) return mismatch;

  const text = String(rawMessage || '').toLowerCase();
  if (/(insufficient|solde|funds|balance|insuffisant)/i.test(text)) {
    return 'Solde Mobile Money insuffisant. Rechargez le compte puis réessayez.';
  }
  if (/(subscriber|not registered|does not exist|unknown msisdn|wrong (operator|service)|not a valid|not an (mtn|orange))/i.test(text)) {
    return 'Ce numéro ne correspond pas à l’opérateur sélectionné. Vérifiez que vous avez bien choisi MTN Money ou Orange Money selon le numéro saisi.';
  }
  if (/(cancel|annul|user.?refus|declined by user)/i.test(text)) {
    return 'Le paiement a été annulé sur le téléphone. Aucun montant n’a été enregistré.';
  }
  return 'Le paiement a été refusé ou annulé. Vérifiez que le numéro saisi correspond bien à l’opérateur choisi (MTN Money ou Orange Money), puis réessayez. Aucun montant n’a été enregistré.';
}
