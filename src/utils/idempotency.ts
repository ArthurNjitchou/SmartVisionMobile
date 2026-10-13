/** Clé unique d'une tentative de paiement. Conservée jusqu'à SUCCESS ou FAILED confirmé. */
export function createIdempotencyKey(prefix: string): string {
  const id =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${id}`;
}

function httpStatus(err: any): number {
  return Number(err?.response?.status ?? err?.status ?? err?.statusCode ?? 0);
}

function errorCode(err: any): string {
  return String(
    err?.response?.data?.error ||
      err?.response?.data?.code ||
      err?.error?.error ||
      err?.error?.code ||
      err?.code ||
      ''
  );
}

/**
 * Garder la même clé si on ne sait pas si MeSomb a débité (timeout, 5xx, paiement en cours).
 * En générer une nouvelle seulement après un échec définitif.
 */
export function shouldRotateIdempotencyKey(err?: any, payload?: any): boolean {
  if (payload?.status === 'FAILED' && payload?.localTransactionId) {
    return false;
  }
  if (payload?.status === 'FAILED') {
    return true;
  }
  if (!err) {
    return false;
  }

  const status = httpStatus(err);
  const code = errorCode(err);

  if (code === 'PAYMENT_ALREADY_IN_PROGRESS' || code === 'CONFLICT') {
    return false;
  }
  if (status === 0 || status === 408 || status === 409 || status === 502 || status === 503 || status === 504) {
    return false;
  }
  if (code === 'FAILED_MESOMB_COLLECT' || code === 'FAILED_MESOMB_DEPOSIT') {
    return true;
  }
  if (status >= 500) {
    return false;
  }
  if (status >= 400) {
    return true;
  }
  return false;
}
