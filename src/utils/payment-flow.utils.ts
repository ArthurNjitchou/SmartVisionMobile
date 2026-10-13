const DEFAULT_PENDING_MESSAGE =
  'Paiement en attente. Validez sur votre téléphone ; le résultat s’affichera ici dès confirmation.';

export function hideProviderName(text?: string): string {
  return String(text || '')
    .replace(/MeSomb/gi, 'Mobile Money')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Tant qu'une transaction locale existe, ne pas afficher d'échec prématuré. */
export function shouldTreatCollectAsPending(payload?: {
  status?: string;
  localTransactionId?: string | null;
}): boolean {
  if (!payload) return false;
  if (payload.status === 'PENDING') return true;
  return payload.status === 'FAILED' && Boolean(payload.localTransactionId);
}

export function resolvePendingMessage(message?: string): string {
  return hideProviderName(message) || DEFAULT_PENDING_MESSAGE;
}

export function isPaymentInProgressError(code?: string): boolean {
  return code === 'PAYMENT_ALREADY_IN_PROGRESS' || code === 'CONFLICT';
}

export function extractCollectErrorData(err: any): {
  code: string;
  data: any;
  message?: string;
} {
  const body = err?.response?.data ?? err?.error ?? err;
  return {
    code: String(body?.error || body?.code || ''),
    data: body?.data ?? body,
    message: body?.message,
  };
}
